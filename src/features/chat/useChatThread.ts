import { useQuery } from "@tanstack/react-query";
import { listThreadMessages, MAIN_THREAD_ID, type ChatMessageRow } from "./chatMessagesRepo";

export const CHAT_THREAD_QUERY_KEY = (threadId: string) => ["chat", "messages", threadId] as const;

export function useChatThread(threadId: string = MAIN_THREAD_ID) {
  return useQuery({
    queryKey: CHAT_THREAD_QUERY_KEY(threadId),
    queryFn: (): Promise<ChatMessageRow[]> => listThreadMessages(threadId),
  });
}
