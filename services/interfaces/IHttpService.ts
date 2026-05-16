export interface IHttpService {
  get<T>(path: string, options?: HttpOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T>;
  delete<T>(path: string, options?: HttpOptions): Promise<T>;
}

export type HttpOptions = {
  timeoutMs?: number | undefined;
  headers?: Record<string, string> | undefined;
  signal?: AbortSignal | undefined;
};
