import type { BackendStage } from "./useStreamChatMessage";

const KNOWN: Record<string, BackendStage> = {
  routing: "routing",
  planning: "planning",
  tools: "tools",
  synthesizing: "synthesizing",
  clarify: "clarify",
};

/** Maps backend `data.stage` string to our enum when it matches. */
export function parseKnownStage(data: Record<string, unknown>): BackendStage | undefined {
  const raw = data.stage;
  if (typeof raw !== "string") return undefined;
  return KNOWN[raw];
}

/**
 * Primary line: prefer explicit backend strings, then `stage`, then JSON.
 * Secondary line: other human-readable fields, then remaining JSON.
 */
export function titleAndSubtitleFromStageData(data: Record<string, unknown>): {
  title: string;
  subtitle: string;
} {
  const pickStr = (keys: string[]): string => {
    for (const k of keys) {
      const v = data[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const title =
    pickStr(["title", "label", "name", "message", "heading", "summary"]) ||
    (typeof data.stage === "string" && data.stage.trim() ? data.stage.trim() : "");

  const subtitleDirect = pickStr([
    "description",
    "detail",
    "subtitle",
    "body",
    "notes",
    "text",
    "content",
  ]);

  const titleKeys = new Set([
    "title",
    "label",
    "name",
    "message",
    "heading",
    "summary",
    "stage",
    "description",
    "detail",
    "subtitle",
    "body",
    "notes",
    "text",
    "content",
  ]);

  if (title) {
    if (subtitleDirect) {
      return { title, subtitle: subtitleDirect };
    }
    const rest = restObject(data, titleKeys);
    const sub = stringifyRest(rest);
    return { title, subtitle: sub };
  }

  const fallback = stringifyRest(data);
  return {
    title: typeof data.stage === "string" ? data.stage : "Stage",
    subtitle: fallback || "",
  };
}

function restObject(data: Record<string, unknown>, omit: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!omit.has(k)) out[k] = v;
  }
  return out;
}

function stringifyRest(rest: Record<string, unknown>): string {
  const keys = Object.keys(rest);
  if (keys.length === 0) return "";
  try {
    return JSON.stringify(rest, null, 2);
  } catch {
    return String(rest);
  }
}
