import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { deleteFarmerConversation } from "@/shared/api";
import type { Connectivity } from "@/shared/api/types";
import { clearThread } from "./chatMessagesRepo";
import { useChatStore } from "./chatStore";
import { hydrateLocalThreadFromServerHistory } from "./hydrateConversationHistory";
import { FARMER_CONVERSATIONS_QUERY_KEY } from "./useFarmerConversations";
import { CHAT_THREAD_QUERY_KEY } from "./useChatThread";

/**
 * Imperative chat session flows: open, start new, or delete (server + local cache).
 */
export function useChatSessionActions(opts: {
  farmerId: string | null | undefined;
  connectivity: Connectivity;
}) {
  const { farmerId, connectivity } = opts;
  const qc = useQueryClient();
  const startConversation = useChatStore((s) => s.startConversation);
  const resumeConversation = useChatStore((s) => s.resumeConversation);
  const resetConversation = useChatStore((s) => s.resetConversation);

  const openSession = useCallback(
    async (conversationId: string) => {
      if (!farmerId || connectivity === "offline") return;
      resumeConversation(conversationId);
      await hydrateLocalThreadFromServerHistory(farmerId, conversationId, connectivity, undefined, {
        replaceLocal: true,
      });
      await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(conversationId) });
    },
    [farmerId, connectivity, resumeConversation, qc],
  );

  const startNewSession = useCallback(async () => {
    if (!farmerId || connectivity === "offline") return;
    const ctrl = new AbortController();
    await startConversation(farmerId, connectivity, ctrl.signal);
    await qc.invalidateQueries({
      queryKey: FARMER_CONVERSATIONS_QUERY_KEY(farmerId, connectivity),
    });
  }, [farmerId, connectivity, startConversation, qc]);

  /**
   * DELETE on server, clear local thread, refresh list.
   * If the deleted session is active, starts a fresh backend session.
   */
  const deleteSession = useCallback(
    async (conversationIdToDelete: string) => {
      if (!farmerId || connectivity === "offline") return;
      await deleteFarmerConversation(farmerId, conversationIdToDelete, connectivity);
      await clearThread(conversationIdToDelete);
      qc.removeQueries({ queryKey: CHAT_THREAD_QUERY_KEY(conversationIdToDelete) });
      await qc.invalidateQueries({
        queryKey: FARMER_CONVERSATIONS_QUERY_KEY(farmerId, connectivity),
      });

      const current = useChatStore.getState().conversationId;
      if (current === conversationIdToDelete) {
        resetConversation();
        const ctrl = new AbortController();
        await startConversation(farmerId, connectivity, ctrl.signal);
        await qc.invalidateQueries({
          queryKey: FARMER_CONVERSATIONS_QUERY_KEY(farmerId, connectivity),
        });
      }
    },
    [farmerId, connectivity, qc, startConversation, resetConversation],
  );

  return { openSession, startNewSession, deleteSession };
}
