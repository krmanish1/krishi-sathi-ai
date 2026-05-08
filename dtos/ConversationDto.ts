export type ConversationDto = {
  conversation_id: string;
  farmer_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type SyncBundleDto = {
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
