import { parseKnownStage } from "./formatStagePayload";
import type { BackendStage, StreamPhase } from "./useStreamChatMessage";

/** One backend `data: { "type": "data-stage", "data": { ... } }` event (full `data` object). */
export type StageEvent = {
  data: Record<string, unknown>;
};

export type ThinkingStep = {
  data: Record<string, unknown>;
  knownStage: BackendStage | undefined;
  done: boolean;
  active: boolean;
};

/** Icon names for `@expo/vector-icons/MaterialCommunityIcons`. */
export function iconForStage(known: BackendStage | undefined): string {
  if (!known) return "transit-connection-variant";
  switch (known) {
    case "routing":
      return "compass-outline";
    case "planning":
      return "clipboard-text-outline";
    case "tools":
      return "hammer-wrench";
    case "synthesizing":
      return "creation";
    case "clarify":
      return "help-circle-outline";
    default:
      return "dots-horizontal-circle-outline";
  }
}

/**
 * Timeline from every `data-stage` payload received (order preserved).
 * If none yet while streaming, synthesizes one row from `phase` so the panel isn’t empty.
 */
export function buildThinkingSteps(
  stageEvents: StageEvent[] | undefined,
  phase: StreamPhase,
  isStreaming: boolean,
): ThinkingStep[] {
  const raw =
    (stageEvents?.length ?? 0) > 0
      ? [...(stageEvents ?? [])]
      : isStreaming && phase !== "idle"
        ? [{ data: { stage: phase } as Record<string, unknown> }]
        : [];

  if (raw.length === 0) return [];

  return raw.map((ev, i) => ({
    data: ev.data,
    knownStage: parseKnownStage(ev.data),
    done: isStreaming ? i < raw.length - 1 : true,
    active: Boolean(isStreaming && i === raw.length - 1),
  }));
}
