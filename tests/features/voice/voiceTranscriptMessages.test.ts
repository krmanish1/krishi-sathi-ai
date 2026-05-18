import {
  patchVoiceTranscriptMessages,
  applyLiveKitSegmentUpdate,
  type VoiceTranscriptMessage,
} from "@/features/voice/voiceTranscriptMessages";

const idSeq = (() => {
  let n = 0;
  return () => `id-${++n}`;
})();

describe("applyLiveKitSegmentUpdate", () => {
  it("creates a row for a new segment_id", () => {
    const next = applyLiveKitSegmentUpdate(
      [],
      { segmentId: "seg-1", role: "agent", text: "hello", final: false },
      idSeq,
    );
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      segmentId: "seg-1",
      role: "agent",
      text: "hello",
      final: false,
    });
  });

  it("overwrites the same segment_id in place (LiveKit interim → final)", () => {
    let msgs = applyLiveKitSegmentUpdate(
      [],
      { segmentId: "seg-1", role: "agent", text: "hel", final: false },
      idSeq,
    );
    msgs = applyLiveKitSegmentUpdate(
      msgs,
      { segmentId: "seg-1", role: "agent", text: "hello", final: true },
      idSeq,
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ text: "hello", final: true });
  });

  it("keeps separate rows for different segment_ids", () => {
    let msgs = applyLiveKitSegmentUpdate(
      [],
      { segmentId: "seg-a", role: "user", text: "q1", final: true },
      idSeq,
    );
    msgs = applyLiveKitSegmentUpdate(
      msgs,
      { segmentId: "seg-b", role: "agent", text: "a1", final: true },
      idSeq,
    );
    msgs = applyLiveKitSegmentUpdate(
      msgs,
      { segmentId: "seg-c", role: "user", text: "q2", final: true },
      idSeq,
    );
    msgs = applyLiveKitSegmentUpdate(
      msgs,
      { segmentId: "seg-d", role: "agent", text: "a2", final: true },
      idSeq,
    );
    expect(msgs).toHaveLength(4);
    expect(msgs.map((m) => m.text)).toEqual(["q1", "a1", "q2", "a2"]);
  });

  it("streams interim text on the same segment without new bubbles", () => {
    let msgs = applyLiveKitSegmentUpdate(
      [],
      { segmentId: "seg-x", role: "agent", text: "For", final: false },
      idSeq,
    );
    msgs = applyLiveKitSegmentUpdate(
      msgs,
      { segmentId: "seg-x", role: "agent", text: "For wheat", final: false },
      idSeq,
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.text).toBe("For wheat");
  });
});

describe("patchVoiceTranscriptMessages (offline fallback)", () => {
  it("creates a new message for user text", () => {
    const next = patchVoiceTranscriptMessages([], { user: "hello" }, idSeq);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ role: "user", text: "hello", final: true });
  });

  it("merges growing same-role text into the tail bubble only", () => {
    let msgs = patchVoiceTranscriptMessages([], { user: "hel" }, idSeq);
    msgs = patchVoiceTranscriptMessages(msgs, { user: "hello there" }, idSeq);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.text).toBe("hello there");
  });

  it("keeps user and agent turns separate in order", () => {
    let msgs: VoiceTranscriptMessage[] = [];
    msgs = patchVoiceTranscriptMessages(msgs, { user: "hi" }, idSeq);
    msgs = patchVoiceTranscriptMessages(msgs, { agent: "namaste" }, idSeq);
    expect(msgs.map((m) => m.role)).toEqual(["user", "agent"]);
  });
});
