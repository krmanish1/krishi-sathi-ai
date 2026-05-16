export type ApiResponse<T> = {
  data: T;
  error?: ApiErrorDto;
  success: boolean;
};

export type ApiErrorDto = {
  code: string;
  message: string;
  retryable: boolean;
  retry_after_seconds?: number;
  fallback_hint?: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
};
