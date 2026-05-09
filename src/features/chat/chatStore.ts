import { create } from "zustand";
import { postConversation } from "@/shared/api";
import type { Connectivity } from "@/shared/api/types";
import { MAIN_THREAD_ID } from "./chatMessagesRepo";

/** Tracks overlapping POST /conversation calls so `finally` only clears the spinner when the last one ends. */
let pendingConversationCreates = 0;

type ChatState = {
  /** Backend conversation UUID, or MAIN_THREAD_ID when offline / creation failed. */
  conversationId: string;
  /** True while POST /api/v1/conversation is in-flight. */
  isCreatingConversation: boolean;
  /**
   * Non-null when the last `startConversation` call failed (e.g. network error, 4xx/5xx).
   * Surfaces to the UI so the user knows why `conversation_id` is "main".
   */
  conversationError: string | null;
};

type ChatActions = {
  /**
   * POST /api/v1/conversation and store the UUID.
   * Pass an AbortSignal so the caller (useFocusEffect cleanup) can cancel the
   * in-flight request when the tab blurs before the response arrives.
   */
  startConversation: (
    farmerId: string,
    connectivity: Connectivity,
    signal: AbortSignal,
  ) => Promise<void>;
  /**
   * Restore an existing backend session (e.g. after a full web reload) without POST.
   */
  resumeConversation: (conversationId: string) => void;
  /** Reset to MAIN_THREAD_ID — called on tab blur or when going offline. */
  resetConversation: () => void;
};

export type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>((set) => ({
  conversationId: MAIN_THREAD_ID,
  isCreatingConversation: false,
  conversationError: null,

  startConversation: async (farmerId, connectivity, signal) => {
    pendingConversationCreates += 1;
    set({ isCreatingConversation: true, conversationError: null });
    try {
      const conv = await postConversation(
        { farmerId, title: "Chat session" },
        connectivity,
        signal,
      );
      if (!signal.aborted) {
        set({
          conversationId: conv.conversation_id,
          conversationError: null,
        });
      }
    } catch (e) {
      if (signal.aborted) return;
      const msg = e instanceof Error ? e.message : "Failed to start chat session";
      set({
        conversationId: MAIN_THREAD_ID,
        conversationError: msg,
      });
    } finally {
      pendingConversationCreates -= 1;
      if (pendingConversationCreates <= 0) {
        pendingConversationCreates = 0;
        set({ isCreatingConversation: false });
      }
    }
  },

  resumeConversation: (conversationId) => {
    if (!conversationId || conversationId === MAIN_THREAD_ID) return;
    set({
      conversationId,
      isCreatingConversation: false,
      conversationError: null,
    });
  },

  resetConversation: () => {
    set({
      conversationId: MAIN_THREAD_ID,
      isCreatingConversation: false,
      conversationError: null,
    });
  },
}));
