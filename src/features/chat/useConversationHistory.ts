import { useQuery } from "@tanstack/react-query";
import { getConversationHistory } from "@/shared/api";
import type { Connectivity } from "@/shared/api/types";
import { MAIN_THREAD_ID } from "./chatMessagesRepo";

export const CONVERSATION_HISTORY_QUERY_KEY = (
  farmerId: string,
  conversationId: string,
  connectivity: Connectivity,
) => ["chat", "conversationHistory", farmerId, conversationId, connectivity] as const;

/**
 * Fetches server-side conversation history for a real backend `conversation_id`.
 * Skips when offline, when `conversationId` is the local fallback (`main`), or when ids are missing.
 */
export function useConversationHistory(opts: {
  farmerId: string | null | undefined;
  conversationId: string | null | undefined;
  connectivity: Connectivity;
}) {
  const { farmerId, conversationId, connectivity } = opts;
  const enabled =
    !!farmerId &&
    !!conversationId &&
    conversationId !== MAIN_THREAD_ID &&
    connectivity !== "offline";

  return useQuery({
    queryKey:
      farmerId && conversationId
        ? CONVERSATION_HISTORY_QUERY_KEY(farmerId, conversationId, connectivity)
        : (["chat", "conversationHistory", "disabled"] as const),
    queryFn: () => getConversationHistory(farmerId!, conversationId!, connectivity),
    enabled,
  });
}
