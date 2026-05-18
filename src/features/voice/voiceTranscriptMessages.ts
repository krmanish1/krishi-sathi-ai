import { randomUUID } from "@/shared/utils/uuid";

export type VoiceTranscriptRole = "user" | "agent";

export type VoiceTranscriptMessage = {
  id: string;
  role: VoiceTranscriptRole;
  text: string;
  /** LiveKit `lk.segment_id` / TranscriptionSegment.id when from LiveKit. */
  segmentId?: string;
  /** LiveKit `lk.transcription_final` / TranscriptionSegment.final. Omitted = final (offline). */
  final?: boolean;
};

export type VoiceTranscriptPatch = Partial<Record<VoiceTranscriptRole, string>>;

export type LiveKitSegmentInput = {
  segmentId: string;
  role: VoiceTranscriptRole;
  text: string;
  final: boolean;
};

/**
 * LiveKit-aligned transcript apply: one UI row per `segment_id`, in-place overwrite
 * when the same segment streams interim → final text.
 * @see https://docs.livekit.io/agents/multimodality/text/
 */
export function applyLiveKitSegmentUpdate(
  messages: VoiceTranscriptMessage[],
  input: LiveKitSegmentInput,
  createId: () => string = randomUUID,
): VoiceTranscriptMessage[] {
  const trimmed = input.text.trim();
  if (!trimmed) return messages;

  const idx = messages.findIndex((m) => m.segmentId === input.segmentId);
  if (idx >= 0) {
    return messages.map((m, i) =>
      i === idx
        ? { ...m, text: trimmed, role: input.role, final: input.final }
        : m,
    );
  }

  return [
    ...messages,
    {
      id: createId(),
      role: input.role,
      text: trimmed,
      segmentId: input.segmentId,
      final: input.final,
    },
  ];
}

/** @deprecated Prefer applyLiveKitSegmentUpdate */
export const addSegmentMessage = applyLiveKitSegmentUpdate;

/** Offline / legacy data-channel patches (no segment ids). */
function appendOrMergeAtTail(
  messages: VoiceTranscriptMessage[],
  role: VoiceTranscriptRole,
  trimmed: string,
  createId: () => string,
): VoiceTranscriptMessage[] {
  const tail = messages[messages.length - 1];
  if (tail?.role === role && tail.segmentId === undefined) {
    if (trimmed === tail.text) return messages;
    if (trimmed.startsWith(tail.text) && trimmed.length >= tail.text.length) {
      return [...messages.slice(0, -1), { ...tail, text: trimmed }];
    }
    if (tail.text.startsWith(trimmed) && trimmed.length <= tail.text.length) {
      return [...messages.slice(0, -1), { ...tail, text: trimmed }];
    }
  }

  return [...messages, { id: createId(), role, text: trimmed, final: true }];
}

/** Applies data-channel / TranscriptionReceived patches without segment ids. */
export function patchVoiceTranscriptMessages(
  messages: VoiceTranscriptMessage[],
  patch: VoiceTranscriptPatch,
  createId: () => string = randomUUID,
): VoiceTranscriptMessage[] {
  let next = messages;
  if (patch.user !== undefined) {
    const trimmed = patch.user.trim();
    if (trimmed) next = appendOrMergeAtTail(next, "user", trimmed, createId);
  }
  if (patch.agent !== undefined) {
    const trimmed = patch.agent.trim();
    if (trimmed) next = appendOrMergeAtTail(next, "agent", trimmed, createId);
  }
  return next;
}
