import { parseConversationHistoryMessages } from "./parseConversationHistory";

describe("parseConversationHistoryMessages", () => {
  it("reads messages array with role + text", () => {
    const r = parseConversationHistoryMessages({
      messages: [
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ],
    });
    expect(r).toEqual([
      { role: "user", text: "Hi" },
      { role: "assistant", text: "Hello" },
    ]);
  });

  it("reads turns and content field", () => {
    const r = parseConversationHistoryMessages({
      turns: [{ role: "user", content: "A" }, { role: "model", content: "B" }],
    });
    expect(r).toEqual([
      { role: "user", text: "A" },
      { role: "assistant", text: "B" },
    ]);
  });

  it("reads nested query.text", () => {
    const r = parseConversationHistoryMessages({
      messages: [{ role: "user", query: { text: "Water?" } }],
    });
    expect(r).toEqual([{ role: "user", text: "Water?" }]);
  });

  it("accepts top-level array", () => {
    const r = parseConversationHistoryMessages([{ role: "assistant", text: "OK" }]);
    expect(r).toEqual([{ role: "assistant", text: "OK" }]);
  });

  it("reads API turns with query_text + response (Krishi history shape)", () => {
    const r = parseConversationHistoryMessages({
      conversation_id: "ad8602a8-030b-40f3-8e44-142b197aed83",
      messages: [
        {
          query_text: "how to grw bhindi",
          intent: "general",
          response: "Growing Bhindi (Okra) is a great choice…",
          data_source: "live",
          id: "af807344-f041-44be-a1c9-07c880194bda",
        },
      ],
    });
    expect(r).toEqual([
      { role: "user", text: "how to grw bhindi" },
      { role: "assistant", text: "Growing Bhindi (Okra) is a great choice…" },
    ]);
  });
});
