import { useEffect, useState, useRef } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/features/onboarding/store";
import { downloadGemmaE4B } from "@/features/onboarding/useModelDownload";
import { runInitialSync } from "@/features/onboarding/useInitialSync";
import { loadBundleVersion } from "@/shared/storage/bundle";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ModelDownloadScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  return (
    <View
      className="bg-paper flex-1 items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
        <Text className="text-center text-xl font-bold text-brand">
          {t("onboarding.downloadingModel")}
        </Text>
        <Text className="mt-2 text-center text-sm text-text-muted">
          {t("onboarding.modelProgress")}
        </Text>
        <Text className="mt-6 text-center text-3xl font-semibold text-brand-mid">{pct}%</Text>
      </View>
    </View>
  );
}
