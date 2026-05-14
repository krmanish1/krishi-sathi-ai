import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import {
  rehydrateOnboardingFromStorage,
  shouldSkipOnboardingAfterSignIn,
  useOnboarding,
} from "@/features/onboarding/store";
import { useAuthReady, useSupabaseSession } from "@/shared/auth/AuthProvider";
import { useTranslation } from "react-i18next";
import { useConnectivityUi } from "@/shared/network";

export default function Index() {
  const { t } = useTranslation();
  const ui = useConnectivityUi();
  const [boot, setBoot] = useState(false);
  const { hasCompletedOnboarding } = useOnboarding();
  const authReady = useAuthReady();
  const session = useSupabaseSession();
  const sessionUserId = session?.user?.id ?? null;

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    void rehydrateOnboardingFromStorage(sessionUserId)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBoot(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, sessionUserId]);

  useEffect(() => {
    if (!boot || !authReady) return;

    // Not signed in → always show login
    if (!session) {
      router.replace("/(auth)/login");
      return;
    }

    // Signed in → onboarding only until the flow is completed once (persisted per user).
    if (shouldSkipOnboardingAfterSignIn({ hasCompletedOnboarding })) {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/(onboarding)/welcome");
    }
  }, [authReady, boot, hasCompletedOnboarding, session, sessionUserId]);

  return (
    <View className="flex-1 items-center justify-center bg-page" accessibilityLabel={t("app.name")}>
      <ActivityIndicator size="large" color={ui.accentHex} />
      <Text className="mt-3 text-sm text-text-muted opacity-80">{t("app.name")}</Text>
    </View>
  );
}
