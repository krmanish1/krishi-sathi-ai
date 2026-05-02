import { hydrateLocalThreadFromServerHistory } from "./hydrateConversationHistory";
import * as endpoints from "@/shared/api/endpoints";
import * as repo from "./chatMessagesRepo";

jest.mock("@/shared/api/endpoints", () => ({
  getConversationHistory: jest.fn(),
}));

jest.mock("./chatMessagesRepo", () => ({
  MAIN_THREAD_ID: "main",
  appendMessage: jest.fn().mockResolvedValue(undefined),
  clearThread: jest.fn().mockResolvedValue(undefined),
  listThreadMessages: jest.fn().mockResolvedValue([]),
}));

const getConversationHistory = endpoints.getConversationHistory as jest.Mock;
const clearThread = repo.clearThread as jest.Mock;
const appendMessage = repo.appendMessage as jest.Mock;
const listThreadMessages = repo.listThreadMessages as jest.Mock;

describe("hydrateLocalThreadFromServerHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("replaceLocal: does not clear SQLite when history fetch fails (keeps prior messages)", async () => {
    getConversationHistory.mockRejectedValue(new Error("network"));

    await hydrateLocalThreadFromServerHistory("farmer-1", "conv-1", "online", undefined, {
      replaceLocal: true,
    });

    expect(clearThread).not.toHaveBeenCalled();
    expect(appendMessage).not.toHaveBeenCalled();
  });

  it("replaceLocal: clears and appends only after a successful fetch", async () => {
    getConversationHistory.mockResolvedValue({
      messages: [{ role: "user", text: "Hello" }],
    });

    await hydrateLocalThreadFromServerHistory("farmer-1", "conv-1", "online", undefined, {
      replaceLocal: true,
    });

    expect(getConversationHistory).toHaveBeenCalledWith("farmer-1", "conv-1", "online", undefined);
    expect(clearThread).toHaveBeenCalledWith("conv-1");
    expect(appendMessage).toHaveBeenCalledTimes(1);
    expect(appendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "user",
        text: "Hello",
        threadId: "conv-1",
        source: "backend",
      }),
    );
  });

  it("skips main placeholder thread", async () => {
    await hydrateLocalThreadFromServerHistory("farmer-1", "main", "online", undefined, {
      replaceLocal: true,
    });
    expect(getConversationHistory).not.toHaveBeenCalled();
  });

  it("non-replace: fills empty thread from server", async () => {
    listThreadMessages.mockResolvedValueOnce([]);
    getConversationHistory.mockResolvedValue({
      messages: [{ role: "assistant", text: "Hi" }],
    });

    await hydrateLocalThreadFromServerHistory("farmer-1", "conv-2", "online");

    expect(clearThread).not.toHaveBeenCalled();
    expect(appendMessage).toHaveBeenCalledTimes(1);
  });
});
