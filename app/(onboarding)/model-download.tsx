import { useEffect, useState, useRef } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/features/onboarding/store";
import { downloadGemmaE4B } from "@/features/onboarding/useModelDownload";
import { runInitialSync } from "@/features/onboarding/useInitialSync";
import { loadBundleVersion } from "@/shared/storage/bundle";
import { OnboardingShell } from "@/features/onboarding";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function ModelDownloadScreen() {
  const { t } = useTranslation();
  const { state, district } = useOnboarding();
  const [pct, setPct] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!state || !district) {
      router.replace("/(onboarding)/location");
      return;
    }
    (async () => {
      const ver = await loadBundleVersion().catch(() => null);
      const syncP = runInitialSync(
        ver != null ? { state, district, bundleVersion: ver } : { state, district },
      ).catch(() => undefined);
      const dlP = downloadGemmaE4B((p) => setPct(Math.round((p.received / p.total) * 100)));
      await Promise.all([syncP, dlP]);
      if (!cancelled.current) {
        router.replace("/(onboarding)/done");
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [district, state]);

  const barWidth = `${Math.min(100, Math.max(0, pct))}%`;

  return (
    <OnboardingShell step={4}>
      <View className="flex-1 items-center justify-center px-1">
        <LinearGradient
          colors={["rgba(30,215,96,0.2)", "rgba(22,141,64,0.06)"]}
          className="mb-8 items-center justify-center rounded-full p-6"
        >
          <View className="h-20 w-20 items-center justify-center rounded-full bg-brand/25">
            <MaterialCommunityIcons name="download-network" size={40} color="#1ed760" />
          </View>
        </LinearGradient>

        <View className="w-full max-w-md overflow-hidden rounded-bento border border-white/[0.08] bg-card p-8 shadow-dialog">
          <Text className="text-center font-display text-xl text-ink">{t("onboarding.downloadingModel")}</Text>
          <Text className="mt-2 text-center font-body text-sm leading-6 text-ink-muted">{t("onboarding.modelProgress")}</Text>

          <Text className="mt-8 text-center font-display text-5xl tabular-nums text-brand">{pct}%</Text>

          <View className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <View className="h-full rounded-full bg-brand" style={{ width: barWidth as `${number}%` }} />
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
}
