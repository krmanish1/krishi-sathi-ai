import {
  consumeLiveKitTranscriptionStream,
  parseTranscriptionStreamMeta,
  roleFromParticipantIdentity,
} from "@/features/voice/liveKitTranscriptionStream";

describe("parseTranscriptionStreamMeta", () => {
  it("reads segment id and final flag from stream attributes", () => {
    expect(
      parseTranscriptionStreamMeta("stream-1", {
        "lk.segment_id": "seg-a",
        "lk.transcription_final": "true",
      }),
    ).toEqual({ segmentId: "seg-a", final: true });
  });

  it("falls back to stream id when segment id is missing", () => {
    expect(parseTranscriptionStreamMeta("stream-1", {})).toEqual({
      segmentId: "stream-1",
      final: false,
    });
  });
});

describe("roleFromParticipantIdentity", () => {
  it("maps local identity to user and remote to agent", () => {
    expect(roleFromParticipantIdentity("farmer1", "farmer1")).toBe("user");
    expect(roleFromParticipantIdentity("agent", "farmer1")).toBe("agent");
  });
});

describe("consumeLiveKitTranscriptionStream", () => {
  it("emits each interim chunk as it arrives for real-time streaming", async () => {
    const updates: { text: string }[] = [];
    const reader = {
      info: { id: "s1", attributes: { "lk.segment_id": "seg-1" } },
      async * [Symbol.asyncIterator]() {
        yield "hello ";
        yield "world";
      },
      readAll: async () => "",
    };

    await consumeLiveKitTranscriptionStream(reader, "agent", "farmer1", (u) => {
      updates.push({ text: u.text });
    });

    // Each chunk emitted immediately — text grows as chunks arrive
    expect(updates).toEqual([
      { text: "hello" },
      { text: "hello world" },
    ]);
  });

  it("emits a single final segment from readAll", async () => {
    const updates: string[] = [];
    const reader = {
      info: {
        id: "s2",
        attributes: {
          "lk.segment_id": "seg-2",
          "lk.transcription_final": "true",
        },
      },
      async *[Symbol.asyncIterator]() {
        // unused for final streams
      },
      readAll: async () => "  namaste  ",
    };

    await consumeLiveKitTranscriptionStream(reader, "farmer1", "farmer1", (u) => {
      updates.push(`${u.role}:${u.text}`);
    });

    expect(updates).toEqual(["user:namaste"]);
  });
});
