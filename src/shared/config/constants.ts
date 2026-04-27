export const TIMEOUTS_MS = {
  query: 10_000,
  queryImage: 5_000,
  syncBundle: 15_000,
  health: 3_000,
} as const;

export const CONFIDENCE_THRESHOLD_LOW = 0.7;

export const SUPPORTED_LANGUAGES = ["hi", "en", "pa", "te", "mr", "bn"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
