import { secureGet, secureSet } from "@/shared/storage/secure";

const KEY = "onboarding_v1";

export type PersistedOnboarding = {
  language: string | null;
  state: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  /** Land size in acres as entered on onboarding (string for TextInput parity). */
  landAcres: string | null;
  irrigation: boolean | null;
  hasCompletedOnboarding: boolean;
};

export async function readOnboarding(): Promise<PersistedOnboarding | null> {
  const raw = await secureGet(KEY);
  if (!raw) {
    return null;
  }
  try {
    const p = JSON.parse(raw) as Partial<PersistedOnboarding>;
    return {
      language: p.language ?? null,
      state: p.state ?? null,
      district: p.district ?? null,
      lat: typeof p.lat === "number" && Number.isFinite(p.lat) ? p.lat : null,
      lng: typeof p.lng === "number" && Number.isFinite(p.lng) ? p.lng : null,
      landAcres: p.landAcres ?? null,
      irrigation: p.irrigation ?? null,
      hasCompletedOnboarding: p.hasCompletedOnboarding ?? false,
    };
  } catch {
    return null;
  }
}

export function writeOnboarding(p: PersistedOnboarding): Promise<void> {
  return secureSet(KEY, JSON.stringify(p));
}
