import { parseVoiceTranscription } from "@/features/voice/parseVoiceTranscription";

describe("parseVoiceTranscription", () => {
  it("maps local segments to user transcript", () => {
    expect(
      parseVoiceTranscription([{ text: "hello ", final: true }, { text: "there" }], true),
    ).toEqual({ patch: { user: "hello there" } });
  });

  it("maps remote segments to agent transcript", () => {
    expect(parseVoiceTranscription([{ text: "namaste", final: false }], false)).toEqual({
      patch: { agent: "namaste" },
    });
  });
});
