import type { ErrorEnvelope } from "./types";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public retryable: boolean,
    public retryAfterSeconds: number | undefined,
    public fallbackHint: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const isEnvelope = (v: unknown): v is ErrorEnvelope =>
  !!v && typeof v === "object" && "error" in (v as Record<string, unknown>);

export const parseErrorResponse = (status: number, body: unknown): ApiError => {
  if (!isEnvelope(body)) {
    return new ApiError(
      "INTERNAL_ERROR",
      status,
      "Unknown error",
      false,
      undefined,
      "RETRY_ONLINE_LATER",
    );
  }
  const e = body.error;
  return new ApiError(
    e.code,
    status,
    e.message,
    e.retryable,
    e.retry_after_seconds,
    e.fallback_hint ?? null,
  );
};

export type MappedError = {
  userMessageKey: string;
  action: "banner" | "toast" | "retry" | "silent-ondevice";
  retryAfterMs?: number;
};

export const mapError = (e: unknown): MappedError => {
  if (!(e instanceof ApiError)) {
    return { userMessageKey: "errors.generic", action: "toast" };
  }
  if (e.fallbackHint === "USE_ONDEVICE") {
    return { userMessageKey: "errors.networkBusy", action: "silent-ondevice" };
  }
  if (e.fallbackHint === "RETRY_ONLINE_LATER") {
    return {
      userMessageKey: "errors.retryLater",
      action: "retry",
      retryAfterMs: (e.retryAfterSeconds ?? 30) * 1000,
    };
  }
  switch (e.code) {
    case "VALIDATION_ERROR":
      return { userMessageKey: "errors.validation", action: "toast" };
    case "IMAGE_TOO_LARGE":
      return { userMessageKey: "errors.imageTooLarge", action: "toast" };
    case "IMAGE_UNSUPPORTED_TYPE":
      return { userMessageKey: "errors.imageUnsupported", action: "toast" };
    case "IMAGE_REF_EXPIRED":
      return { userMessageKey: "errors.imageExpired", action: "retry" };
    case "FARMER_NOT_FOUND":
      return { userMessageKey: "errors.farmerMissing", action: "retry" };
    default:
      return { userMessageKey: "errors.generic", action: "toast" };
  }
};
