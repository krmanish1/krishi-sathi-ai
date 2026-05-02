import { randomUUID } from "@/shared/utils/uuid";

/** Mutable state for one HTTP streaming response. */
export type LegacyUiStreamNormalizeState = {
  textPartId: string | null;
  textStarted: boolean;
};

export function createLegacyUiStreamNormalizeState(): LegacyUiStreamNormalizeState {
  return { textPartId: null, textStarted: false };
}

/**
 * AI SDK 6 UI message stream requires `text-start` (with id) before `text-delta` / `text-end`,
 * and every `text-delta` must include `id`. Some backends only emit `{ type: "text-delta", delta }`.
 * This expands those into a compliant sequence.
 */
export function normalizeLegacyUiStreamChunk(
  raw: unknown,
  state: LegacyUiStreamNormalizeState,
): unknown[] {
  if (raw == null || typeof raw !== "object") {
    return [raw];
  }

  const o = raw as Record<string, unknown>;
  const t = o.type;

  if (t === "start") {
    state.textPartId = null;
    state.textStarted = false;
    return [o];
  }

  if (t === "text-start" && typeof o.id === "string") {
    state.textPartId = o.id;
    state.textStarted = true;
    return [o];
  }

  if (t === "text-delta") {
    const delta = typeof o.delta === "string" ? o.delta : "";
    let id = typeof o.id === "string" ? o.id : state.textPartId;
    if (id == null) {
      id = randomUUID();
    }
    state.textPartId = id;

    const out: unknown[] = [];
    if (!state.textStarted) {
      out.push({ type: "text-start", id });
      state.textStarted = true;
    }
    out.push({
      type: "text-delta",
      id,
      delta,
      ...(o.providerMetadata !== undefined ? { providerMetadata: o.providerMetadata } : {}),
    });
    return out;
  }

  if (t === "text-end") {
    let id = typeof o.id === "string" ? o.id : state.textPartId;
    if (id == null) {
      id = randomUUID();
    }
    const ended: Record<string, unknown> = {
      type: "text-end",
      id,
      ...(o.providerMetadata !== undefined ? { providerMetadata: o.providerMetadata } : {}),
    };
    state.textPartId = null;
    state.textStarted = false;
    return [ended];
  }

  return [o];
}
