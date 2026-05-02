import { create } from "zustand";
import type { Language } from "@/shared/config/constants";
import { readOnboarding, writeOnboarding, type PersistedOnboarding } from "./onboardingStorage";

/** Supabase `session.user.id` when signed in; writes are skipped when null. */
let onboardingPersistUserId: string | null = null;

export function setOnboardingPersistUserId(userId: string | null): void {
  onboardingPersistUserId = userId;
}

const ONBOARDING_DEFAULTS = {
  language: null,
  state: null,
  district: null,
  village: null,
  farmerName: null,
  cropsText: null,
  soilType: null,
  lat: null,
  lng: null,
  landAcres: null,
  hasCompletedOnboarding: false,
} as const;

type S = {
  language: Language | null;
  state: string | null;
  district: string | null;
  village: string | null;
  /** Display name for twin `name` (optional; falls back to auth metadata on sync). */
  farmerName: string | null;
  /** Comma-separated crop names; synced as twin `current_crops`. */
  cropsText: string | null;
  /** Twin `land.soil_type` (e.g. loamy, clay). */
  soilType: string | null;
  /** GPS fix from onboarding detection (WGS84); sent with twin and chat context. */
  lat: number | null;
  lng: number | null;
  landAcres: string | null;
  hasCompletedOnboarding: boolean;
  setLanguage: (l: Language) => void;
  /** Persists state/district and twin-aligned farm fields from onboarding or profile. */
  setLocation: (
    s: string,
    d: string,
    extras?: {
      landAcres?: string | null;
      lat?: number | null;
      lng?: number | null;
      village?: string | null;
      farmerName?: string | null;
      cropsText?: string | null;
      soilType?: string | null;
    },
  ) => void;
  setCompleted: (v: boolean) => void;
  hydrate: (p: Partial<PersistedOnboarding>) => void;
};

const toPersist = (g: S): PersistedOnboarding => ({
  language: g.language,
  state: g.state,
  district: g.district,
  village: g.village,
  farmerName: g.farmerName,
  cropsText: g.cropsText,
  soilType: g.soilType,
  lat: g.lat,
  lng: g.lng,
  landAcres: g.landAcres,
  hasCompletedOnboarding: g.hasCompletedOnboarding,
});

function persistIfSignedIn(get: () => S): void {
  const uid = onboardingPersistUserId;
  if (!uid) return;
  void writeOnboarding(uid, toPersist(get()));
}

export const useOnboarding = create<S>((set, get) => ({
  ...ONBOARDING_DEFAULTS,
  setLanguage: (language) => {
    set({ language });
    persistIfSignedIn(get);
  },
  setLocation: (state, district, extras) => {
    const prev = get();
    set({
      state,
      district,
      lat: extras?.lat !== undefined ? extras.lat : prev.lat,
      lng: extras?.lng !== undefined ? extras.lng : prev.lng,
      landAcres: extras?.landAcres !== undefined ? extras.landAcres : prev.landAcres,
      village: extras?.village !== undefined ? extras.village : prev.village,
      farmerName: extras?.farmerName !== undefined ? extras.farmerName : prev.farmerName,
      cropsText: extras?.cropsText !== undefined ? extras.cropsText : prev.cropsText,
      soilType: extras?.soilType !== undefined ? extras.soilType : prev.soilType,
    });
    persistIfSignedIn(get);
  },
  setCompleted: (hasCompletedOnboarding) => {
    set({ hasCompletedOnboarding });
    persistIfSignedIn(get);
  },
  hydrate: (p) =>
    set((s) => {
      const next: Partial<S> = {};
      if (p.language !== undefined) next.language = p.language as Language | null;
      if (p.state !== undefined) next.state = p.state;
      if (p.district !== undefined) next.district = p.district;
      if (p.village !== undefined) next.village = p.village;
      if (p.farmerName !== undefined) next.farmerName = p.farmerName;
      if (p.cropsText !== undefined) next.cropsText = p.cropsText;
      if (p.soilType !== undefined) next.soilType = p.soilType;
      if (p.lat !== undefined) next.lat = p.lat;
      if (p.lng !== undefined) next.lng = p.lng;
      if (p.landAcres !== undefined) next.landAcres = p.landAcres;
      if (p.hasCompletedOnboarding !== undefined)
        next.hasCompletedOnboarding = p.hasCompletedOnboarding;
      return { ...s, ...next };
    }),
}));

/**
 * Call when auth session changes. Pass `session.user.id` after sign-in, or `null` after sign-out.
 * Ensures each account has its own onboarding completion flag (new signups start incomplete).
 */
export async function rehydrateOnboardingFromStorage(userId: string | null): Promise<void> {
  setOnboardingPersistUserId(userId);
  if (!userId) {
    useOnboarding.setState({ ...ONBOARDING_DEFAULTS });
    return;
  }
  const p = await readOnboarding(userId);
  useOnboarding.setState({ ...ONBOARDING_DEFAULTS });
  if (p) {
    useOnboarding.getState().hydrate(p);
  }
}
