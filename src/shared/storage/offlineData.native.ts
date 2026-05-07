import { getDb } from "./db";
import type { SyncBundle } from "@/shared/api/types";
import { tablesFromBundle } from "./offlineDataNormalize";
import type { MandiPriceRow, SchemeRow, WeatherHistRow } from "./offlineDataNormalize";

function escapeLike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function saveOfflineBundle(bundle: SyncBundle): Promise<void> {
  const db = getDb();
  const { schemes, mandi, calendar, weather } = tablesFromBundle(bundle);
  await db.execAsync("BEGIN TRANSACTION");
  try {
    await db.execAsync(`DELETE FROM schemes`);
    await db.execAsync(`DELETE FROM mandi_prices`);
    await db.execAsync(`DELETE FROM crop_calendar`);
    await db.execAsync(`DELETE FROM weather_history`);

    for (const s of schemes) {
      await db.runAsync(
        `INSERT INTO schemes (id, name, eligibility, benefits, how_to_apply, keywords)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, s.name, s.eligibility, s.benefits, s.how_to_apply, s.keywords],
      );
    }
    for (const m of mandi) {
      await db.runAsync(
        `INSERT INTO mandi_prices (crop, mandi, district, state, date, price_inr, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [m.crop, m.mandi, m.district, m.state, m.date, m.price_inr, m.unit],
      );
    }
    for (const c of calendar) {
      await db.runAsync(`INSERT INTO crop_calendar (crop, data) VALUES (?, ?)`, [
        c.crop,
        c.dataJson,
      ]);
    }
    for (const w of weather) {
      if (w.district == null || w.month == null) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO weather_history (district, month, avg_temp_c, avg_rain_mm)
         VALUES (?, ?, ?, ?)`,
        [w.district, w.month, w.avg_temp_c, w.avg_rain_mm],
      );
    }

    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
}

/** FTS5-safe-ish token bundle (alphanumeric + Hindi range + hyphen). */
export function ftsQueryToken(q: string): string {
  const t = q
    .trim()
    .split(/\s+/u)
    .slice(0, 5)
    .join(" OR ");
  const cleaned = t.replace(/[^\w\u0900-\u097F\s-]/gu, "").trim();
  return cleaned.length > 0 ? cleaned : "*";
}

export async function querySchemes(searchText: string): Promise<SchemeRow[]> {
  const db = getDb();
  const token = ftsQueryToken(searchText);
  if (!token || token === "*") {
    return db.getAllAsync<SchemeRow>(
      `SELECT id, name, eligibility, benefits, how_to_apply, keywords FROM schemes LIMIT 3`,
    );
  }
  try {
    return await db.getAllAsync<SchemeRow>(
      `SELECT s.id, s.name, s.eligibility, s.benefits, s.how_to_apply, s.keywords
       FROM schemes s
       INNER JOIN (
         SELECT rowid FROM schemes_fts WHERE schemes_fts MATCH ?
         ORDER BY rank LIMIT 3
       ) r ON s.rowid = r.rowid`,
      [token],
    );
  } catch {
    const like = `%${escapeLike(searchText.trim().slice(0, 120))}%`;
    return db.getAllAsync<SchemeRow>(
      `SELECT id, name, eligibility, benefits, how_to_apply, keywords FROM schemes
       WHERE COALESCE(keywords,'') LIKE ? ESCAPE '\\'
          OR COALESCE(name,'') LIKE ? ESCAPE '\\'
       LIMIT 3`,
      [like, like],
    );
  }
}

export async function queryMandiPrices(crop: string, district: string): Promise<MandiPriceRow[]> {
  const db = getDb();
  const cropP = `%${escapeLike(crop.trim())}%`;
  const distP = `%${escapeLike(district.trim())}%`;
  return db.getAllAsync<MandiPriceRow>(
    `SELECT crop, mandi, district, state, date, price_inr, unit
     FROM mandi_prices
     WHERE (crop IS NOT NULL AND crop LIKE ? ESCAPE '\\')
       AND (district IS NULL OR district LIKE ? ESCAPE '\\')
     ORDER BY date DESC LIMIT 21`,
    [cropP, distP],
  );
}

export async function queryCropCalendar(cropKey: string): Promise<unknown | null> {
  const db = getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    `SELECT data FROM crop_calendar WHERE crop LIKE ? ESCAPE '\\' LIMIT 1`,
    [`%${escapeLike(cropKey.trim())}%`],
  );
  if (!row?.data) return null;
  try {
    return JSON.parse(row.data) as unknown;
  } catch {
    return row.data;
  }
}

export async function queryWeatherHistory(
  district: string,
  month: number,
): Promise<WeatherHistRow | null> {
  const db = getDb();
  const row = await db.getFirstAsync<WeatherHistRow>(
    `SELECT district, month, avg_temp_c, avg_rain_mm FROM weather_history
     WHERE district = ? AND month = ?`,
    [district.trim(), month],
  );
  if (row) return row;
  return db.getFirstAsync<WeatherHistRow>(
    `SELECT district, month, avg_temp_c, avg_rain_mm FROM weather_history
     WHERE district LIKE ? ESCAPE '\\' AND month = ? ORDER BY district LIMIT 1`,
    [`%${district.trim()}%`, month],
  );
}
