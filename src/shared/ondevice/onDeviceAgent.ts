import i18next from "i18next";
import { getBackend } from "./gemma";
import { PLANNER_SYSTEM } from "./prompts/planner";
import { SYNTHESIZER_SYSTEM } from "./prompts/synthesizer";
import { offlineFallback } from "./offlineFallback";
import {
  querySchemes,
  queryMandiPrices,
  queryCropCalendar,
  queryWeatherHistory,
} from "@/shared/storage/offlineData";
import type { AgentQuery, AgentResponse } from "@/shared/api/routing";

const MAX_GEN_MS = 45_000;

type ToolCall = { tool: string; params?: Record<string, string | undefined> };
type PlanResult = { intent: string; tools: ToolCall[]; safe: boolean };

/** Merge an external AbortSignal with an internal one (for timeout). */
function mergeSignals(outer?: AbortSignal, inner?: AbortSignal): AbortSignal {
  const ac = new AbortController();
  const abort = () => ac.abort();
  outer?.addEventListener("abort", abort);
  inner?.addEventListener("abort", abort);
  if (outer?.aborted || inner?.aborted) ac.abort();
  return ac.signal;
}

async function callGemmaWithTimeout(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const backend = getBackend();
  if (!backend) throw new Error("Gemma backend not set");

  const timeoutAc = new AbortController();
  const timer = setTimeout(() => timeoutAc.abort(), MAX_GEN_MS);
  const merged = mergeSignals(signal, timeoutAc.signal);

  try {
    if (merged.aborted) throw new DOMException("Aborted", "AbortError");
    const result = await backend.generate({
      prompt,
      language: "hi",
      intent: "general",
    });
    if (merged.aborted) throw new DOMException("Aborted", "AbortError");
    return result.text;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonSafe(text: string): PlanResult | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as PlanResult;
  } catch {
    return null;
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
        )
        .catch((e: unknown) => ({
          text: String(e),
          confidence: 0,
          modelUsed: "gemma-4-e4b-it" as const,
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
Query: ${query.text}`;

    let planText: string;
    try {
      planText = await callGemmaWithTimeout(plannerPrompt, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      // Timeout or crash — use rule-based fallback
      return offlineFallback(query);
    }

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const plan = parseJsonSafe(planText);
    if (!plan || plan.safe === false) {
      return {
        text: i18next.t("chat.safetyBlock"),
        confidence: 0,
        source: "ondevice",
        modelUsed: "gemma-4-e4b-it",
        canEscalate: true,
      };
    }

    // Stage B: Tool execution (no LLM, pure SQLite/rules)
    const toolTrace: { tool: string; result: unknown }[] = [];
    const tools: ToolCall[] = Array.isArray(plan.tools) ? plan.tools : [];

    for (const toolCall of tools.slice(0, 4)) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const result = await dispatchTool(toolCall, query, farmerProfile);
      toolTrace.push(result);
    }

    // Stage C: Synthesize (1 Gemma call)
    const synthPrompt = `${SYNTHESIZER_SYSTEM}

Tool results:
${JSON.stringify(toolTrace, null, 2)}

Farmer query: ${query.text}
District: ${farmerProfile.district}, State: ${farmerProfile.state}

Write a helpful response:`;

    let finalText: string;
    try {
      finalText = await callGemmaWithTimeout(synthPrompt, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      // Timeout — return tool results as fallback
      const summary = toolTrace
        .map((t) => `${t.tool}: ${JSON.stringify(t.result).slice(0, 200)}`)
        .join("\n");
      finalText = summary || i18next.t("offline.modelDownloadingGeneral");
    }

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    return {
      text: finalText,
      confidence: 0.72,
      source: "ondevice",
      modelUsed: "gemma-4-e4b-it",
      canEscalate: false,
      toolTrace,
    };
  },
};
