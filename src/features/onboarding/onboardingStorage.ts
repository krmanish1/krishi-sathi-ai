import { secureGet, secureSet } from "@/shared/storage/secure";

const KEY = "onboarding_v1";

export type PersistedOnboarding = {
  language: string | null;
  state: string | null;
  district: string | null;
  hasCompletedOnboarding: boolean;
};

export async function readOnboarding(): Promise<PersistedOnboarding | null> {
  const raw = await secureGet(KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PersistedOnboarding;
  } catch {
    return null;
  }
}

export function writeOnboarding(p: PersistedOnboarding): Promise<void> {
  return secureSet(KEY, JSON.stringify(p));
}
