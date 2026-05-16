import type { DataSource } from "@/types/api";

export type QueryResponseDto = {
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

export type ImageUploadResponseDto = {
  image_ref: string;
  expires_at: string;
  mime: string;
  bytes: number;
};
