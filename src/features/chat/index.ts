/**
 * Public API for the chat feature.
 * Import from `@/features/chat`, not from internal file paths, unless you have a real reason.
 */
export { guessDeviceIntent } from "./guessDeviceIntent";
export {
  MAIN_THREAD_ID,
  appendMessage,
  clearThread,
  clearAllChatThreads,
  listThreadMessages,
} from "./chatMessagesRepo";
export { runChatLocalCacheMigrationIfNeeded } from "./chatLocalCacheMigration";
export type { ChatMessageRow } from "./chatMessagesRepo";
export { CHAT_THREAD_QUERY_KEY, useChatThread } from "./useChatThread";
export { CONFIDENCE_THRESHOLD_LOW, useSendChatMessage } from "./useSendQuery";
export type { SendQueryInput } from "./useSendQuery";
export {
  useStreamChatMessage,
  type BackendStage,
  type StreamPhase,
  type UseStreamChatMessageOpts,
} from "./useStreamChatMessage";
export type { StageEvent } from "./thinkingStages";
export { StreamingStatusBox } from "./components/StreamingStatusBox";
export type { StreamingStatusBoxProps } from "./components/StreamingStatusBox";
export { guessImagePurpose } from "./guessImagePurpose";
export type { ImagePurpose } from "./guessImagePurpose";
export { useImageAttachment } from "./useImageAttachment";
export type { ImageAttachment } from "./useImageAttachment";
export { useConversation } from "./useConversation";
export { FARMER_CONVERSATIONS_QUERY_KEY, useFarmerConversations } from "./useFarmerConversations";
export { useChatSessionActions } from "./useChatSessionActions";
export {
  applyConversationHistoryPayloadToLocalThread,
  hydrateLocalThreadFromServerHistory,
} from "./hydrateConversationHistory";
export { useChatStore } from "./chatStore";
export type { ChatStore } from "./chatStore";
export { CONVERSATION_HISTORY_QUERY_KEY, useConversationHistory } from "./useConversationHistory";
