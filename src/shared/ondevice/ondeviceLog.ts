/** Structured logs for offline Gemma — visible in Metro / `adb logcat` (ReactNativeJS). */
export type OnDeviceLogEvent =
  | "sync_disk"
  | "hydrate"
  | "load_model_start"
  | "load_model_ok"
  | "load_model_fail"
  | "planner_fail"
  | "planner_fallback"
  | "planner_unsafe"
  | "generate_fail"
  | "generate_ok"
  | "agent_reply"
  | "offline_fallback"
  | "routing_offline";

export function logOnDevice(
  event: OnDeviceLogEvent,
  detail?: Record<string, unknown>,
): void {
  const line = `[OnDevice] ${event}${detail ? ` ${JSON.stringify(detail)}` : ""}`;
  console.warn(line);
}
