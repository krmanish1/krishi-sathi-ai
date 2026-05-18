import {
  patchVoiceTranscriptMessages,
  addSegmentMessage,
  type VoiceTranscriptMessage,
} from "@/features/voice/voiceTranscriptMessages";

const idSeq = (() => {
  let n = 0;
  return () => `id-${++n}`;
})();

describe("patchVoiceTranscriptMessages", () => {
  it("creates a new message for user text", () => {
    const next = patchVoiceTranscriptMessages([], { user: "hello" }, idSeq);
    expect(next).toEqual([{ id: "id-1", role: "user", text: "hello" }]);
  });

  it("merges growing same-role text into one bubble", () => {
    let msgs = patchVoiceTranscriptMessages([], { user: "hel" }, idSeq);
    msgs = patchVoiceTranscriptMessages(msgs, { user: "hello there" }, idSeq);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.text).toBe("hello there");
  });

  it("keeps separate turns when text is not a prefix extension", () => {
    let msgs = patchVoiceTranscriptMessages([], { user: "hi" }, idSeq);
    msgs = patchVoiceTranscriptMessages(msgs, { user: "bye" }, idSeq);
    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.text)).toEqual(["hi", "bye"]);
  });

  it("keeps user and agent turns separate in order", () => {
    let msgs: VoiceTranscriptMessage[] = [];
    msgs = patchVoiceTranscriptMessages(msgs, { user: "hi" }, idSeq);
    msgs = patchVoiceTranscriptMessages(msgs, { agent: "namaste" }, idSeq);
    expect(msgs.map((m) => m.role)).toEqual(["user", "agent"]);
  });

  it("handles concurrent user and agent patches", () => {
    const msgs = patchVoiceTranscriptMessages(
      [],
      {
        user: "hello",
        agent: "hi there",
      },
      idSeq,
    );
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ role: "user", text: "hello" });
    expect(msgs[1]).toMatchObject({ role: "agent", text: "hi there" });
  });
});

describe("addSegmentMessage", () => {
  it("creates a new message for a segment", () => {
    const next = addSegmentMessage(
      [],
      { segmentId: "seg-1", role: "agent", text: "hello" },
      idSeq,
    );
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      segmentId: "seg-1",
      role: "agent",
      text: "hello",
    });
  });

  it("updates the same segment id in place", () => {
    let msgs = addSegmentMessage(
      [],
      { segmentId: "seg-1", role: "user", text: "what" },
      idSeq,
    );
    msgs = addSegmentMessage(
      msgs,
      { segmentId: "seg-1", role: "user", text: "what is weather" },
      idSeq,
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.text).toBe("what is weather");
  });

  it("merges per-chunk streams for the same role when text grows", () => {
    let msgs = addSegmentMessage(
      [],
      { segmentId: "stream-a", role: "agent", text: "For" },
      idSeq,
    );
    msgs = addSegmentMessage(
      msgs,
      { segmentId: "stream-b", role: "agent", text: "For wheat" },
      idSeq,
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.text).toBe("For wheat");
  });

  it("keeps separate bubbles per distinct segment when not prefix-related", () => {
    let msgs = addSegmentMessage(
      [],
      { segmentId: "seg-a", role: "user", text: "first" },
      idSeq,
    );
    msgs = addSegmentMessage(
      msgs,
      { segmentId: "seg-b", role: "user", text: "second" },
      idSeq,
    );
    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.text)).toEqual(["first", "second"]);
  });
});
