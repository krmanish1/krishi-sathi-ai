import { useVoiceSessionStore } from "@/features/voice/useVoiceSessionStore";

describe("useVoiceSessionStore", () => {
  beforeEach(() => {
    useVoiceSessionStore.getState().reset();
  });

  it("starts in idle phase with no transcript or error", () => {
    const s = useVoiceSessionStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.transcriptMessages).toEqual([]);
    expect(s.errorMessage).toBeNull();
  });

  it("setPhase transitions to connecting then listening", () => {
    const { setPhase } = useVoiceSessionStore.getState();
    setPhase("connecting");
    expect(useVoiceSessionStore.getState().phase).toBe("connecting");
    setPhase("listening");
    expect(useVoiceSessionStore.getState().phase).toBe("listening");
  });

  it("setPhase transitions to speaking", () => {
    useVoiceSessionStore.getState().setPhase("speaking");
    expect(useVoiceSessionStore.getState().phase).toBe("speaking");
  });

  it("setError sets phase to error and stores the message", () => {
    useVoiceSessionStore.getState().setError("voice.error.noMic");
    const s = useVoiceSessionStore.getState();
    expect(s.phase).toBe("error");
    expect(s.errorMessage).toBe("voice.error.noMic");
  });

  it("patchTranscript appends separate user and agent messages", () => {
    useVoiceSessionStore.getState().patchTranscript({ user: "what is weather" });
    useVoiceSessionStore.getState().patchTranscript({ agent: "Rain tomorrow." });
    const msgs = useVoiceSessionStore.getState().transcriptMessages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ role: "user", text: "what is weather" });
    expect(msgs[1]).toMatchObject({ role: "agent", text: "Rain tomorrow." });
  });

  it("patchTranscript merges growing same-role transcript into one bubble", () => {
    useVoiceSessionStore.getState().patchTranscript({ agent: "hel" });
    useVoiceSessionStore.getState().patchTranscript({ agent: "hello" });
    const msgs = useVoiceSessionStore.getState().transcriptMessages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ role: "agent", text: "hello" });
  });

  it("reset clears all state back to idle", () => {
    const store = useVoiceSessionStore.getState();
    store.setPhase("speaking");
    store.patchTranscript({ user: "a" });
    store.patchTranscript({ agent: "b" });
    store.setError("some error");
    useVoiceSessionStore.getState().reset();
    const s = useVoiceSessionStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.transcriptMessages).toEqual([]);
    expect(s.errorMessage).toBeNull();
  });
});
