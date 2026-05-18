import {
  consumeLiveKitTranscriptionStream,
  parseTranscriptionStreamMeta,
  resolveTranscriptionRole,
  LIVEKIT_TRANSCRIPTION_ATTR,
} from "@/features/voice/liveKitTranscriptionStream";

describe("parseTranscriptionStreamMeta", () => {
  it("reads LiveKit TranscriptionAttributes from stream info", () => {
    expect(
      parseTranscriptionStreamMeta("stream-1", {
        [LIVEKIT_TRANSCRIPTION_ATTR.SEGMENT_ID]: "seg-a",
        [LIVEKIT_TRANSCRIPTION_ATTR.TRANSCRIPTION_FINAL]: "true",
        [LIVEKIT_TRANSCRIPTION_ATTR.TRANSCRIBED_TRACK_ID]: "TR_abc",
      }),
    ).toEqual({
      segmentId: "seg-a",
      final: true,
      transcribedTrackId: "TR_abc",
    });
  });

  it("falls back to stream id when segment id is missing", () => {
    expect(parseTranscriptionStreamMeta("stream-1", {})).toEqual({
      segmentId: "stream-1",
      final: false,
    });
  });
});

describe("resolveTranscriptionRole", () => {
  const base = {
    localIdentity: "farmer1",
    localAudioTrackIds: ["TR_local_mic"],
    participantIdentity: "",
  };

  it("maps local participant identity to user", () => {
    expect(
      resolveTranscriptionRole({ ...base, participantIdentity: "farmer1" }),
    ).toBe("user");
  });

  it("maps local transcribed track id to user", () => {
    expect(
      resolveTranscriptionRole(
        { ...base, participantIdentity: "" },
        "TR_local_mic",
      ),
    ).toBe("user");
  });

  it("maps remote transcribed track id to agent", () => {
    expect(
      resolveTranscriptionRole(
        { ...base, participantIdentity: "agent" },
        "TR_agent_audio",
      ),
    ).toBe("agent");
  });
});

describe("consumeLiveKitTranscriptionStream", () => {
  const roleCtx = {
    localIdentity: "farmer1",
    localAudioTrackIds: [],
    participantIdentity: "agent",
  };

  it("emits interim chunks with final false then final true at end", async () => {
    const updates: { text: string; final: boolean }[] = [];
    const reader = {
      info: { id: "s1", attributes: { [LIVEKIT_TRANSCRIPTION_ATTR.SEGMENT_ID]: "seg-1" } },
      async * [Symbol.asyncIterator]() {
        yield "hello ";
        yield "world";
      },
      readAll: async () => "",
    };

    await consumeLiveKitTranscriptionStream(reader, roleCtx, (u) => {
      updates.push({ text: u.text, final: u.final });
    });

    expect(updates).toEqual([
      { text: "hello", final: false },
      { text: "hello world", final: false },
      { text: "hello world", final: true },
    ]);
  });

  it("emits a single final segment when lk.transcription_final is true", async () => {
    const updates: { role: string; text: string; final: boolean }[] = [];
    const reader = {
      info: {
        id: "s2",
        attributes: {
          [LIVEKIT_TRANSCRIPTION_ATTR.SEGMENT_ID]: "seg-2",
          [LIVEKIT_TRANSCRIPTION_ATTR.TRANSCRIPTION_FINAL]: "true",
        },
      },
      async *[Symbol.asyncIterator]() {
        // unused for final streams
      },
      readAll: async () => "  namaste  ",
    };

    await consumeLiveKitTranscriptionStream(
      reader,
      { ...roleCtx, participantIdentity: "farmer1" },
      (u) => {
        updates.push({ role: u.role, text: u.text, final: u.final });
      },
    );

    expect(updates).toEqual([
      { role: "user", text: "namaste", final: true },
    ]);
  });
});
