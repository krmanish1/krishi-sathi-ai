export type Connectivity = "online" | "offline" | "degraded";

export type DeviceIntent =
  | "crop_disease"
  | "scheme_query"
  | "market_price"
  | "financial"
  | "weather"
  | "crop_plan"
  | "general"
  | "alert";

export type OnDeviceModel = "gemma-4-e4b-it" | "gemma-4-e2b-it";

export type DataSource = "live" | "offline";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "FARMER_NOT_FOUND"
  | "IMAGE_REF_EXPIRED"
  | "LLM_TIMEOUT"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_UNSUPPORTED_TYPE"
  | "UPSTREAM_RATE_LIMIT"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL_ERROR";
