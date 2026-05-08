export type ChatSessionModel = {
  conversationId: string;
  farmerId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageModel = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  imageRef?: string | null;
};

export type ChatStateModel = {
  conversationId: string | null;
  isCreatingConversation: boolean;
  conversationError: string | null;
};
