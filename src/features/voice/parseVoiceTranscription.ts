import type { VoiceTranscriptRole } from "./voiceTranscriptMessages";

export type TranscriptionSegmentLike = {
  id?: string;
  text?: string;
  final?: boolean;
};

export type ParsedTranscriptionSegment = {
  segmentId: string;
  role: VoiceTranscriptRole;
  text: string;
  final: boolean;
};

/**
 * LiveKit `RoomEvent.TranscriptionReceived` → per-segment updates (segment.id + final).
 * @see https://docs.livekit.io/client-sdk-js/interfaces/TranscriptionSegment.html
 */
export function parseVoiceTranscriptionSegments(
  segments: TranscriptionSegmentLike[],
  isLocalParticipant: boolean,
): ParsedTranscriptionSegment[] {
  const role: VoiceTranscriptRole = isLocalParticipant ? "user" : "agent";
  const out: ParsedTranscriptionSegment[] = [];

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const text = (seg?.text ?? "").trim();
    if (!text) continue;
    const segmentId =
      typeof seg?.id === "string" && seg.id.trim().length > 0
        ? seg.id.trim()
        : `${role}-${i}-${text.slice(0, 24)}`;
    out.push({
      segmentId,
      role,
      text,
      final: seg?.final !== false,
    });
  }

  return out;
}

/** @deprecated Use parseVoiceTranscriptionSegments */
export function parseVoiceTranscription(
  segments: TranscriptionSegmentLike[],
  isLocalParticipant: boolean,
): { patch: { user?: string; agent?: string } } | null {
  const parsed = parseVoiceTranscriptionSegments(segments, isLocalParticipant);
  if (parsed.length === 0) return null;
  const text = parsed.map((p) => p.text).join(" ").trim();
  if (!text) return null;
  return isLocalParticipant ? { patch: { user: text } } : { patch: { agent: text } };
}
