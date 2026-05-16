import { ApiError, mapError, parseErrorResponse } from "@/shared/api/errors";

describe("parseErrorResponse", () => {
  it("parses a full envelope", () => {
    const err = parseErrorResponse(429, {
      error: {
        code: "UPSTREAM_RATE_LIMIT",
        message: "x",
        retryable: true,
        retry_after_seconds: 5,
        fallback_hint: "USE_ONDEVICE",
      },
    });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("UPSTREAM_RATE_LIMIT");
    expect(err.retryable).toBe(true);
    expect(err.retryAfterSeconds).toBe(5);
    expect(err.fallbackHint).toBe("USE_ONDEVICE");
  });

  it("falls back to INTERNAL_ERROR on malformed body", () => {
    const err = parseErrorResponse(500, null);
    expect(err.code).toBe("INTERNAL_ERROR");
  });
});

describe("mapError", () => {
  it("maps USE_ONDEVICE hint to silent-ondevice action", () => {
    const err = new ApiError("UPSTREAM_UNAVAILABLE", 503, "x", true, undefined, "USE_ONDEVICE");
    expect(mapError(err).action).toBe("silent-ondevice");
  });

  it("maps RETRY_ONLINE_LATER to retry action", () => {
    const err = new ApiError("INTERNAL_ERROR", 500, "x", false, undefined, "RETRY_ONLINE_LATER");
    expect(mapError(err).action).toBe("retry");
  });

  it("maps validation errors to toast", () => {
    const err = new ApiError("VALIDATION_ERROR", 400, "x", false, undefined, null);
    expect(mapError(err).action).toBe("toast");
  });
});
