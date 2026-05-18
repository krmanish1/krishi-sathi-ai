import { parseVoiceTranscriptionSegments } from "@/features/voice/parseVoiceTranscription";

describe("parseVoiceTranscriptionSegments", () => {
  it("maps local participant segments to user with segment ids", () => {
    expect(
      parseVoiceTranscriptionSegments(
        [
          { id: "seg-1", text: "hello ", final: false },
          { id: "seg-1", text: "hello there", final: true },
        ],
        true,
      ),
    ).toEqual([
      { segmentId: "seg-1", role: "user", text: "hello", final: false },
      { segmentId: "seg-1", role: "user", text: "hello there", final: true },
    ]);
  });

  it("maps remote participant segments to agent", () => {
    expect(
      parseVoiceTranscriptionSegments(
        [{ id: "seg-2", text: "namaste", final: true }],
        false,
      ),
    ).toEqual([
      { segmentId: "seg-2", role: "agent", text: "namaste", final: true },
    ]);
  });
});
