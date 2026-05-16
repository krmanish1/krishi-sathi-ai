import type { Language } from "@/shared/config/constants";

export type Connectivity = "online" | "offline" | "degraded";

/**
 * Backend query params and `ContextPayload.connectivity` are documented as `online` | `offline`
 * (see [API docs](https://nikesh2290-krishisaathi-backend.hf.space/docs#/)).
 * Map app `degraded` → `online` so the wire value is always one of those two.
 */
export function queryConnectivityWire(c: Connectivity): "online" | "offline" {
  return c === "offline" ? "offline" : "online";
}

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

/** POST `/api/v1/query` and `/api/v1/query/stream` body (matches backend OpenAPI). */
export type QueryRequest = {
  farmer_id: string;
  conversation_id: string;
  query: {
    text: string;
    voice_b64: string;
    image_ref: string | null;
    language: Language;
  };
  context: {
    location: { state: string; district: string; lat?: number; lng?: number };
    connectivity: "online" | "offline";
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

/** GET `/api/v1/weather/{farmer_id}` — OpenAPI-aligned; extra keys may appear at runtime. */
export type FarmerWeatherCurrent = {
  temperature_c?: number;
  feels_like_c?: number;
  humidity_pct?: number;
  wind_speed_kmh?: number;
  precipitation_mm?: number;
  weather_code?: number;
  condition?: string;
};

export type FarmerWeatherForecastDay = {
  date?: string;
  temp_max_c?: number;
  temp_min_c?: number;
  precipitation_mm?: number;
  precip_probability_pct?: number;
  weather_code?: number;
  condition?: string;
};

export type FarmerWeatherReport = {
  farmer_id?: string;
  lat?: number;
  lng?: number;
  current?: FarmerWeatherCurrent;
  forecast?: FarmerWeatherForecastDay[];
  cached?: boolean;
  fetched_at?: string;
  expires_at?: string;
  /** Legacy / extended fields still honored in `weatherDisplayFromReport` */
  data_source?: string;
  location_label?: string;
  place?: string;
  condition?: string;
  temperature_c?: number;
  humidity_percent?: number;
  rain_chance_percent?: number;
} & Record<string, unknown>;

// Aligned to backend twin schema (GET/PUT).
// Wire `current_crops` is string[]; legacy object-shaped crops may still appear on cached payloads and are normalized in twinWire.
// `land.irrigation` is optional — retained only when older API responses include it (not sent on PUT).
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
  current_crops?: string[];
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

export type Conversation = {
  conversation_id: string;
  farmer_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

/** GET `/api/v1/farmer/.../conversations/.../history` — OpenAPI: object with open properties. */
export type ConversationHistoryResponse = Record<string, unknown>;

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

/** Single commodity row from the data.gov.in AGMARKNET mandi prices API. */
export type DataGovMandiRecord = {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  /** Format: DD/MM/YYYY */
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
};

/** Top-level response from `GET https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`. */
export type DataGovMandiResponse = {
  total: number;
  count: number;
  records: DataGovMandiRecord[];
};

/** Generic data.gov.in list response (district directory, eNAM trade, etc.). */
export type DataGovRecordsEnvelope = {
  total: number;
  count: number;
  records: unknown[];
};

export type VoiceTokenRequest = {
  farmer_id: string;
  conversation_id?: string;
  room_name?: string;
  participant_identity?: string;
  language?: Language;
};

export type VoiceTokenResponse = {
  server_url: string;
  room_name: string;
  participant_token: string;
  participant_identity: string;
};
