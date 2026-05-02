import { useEffect } from "react";
import { router } from "expo-router";
import {
  rehydrateOnboardingFromStorage,
  shouldSkipOnboardingAfterSignIn,
  useOnboarding,
} from "@/features/onboarding/store";
import { useSupabaseSession } from "@/shared/auth";

/** After email auth succeeds, send user to home or onboarding. */
export function useRedirectWhenAuthed(): void {
  const session = useSupabaseSession();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    void rehydrateOnboardingFromStorage(userId)
      .catch(() => undefined)
      .finally(() => {
        const { hasCompletedOnboarding } = useOnboarding.getState();
        if (shouldSkipOnboardingAfterSignIn({ hasCompletedOnboarding })) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/(onboarding)/welcome");
        }
      });
  }, [userId]);
}
