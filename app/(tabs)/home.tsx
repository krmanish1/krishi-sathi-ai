import { useEffect, useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import { greetingFirstName, useDisplayName } from "@/features/twin";
import { useFarmerWeather } from "@/features/weather";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivity } from "@/shared/network";
import { runInitialSync } from "@/features/onboarding/useInitialSync";
import { useMandiFromBundle } from "@/features/mandi/mandiFromBundle";

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const district = useOnboarding((s) => s.district);
  const state = useOnboarding((s) => s.state);
  const farmerId = useFarmerId();
  const displayName = useDisplayName();
  const greetingName = greetingFirstName(displayName);
  const connectivity = useConnectivity();
  const isOffline = connectivity === "offline";
  const isOnlineMode = connectivity === "online" || connectivity === "degraded";
  const timeLabel = format(new Date(), "hh:mm a");
  const farmPlaceLabel = district && state ? `${district}, ${state}` : "—";
  const {
    display: weatherDisplay,
    refreshWeather,
    isRefreshingWeather,
    weatherError,
    isPending: weatherPending,
    data: weatherData,
  } = useFarmerWeather({
    farmerId,
    connectivity,
    fallbackPlace: farmPlaceLabel,
  });

  const weatherBadgeLabel = (() => {
    if (!isOnlineMode) return t("home.weatherOfflinePill");
    if (weatherPending && !weatherData) return t("home.weatherLoading");
    if (weatherDisplay.source === "live") return t("home.weatherLive");
    if (weatherDisplay.source === "cached") return t("home.cachedWeather");
    return t("home.cachedWeather");
  })();
  const { data: mandiData, refetch: refetchMandi } = useMandiFromBundle();
  const mandiRows = mandiData?.rows ?? [];
  const primaryMandi = mandiRows[0];
  const secondaryMandi = mandiRows[1];

  const quickActions = useMemo(
    () =>
      [
        { icon: "microphone-outline" as const, label: t("home.actionAskAi"), href: "/(tabs)/chat" },
        { icon: "calendar-month-outline" as const, label: t("home.actionCropPlan"), href: "/(tabs)/chat" },
        { icon: "camera-outline" as const, label: t("home.actionUploadPhoto"), href: "/scan" },
        { icon: "gavel" as const, label: t("home.actionGovtSchemes"), href: "/(tabs)/chat" },
      ] as const,
    [t],
  );

  useEffect(() => {
    if (!state || !district || !isOnlineMode) {
      return;
    }
    void runInitialSync({ state, district })
      .then(() => refetchMandi())
      .catch(() => undefined);
  }, [state, district, isOnlineMode, refetchMandi]);

  return (
    <View className="flex-1 bg-page">
      <ScrollView
        testID="home-scroll"
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 20,
          paddingBottom: 180,
          maxWidth: 1024,
          width,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {isOffline ? (
          <View className="mb-6 items-center">
            <View className="flex-row items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-2.5">
              <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#ffa42b" />
              <Text className="font-body-semibold text-xs uppercase tracking-[1.2px] text-amber">
                {t("home.offlinePill")}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="mb-7">
          <Text className="font-xb text-[28px] leading-9 tracking-tight text-ink">
            {t("home.greetingName", { name: greetingName })}
          </Text>
          <Text className="mt-2 font-body text-[15px] leading-6 text-ink-muted">
            {t("home.cacheLine", { time: timeLabel })}
          </Text>
          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => router.push("/(tabs)/chat")}
              className="min-h-[48px] flex-1 items-center justify-center rounded-full border border-border-light bg-muted shadow-card active:opacity-90"
              accessibilityRole="button"
              accessibilityLabel={t("tabs.assistant")}
            >
              <Text className="font-body-semibold text-[11px] uppercase tracking-button text-ink">
                {t("tabs.assistant")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/scan")}
              className="min-h-[48px] flex-1 items-center justify-center rounded-full border border-border-light bg-muted shadow-card active:opacity-90"
              accessibilityRole="button"
              accessibilityLabel={t("scan.title")}
            >
              <Text className="font-body-semibold text-[11px] uppercase tracking-button text-ink">
                {t("scan.title")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Weather card — GET /api/v1/weather/{farmer_id} */}
        <View testID="home-weather-card" className="mb-7 overflow-hidden rounded-bento bg-card p-5 shadow-dialog">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <View className="self-start rounded-full bg-amber/12 px-3 py-1">
                <Text className="font-body-semibold text-[10px] uppercase tracking-[1.4px] text-amber">
                  {weatherBadgeLabel}
                </Text>
              </View>
              <Text className="mt-3 font-display text-[40px] leading-none text-ink">
                {weatherDisplay.tempLabel}
              </Text>
              {weatherDisplay.conditionLabel ? (
                <Text className="mt-2 font-body text-[15px] leading-5 text-ink">
                  {weatherDisplay.conditionLabel}
                </Text>
              ) : null}
              <Text
                className={`font-body text-[15px] text-ink-muted ${weatherDisplay.conditionLabel ? "mt-1" : "mt-2"}`}
              >
                {t("home.weatherAtPlace", { place: weatherDisplay.placeLabel })}
              </Text>
              {weatherError && isOnlineMode ? (
                <Text className="mt-2 font-body text-xs text-danger">{t("home.weatherError")}</Text>
              ) : null}
            </View>
            <View className="items-end gap-2">
              {isOnlineMode && farmerId ? (
                <Pressable
                  testID="home-weather-refresh"
                  onPress={refreshWeather}
                  disabled={isRefreshingWeather}
                  accessibilityRole="button"
                  accessibilityLabel={t("home.weatherRefreshA11y")}
                  className="rounded-full bg-muted/90 p-2.5 active:opacity-80"
                  hitSlop={6}
                >
                  {isRefreshingWeather ? (
                    <ActivityIndicator size="small" color="#1ed760" />
                  ) : (
                    <MaterialCommunityIcons name="refresh" size={22} color="#1ed760" />
                  )}
                </Pressable>
              ) : null}
              <View className="rounded-full bg-amber/15 p-3">
                <MaterialCommunityIcons name="weather-partly-cloudy" size={36} color="#ffa42b" />
              </View>
            </View>
          </View>
          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-xl bg-muted p-3.5" style={styles.statInset}>
              <Text className="font-body-semibold text-[10px] uppercase tracking-[1.2px] text-ink-muted">
                {t("home.humidity")}
              </Text>
              <Text className="mt-1 font-display text-xl text-ink">{weatherDisplay.humidityLabel}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-muted p-3.5" style={styles.statInset}>
              <Text className="font-body-semibold text-[10px] uppercase tracking-[1.2px] text-ink-muted">
                {t("home.rainChance")}
              </Text>
              <Text className="mt-1 font-display text-xl text-ink">{weatherDisplay.rainLabel}</Text>
            </View>
          </View>
        </View>

        {!isOnlineMode ? (
          <View className="mb-7 rounded-bento border border-dashed border-border-light bg-muted/60 p-5">
            <View className="size-11 items-center justify-center rounded-full bg-danger/15">
              <MaterialCommunityIcons name="sync-alert" size={20} color="#f3727f" />
            </View>
            <Text className="mt-3 font-display text-lg text-ink">{t("home.syncTitle")}</Text>
            <Text className="mt-2 font-body text-sm leading-relaxed text-ink-muted">{t("home.syncBody")}</Text>
            <Pressable className="mt-4 flex-row items-center gap-1 self-start active:opacity-80" onPress={() => undefined}>
              <Text className="font-body-semibold text-sm text-brand">{t("home.retrySync")}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#1ed760" />
            </Pressable>
          </View>
        ) : null}

        {/* Market / bento — online */}
        {isOnlineMode ? (
          <View className="mb-7">
            <View className="mb-5 flex-row gap-3">
              <LinearGradient
                colors={["#1ed760", "#168d40"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bentoGreen, styles.shadowHeavy]}
              >
                <View className="absolute -right-8 -top-8 size-28 rounded-full bg-black/10" />
                <MaterialCommunityIcons name="sprout" size={20} color="#000000" />
                <Text className="mt-2 font-body-medium text-[11px] uppercase tracking-wide text-on-brand/90">
                  {t("home.recommended")}
                </Text>
                <Text className="font-display text-3xl text-on-brand">{t("home.recommendedCrop")}</Text>
                <View className="mt-auto rounded-2xl bg-black/20 px-3 py-2">
                  <Text className="font-body-semibold text-[9px] uppercase tracking-[1.2px] text-on-brand/85">
                    {t("home.profitPotential")}
                  </Text>
                  <Text className="font-display text-xl text-on-brand">{t("home.profitHigh")}</Text>
                </View>
              </LinearGradient>

              <View className="flex-1 justify-between rounded-bento border border-white/[0.06] bg-muted p-4 shadow-card">
                <View>
                  <View className="mb-2 self-start rounded-full bg-brand/12 p-2">
                    <MaterialCommunityIcons name="cash-multiple" size={20} color="#1ed760" />
                  </View>
                  <Text className="font-body-medium text-[11px] text-ink-muted">{t("home.mandiPriceShort")}</Text>
                  <Text className="mt-0.5 font-display text-3xl text-ink">{primaryMandi?.price ?? "—"}</Text>
                </View>
                <View className="flex-row items-center justify-between border-t border-white/[0.06] pt-3">
                  <Text
                    className={`font-body-semibold text-sm ${
                      primaryMandi?.up === false
                        ? "text-danger"
                        : primaryMandi?.up === true
                          ? "text-success"
                          : "text-ink-muted"
                    }`}
                  >
                    {primaryMandi?.changeLabel ?? "—"}
                  </Text>
                  <MaterialCommunityIcons
                    name={
                      primaryMandi?.up === false
                        ? "arrow-down"
                        : primaryMandi?.up === true
                          ? "arrow-up"
                          : "minus"
                    }
                    size={16}
                    color={
                      primaryMandi?.up === false
                        ? "#f3727f"
                        : primaryMandi?.up === true
                          ? "#1ed760"
                          : "#b3b3b3"
                    }
                  />
                </View>
              </View>
            </View>

            <View className="mb-4 flex-row items-end justify-between gap-3">
              <Text className="flex-1 font-display text-xl text-ink">{t("home.quickActions")}</Text>
              <Pressable onPress={() => router.push("/(tabs)/mandi")} hitSlop={8} className="active:opacity-70">
                <Text className="font-body-semibold text-sm text-brand">{t("home.viewAll")}</Text>
              </Pressable>
            </View>

            <View className="mb-2 flex-row justify-between gap-2">
              {quickActions.map((item) => (
                <Pressable
                  key={item.href + item.label}
                  accessibilityRole="button"
                  accessibilityLabel={item.label.replace(/\n/g, " ")}
                  onPress={() => router.push(item.href as never)}
                  className="min-w-0 flex-1 items-center active:opacity-85"
                >
                  <View className="w-full items-center rounded-2xl border border-white/[0.07] bg-muted py-4 shadow-card">
                    <MaterialCommunityIcons name={item.icon} size={22} color="#1ed760" />
                  </View>
                  <Text className="mt-2 text-center font-body-semibold text-[9px] uppercase leading-tight tracking-wide text-ink-muted">
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="mb-7 rounded-bento border border-white/[0.06] bg-card p-5 shadow-dialog">
            <View className="flex-row items-start justify-between">
              <Text className="font-display text-lg text-ink">{t("home.marketTitle")}</Text>
              <View className="flex-row items-center gap-1.5 rounded-full bg-amber/12 px-2 py-1">
                <View className="size-1.5 rounded-full bg-amber" />
                <Text className="font-body-semibold text-[9px] uppercase tracking-wide text-amber">
                  {t("home.pending")}
                </Text>
              </View>
            </View>
            <View className="mt-4 gap-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-muted p-2">
                    <MaterialCommunityIcons name="barley" size={20} color="#1ed760" />
                  </View>
                  <View>
                    <Text className="font-body-semibold text-sm text-ink">{primaryMandi?.label ?? "Wheat"}</Text>
                    <Text className="font-body-medium text-[10px] uppercase tracking-tight text-ink-muted">
                      {t("home.mandiLabel", { place: primaryMandi?.place ?? "—" })}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-body-semibold text-sm text-ink">{primaryMandi?.price ?? "—"}</Text>
                  <Text
                    className={`font-body-semibold text-[10px] ${
                      primaryMandi?.up === false
                        ? "text-danger"
                        : primaryMandi?.up === true
                          ? "text-success"
                          : "text-ink-muted"
                    }`}
                  >
                    {primaryMandi?.changeLabel ?? "—"}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-full bg-muted p-2">
                    <MaterialCommunityIcons name="leaf" size={20} color="#1ed760" />
                  </View>
                  <View>
                    <Text className="font-body-semibold text-sm text-ink">{secondaryMandi?.label ?? "Mustard"}</Text>
                    <Text className="font-body-medium text-[10px] uppercase tracking-tight text-ink-muted">
                      {t("home.mandiLabel", { place: secondaryMandi?.place ?? "—" })}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-body-semibold text-sm text-ink">{secondaryMandi?.price ?? "—"}</Text>
                  <Text
                    className={`font-body-semibold text-[10px] ${
                      secondaryMandi?.up === false
                        ? "text-danger"
                        : secondaryMandi?.up === true
                          ? "text-success"
                          : "text-ink-muted"
                    }`}
                  >
                    {secondaryMandi?.changeLabel ?? "—"}
                  </Text>
                </View>
              </View>
            </View>
            <View className="mt-4 border-t border-border pt-4">
              <Text className="font-body text-[11px] italic leading-snug text-ink-muted">{t("home.priceFootnote")}</Text>
            </View>
          </View>
        )}

        {/* Sowing CTA */}
        <LinearGradient
          colors={["#1ed760", "#168d40"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sowingCard, styles.shadowHeavy]}
        >
          <View className="absolute -bottom-12 -right-12 size-56 rounded-full bg-black/12" />
          <Text className="text-center font-display text-xl leading-7 text-on-brand">{t("home.sowingTitle")}</Text>
          <Text className="mt-3 text-center font-body text-[15px] leading-6 text-black/85">{t("home.sowingSub")}</Text>
          <Pressable className="mt-6 items-center self-center rounded-full bg-wheat px-8 py-3.5 shadow-dialog active:opacity-90">
            <Text className="font-body-semibold text-[13px] uppercase tracking-button text-[#181818]">
              {t("home.viewGuide")}
            </Text>
          </Pressable>
        </LinearGradient>

        {!isOnlineMode ? (
          <View className="mb-8 rounded-bento border border-white/[0.06] bg-muted p-5 shadow-card">
            <Text className="font-display text-lg text-ink">{t("home.docsTitle")}</Text>
            <View className="mt-4 gap-3">
              {[t("home.doc1"), t("home.doc2"), t("home.doc3")].map((label) => (
                <View key={label} className="flex-row items-center gap-3">
                  <MaterialCommunityIcons name="file-document-outline" size={16} color="#b3b3b3" />
                  <Text className="font-body-medium text-sm text-ink-muted">{label}</Text>
                </View>
              ))}
            </View>
            <View className="mt-4 border-t border-border pt-4">
              <Text className="font-body-semibold text-[10px] uppercase tracking-[1.4px] text-ink-muted">{t("home.storage")}</Text>
            </View>
          </View>
        ) : (
          <View className="mb-8 overflow-hidden rounded-bento shadow-dialog">
            <LinearGradient
              colors={["#0f3d22", "#168d40", "#1ed760"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 22, minHeight: 168, justifyContent: "flex-end" }}
            >
              <View className="self-start rounded-full bg-black/25 px-3 py-1">
                <Text className="font-body-semibold text-[10px] uppercase tracking-[1.6px] text-white/95">
                  {t("home.expertBadge")}
                </Text>
              </View>
              <Text className="mt-3 font-display text-2xl leading-8 text-white">{t("home.expertTitle")}</Text>
              <Text className="mt-2 font-body text-[15px] leading-[22px] text-white/88">{t("home.expertSub")}</Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      <View className="pointer-events-box-none absolute z-10" style={{ bottom: insets.bottom + 100, right: 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.fabLabel")}
          onPress={() => router.push("/(tabs)/chat")}
          style={styles.fabShadow}
        >
          <LinearGradient
            colors={["#1ed760", "#168d40"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="microphone" size={26} color="#000000" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statInset: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  bentoGreen: {
    flex: 1,
    minHeight: 176,
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  sowingCard: {
    borderRadius: 18,
    marginBottom: 28,
    padding: 28,
    overflow: "hidden",
  },
  shadowHeavy: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 12,
  },
  fabShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    borderRadius: 9999,
  },
});
