export type WeatherCurrentDto = {
  temperature_c?: number;
  feels_like_c?: number;
  humidity_pct?: number;
  wind_speed_kmh?: number;
  precipitation_mm?: number;
  weather_code?: number;
  condition?: string;
};

export type WeatherForecastDayDto = {
  date?: string;
  temp_max_c?: number;
  temp_min_c?: number;
  precipitation_mm?: number;
  precip_probability_pct?: number;
  weather_code?: number;
  condition?: string;
};

export type WeatherReportDto = {
  farmer_id?: string;
  lat?: number;
  lng?: number;
  current?: WeatherCurrentDto;
  forecast?: WeatherForecastDayDto[];
  cached?: boolean;
  fetched_at?: string;
  expires_at?: string;
  data_source?: string;
  location_label?: string;
} & Record<string, unknown>;
