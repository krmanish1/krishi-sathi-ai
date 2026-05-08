import type { ErrorCode } from "@/types/api";

export type ErrorEnvelopeDto = {
  error: {
    code: ErrorCode | string;
    message: string;
    retryable: boolean;
    retry_after_seconds?: number;
    fallback_hint?: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
  };
};
