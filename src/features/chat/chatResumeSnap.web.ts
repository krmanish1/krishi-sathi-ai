import { MAIN_THREAD_ID } from "./chatMessagesRepo";

const KEY = "krishi_chat_unload_snap_v1";

type Snap = { farmerId: string; conversationId: string };

/**
 * Memo per `farmerId` for this JS document so React 18 Strict Mode / double
 * `useFocusEffect` does not drop the snap after the first read.
 */
let consumeMemo: { farmerId: string; conversationId: string | null } | undefined;

/** Drop sessionStorage snapshot + in-memory memo (e.g. after cache purge). */
export function clearChatResumeStorage(): void {
  consumeMemo = undefined;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Call from `pagehide` / `beforeunload` so a full tab reload can recover the
 * active backend `conversation_id` (sessionStorage survives F5 in the same tab).
 */
export function persistUnloadSnapshot(farmerId: string | null, conversationId: string): void {
  if (typeof sessionStorage === "undefined") return;
  if (!farmerId || !conversationId || conversationId === MAIN_THREAD_ID) return;
  try {
    const payload: Snap = { farmerId, conversationId };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Called when the chat screen focuses after a reload. Consumes the storage key
 * on first read; returns the same result for the same `farmerId` afterwards.
 */
export function consumeUnloadSnapshot(farmerId: string | null): string | null {
  if (!farmerId) return null;
  if (consumeMemo?.farmerId === farmerId) {
    return consumeMemo.conversationId;
  }

  if (typeof sessionStorage === "undefined") {
    consumeMemo = { farmerId, conversationId: null };
    return null;
  }

  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      consumeMemo = { farmerId, conversationId: null };
      return null;
    }
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Snap;
    if (parsed.farmerId !== farmerId) {
      consumeMemo = { farmerId, conversationId: null };
      return null;
    }
    if (!parsed.conversationId || parsed.conversationId === MAIN_THREAD_ID) {
      consumeMemo = { farmerId, conversationId: null };
      return null;
    }
    consumeMemo = { farmerId, conversationId: parsed.conversationId };
    return parsed.conversationId;
  } catch {
    consumeMemo = { farmerId, conversationId: null };
    return null;
  }
}
