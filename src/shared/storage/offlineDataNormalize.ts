import type { SyncBundle } from "@/shared/api/types";

export type SchemeRow = {
  id: string;
  name: string | null;
  eligibility: string | null;
  benefits: string | null;
  how_to_apply: string | null;
  keywords: string | null;
};

export type MandiPriceRow = {
  crop: string | null;
  mandi: string | null;
  district: string | null;
  state: string | null;
  date: string | null;
  price_inr: number | null;
  unit: string | null;
};

export type WeatherHistRow = {
  district: string | null;
  month: number | null;
  avg_temp_c: number | null;
  avg_rain_mm: number | null;
};

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return String(v);
}

function hash32(input: string): string {
  // Deterministic small hash (FNV-1a 32-bit)
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Normalize backend sync payload rows into SQLite-friendly shapes. */
export function normalizeSchemeRows(rows: unknown[]): SchemeRow[] {
  return rows.map((raw, idx) => {
    const r = raw as Record<string, unknown>;
    const nameStable = str(r.name) ?? str(r.scheme_name) ?? "";
    const fallback = nameStable ? `scheme-${hash32(nameStable)}` : `scheme-${idx}`;
    const id =
      str(r.id) ??
      str(r.scheme_id) ??
      fallback;
    return {
      id,
      name: str(r.name) ?? str(r.scheme_name),
      eligibility: str(r.eligibility),
      benefits: str(r.benefits),
      how_to_apply: str(r.how_to_apply) ?? str(r.how_apply),
      keywords: str(r.keywords),
    };
  });
}

export function normalizeMandiRows(rows: unknown[]): MandiPriceRow[] {
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      crop: str(r.crop) ?? str(r.commodity),
      mandi: str(r.mandi) ?? str(r.market),
      district: str(r.district),
      state: str(r.state),
      date: str(r.date) ?? str(r.price_date),
      price_inr: num(r.price_inr) ?? num(r.price) ?? num(r.rate),
      unit: str(r.unit) ?? str(r.units),
    };
  });
}

export function normalizeWeatherRows(rows: unknown[]): WeatherHistRow[] {
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      district: str(r.district),
      month: num(r.month),
      avg_temp_c: num(r.avg_temp_c) ?? num(r.avg_temperature_c),
      avg_rain_mm: num(r.avg_rain_mm) ?? num(r.avg_rainfall_mm),
    };
  });
}

export function normalizeCropCalendar(cal: Record<string, unknown>): { crop: string; dataJson: string }[] {
  return Object.entries(cal).map(([crop, val]) => ({
    crop,
    dataJson: JSON.stringify(val ?? {}),
  }));
}

/** Build normalized tables snapshot from SyncBundle.data (used by native + web). */
export function tablesFromBundle(bundle: SyncBundle): {
  schemes: SchemeRow[];
  mandi: MandiPriceRow[];
  calendar: { crop: string; dataJson: string }[];
  weather: WeatherHistRow[];
} {
  const schemes = normalizeSchemeRows(Array.isArray(bundle.data.schemes) ? bundle.data.schemes : []);
  const mandi = normalizeMandiRows(
    Array.isArray(bundle.data.mandi_prices) ? bundle.data.mandi_prices : [],
  );
  const calRaw =
    bundle.data.crop_calendar && typeof bundle.data.crop_calendar === "object"
      ? (bundle.data.crop_calendar as Record<string, unknown>)
      : {};
  const calendar = normalizeCropCalendar(calRaw);
  const weather = normalizeWeatherRows(
    Array.isArray(bundle.data.weather_history) ? bundle.data.weather_history : [],
  );
  return { schemes, mandi, calendar, weather };
}
