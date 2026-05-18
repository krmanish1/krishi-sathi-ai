import { create } from "zustand";
import {
  patchVoiceTranscriptMessages,
  addSegmentMessage,
  type VoiceTranscriptMessage,
  type VoiceTranscriptPatch,
} from "./voiceTranscriptMessages";

export type VoicePhase = "idle" | "connecting" | "listening" | "speaking" | "error";

export type { VoiceTranscriptMessage, VoiceTranscriptPatch };

type VoiceSessionStore = {
  phase: VoicePhase;
  errorMessage: string | null;
  transcriptMessages: VoiceTranscriptMessage[];
  agentJoined: boolean;
  muted: boolean;
  interimUserText: string;
  interimAgentText: string;
  setPhase: (p: VoicePhase) => void;
  setTranscriptMessages: (messages: VoiceTranscriptMessage[]) => void;
  patchTranscript: (patch: VoiceTranscriptPatch) => void;
  addSegmentTranscript: (segment: { segmentId: string; role: "user" | "agent"; text: string }) => void;
  setInterimUserText: (text: string) => void;
  setInterimAgentText: (text: string) => void;
  setError: (msg: string) => void;
  setAgentJoined: (joined: boolean) => void;
  setMuted: (muted: boolean) => void;
  reset: () => void;
};

export const useVoiceSessionStore = create<VoiceSessionStore>((set) => ({
  phase: "idle",
  errorMessage: null,
  transcriptMessages: [],
  agentJoined: false,
  muted: false,
  interimUserText: "",
  interimAgentText: "",
  setPhase: (phase) => set({ phase }),
  setTranscriptMessages: (transcriptMessages) => set({ transcriptMessages }),
  patchTranscript: (patch) =>
    set((state) => ({
      transcriptMessages: patchVoiceTranscriptMessages(
        state.transcriptMessages,
        patch,
      ),
    })),
  addSegmentTranscript: (segment) =>
    set((state) => ({
      transcriptMessages: addSegmentMessage(state.transcriptMessages, segment),
    })),
  setInterimUserText: (interimUserText) => set({ interimUserText }),
  setInterimAgentText: (interimAgentText) => set({ interimAgentText }),
  setError: (errorMessage) => set({ phase: "error", errorMessage }),
  setAgentJoined: (agentJoined) => set({ agentJoined }),
  setMuted: (muted) => set({ muted }),
  reset: () =>
    set({
      phase: "idle",
      errorMessage: null,
      transcriptMessages: [],
      agentJoined: false,
      muted: false,
      interimUserText: "",
      interimAgentText: "",
    }),
}));
