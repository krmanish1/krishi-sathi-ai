import type { FarmerTwin } from "@/shared/api/types";
import { getDb } from "@/shared/storage/db";

export async function getCachedTwin(farmerId: string): Promise<FarmerTwin | null> {
  const d = getDb();
  const row = await d.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM twin_cache WHERE farmer_id = ?",
    [farmerId],
  );
  if (!row) {
    return null;
  }
  return JSON.parse(row.payload) as FarmerTwin;
}

export async function setCachedTwin(farmerId: string, twin: FarmerTwin): Promise<void> {
  const d = getDb();
  await d.runAsync(
    "INSERT OR REPLACE INTO twin_cache (farmer_id, payload, updated_at) VALUES (?, ?, ?)",
    [farmerId, JSON.stringify(twin), Date.now()],
  );
}

export async function clearTwinCache(farmerId: string): Promise<void> {
  const d = getDb();
  await d.runAsync("DELETE FROM twin_cache WHERE farmer_id = ?", [farmerId]);
}
