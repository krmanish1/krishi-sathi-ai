import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { useOnboarding, rehydrateOnboardingFromStorage } from "@/features/onboarding/store";
import { useAuthReady, useSupabaseSession } from "@/shared/auth/AuthProvider";
import { useTranslation } from "react-i18next";

export default function Index() {
  const { t } = useTranslation();
  const [boot, setBoot] = useState(false);
  const { language, state, district, hasCompletedOnboarding } = useOnboarding();
  const authReady = useAuthReady();
  const session = useSupabaseSession();

  useEffect(() => {
    rehydrateOnboardingFromStorage()
      .catch(() => undefined)
      .finally(() => setBoot(true));
  }, []);

  useEffect(() => {
    if (!boot || !authReady) return;

    // Not signed in → always show login
    if (!session) {
      router.replace("/(auth)/login");
      return;
    }

    // Signed in → check onboarding completion
    if (hasCompletedOnboarding && language && state && district) {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/(onboarding)/welcome");
    }
  }, [authReady, boot, district, hasCompletedOnboarding, language, session, state]);

  return (
    <View className="flex-1 items-center justify-center bg-page" accessibilityLabel={t("app.name")}>
      <ActivityIndicator size="large" color="#1ed760" />
      <Text className="mt-3 text-sm text-text-muted opacity-80">{t("app.name")}</Text>
    </View>
  );
}
