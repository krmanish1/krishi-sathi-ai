import { useVoiceSessionStore } from "./useVoiceSessionStore";

describe("useVoiceSessionStore", () => {
  beforeEach(() => {
    useVoiceSessionStore.getState().reset();
  });

  it("starts in idle phase with no transcript or error", () => {
    const s = useVoiceSessionStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.transcript).toBeNull();
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

  it("setTranscript stores user and agent text", () => {
    useVoiceSessionStore
      .getState()
      .setTranscript({ user: "hello", agent: "namaste" });
    const s = useVoiceSessionStore.getState();
    expect(s.transcript).toEqual({ user: "hello", agent: "namaste" });
  });

  it("reset clears all state back to idle", () => {
    const store = useVoiceSessionStore.getState();
    store.setPhase("speaking");
    store.setTranscript({ user: "a", agent: "b" });
    store.setError("some error");
    useVoiceSessionStore.getState().reset();
    const s = useVoiceSessionStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.transcript).toBeNull();
    expect(s.errorMessage).toBeNull();
  });
});
