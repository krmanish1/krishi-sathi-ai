import { ApiError, parseErrorResponse } from "./errors";

export type ApiFetchOptions = {
  baseUrl: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: BodyInit | Record<string, unknown>;
  signal?: AbortSignal;
};

const isPlainObject = (b: unknown): b is Record<string, unknown> =>
  typeof b === "object" && b !== null && !(b instanceof FormData);

export const apiFetch = async <T>(path: string, opts: ApiFetchOptions): Promise<T> => {
  const { baseUrl, timeoutMs, headers, method = "GET", body, signal } = opts;
  const ctrl = new AbortController();
  const linked = signal
    ? (() => {
        const onAbort = () => ctrl.abort();
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) ctrl.abort();
        return ctrl.signal;
      })()
    : ctrl.signal;
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const jsonBody = isPlainObject(body) ? body : undefined;
  const rawBody = isPlainObject(body) ? undefined : (body as BodyInit | undefined);

  const requestInit: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...(jsonBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    signal: linked,
  };
  if (jsonBody) {
    requestInit.body = JSON.stringify(jsonBody);
  } else if (rawBody !== undefined) {
    requestInit.body = rawBody;
  }
  try {
    const res = await fetch(`${baseUrl}${path}`, requestInit);

    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        if (!res.ok) {
          throw new ApiError(
            "INTERNAL_ERROR",
            res.status,
            "Invalid JSON from server",
            false,
            undefined,
            null,
          );
        }
        throw new ApiError(
          "INTERNAL_ERROR",
          res.status,
          "Invalid response body",
          false,
          undefined,
          null,
        );
      }
    }

    if (!res.ok) {
      throw parseErrorResponse(res.status, json);
    }
    return json as T;
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError("LLM_TIMEOUT", 408, "Request timed out", true, undefined, "USE_ONDEVICE");
    }
    if (e instanceof Error) {
      throw new ApiError("INTERNAL_ERROR", 0, e.message, false, undefined, "RETRY_ONLINE_LATER");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
};
