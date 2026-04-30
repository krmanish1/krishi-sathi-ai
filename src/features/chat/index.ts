/**
 * Public API for the chat feature.
 * Import from `@/features/chat`, not from internal file paths, unless you have a real reason.
 */
export { guessDeviceIntent } from "./guessDeviceIntent";
export { MAIN_THREAD_ID, appendMessage, clearThread, listThreadMessages } from "./chatMessagesRepo";
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
export { StreamingStatusBox } from "./components/StreamingStatusBox";
export type { StreamingStatusBoxProps } from "./components/StreamingStatusBox";
export { guessImagePurpose } from "./guessImagePurpose";
export type { ImagePurpose } from "./guessImagePurpose";
export { useImageAttachment } from "./useImageAttachment";
export type { ImageAttachment } from "./useImageAttachment";
