import type { Language } from "@/shared/config/constants";

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

// Matches backend: "live" (from network) | "offline" (served from server cache)
export type DataSource = "live" | "offline";

export type QueryRequest = {
  farmer_id: string;
  query: {
    text: string;
    voice_b64?: string | null;
    image_ref: string | null;
    language: Language;
  };
  context: {
    location: { lat?: number; lng?: number; district: string; state: string };
    connectivity: Connectivity;
    device_intent: DeviceIntent;
    device_capabilities: { ondevice_model: OnDeviceModel };
  };
};

export type QueryResponse = {
  response_id: string;
  text: string;
  structured?: { kind: string; data: unknown } | null;
  data_source: DataSource;
  confidence_level: "low" | "medium" | "high";
  confidence_score: number;
  model_used: string;
  tool_trace: unknown;
  safety_flags: unknown;
  fallback_hint: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
  language: string;
  timestamp: string;
};

export type ImageUploadResponse = {
  image_ref: string;
  expires_at: string;
  mime: string;
  bytes: number;
};

export type SyncBundle = {
  bundle_version: string;
  generated_at: string;
  district: string;
  state: string;
  data: {
    schemes: unknown[];
    mandi_prices: unknown[];
    crop_calendar: Record<string, unknown>;
    weather_history: unknown[];
  };
  ttl_hours: number;
};

// Aligned to backend AgentTwin schema.
// preferred_language replaces the old `language` field.
// current_crops replaces the old `crops` field.
export type FarmerTwin = {
  farmer_id: string;
  name?: string | null;
  preferred_language?: string | null;
  location: {
    district: string;
    state: string;
    village?: string;
    lat?: number;
    lng?: number;
  };
  current_crops?: { name: string; area_acres: number; sown_on?: string }[];
  land?: { total_acres?: number; soil_type?: string; irrigation?: string };
  financial?: {
    kcc_loan_amount?: number;
    kcc_bank?: string;
    pm_fasal_bima?: boolean;
  };
  risk_profile?: string | null;
  interaction_history?: unknown[];
  livestock?: { kind: string; count: number }[];
};

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

export type ErrorEnvelope = {
  error: {
    code: ErrorCode | string;
    message: string;
    retryable: boolean;
    retry_after_seconds?: number;
    fallback_hint?: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
  };
};
