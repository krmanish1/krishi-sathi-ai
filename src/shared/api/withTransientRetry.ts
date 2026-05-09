import { ApiError } from "./errors";

/** RN `fetch` often fails with status 0 before HTTP; servers may mark 503 etc. as retryable. */
export function isTransientTransportError(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  if (e.status === 0) return true;
  if (e.retryable) return true;
  return false;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      return;
    }
    const id = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      signal?.removeEventListener("abort", onAbort);
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type WithTransientRetryOpts = {
  attempts?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
};

/**
 * Retries idempotent reads when the transport fails before a normal HTTP response
 * (common on React Native + CDN/Space edges).
 */
export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  opts?: WithTransientRetryOpts,
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 400;
  const signal = opts?.signal;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    if (signal?.aborted) {
      const err = Object.assign(new Error("Aborted"), { name: "AbortError" });
      throw err;
    }
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (signal?.aborted) throw e;
      if (!isTransientTransportError(e) || i === attempts - 1) throw e;
      try {
        await sleep(baseDelayMs * (i + 1), signal);
      } catch {
        throw e;
      }
    }
  }
  throw last;
}
