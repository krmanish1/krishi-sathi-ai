import { create } from "zustand";

export type VoicePhase = "idle" | "connecting" | "listening" | "speaking" | "error";

type VoiceSessionStore = {
  phase: VoicePhase;
  errorMessage: string | null;
  transcript: { user: string; agent: string } | null;
  setPhase: (p: VoicePhase) => void;
  setTranscript: (t: { user: string; agent: string } | null) => void;
  setError: (msg: string) => void;
  reset: () => void;
};

export const useVoiceSessionStore = create<VoiceSessionStore>((set) => ({
  phase: "idle",
  errorMessage: null,
  transcript: null,
  setPhase: (phase) => set({ phase }),
  setTranscript: (transcript) => set({ transcript }),
  setError: (errorMessage) => set({ phase: "error", errorMessage }),
  reset: () => set({ phase: "idle", errorMessage: null, transcript: null }),
}));
