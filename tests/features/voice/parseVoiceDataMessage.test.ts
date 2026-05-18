import { parseVoiceDataMessage } from "@/features/voice/parseVoiceDataMessage";

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj));
}

describe("parseVoiceDataMessage", () => {
  it("parses final transcript with user and agent", () => {
    expect(
      parseVoiceDataMessage(
        encode({ type: "transcript", user: "weather?", agent: "Rain likely tomorrow." }),
      ),
    ).toEqual({
      patch: { user: "weather?", agent: "Rain likely tomorrow." },
    });
  });

  it("parses user-only transcript updates", () => {
    expect(parseVoiceDataMessage(encode({ type: "transcript", user: "hello" }))).toEqual({
      patch: { user: "hello" },
    });
  });

  it("parses typed user and agent messages", () => {
    expect(parseVoiceDataMessage(encode({ type: "user_transcript", text: "hi" }))).toEqual({
      patch: { user: "hi" },
    });
    expect(parseVoiceDataMessage(encode({ type: "agent_transcript", text: "namaste" }))).toEqual({
      patch: { agent: "namaste" },
    });
  });

  it("rejects partial deltas (append-only messages)", () => {
    expect(
      parseVoiceDataMessage(encode({ type: "transcript_delta", role: "user", text: "what" })),
    ).toBeNull();
    expect(
      parseVoiceDataMessage(encode({ type: "partial", role: "assistant", text: "Sure" })),
    ).toBeNull();
  });

  it("returns null for malformed payloads", () => {
    expect(parseVoiceDataMessage(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
