import { injectable } from 'inversify';
import type { IHttpService, HttpOptions } from "./interfaces/IHttpService";
import { ApiError, parseErrorResponse } from "@/shared/api/errors";
import { getApiBaseUrl } from "@/shared/config/env";

@injectable()
export class HttpService implements IHttpService {
  async get<T>(path: string, options?: HttpOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options ?? {});
  }

  async post<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T> {
    return this.request<T>("POST", path, body, options ?? {});
  }

  async put<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options ?? {});
  }

  async delete<T>(path: string, options?: HttpOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options ?? {});
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: HttpOptions,
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const ctrl = new AbortController();
    const linked = options?.signal
      ? (() => {
          const onAbort = () => ctrl.abort();
          options.signal!.addEventListener("abort", onAbort, { once: true });
          if (options.signal!.aborted) ctrl.abort();
          return ctrl.signal;
        })()
      : ctrl.signal;
    const t = setTimeout(() => ctrl.abort(), options?.timeoutMs ?? 30_000);

    try {
      const isPlainObject = body != null && typeof body === "object" && !(body instanceof FormData);
      const requestInit: RequestInit = {
        method,
        headers: {
          Accept: "application/json",
          ...(isPlainObject ? { "Content-Type": "application/json" } : {}),
          ...options?.headers,
        },
        signal: linked,
      };
      if (isPlainObject) {
        requestInit.body = JSON.stringify(body);
      } else if (body instanceof FormData) {
        requestInit.body = body;
      }

      const res = await fetch(`${baseUrl}${path}`, requestInit);
      const text = await res.text();
      let json: unknown = null;
      if (text) {
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          if (!res.ok) {
            throw new ApiError("INTERNAL_ERROR", res.status, "Invalid JSON from server", false, undefined, null);
          }
          throw new ApiError("INTERNAL_ERROR", res.status, "Invalid response body", false, undefined, null);
        }
      }
      if (!res.ok) throw parseErrorResponse(res.status, json);
      return json as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
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
  }
}
