import { secureDelete, secureGet, secureSet } from "@/shared/storage/secure";

/** Pre–per-user installs used a single key; migrated once into `keyFor(userId)`. */
const LEGACY_KEY = "onboarding_v1";

function keyFor(userId: string): string {
  return `onboarding_v1:${userId}`;
}

export type PersistedOnboarding = {
  language: string | null;
  state: string | null;
  district: string | null;
  village: string | null;
  farmerName: string | null;
  cropsText: string | null;
  soilType: string | null;
  lat: number | null;
  lng: number | null;
  /** Land size in acres as entered on onboarding (string for TextInput parity). */
  landAcres: string | null;
  hasCompletedOnboarding: boolean;
};

function parsePayload(raw: string): PersistedOnboarding | null {
  try {
    const p = JSON.parse(raw) as Partial<PersistedOnboarding>;
    return {
      language: p.language ?? null,
      state: p.state ?? null,
      district: p.district ?? null,
      village: p.village ?? null,
      farmerName: p.farmerName ?? null,
      cropsText: p.cropsText ?? null,
      soilType: p.soilType ?? null,
      lat: typeof p.lat === "number" && Number.isFinite(p.lat) ? p.lat : null,
      lng: typeof p.lng === "number" && Number.isFinite(p.lng) ? p.lng : null,
      landAcres: p.landAcres ?? null,
      hasCompletedOnboarding: p.hasCompletedOnboarding ?? false,
    };
  } catch {
    return null;
  }
}

/**
 * Load onboarding blob for this Supabase user (`session.user.id`).
 * New signups have no row → null → caller should reset in-memory onboarding.
 */
export async function readOnboarding(userId: string): Promise<PersistedOnboarding | null> {
  const keyed = await secureGet(keyFor(userId));
  if (keyed) {
    return parsePayload(keyed);
  }
  const legacy = await secureGet(LEGACY_KEY);
  if (legacy) {
    const p = parsePayload(legacy);
    if (p) {
      await secureSet(keyFor(userId), legacy);
      await secureDelete(LEGACY_KEY);
    }
    return p;
  }
  return null;
}

export function writeOnboarding(userId: string, p: PersistedOnboarding): Promise<void> {
  return secureSet(keyFor(userId), JSON.stringify(p));
}
