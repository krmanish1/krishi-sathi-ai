import type { ConversationHistoryResponse } from "@/shared/api/types";

function normalizeRole(r: unknown): "user" | "assistant" | null {
  if (r === "user" || r === "human") return "user";
  if (r === "assistant" || r === "model" || r === "ai" || r === "bot") return "assistant";
  if (typeof r === "string") {
    const lower = r.toLowerCase();
    if (lower === "user") return "user";
    if (lower === "assistant" || lower === "assistant_message") return "assistant";
  }
  return null;
}

function extractText(m: Record<string, unknown>): string | null {
  if (typeof m.text === "string") return m.text;
  if (typeof m.content === "string") return m.content;
  if (m.message && typeof m.message === "string") return m.message;
  const q = m.query;
  if (q && typeof q === "object" && !Array.isArray(q)) {
    const qt = (q as Record<string, unknown>).text;
    if (typeof qt === "string") return qt;
  }
  return null;
}

/**
 * Backend history items often use `query_text` + `response` (one row per turn)
 * instead of `role` + `text`.
 */
function expandQueryResponseTurn(o: Record<string, unknown>): {
  role: "user" | "assistant";
  text: string;
}[] | null {
  const qtRaw = o.query_text;
  const respRaw = o.response;
  const qt = typeof qtRaw === "string" ? qtRaw.trim() : "";
  const resp = typeof respRaw === "string" ? respRaw.trim() : "";
  if (!qt && !resp) return null;
  const out: { role: "user" | "assistant"; text: string }[] = [];
  if (qt) out.push({ role: "user", text: qt });
  if (resp) out.push({ role: "assistant", text: resp });
  return out;
}

/**
 * Best-effort parse for OpenAPI "open object" history payloads.
 */
export function parseConversationHistoryMessages(raw: unknown): {
  role: "user" | "assistant";
  text: string;
}[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as ConversationHistoryResponse;
    if (Array.isArray(o.messages)) {
      arr = o.messages as unknown[];
    } else if (Array.isArray(o.turns)) {
      arr = o.turns as unknown[];
    } else if (Array.isArray(o.history)) {
      arr = o.history as unknown[];
    }
  }

  const out: { role: "user" | "assistant"; text: string }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const fromTurn = expandQueryResponseTurn(o);
    if (fromTurn) {
      out.push(...fromTurn);
      continue;
    }
    const role = normalizeRole(o.role);
    const text = extractText(o)?.trim();
    if (role && text) {
      out.push({ role, text });
    }
  }
  return out;
}
