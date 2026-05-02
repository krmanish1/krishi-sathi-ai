import { getConversationHistory } from "@/shared/api/endpoints";
import type { Connectivity } from "@/shared/api/types";
import { appendMessage, clearThread, listThreadMessages, MAIN_THREAD_ID } from "./chatMessagesRepo";
import { parseConversationHistoryMessages } from "./parseConversationHistory";

export type HydrateThreadOptions = {
  /**
   * When true (e.g. pull-to-refresh), replace local rows with server history.
   * Fetches **before** clearing so a failed request never wipes the thread.
   */
  replaceLocal?: boolean;
};

/**
 * Writes a history API JSON body into SQLite for `conversationId`.
 * Used after a fresh GET `/history` (pull-to-refresh or bootstrap).
 */
export async function applyConversationHistoryPayloadToLocalThread(
  conversationId: string,
  raw: Record<string, unknown>,
  opts?: HydrateThreadOptions,
  signal?: AbortSignal,
): Promise<void> {
  if (conversationId === MAIN_THREAD_ID) return;
  if (signal?.aborted) return;

  if (!opts?.replaceLocal) {
    const existing = await listThreadMessages(conversationId);
    if (existing.length > 0) return;
  }

  const turns = parseConversationHistoryMessages(raw);

  if (opts?.replaceLocal) {
    await clearThread(conversationId);
    if (turns.length === 0) return;
  } else if (turns.length === 0) {
    return;
  }

  const base = Date.now() - turns.length * 1000;
  for (let i = 0; i < turns.length; i++) {
    if (signal?.aborted) return;
    const t = turns[i];
    if (!t) continue;
    await appendMessage({
      role: t.role,
      text: t.text,
      source: "backend",
      confidence: null,
      threadId: conversationId,
      createdAt: base + i * 1000,
    });
  }
}

/**
 * Pull turns from GET .../history into SQLite when the thread is empty, or
 * replace local rows after a successful history fetch (`replaceLocal`).
 */
export async function hydrateLocalThreadFromServerHistory(
  farmerId: string,
  conversationId: string,
  connectivity: Connectivity,
  signal?: AbortSignal,
  opts?: HydrateThreadOptions,
): Promise<void> {
  if (conversationId === MAIN_THREAD_ID) return;
  if (signal?.aborted) return;

  let raw: Record<string, unknown>;
  try {
    raw = await getConversationHistory(farmerId, conversationId, connectivity, signal);
  } catch {
    return;
  }
  await applyConversationHistoryPayloadToLocalThread(conversationId, raw, opts, signal);
}
