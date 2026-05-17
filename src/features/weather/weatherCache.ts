import type { FarmerWeatherReport } from "@/shared/api/types";
import { getDb } from "@/shared/storage/db";

export async function getCachedWeather(farmerId: string): Promise<FarmerWeatherReport | null> {
  const d = getDb();
  const row = await d.getFirstAsync<{ payload: string; fetched_at: number }>(
    "SELECT payload, fetched_at FROM weather_cache WHERE farmer_id = ?",
    [farmerId],
  );
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as FarmerWeatherReport;
  } catch {
    return null;
  }
}

export async function setCachedWeather(
  farmerId: string,
  report: FarmerWeatherReport,
): Promise<void> {
  const d = getDb();
  await d.runAsync(
    "INSERT OR REPLACE INTO weather_cache (farmer_id, payload, fetched_at) VALUES (?, ?, ?)",
    [farmerId, JSON.stringify(report), Date.now()],
  );
}
