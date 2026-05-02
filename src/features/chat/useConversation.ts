import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import type { Connectivity } from "@/shared/api/types";
import { useChatStore } from "./chatStore";
import { consumeUnloadSnapshot, persistUnloadSnapshot } from "./chatResumeSnap";
import { hydrateLocalThreadFromServerHistory } from "./hydrateConversationHistory";
import { FARMER_CONVERSATIONS_QUERY_KEY } from "./useFarmerConversations";
import { CHAT_THREAD_QUERY_KEY } from "./useChatThread";
import { MAIN_THREAD_ID } from "./chatMessagesRepo";

/** "reachable" = online or degraded — both can hit the backend; only `offline` skips create. */
function connectivityLane(c: Connectivity): "offline" | "reachable" {
  return c === "offline" ? "offline" : "reachable";
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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const ctrl = new AbortController();

      const run = async () => {
        if (!farmerId) {
          resetConversation();
          return;
        }

        if (lane === "offline") {
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
    }, [farmerId, lane, startConversation, resumeConversation, resetConversation, qc]),
  );
}
