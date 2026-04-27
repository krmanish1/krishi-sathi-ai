import type { SyncBundle } from "@/shared/api/types";
import { getDb } from "./db";

export const saveBundle = async (version: string, payload: SyncBundle): Promise<void> => {
  const d = getDb();
  await d.runAsync(
    "INSERT OR REPLACE INTO sync_bundle (id, version, payload, updated_at) VALUES (1, ?, ?, ?)",
    [version, JSON.stringify(payload), Date.now()],
  );
};

export const loadBundleVersion = async (): Promise<string | null> => {
  const d = getDb();
  const row = await d.getFirstAsync<{ version: string }>(
    "SELECT version FROM sync_bundle WHERE id = 1",
  );
  return row?.version ?? null;
};

export const loadBundlePayload = async (): Promise<SyncBundle | null> => {
  const d = getDb();
  const row = await d.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM sync_bundle WHERE id = 1",
  );
  if (!row) {
    return null;
  }
  return JSON.parse(row.payload) as SyncBundle;
};
