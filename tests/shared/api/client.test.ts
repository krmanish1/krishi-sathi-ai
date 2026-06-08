import { apiFetch } from "@/shared/api/client";
import { ApiError } from "@/shared/api/errors";
import { platformFetch } from "@/shared/api/platformFetch";

jest.mock("@/shared/api/platformFetch", () => ({
  platformFetch: jest.fn(),
}));

const mockFetch = platformFetch as jest.MockedFunction<typeof fetch>;

describe("apiFetch", () => {
  afterEach(() => {
    mockFetch.mockReset();
  });

  it("returns parsed JSON on 2xx", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    } as Response);

    const data = await apiFetch<{ ok: boolean }>("/ok", {
      baseUrl: "http://test",
      timeoutMs: 1000,
    });
    expect(data.ok).toBe(true);
  });

  it("throws ApiError with fallbackHint on non-2xx", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () =>
        JSON.stringify({
          error: {
            code: "UPSTREAM_UNAVAILABLE",
            message: "down",
            retryable: true,
            fallback_hint: "USE_ONDEVICE",
          },
        }),
    } as Response);

    await expect(
      apiFetch<unknown>("/fail", { baseUrl: "http://test", timeoutMs: 1000 }),
    ).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE", fallbackHint: "USE_ONDEVICE" });
  });

  it("maps AbortError to LLM_TIMEOUT", async () => {
    mockFetch.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        const e = new Error("The operation was aborted");
        e.name = "AbortError";
        return Promise.reject(e);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => "{}",
      } as Response);
    });

    const ac = new AbortController();
    ac.abort();
    await expect(
      apiFetch<unknown>("/ok", { baseUrl: "http://test", timeoutMs: 10_000, signal: ac.signal }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
