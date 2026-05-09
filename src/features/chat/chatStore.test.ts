import { postConversation } from "@/shared/api";
import type { Conversation } from "@/shared/api/types";
import { MAIN_THREAD_ID } from "./chatMessagesRepo";
import { useChatStore } from "./chatStore";

jest.mock("@/shared/api", () => ({
  postConversation: jest.fn(),
}));

const postConversationMock = postConversation as jest.MockedFunction<typeof postConversation>;

describe("useChatStore startConversation", () => {
  beforeEach(() => {
    postConversationMock.mockReset();
    useChatStore.setState({
      conversationId: MAIN_THREAD_ID,
      isCreatingConversation: false,
      conversationError: null,
    });
  });

  it("clears isCreatingConversation when the request finishes after AbortSignal abort (late resolve)", async () => {
    let resolvePost!: (v: Conversation) => void;
    const postPromise = new Promise<Conversation>((r) => {
      resolvePost = r;
    });
    postConversationMock.mockReturnValue(postPromise as ReturnType<typeof postConversation>);

    const ac = new AbortController();
    const p = useChatStore.getState().startConversation("farmer-1", "online", ac.signal);

    expect(useChatStore.getState().isCreatingConversation).toBe(true);

    ac.abort();
    await Promise.resolve();
    expect(useChatStore.getState().isCreatingConversation).toBe(true);

    resolvePost({
      conversation_id: "late-uuid",
      farmer_id: "farmer-1",
      title: "Chat session",
      created_at: "",
      updated_at: "",
    });
    await p;

    expect(useChatStore.getState().isCreatingConversation).toBe(false);
    expect(useChatStore.getState().conversationId).toBe(MAIN_THREAD_ID);
  });

  it("sets conversation id when request succeeds and signal is not aborted", async () => {
    postConversationMock.mockResolvedValue({
      conversation_id: "new-uuid",
      farmer_id: "farmer-1",
      title: "Chat session",
      created_at: "",
      updated_at: "",
    });

    const ac = new AbortController();
    await useChatStore.getState().startConversation("farmer-1", "online", ac.signal);

    expect(useChatStore.getState().conversationId).toBe("new-uuid");
    expect(useChatStore.getState().isCreatingConversation).toBe(false);
    expect(useChatStore.getState().conversationError).toBeNull();
  });
});
