import { create } from "zustand";
import type { Language } from "@/shared/config/constants";
import { readOnboarding, writeOnboarding, type PersistedOnboarding } from "./onboardingStorage";

type S = {
  language: Language | null;
  state: string | null;
  district: string | null;
  hasCompletedOnboarding: boolean;
  setLanguage: (l: Language) => void;
  setLocation: (s: string, d: string) => void;
  setCompleted: (v: boolean) => void;
  hydrate: (p: Partial<PersistedOnboarding>) => void;
};

const toPersist = (g: S): PersistedOnboarding => ({
  language: g.language,
  state: g.state,
  district: g.district,
  hasCompletedOnboarding: g.hasCompletedOnboarding,
});

export const useOnboarding = create<S>((set, get) => ({
  language: null,
  state: null,
  district: null,
  hasCompletedOnboarding: false,
  setLanguage: (language) => {
    set({ language });
    void writeOnboarding(toPersist({ ...get(), language }));
  },
  setLocation: (state, district) => {
    set({ state, district });
    void writeOnboarding(toPersist({ ...get(), state, district }));
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
