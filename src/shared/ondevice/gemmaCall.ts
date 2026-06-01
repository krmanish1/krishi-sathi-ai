import { getBackend } from "./gemma";
import { logOnDevice } from "./ondeviceLog";

/** E2B on mid-range phones can exceed 45s for planner + synthesize. */
export const ON_DEVICE_GEMMA_TIMEOUT_MS = 90_000;

export function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  return e instanceof Error && e.message === "Aborted";
}

export function isGemmaTimeoutError(e: unknown): boolean {
  return e instanceof Error && e.message === "GEMMA_TIMEOUT";
}

/**
 * Runs on-device generate with wall-clock timeout and optional cancel signal.
 * Does not throw Aborted after a successful generate when only the timer fired late.
 */
export async function callGemmaWithTimeout(
  prompt: string,
  signal?: AbortSignal,
  onToken?: (token: string) => void,
): Promise<string> {
  const backend = getBackend();
  if (!backend) throw new Error("Gemma backend not set");
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  let timer: ReturnType<typeof setTimeout> | undefined;
  const onUserAbort = () => {
    backend.cancel?.();
  };
  signal?.addEventListener("abort", onUserAbort, { once: true });

  const generatePromise = backend
    .generate({
      prompt,
      language: "hi",
      intent: "general",
      ...(onToken !== undefined ? { onToken } : {}),
    })
    .then((result) => result.text);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      backend.cancel?.();
      reject(new Error("GEMMA_TIMEOUT"));
    }, ON_DEVICE_GEMMA_TIMEOUT_MS);
  });

  try {
    const text = await Promise.race([generatePromise, timeoutPromise]);
    logOnDevice("generate_ok", { textLength: (text ?? "").length });
    return text;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener("abort", onUserAbort);
  }
}
