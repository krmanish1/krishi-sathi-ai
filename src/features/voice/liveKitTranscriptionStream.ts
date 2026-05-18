import type { VoiceTranscriptRole } from "./voiceTranscriptMessages";

/** LiveKit agent transcription text stream topic. */
export const LIVEKIT_TRANSCRIPTION_TOPIC = "lk.transcription";

export type LiveKitTranscriptSegmentUpdate = {
  segmentId: string;
  role: VoiceTranscriptRole;
  text: string;
};

type TextStreamReaderLike = {
  info: {
    id: string;
    attributes?: Record<string, string>;
  };
  readAll(): Promise<string>;
  [Symbol.asyncIterator](): AsyncIterator<string>;
};

export function parseTranscriptionStreamMeta(
  streamId: string,
  attributes: Record<string, string> | undefined,
): { segmentId: string; final: boolean } {
  const segmentId = attributes?.["lk.segment_id"]?.trim() || streamId;
  const final = attributes?.["lk.transcription_final"] === "true";
  return { segmentId, final };
}

export function roleFromParticipantIdentity(
  participantIdentity: string,
  localParticipantIdentity: string,
): VoiceTranscriptRole {
  return participantIdentity === localParticipantIdentity ? "user" : "agent";
}

/**
 * Consumes one `lk.transcription` text stream.
 * Emits each chunk as it arrives so the transcript UI shows agent text
 * in real-time while the agent is still speaking.
 */
export async function consumeLiveKitTranscriptionStream(
  reader: TextStreamReaderLike,
  participantIdentity: string,
  localParticipantIdentity: string,
  onUpdate: (update: LiveKitTranscriptSegmentUpdate) => void,
): Promise<void> {
  const { segmentId, final } = parseTranscriptionStreamMeta(reader.info.id, reader.info.attributes);
  const role = roleFromParticipantIdentity(participantIdentity, localParticipantIdentity);

  if (final) {
    const text = (await reader.readAll()).trim();
    if (text) {
      onUpdate({ segmentId, role, text });
    }
    return;
  }

  // Emit each chunk immediately so the UI streams text in real-time
  let accumulated = "";
  for await (const chunk of reader) {
    accumulated += chunk;
    const trimmed = accumulated.trim();
    if (trimmed) {
      onUpdate({ segmentId, role, text: trimmed });
    }
  }
}
