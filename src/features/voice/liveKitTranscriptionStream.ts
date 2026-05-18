import type { VoiceTranscriptRole } from "./voiceTranscriptMessages";

/** LiveKit agent transcription text stream topic. */
export const LIVEKIT_TRANSCRIPTION_TOPIC = "lk.transcription";

/** Attribute keys on `lk.transcription` text streams (LiveKit TranscriptionAttributes). */
export const LIVEKIT_TRANSCRIPTION_ATTR = {
  SEGMENT_ID: "lk.segment_id",
  TRANSCRIPTION_FINAL: "lk.transcription_final",
  TRANSCRIBED_TRACK_ID: "lk.transcribed_track_id",
} as const;

export type LiveKitTranscriptSegmentUpdate = {
  /** Stable id for this utterance (`lk.segment_id`, else stream id). */
  segmentId: string;
  role: VoiceTranscriptRole;
  text: string;
  /** From `lk.transcription_final` or end-of-stream. */
  final: boolean;
  transcribedTrackId?: string;
};

export type TranscriptionRoleContext = {
  localIdentity: string;
  /** Local mic publication / track sids for `lk.transcribed_track_id` matching. */
  localAudioTrackIds: string[];
  participantIdentity: string;
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
): { segmentId: string; final: boolean; transcribedTrackId?: string } {
  const segmentId =
    attributes?.[LIVEKIT_TRANSCRIPTION_ATTR.SEGMENT_ID]?.trim() || streamId;
  const final =
    attributes?.[LIVEKIT_TRANSCRIPTION_ATTR.TRANSCRIPTION_FINAL] === "true";
  const trackRaw = attributes?.[LIVEKIT_TRANSCRIPTION_ATTR.TRANSCRIBED_TRACK_ID]?.trim();
  const transcribedTrackId = trackRaw && trackRaw.length > 0 ? trackRaw : undefined;
  return transcribedTrackId !== undefined
    ? { segmentId, final, transcribedTrackId }
    : { segmentId, final };
}

/**
 * Resolve user vs agent per LiveKit: local participant / local audio track → user.
 * @see https://docs.livekit.io/agents/multimodality/text/
 */
export function resolveTranscriptionRole(
  ctx: TranscriptionRoleContext,
  transcribedTrackId?: string,
): VoiceTranscriptRole {
  if (
    ctx.participantIdentity.length > 0 &&
    ctx.participantIdentity === ctx.localIdentity
  ) {
    return "user";
  }
  if (
    transcribedTrackId !== undefined &&
    ctx.localAudioTrackIds.includes(transcribedTrackId)
  ) {
    return "user";
  }
  if (transcribedTrackId !== undefined) {
    return "agent";
  }
  return ctx.participantIdentity === ctx.localIdentity ? "user" : "agent";
}

/** @deprecated Use resolveTranscriptionRole */
export function roleFromParticipantIdentity(
  participantIdentity: string,
  localParticipantIdentity: string,
): VoiceTranscriptRole {
  return resolveTranscriptionRole({
    localIdentity: localParticipantIdentity,
    localAudioTrackIds: [],
    participantIdentity,
  });
}

/**
 * Consumes one `lk.transcription` text stream.
 * Emits updates keyed by `segment_id`; marks `final` when the stream says so or ends.
 */
export async function consumeLiveKitTranscriptionStream(
  reader: TextStreamReaderLike,
  roleCtx: TranscriptionRoleContext,
  onUpdate: (update: LiveKitTranscriptSegmentUpdate) => void,
): Promise<void> {
  const { segmentId, final: streamMarkedFinal, transcribedTrackId } =
    parseTranscriptionStreamMeta(reader.info.id, reader.info.attributes);
  const role = resolveTranscriptionRole(roleCtx, transcribedTrackId);

  const emit = (text: string, final: boolean) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const update: LiveKitTranscriptSegmentUpdate = {
      segmentId,
      role,
      text: trimmed,
      final,
    };
    if (transcribedTrackId !== undefined) {
      update.transcribedTrackId = transcribedTrackId;
    }
    onUpdate(update);
  };

  if (streamMarkedFinal) {
    emit(await reader.readAll(), true);
    return;
  }

  let accumulated = "";
  for await (const chunk of reader) {
    accumulated += chunk;
    emit(accumulated, false);
  }
  if (accumulated.trim()) {
    emit(accumulated, true);
  }
}

/** Collect local mic track ids from a connected room (for role resolution). */
export function collectLocalAudioTrackIds(
  audioPublications: Iterable<{ trackSid?: string; track?: { sid?: string } }>,
): string[] {
  const ids: string[] = [];
  for (const pub of audioPublications) {
    if (pub.trackSid) ids.push(pub.trackSid);
    const sid = pub.track?.sid;
    if (sid) ids.push(sid);
  }
  return ids;
}
