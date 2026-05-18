import { randomUUID } from "@/shared/utils/uuid";

export type VoiceTranscriptRole = "user" | "agent";

export type VoiceTranscriptMessage = {
  id: string;
  role: VoiceTranscriptRole;
  text: string;
  /** LiveKit `lk.segment_id` — for dedup / tracking. */
  segmentId?: string;
};

export type VoiceTranscriptPatch = Partial<Record<VoiceTranscriptRole, string>>;

function lastIndexForRole(
  messages: VoiceTranscriptMessage[],
  role: VoiceTranscriptRole,
): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === role) return i;
  }
  return -1;
}

/**
 * Merges streaming STT into the last bubble for the same speaker when the server
 * sends growing text ("hel" → "hello") or a shorter correction. Otherwise appends
 * a new turn.
 */
function mergeOrAppendRole(
  messages: VoiceTranscriptMessage[],
  role: VoiceTranscriptRole,
  trimmed: string,
  createId: () => string,
  segmentId?: string,
): VoiceTranscriptMessage[] {
  const idx = lastIndexForRole(messages, role);
  if (idx < 0) {
    return [
      ...messages,
      segmentId !== undefined
        ? { id: createId(), role, text: trimmed, segmentId }
        : { id: createId(), role, text: trimmed },
    ];
  }
  const last = messages[idx]!;
  if (trimmed === last.text) return messages;

  if (trimmed.startsWith(last.text) && trimmed.length >= last.text.length) {
    const next = [...messages];
    const mergedSeg = last.segmentId ?? segmentId;
    next[idx] =
      mergedSeg !== undefined
        ? { ...last, text: trimmed, segmentId: mergedSeg }
        : { ...last, text: trimmed };
    return next;
  }
  if (last.text.startsWith(trimmed) && trimmed.length <= last.text.length) {
    const next = [...messages];
    const mergedSeg = last.segmentId ?? segmentId;
    next[idx] =
      mergedSeg !== undefined
        ? { ...last, text: trimmed, segmentId: mergedSeg }
        : { ...last, text: trimmed };
    return next;
  }

  return [
    ...messages,
    segmentId !== undefined
      ? { id: createId(), role, text: trimmed, segmentId }
      : { id: createId(), role, text: trimmed },
  ];
}

/** Applies data-channel / TranscriptionReceived patches with same-turn merging. */
export function patchVoiceTranscriptMessages(
  messages: VoiceTranscriptMessage[],
  patch: VoiceTranscriptPatch,
  createId: () => string = randomUUID,
): VoiceTranscriptMessage[] {
  let next = messages;
  if (patch.user !== undefined) {
    const trimmed = patch.user.trim();
    if (trimmed) next = mergeOrAppendRole(next, "user", trimmed, createId);
  }
  if (patch.agent !== undefined) {
    const trimmed = patch.agent.trim();
    if (trimmed) next = mergeOrAppendRole(next, "agent", trimmed, createId);
  }
  return next;
}

/**
 * LiveKit `lk.transcription` segments: same `segment_id` updates one bubble;
 * otherwise same-turn merge when the backend emits one stream per chunk.
 */
export function addSegmentMessage(
  messages: VoiceTranscriptMessage[],
  input: {
    segmentId: string;
    role: VoiceTranscriptRole;
    text: string;
  },
  createId: () => string = randomUUID,
): VoiceTranscriptMessage[] {
  const trimmed = input.text.trim();
  if (!trimmed) return messages;

  const segIdx = messages.findIndex((m) => m.segmentId === input.segmentId);
  if (segIdx >= 0) {
    return messages.map((m, i) =>
      i === segIdx ? { ...m, text: trimmed, role: input.role } : m,
    );
  }

  return mergeOrAppendRole(messages, input.role, trimmed, createId, input.segmentId);
}
