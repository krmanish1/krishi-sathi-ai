import { useEffect, useState, useRef } from "react";
import { Text, View, Modal, Pressable, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/features/onboarding/store";
import {
  downloadGemmaModel,
  checkModelExists,
  checkIsOnWifi,
  detectModelVariant,
  type ModelVariant,
} from "@/features/onboarding/useModelDownload";
import { runInitialSync } from "@/features/onboarding/useInitialSync";
import { loadBundleVersion } from "@/shared/storage/bundle";
import { OnboardingShell } from "@/features/onboarding";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function ModelDownloadScreen() {
  const { t } = useTranslation();
  const { state, district } = useOnboarding();
  const [pct, setPct] = useState(0);
  const [variant, setVariant] = useState<ModelVariant>("e4b");
  const [showWifiWarning, setShowWifiWarning] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const cancelled = useRef(false);
  const resolveWifi = useRef<((proceed: boolean) => void) | null>(null);

  function askWifiPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      resolveWifi.current = resolve;
      setShowWifiWarning(true);
    });
  }

  useEffect(() => {
    if (!state || !district) {
      router.replace("/(onboarding)/location");
      return;
    }
    (async () => {
      const v = await detectModelVariant();
      setVariant(v);

      const existing = await checkModelExists(v);
      if (existing.exists) {
        setPct(100);
        const ver = await loadBundleVersion().catch(() => null);
        await runInitialSync(
          ver != null ? { state, district, bundleVersion: ver } : { state, district },
        ).catch(() => undefined);
        if (!cancelled.current) {
          router.replace("/(onboarding)/done");
        }
        return;
      }

      const isWifi = await checkIsOnWifi();
      if (!isWifi) {
        const proceed = await askWifiPermission();
        if (!proceed) {
          if (!cancelled.current) {
            setInlineMessage(t("offline.wifiRequiredToContinue"));
            setPct(0);
          }
          return;
        }
      }

      const ver = await loadBundleVersion().catch(() => null);
      const syncP = runInitialSync(
        ver != null ? { state, district, bundleVersion: ver } : { state, district },
      ).catch(() => undefined);

      const dlP = downloadGemmaModel(
        (p) => {
          const pctVal = p.total > 0 ? Math.round((p.received / p.total) * 100) : 0;
          setPct(pctVal);
        },
        undefined,
        v,
      );

      await Promise.all([syncP, dlP]);
      if (!cancelled.current) {
        router.replace("/(onboarding)/done");
      }
    })().catch((e: unknown) => {
      if (!cancelled.current) {
        Alert.alert(t("offline.download_error_title"), e instanceof Error ? e.message : String(e));
      }
    });
    return () => {
      cancelled.current = true;
    };
  }, [district, state]);

  const barWidth = `${Math.min(100, Math.max(0, pct))}%`;
  const variantLabelKey = variant === "e4b" ? "offline.variantLabel.e4b" : "offline.variantLabel.e2b";

  return (
    <OnboardingShell step={4}>
      <Modal visible={showWifiWarning} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full max-w-sm rounded-bento bg-card p-6">
            <Text className="mb-2 font-display text-lg text-ink">
              {t("offline.wifiWarningTitle", { size: variant === "e4b" ? "2" : "1" })}
            </Text>
            <Text className="mb-6 font-body text-sm leading-6 text-ink-muted">
              {t("offline.wifiWarningBody")}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 items-center rounded-xl bg-muted py-3 active:opacity-80"
                onPress={() => {
                  setShowWifiWarning(false);
                  resolveWifi.current?.(false);
                }}
              >
                <Text className="font-body text-sm text-ink">{t("offline.wifiWarningCancel")}</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center rounded-xl bg-brand py-3 active:opacity-80"
                onPress={() => {
                  setShowWifiWarning(false);
                  resolveWifi.current?.(true);
                }}
              >
                <Text className="font-body text-sm font-semibold text-black">
                  {t("offline.wifiWarningProceed")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
          <Text className="text-center font-display text-xl text-ink">
            {t("onboarding.downloadingModel")}
          </Text>
          <Text className="mt-1 text-center font-body text-xs text-ink-muted">{t(variantLabelKey)}</Text>
          <Text className="mt-1 text-center font-body text-sm leading-6 text-ink-muted">
            {t("onboarding.modelProgress")}
          </Text>

          {inlineMessage ? (
            <Text className="mt-3 text-center font-body text-sm leading-6 text-ink-muted">
              {inlineMessage}
            </Text>
          ) : null}

          <Text className="mt-8 text-center font-display text-5xl tabular-nums text-brand">
            {pct}%
          </Text>

          <View className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-brand"
              style={{ width: barWidth as `${number}%` }}
            />
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
}
