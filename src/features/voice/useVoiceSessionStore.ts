import { create } from "zustand";

export type VoicePhase = "idle" | "connecting" | "listening" | "speaking" | "error";

type VoiceSessionStore = {
  phase: VoicePhase;
  errorMessage: string | null;
  transcript: { user: string; agent: string } | null;
  agentJoined: boolean;
  muted: boolean;
  setPhase: (p: VoicePhase) => void;
  setTranscript: (t: { user: string; agent: string } | null) => void;
  setError: (msg: string) => void;
  setAgentJoined: (joined: boolean) => void;
  setMuted: (muted: boolean) => void;
  reset: () => void;
};

export const useVoiceSessionStore = create<VoiceSessionStore>((set) => ({
  phase: "idle",
  errorMessage: null,
  transcript: null,
  agentJoined: false,
  muted: false,
  setPhase: (phase) => set({ phase }),
  setTranscript: (transcript) => set({ transcript }),
  setError: (errorMessage) => set({ phase: "error", errorMessage }),
  setAgentJoined: (agentJoined) => set({ agentJoined }),
  setMuted: (muted) => set({ muted }),
  reset: () => set({ phase: "idle", errorMessage: null, transcript: null, agentJoined: false, muted: false }),
}));
