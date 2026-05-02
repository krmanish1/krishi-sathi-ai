import type { FarmerWeatherReport } from "@/shared/api/types";

export type WeatherDisplay = {
  tempLabel: string;
  conditionLabel: string;
  placeLabel: string;
  humidityLabel: string;
  rainLabel: string;
  /** UI badge: live fetch vs cached / offline payload */
  source: "live" | "cached" | "unknown";
};

/** Stringify numeric API values without rounding (JSON number → same decimal form in typical cases). */
export function formatExactNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function exactPercent(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${formatExactNumber(n)}%`;
}

function pickNum(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function pickStr(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/**
 * Maps GET `/api/v1/weather/{farmer_id}` JSON into a compact home-card summary.
 * Shows temperature, condition, place, humidity, and rain chance only.
 * Numeric values are not rounded. Rain chance may come from the first forecast day when absent on current.
 */
export function weatherDisplayFromReport(
  raw: FarmerWeatherReport | undefined,
  fallbackPlace: string,
): WeatherDisplay {
  const dash = "—";
  const fb = fallbackPlace.trim() || dash;

  if (!raw) {
    return {
      tempLabel: dash,
      conditionLabel: "",
      placeLabel: fb,
      humidityLabel: dash,
      rainLabel: dash,
      source: "unknown",
    };
  }

  const current = raw.current;
  const currentLoose = asRecord(raw.current);
  const loc = asRecord(raw.location) ?? asRecord(currentLoose?.location);

  const forecastArr = Array.isArray(raw.forecast) ? raw.forecast : [];
  const forecastFirst = forecastArr[0];
  const forecastLoose = asRecord(forecastFirst);

  const temp = pickNum(
    raw.temperature_c,
    raw.temp_c,
    raw.temperature,
    current?.temperature_c,
    currentLoose?.temp_c,
    currentLoose?.temperature,
  );
  const tempLabel =
    temp != null
      ? `${formatExactNumber(temp)}°C`
      : pickStr(raw.temperature_display, currentLoose?.temperature_display) || dash;

  const conditionLabel = pickStr(
    raw.condition,
    raw.summary,
    raw.description,
    raw.weather_summary,
    current?.condition,
    currentLoose?.summary,
  );

  const place = pickStr(
    raw.location_label,
    raw.place,
    raw.place_name,
    raw.district,
    typeof raw.city === "string" ? raw.city : "",
    loc?.label,
    loc?.name,
    loc?.district,
    asRecord(raw.address)?.label,
  );

  const hum = pickNum(
    raw.humidity_percent,
    raw.humidity,
    current?.humidity_pct,
    currentLoose?.humidity_percent,
    currentLoose?.humidity,
  );
  const humidityLabel = hum != null ? exactPercent(hum) : pickStr(raw.humidity_display) || dash;

  const rain = pickNum(
    raw.rain_chance_percent,
    raw.precipitation_chance_percent,
    raw.precipitation_probability,
    raw.rain_chance,
    currentLoose?.rain_chance_percent,
    currentLoose?.precipitation_chance_percent,
    currentLoose?.precip_probability_pct,
    forecastFirst?.precip_probability_pct,
    forecastLoose?.precip_probability_pct,
  );
  const rainLabel = rain != null ? exactPercent(rain) : pickStr(raw.rain_display) || dash;

  const ds = pickStr(raw.data_source).toLowerCase();
  const forceCached = raw.cached === true;
  const explicitLive = raw.cached === false;
  let source: WeatherDisplay["source"] = "unknown";
  if (forceCached || ds === "offline" || ds === "cached") {
    source = "cached";
  } else if (explicitLive || ds === "live") {
    source = "live";
  }

  return {
    tempLabel,
    conditionLabel,
    placeLabel: place || fb,
    humidityLabel,
    rainLabel,
    source,
  };
}
