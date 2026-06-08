import type { DeviceIntent } from "@/shared/api/types";

export type PlannerToolCall = { tool: string; params?: Record<string, string | undefined> };
export type PlannerPlan = { intent: string; tools: PlannerToolCall[]; safe: boolean };

const INTENT_TO_TOOL: Record<DeviceIntent, string> = {
  weather: "climate",
  scheme_query: "scheme",
  market_price: "market",
  crop_plan: "crop_planner",
  financial: "financial",
  crop_disease: "general",
  general: "general",
  alert: "general",
};

/** Only explicit false counts as unsafe; missing/invalid safe defaults to true. */
export function normalizePlannerSafe(raw: unknown): boolean {
  return raw !== false && raw !== "false";
}

export function parsePlannerJson(text: string): PlannerPlan | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const raw = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    const tools = Array.isArray(raw.tools)
      ? (raw.tools as PlannerToolCall[]).filter(
          (t) => t && typeof t.tool === "string" && t.tool.trim().length > 0,
        )
      : [];
    return {
      intent: typeof raw.intent === "string" ? raw.intent : "general",
      tools,
      safe: normalizePlannerSafe(raw.safe),
    };
  } catch {
    return null;
  }
}

/** Rule-based plan when on-device Gemma returns non-JSON (common on E2B). */
export function buildFallbackPlan(
  intent: DeviceIntent,
  opts?: { hasImage?: boolean },
): PlannerPlan {
  let tool = INTENT_TO_TOOL[intent] ?? "general";
  if (opts?.hasImage && tool === "general") {
    tool = "vision";
  }
  return {
    intent,
    tools: [{ tool, params: {} }],
    safe: true,
  };
}
