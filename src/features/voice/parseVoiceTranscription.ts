import type { VoiceTranscriptPatch } from "./voiceTranscriptMessages";

export type { VoiceTranscriptPatch };

type TranscriptionSegment = {
  text?: string;
  final?: boolean;
};

/** LiveKit `TranscriptionReceived` segments → user/agent transcript patch. */
export function parseVoiceTranscription(
  segments: TranscriptionSegment[],
  isLocalParticipant: boolean,
): { patch: VoiceTranscriptPatch } | null {
  const text = segments
    .map((s) => s.text ?? "")
    .join("")
    .trim();
  if (!text) return null;

  const patch: VoiceTranscriptPatch = isLocalParticipant ? { user: text } : { agent: text };
  return { patch };
}
