export const TIMEOUTS_MS = {
  query: 90_000,
  queryImage: 30_000,
  /** HF Space / cold backends may need 30s+ for first gzip bundle. */
  syncBundle: 45_000,
  syncPush: 45_000,
  /** Health must outlast cold-start hosts (e.g. Hugging Face Spaces waking from sleep). */
  health: 60_000,
  conversation: 20_000,
  /** GET …/history can be slower / flakier on Space proxies than list conversations. */
  conversationHistory: 45_000,
  weather: 45_000,
} as const;

export const CONFIDENCE_THRESHOLD_LOW = 0.7;

export const SUPPORTED_LANGUAGES = ["hi", "en", "pa", "te", "mr", "bn"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
