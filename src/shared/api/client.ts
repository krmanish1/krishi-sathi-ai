import { Platform } from "react-native";
import { ApiError, parseErrorResponse } from "./errors";
import { withFetchLane } from "./fetchLane";
import { platformFetch } from "./platformFetch";
import {
  bodySummaryForLog,
  logApiEndErr,
  logApiEndOk,
  logApiStart,
} from "./requestLog";

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

/** Gzip magic — happens when the server compresses but the client did not decode (common with manual Accept-Encoding). */
const looksLikeGzipBody = (text: string): boolean =>
  text.length >= 2 && text.charCodeAt(0) === 0x1f && text.charCodeAt(1) === 0x8b;

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
      // Avoid stale keep-alive pools with some CDNs / Space proxies (reduces "Network request failed").
      ...(Platform.OS !== "web" ? { Connection: "close" } : {}),
      ...headers,
    },
    signal: linked,
  };
  if (jsonBody) {
    requestInit.body = JSON.stringify(jsonBody);
  } else if (rawBody !== undefined) {
    requestInit.body = rawBody;
  }

  const url = `${baseUrl}${path}`;
  const bodyHint = bodySummaryForLog(method, jsonBody ?? rawBody);
  logApiStart(method, url, bodyHint);
  const started = Date.now();

  try {
    const res = await withFetchLane(() => platformFetch(url, requestInit));

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
        const enc = res.headers.get("content-encoding")?.toLowerCase() ?? "";
        const gzipBody = looksLikeGzipBody(text) || enc.includes("gzip");
        throw new ApiError(
          "INTERNAL_ERROR",
          res.status,
          gzipBody
            ? "Compressed response could not be decoded (gzip)"
            : text.trim()
              ? "Invalid response body"
              : "Empty response body",
          false,
          undefined,
          null,
        );
      }
    }

    if (!res.ok && res.status !== 304) {
      throw parseErrorResponse(res.status, json);
    }
    logApiEndOk(method, url, res.status, Date.now() - started);
    return json as T;
  } catch (e) {
    logApiEndErr(method, url, Date.now() - started, e);
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
