import { useEffect, useLayoutEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Connectivity } from "@/shared/api/types";
import { useChatStore } from "./chatStore";
import { consumeUnloadSnapshot, persistUnloadSnapshot } from "./chatResumeSnap";
import { hydrateLocalThreadFromServerHistory } from "./hydrateConversationHistory";
import { FARMER_CONVERSATIONS_QUERY_KEY } from "./useFarmerConversations";
import { CHAT_THREAD_QUERY_KEY } from "./useChatThread";
import { MAIN_THREAD_ID } from "./chatMessagesRepo";
import { getLocalConversation } from "./localConversationsRepo";

/** "reachable" = confirmed online only — degraded (WiFi up, no internet) behaves like offline. */
function connectivityLane(c: Connectivity): "offline" | "reachable" {
  return c === "online" ? "reachable" : "offline";
}

/**
 * Conversation bootstrap for the hidden chat screen (no reset on blur).
 *
 * - **Web reload**: recover `conversation_id` from `pagehide` snapshot + hydrate history.
 * - **Reachable + no session yet** (`main`): POST a new conversation once.
 * - **Already have a real id**: do nothing on focus (avoid duplicate sessions).
 * - **Pull-to-refresh** on the chat screen re-fetches history separately.
 */
export function useConversation(opts: {
  farmerId: string | null | undefined;
  connectivity: Connectivity;
}): void {
  const { farmerId, connectivity } = opts;
  const lane = connectivityLane(connectivity);

  const connectivityRef = useRef(connectivity);
  useLayoutEffect(() => {
    connectivityRef.current = connectivity;
  }, [connectivity]);

  const qc = useQueryClient();
  const startConversation = useChatStore((s) => s.startConversation);
  const ensureLocalConversation = useChatStore((s) => s.ensureLocalConversation);
  const syncLocalConversation = useChatStore((s) => s.syncLocalConversation);
  const resumeConversation = useChatStore((s) => s.resumeConversation);
  const resetConversation = useChatStore((s) => s.resetConversation);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const { addEventListener, removeEventListener } = window;
    if (typeof addEventListener !== "function" || typeof removeEventListener !== "function") {
      return undefined;
    }
    const onHide = () => {
      if (!farmerId) return;
      const cid = useChatStore.getState().conversationId;
      persistUnloadSnapshot(farmerId, cid);
    };
    addEventListener.call(window, "pagehide", onHide);
    return () => removeEventListener.call(window, "pagehide", onHide);
  }, [farmerId]);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    const run = async () => {
      if (!farmerId) {
        resetConversation();
        return;
      }

      if (lane === "offline") {
        // Wait briefly: startup fires "offline" before NetInfo resolves (~100ms).
        // If connectivity updates within 300ms the effect re-runs and this run is cancelled.
        await new Promise<void>((r) => setTimeout(r, 300));
        if (cancelled) return;
        // Re-check via the same lane function so "degraded" (WiFi up, no internet)
        // is still treated as offline — not the raw connectivity string.
        if (connectivityLane(connectivityRef.current) !== "offline") return;
        await ensureLocalConversation(farmerId);
        return;
      }

      const resumedId = consumeUnloadSnapshot(farmerId);
      if (resumedId) {
        resumeConversation(resumedId);
        await hydrateLocalThreadFromServerHistory(
          farmerId,
          resumedId,
          connectivityRef.current,
          ctrl.signal,
        );
        if (!cancelled) {
          await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(resumedId) });
        }
        return;
      }

      const currentId = useChatStore.getState().conversationId;
      if (currentId !== MAIN_THREAD_ID) {
        // If this is a pending local conversation, sync it to the backend now that we're online
        const pending = await getLocalConversation(currentId).catch(() => null);
        if (pending && !pending.synced) {
          const localMessages = qc.getQueryData(CHAT_THREAD_QUERY_KEY(currentId));
          await syncLocalConversation(farmerId, currentId, connectivityRef.current, ctrl.signal);
          if (!cancelled && !ctrl.signal.aborted) {
            const newId = useChatStore.getState().conversationId;
            if (newId !== currentId && localMessages) {
              qc.setQueryData(CHAT_THREAD_QUERY_KEY(newId), localMessages);
            }
            await qc.invalidateQueries({
              queryKey: FARMER_CONVERSATIONS_QUERY_KEY(farmerId, connectivityRef.current),
            });
          }
        }
        return;
      }

      await startConversation(farmerId, connectivityRef.current, ctrl.signal);
      if (!cancelled && !ctrl.signal.aborted) {
        await qc.invalidateQueries({
          queryKey: FARMER_CONVERSATIONS_QUERY_KEY(farmerId, connectivityRef.current),
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [farmerId, lane, startConversation, ensureLocalConversation, syncLocalConversation, resumeConversation, resetConversation, qc]);
}
