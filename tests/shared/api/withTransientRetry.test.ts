import { ApiError } from "@/shared/api/errors";
import { isTransientTransportError, withTransientRetry } from "@/shared/api/withTransientRetry";

describe("isTransientTransportError", () => {
  it("is true for pre-HTTP failures (status 0)", () => {
    expect(
      isTransientTransportError(
        new ApiError("INTERNAL_ERROR", 0, "Network request failed", false, undefined, "RETRY_ONLINE_LATER"),
      ),
    ).toBe(true);
  });

  it("is true when server marked retryable", () => {
    expect(
      isTransientTransportError(
        new ApiError("UPSTREAM_UNAVAILABLE", 503, "busy", true, undefined, "RETRY_ONLINE_LATER"),
      ),
    ).toBe(true);
  });

  it("is false for normal client errors", () => {
    expect(
      isTransientTransportError(
        new ApiError("VALIDATION_ERROR", 400, "bad", false, undefined, null),
      ),
    ).toBe(false);
  });
});

describe("withTransientRetry", () => {
  it("retries then succeeds", async () => {
    jest.useFakeTimers();
    let n = 0;
    const fn = jest.fn().mockImplementation(async () => {
      n += 1;
      if (n < 2) {
        throw new ApiError("INTERNAL_ERROR", 0, "Network request failed", false, undefined, "RETRY_ONLINE_LATER");
      }
      return "ok";
    });

    const p = withTransientRetry(fn, { attempts: 3, baseDelayMs: 100 });
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(150);
    await expect(p).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("stops after attempts", async () => {
    const err = new ApiError(
      "INTERNAL_ERROR",
      0,
      "Network request failed",
      false,
      undefined,
      "RETRY_ONLINE_LATER",
    );
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withTransientRetry(fn, { attempts: 2, baseDelayMs: 1 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient errors", async () => {
    const fn = jest.fn().mockRejectedValue(
      new ApiError("VALIDATION_ERROR", 400, "bad", false, undefined, null),
    );
    await expect(withTransientRetry(fn, { attempts: 3 })).rejects.toBeInstanceOf(ApiError);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
