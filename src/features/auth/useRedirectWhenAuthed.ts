import { useEffect } from "react";
import { router } from "expo-router";
import { rehydrateOnboardingFromStorage, useOnboarding } from "@/features/onboarding/store";
import { useSupabaseSession } from "@/shared/auth";

/** After email auth succeeds, send user to home or onboarding. */
export function useRedirectWhenAuthed(): void {
  const session = useSupabaseSession();

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    void rehydrateOnboardingFromStorage(uid)
      .catch(() => undefined)
      .finally(() => {
        const { hasCompletedOnboarding: done, language: lang, state: st, district: dist } =
          useOnboarding.getState();
        if (done && lang && st && dist) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/(onboarding)/welcome");
        }
      });
  }, [session]);
}
