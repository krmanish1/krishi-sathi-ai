import { randomUUID } from "@/shared/utils/uuid";
import { secureGet, secureSet } from "@/shared/storage/secure";

const KEY = "farmer_id";
let cached: string | null = null;

export const getOrCreateFarmerId = async (): Promise<string> => {
  if (cached) {
    return cached;
  }
  const existing = await secureGet(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = `anon_${randomUUID()}`;
  await secureSet(KEY, fresh);
  cached = fresh;
  return fresh;
};

export const __resetFarmerIdForTests = (): void => {
  cached = null;
};
