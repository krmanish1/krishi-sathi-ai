import i18next from "i18next";
import { getBackend } from "./gemma";
import { PLANNER_SYSTEM } from "./prompts/planner";
import { SYNTHESIZER_SYSTEM } from "./prompts/synthesizer";
import { offlineFallback } from "./offlineFallback";
import { logOnDevice } from "./ondeviceLog";
import { getModelPath } from "./modelState";
import { modelVariantFromFilename, modelVariantToOnDeviceModelId } from "./localGemmaModelFile";
import { buildFallbackPlan, parsePlannerJson, type PlannerPlan } from "./plannerParse";
import { toNativeFilesystemPath } from "./nativeModelPath";
import {
  querySchemes,
  queryMandiPrices,
  queryCropCalendar,
  queryWeatherHistory,
} from "@/shared/storage/offlineData";
import type { AgentQuery, AgentResponse } from "@/shared/api/routing";
import { callGemmaWithTimeout, isAbortError, isGemmaTimeoutError } from "./gemmaCall";

type ToolCall = { tool: string; params?: Record<string, string | undefined> };

function activeOnDeviceModelId(): "gemma-4-e4b-it" | "gemma-4-e2b-it" {
  const fromPath = modelVariantFromFilename(getModelPath());
  return modelVariantToOnDeviceModelId(fromPath ?? "e2b");
}

function sanitizeForPrompt(input: unknown, maxLen = 800): string {
  const raw = typeof input === "string" ? input : String(input ?? "");
  const trimmed = raw.trim().slice(0, maxLen);
  // Remove common injection markers and role tokens. (Not perfect, but raises the bar.)
  return trimmed
    .replace(/\b(system|assistant|developer|tool)\s*:/giu, "")
    .replace(/\b(ignore|disregard|override)\b.*\b(previous|instructions)\b/giu, "")
    .replace(/```[\s\S]*?```/g, "[code]");
}

function safeJsonForPrompt(value: unknown, maxLen = 1500): string {
  try {
    return sanitizeForPrompt(JSON.stringify(value), maxLen);
  } catch {
    return sanitizeForPrompt(String(value), maxLen);
  }
}

async function dispatchTool(
  tool: ToolCall,
  query: AgentQuery,
  farmerProfile: { district: string; state: string; land?: number; hasAadhaar?: boolean },
): Promise<{ tool: string; result: unknown }> {
  const params = tool.params ?? {};
  const district = params.district ?? farmerProfile.district;

  switch (tool.tool) {
    case "climate": {
      const month = new Date().getMonth() + 1;
      const row = await queryWeatherHistory(district, month).catch(() => null);
      return { tool: "climate", result: row ?? { note: "No cached weather data" } };
    }
    case "scheme": {
      const rows = await querySchemes(query.text).catch(() => []);
      return { tool: "scheme", result: rows };
    }
    case "market": {
      const crop = params.crop ?? "";
      const rows = await queryMandiPrices(crop, district).catch(() => []);
      return { tool: "market", result: rows };
    }
    case "crop_planner": {
      const crop = params.crop ?? "";
      const cal = await queryCropCalendar(crop).catch(() => null);
      return { tool: "crop_planner", result: cal ?? { note: "No crop calendar data" } };
    }
    case "financial": {
      const eligible = (farmerProfile.land ?? 0) > 0 && farmerProfile.hasAadhaar === true;
      return {
        tool: "financial",
        result: {
          kcc_eligible: eligible,
          note: eligible
            ? "KCC eligibility: Yes (land > 0 and Aadhaar). Contact nearest bank."
            : "KCC eligibility: Requires land ownership and Aadhaar.",
        },
      };
    }
    case "vision": {
      if (!query.imageBase64) {
        return { tool: "vision", result: { note: "No image provided" } };
      }
      const backend = getBackend();
      if (!backend?.supportsVision || !backend.generateWithImage) {
        return {
          tool: "vision",
          result: { note: i18next.t("offline.visionUnavailable") },
        };
      }
      const out = await backend
        .generateWithImage(
          "Analyze this crop image for diseases or problems. Describe what you see.",
          query.imageBase64,
          query.imageMimeType ?? "image/jpeg",
          query.onToken,
        )
        .catch((e: unknown) => ({
          text: String(e),
          confidence: 0,
          modelUsed: activeOnDeviceModelId(),
        }));
      return { tool: "vision", result: { analysis: out.text } };
    }
    default:
      return { tool: tool.tool, result: { note: "Unknown tool" } };
  }
}

export const onDeviceAgent = {
  async run(
    query: AgentQuery,
    farmerProfile: { district: string; state: string; land?: number; hasAadhaar?: boolean },
    signal?: AbortSignal,
  ): Promise<AgentResponse> {
    // Stage A: Plan + Safety (1 Gemma call)
    const plannerPrompt = `${PLANNER_SYSTEM}

Farmer location: district=${farmerProfile.district}, state=${farmerProfile.state}
Has image: ${query.imageBase64 ? "yes" : "no"}
Query: ${sanitizeForPrompt(query.text)}`;

    let planText: string;
    try {
      planText = await callGemmaWithTimeout(plannerPrompt, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      logOnDevice("planner_fail", {
        error: e instanceof Error ? e.message : String(e),
        path: getModelPath() ? toNativeFilesystemPath(getModelPath()) : null,
      });
      return offlineFallback(query, undefined, { reason: "inference_failed", error: e });
    }

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    let plan: PlannerPlan | null = parsePlannerJson(planText);
    if (!plan) {
      plan = buildFallbackPlan(query.intent, { hasImage: !!query.imageBase64 });
      logOnDevice("planner_fallback", {
        intent: query.intent,
        preview: planText.trim().slice(0, 160),
      });
    }

    if (!plan.safe) {
      logOnDevice("planner_unsafe", { intent: plan.intent, preview: planText.trim().slice(0, 120) });
      return {
        text: i18next.t("chat.safetyBlock"),
        confidence: 0,
        source: "ondevice",
        modelUsed: activeOnDeviceModelId(),
        canEscalate: true,
      };
    }

    // Stage B: Tool execution (no LLM, pure SQLite/rules)
    const toolTrace: { tool: string; result: unknown }[] = [];
    let tools: ToolCall[] = Array.isArray(plan.tools) ? plan.tools : [];
    if (tools.length === 0) {
      tools = buildFallbackPlan(query.intent, { hasImage: !!query.imageBase64 }).tools;
    }

    for (const toolCall of tools.slice(0, 4)) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const result = await dispatchTool(toolCall, query, farmerProfile);
      toolTrace.push(result);
    }

    // Stage C: Synthesize (1 Gemma call)
    const synthPrompt = `${SYNTHESIZER_SYSTEM}

Tool results:
${safeJsonForPrompt(toolTrace)}

Farmer query: ${sanitizeForPrompt(query.text)}
District: ${farmerProfile.district}, State: ${farmerProfile.state}

Write a helpful response:`;

    let finalText: string;
    try {
      finalText = await callGemmaWithTimeout(synthPrompt, signal, query.onToken);
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) throw e;
      logOnDevice("generate_fail", {
        reason: isGemmaTimeoutError(e) ? "timeout" : "error",
        error: e instanceof Error ? e.message : String(e),
        path: getModelPath() ? toNativeFilesystemPath(getModelPath()) : null,
      });
      const summary = toolTrace
        .map((t) => `${t.tool}: ${JSON.stringify(t.result).slice(0, 200)}`)
        .join("\n");
      finalText =
        summary ||
        (isGemmaTimeoutError(e)
          ? i18next.t("offline.generationTimeout")
          : i18next.t("offline.modelDownloadingGeneral"));
    }

    const trimmed = (finalText ?? "").trim();
    if (signal?.aborted && !trimmed) {
      throw new DOMException("Aborted", "AbortError");
    }

    const text =
      trimmed ||
      toolTrace
        .map((t) => `${t.tool}: ${JSON.stringify(t.result).slice(0, 200)}`)
        .join("\n") ||
      i18next.t("offline.generationTimeout");

    logOnDevice("agent_reply", {
      source: "ondevice",
      textLength: text.length,
      preview: text.slice(0, 160),
    });

    return {
      text,
      confidence: 0.72,
      source: "ondevice",
      modelUsed: activeOnDeviceModelId(),
      canEscalate: false,
      toolTrace,
    };
  },
};
