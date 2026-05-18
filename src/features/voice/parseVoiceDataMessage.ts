import type { VoiceTranscriptPatch } from "./voiceTranscriptMessages";

export type { VoiceTranscriptPatch };

export type ParsedVoiceData = {
  patch: VoiceTranscriptPatch;
};

const USER_TYPES = new Set([
  "user_transcript",
  "user_speech",
  "user_text",
  "user",
  "farmer",
]);

const AGENT_TYPES = new Set([
  "agent_transcript",
  "agent_speech",
  "agent_text",
  "agent",
  "assistant",
]);

function readText(msg: Record<string, unknown>): string | undefined {
  for (const key of ["text", "transcript", "content", "message"] as const) {
    const v = msg[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function speakerRole(msg: Record<string, unknown>): "user" | "agent" | null {
  const role =
    (typeof msg.role === "string" ? msg.role : undefined) ??
    (typeof msg.speaker === "string" ? msg.speaker : undefined);
  if (!role) return null;
  if (role === "user" || role === "farmer" || role === "participant") return "user";
  if (role === "agent" || role === "assistant" || role === "ai") return "agent";
  return null;
}

/** Maps LiveKit agent data-channel payloads into user/agent transcript patches. */
export function parseVoiceDataMessage(payload: Uint8Array): ParsedVoiceData | null {
  try {
    const msg = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
    const type = typeof msg.type === "string" ? msg.type.toLowerCase() : "";
    const append =
      type.includes("delta") ||
      type.includes("partial") ||
      msg.final === false ||
      msg.is_final === false;

    // Skip partial/delta updates — we only append complete messages
    if (append) return null;

    const text = readText(msg);

    if (type === "transcript" || type === "transcription") {
      const patch: VoiceTranscriptPatch = {};
      if (typeof msg.user === "string" && msg.user.trim()) patch.user = msg.user.trim();
      if (typeof msg.agent === "string" && msg.agent.trim()) patch.agent = msg.agent.trim();
      if (text && !patch.user && !patch.agent) {
        const who = speakerRole(msg);
        if (who === "user") patch.user = text;
        if (who === "agent") patch.agent = text;
      }
      if (Object.keys(patch).length > 0) return { patch };
    }

    if (!type && (msg.user || msg.agent)) {
      const patch: VoiceTranscriptPatch = {};
      if (typeof msg.user === "string" && msg.user.trim()) patch.user = msg.user.trim();
      if (typeof msg.agent === "string" && msg.agent.trim()) patch.agent = msg.agent.trim();
      return { patch };
    }

    if (text && USER_TYPES.has(type)) return { patch: { user: text } };
    if (text && AGENT_TYPES.has(type)) return { patch: { agent: text } };

    if (text) {
      const who = speakerRole(msg);
      if (who === "user") return { patch: { user: text } };
      if (who === "agent") return { patch: { agent: text } };
    }

    return null;
  } catch {
    return null;
  }
}
