import { create } from "zustand";
import type { Language } from "@/shared/config/constants";
import { readOnboarding, writeOnboarding, type PersistedOnboarding } from "./onboardingStorage";

type S = {
  language: Language | null;
  state: string | null;
  district: string | null;
  /** GPS fix from onboarding detection (WGS84); sent with twin and chat context. */
  lat: number | null;
  lng: number | null;
  landAcres: string | null;
  irrigation: boolean | null;
  hasCompletedOnboarding: boolean;
  setLanguage: (l: Language) => void;
  /** Persists state/district; optional land extras from onboarding or profile. */
  setLocation: (
    s: string,
    d: string,
    extras?: {
      landAcres?: string | null;
      irrigation?: boolean | null;
      lat?: number | null;
      lng?: number | null;
    },
  ) => void;
  setCompleted: (v: boolean) => void;
  hydrate: (p: Partial<PersistedOnboarding>) => void;
};

const toPersist = (g: S): PersistedOnboarding => ({
  language: g.language,
  state: g.state,
  district: g.district,
  lat: g.lat,
  lng: g.lng,
  landAcres: g.landAcres,
  irrigation: g.irrigation,
  hasCompletedOnboarding: g.hasCompletedOnboarding,
});

export const useOnboarding = create<S>((set, get) => ({
  language: null,
  state: null,
  district: null,
  lat: null,
  lng: null,
  landAcres: null,
  irrigation: null,
  hasCompletedOnboarding: false,
  setLanguage: (language) => {
    set({ language });
    void writeOnboarding(toPersist({ ...get(), language }));
  },
  setLocation: (state, district, extras) => {
    const prev = get();
    set({
      state,
      district,
      lat: extras?.lat !== undefined ? extras.lat : prev.lat,
      lng: extras?.lng !== undefined ? extras.lng : prev.lng,
      landAcres: extras?.landAcres !== undefined ? extras.landAcres : prev.landAcres,
      irrigation: extras?.irrigation !== undefined ? extras.irrigation : prev.irrigation,
    });
    void writeOnboarding(toPersist(get()));
  },
  setCompleted: (hasCompletedOnboarding) => {
    set({ hasCompletedOnboarding });
    void writeOnboarding(toPersist({ ...get(), hasCompletedOnboarding }));
  },
  hydrate: (p) =>
    set((s) => {
      const next: Partial<S> = {};
      if (p.language !== undefined) next.language = p.language as Language | null;
      if (p.state !== undefined) next.state = p.state;
      if (p.district !== undefined) next.district = p.district;
      if (p.lat !== undefined) next.lat = p.lat;
      if (p.lng !== undefined) next.lng = p.lng;
      if (p.landAcres !== undefined) next.landAcres = p.landAcres;
      if (p.irrigation !== undefined) next.irrigation = p.irrigation;
      if (p.hasCompletedOnboarding !== undefined)
        next.hasCompletedOnboarding = p.hasCompletedOnboarding;
      return { ...s, ...next };
    }),
}));

export async function rehydrateOnboardingFromStorage(): Promise<void> {
  const p = await readOnboarding();
  if (!p) {
    return;
  }
  useOnboarding.getState().hydrate(p);
}
