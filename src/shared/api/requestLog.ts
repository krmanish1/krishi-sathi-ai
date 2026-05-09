import { ApiError } from "./errors";

const TAG = "[KrishiAPI]";

/** Logs in dev builds; set EXPO_PUBLIC_API_LOG=1 to force on release, EXPO_PUBLIC_API_LOG=0 to silence in dev. */
export function isApiLoggingEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_API_LOG === "0") return false;
  if (process.env.EXPO_PUBLIC_API_LOG === "1") return true;
  return typeof __DEV__ !== "undefined" && __DEV__;
}

export function truncateForLog(s: string, max = 480): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function bodySummaryForLog(method: string, body: unknown): string | undefined {
  if (method === "GET" || method === "DELETE") return undefined;
  if (body == null) return undefined;
  if (typeof FormData !== "undefined" && body instanceof FormData) return "<FormData>";
  if (typeof body === "object") {
    try {
      return truncateForLog(JSON.stringify(body));
    } catch {
      return "<object>";
    }
  }
  if (typeof body === "string") return truncateForLog(body);
  return String(body);
}

export function logApiStart(method: string, url: string, bodyHint?: string): void {
  if (!isApiLoggingEnabled()) return;
  if (bodyHint !== undefined) {
    console.info(`${TAG} → ${method} ${url} | body=${bodyHint}`);
  } else {
    console.info(`${TAG} → ${method} ${url}`);
  }
}

export function logApiEndOk(method: string, url: string, status: number, ms: number): void {
  if (!isApiLoggingEnabled()) return;
  console.info(`${TAG} ✓ ${method} ${url} | HTTP ${status} | ${ms}ms`);
}

export function logApiEndErr(method: string, url: string, ms: number, err: unknown): void {
  if (!isApiLoggingEnabled()) return;
  if (err instanceof ApiError) {
    console.warn(
      `${TAG} ✗ ${method} ${url} | ${ms}ms | HTTP ${err.status} | code=${err.code} | ${err.message} | retryable=${String(err.retryable)} | fallback=${String(err.fallbackHint)}`,
    );
    return;
  }
  if (err instanceof Error) {
    console.warn(`${TAG} ✗ ${method} ${url} | ${ms}ms | ${err.name}: ${err.message}`);
    return;
  }
  console.warn(`${TAG} ✗ ${method} ${url} | ${ms}ms |`, err);
}

/** Wrap fetch to log stream/non-JSON calls (e.g. POST /api/v1/query/stream). */
export function wrapFetchWithApiLogging(
  inner: typeof fetch,
  defaultMethod = "GET",
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = (init?.method ?? defaultMethod).toUpperCase();
    const t0 = Date.now();
    let bodyHint: string | undefined;
    if (init?.body != null) {
      if (typeof init.body === "string") {
        bodyHint = truncateForLog(init.body);
      } else {
        bodyHint = "<binary/stream body>";
      }
    }
    logApiStart(method, url, bodyHint);
    try {
      const res = await inner(input, init);
      const ms = Date.now() - t0;
      if (res.ok) {
        logApiEndOk(method, url, res.status, ms);
      } else {
        console.warn(
          `${TAG} ✗ ${method} ${url} | ${ms}ms | HTTP ${res.status} (non-OK; body may stream errors)`,
        );
      }
      return res;
    } catch (err) {
      logApiEndErr(method, url, Date.now() - t0, err);
      throw err;
    }
  };
}
