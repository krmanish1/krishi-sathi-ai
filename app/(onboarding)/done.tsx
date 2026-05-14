import { useEffect } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { flushOnboardingToStorage, useOnboarding } from "@/features/onboarding/store";
import { OnboardingShell, useSyncTwin } from "@/features/onboarding";
import { postSyncPush } from "@/shared/api";
import { useSupabaseSession } from "@/shared/auth";
import { useConnectivityUi } from "@/shared/network";

export default function DoneScreen() {
  const { t } = useTranslation();
  const setCompleted = useOnboarding((s) => s.setCompleted);
  const syncTwin = useSyncTwin();
  const session = useSupabaseSession();
  const ui = useConnectivityUi();
  const online = ui.backendReachable;

  useEffect(() => {
    setCompleted(true);
    let cancelled = false;
    void (async () => {
      await flushOnboardingToStorage().catch(() => undefined);
      if (cancelled) return;
      await syncTwin();
      if (cancelled) return;
      if (online) {
        void postSyncPush(session?.access_token ?? null).catch(() => undefined);
      }
    })();
    const timer = setTimeout(() => {
      router.replace("/(tabs)/home");
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [setCompleted, syncTwin, online, session?.access_token]);

  return (
    <OnboardingShell step={5}>
      <View className="flex-1 items-center justify-center px-4">
        <LinearGradient
          colors={[ui.headerAccentHex, ui.gradientPartnerHex]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-28 w-28 items-center justify-center rounded-full shadow-dialog"
        >
          <MaterialCommunityIcons name="check" size={48} color="#000000" accessible={false} />
        </LinearGradient>
        <Text className="mt-10 text-center font-display text-2xl text-ink">{t("onboarding.doneTitle")}</Text>
        <Text className="mt-3 text-center font-body text-base leading-6 text-ink-muted">{t("onboarding.doneSub")}</Text>
      </View>
    </OnboardingShell>
  );
}
