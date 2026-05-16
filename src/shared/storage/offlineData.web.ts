import type { SyncBundle } from "@/shared/api/types";
import { loadBundlePayload } from "./bundle";
import {
  tablesFromBundle,
  type MandiPriceRow,
  type SchemeRow,
  type WeatherHistRow,
} from "./offlineDataNormalize";

type Snapshot =
  | {
      schemes: SchemeRow[];
      mandi: MandiPriceRow[];
      calendar: { crop: string; dataJson: string }[];
      weather: WeatherHistRow[];
    }
  | null;

let snapshot: Snapshot = null;

export async function saveOfflineBundle(bundle: SyncBundle): Promise<void> {
  snapshot = tablesFromBundle(bundle);
}

async function getSnapshot(): Promise<NonNullable<Snapshot>> {
  if (snapshot) return snapshot;
  const b = await loadBundlePayload();
  if (!b) {
    return { schemes: [], mandi: [], calendar: [], weather: [] };
  }
  snapshot = tablesFromBundle(b);
  return snapshot;
}

function simpleSchemeSearch(rows: SchemeRow[], q: string): SchemeRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows.slice(0, 3);
  return rows
    .filter((s) =>
      `${s.keywords ?? ""} ${s.name ?? ""} ${s.benefits ?? ""}`
        .toLowerCase()
        .includes(needle),
    )
    .slice(0, 3);
}

export async function querySchemes(searchText: string): Promise<SchemeRow[]> {
  const s = await getSnapshot();
  if (s.schemes.length === 0) return [];
  const hit = simpleSchemeSearch(s.schemes, searchText);
  return hit.length > 0 ? hit : s.schemes.slice(0, 3);
}

export async function queryMandiPrices(crop: string, district: string): Promise<MandiPriceRow[]> {
  const s = await getSnapshot();
  const c = crop.trim().toLowerCase();
  const d = district.trim().toLowerCase();
  return s.mandi
    .filter((m) => {
      const mc = (m.crop ?? "").toLowerCase();
      const md = (m.district ?? "").toLowerCase();
      return mc.includes(c) && (d === "" || md.includes(d));
    })
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    .slice(0, 21);
}

export async function queryCropCalendar(cropKey: string): Promise<unknown | null> {
  const s = await getSnapshot();
  const k = cropKey.trim().toLowerCase();
  const hit = s.calendar.find((c) => c.crop.toLowerCase().includes(k));
  if (!hit) return null;
  try {
    return JSON.parse(hit.dataJson) as unknown;
  } catch {
    return hit.dataJson;
  }
}

export async function queryWeatherHistory(
  district: string,
  month: number,
): Promise<WeatherHistRow | null> {
  const s = await getSnapshot();
  const d = district.trim().toLowerCase();
  const exact =
    s.weather.find((w) => (w.district ?? "").toLowerCase() === d && Number(w.month) === month) ?? null;
  if (exact) return exact;
  if (d.length < 3) return null;
  return (
    s.weather.find(
      (w) => (w.district ?? "").toLowerCase().includes(d) && Number(w.month) === month,
    ) ?? null
  );
}

export function ftsQueryToken(q: string): string {
  return q.trim().split(/\s+/u).slice(0, 5).join(" OR ");
}
