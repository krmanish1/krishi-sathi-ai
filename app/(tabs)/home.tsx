import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import { greetingFirstName, useDisplayName } from "@/features/twin";
import { SidebarDrawer } from "@/shared/ui/primitives";
import { useFarmerWeather } from "@/features/weather";
import { useFarmerId } from "@/shared/auth";
import { useConnectivityUi, NetworkBanner } from "@/shared/network";
import { runInitialSync } from "@/features/onboarding/useInitialSync";
import { useMandiFromBundle } from "@/features/mandi/mandiFromBundle";
import { ModelDownloadBanner } from "@/features/model-download";

// ─── Design tokens ───────────────────────────────────────────────────────────

const PAGE_BG = "#F2EDE4";
const CARD_BG = "#FFFFFF";
const SOIL_CARD_BG = "#1B3A28";
const AI_CARD_BG = "#FCDDB5";
const GUIDE_GRAD_START = "#1B3A28";
const GUIDE_GRAD_END = "#2D5A3D";
const VIEW_PRICES_BG = "#1B3A28";
const AMBER_LABEL = "#D97706";
const INK = "#001E2B";
const INK_MUTED = "#5C6C75";

// ─── Home screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const district = useOnboarding((s) => s.district);
  const state = useOnboarding((s) => s.state);
  const farmerId = useFarmerId();
  const displayName = useDisplayName();
  const greetingName = greetingFirstName(displayName);
  const ui = useConnectivityUi();
  const connectivity = ui.apiConnectivity;
  const isOnlineMode = ui.backendReachable;

  const {
    display: weatherDisplay,
    refreshWeather,
    isRefreshingWeather,
    isPending: weatherPending,
    data: weatherData,
  } = useFarmerWeather({
    farmerId,
    connectivity,
    fallbackPlace: district && state ? `${district}, ${state}` : "—",
  });

  const [spinAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (isRefreshingWeather) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [isRefreshingWeather, spinAnim]);

  const { data: mandiData, refetch: refetchMandi } = useMandiFromBundle();
  const mandiRows = mandiData?.rows ?? [];
  const primaryMandi = mandiRows[0];

  const avatarLetter = useMemo(() => {
    const first = greetingFirstName(displayName);
    return first ? first.charAt(0).toUpperCase() : "K";
  }, [displayName]);

  useEffect(() => {
    if (!state || !district || !isOnlineMode) return;
    void runInitialSync({ state, district })
      .then(() => refetchMandi())
      .catch(() => undefined);
  }, [state, district, isOnlineMode, refetchMandi]);

  const tempLabel = weatherDisplay.tempLabel;
  const conditionLabel = weatherDisplay.conditionLabel ?? "—";
  const humidityLabel = weatherDisplay.humidityLabel;
  const placeLabel = district ?? weatherDisplay.placeLabel;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setSidebarOpen(true)}
          style={styles.headerIconBtn}
        >
          <MaterialCommunityIcons name="menu" size={24} color={INK} />
        </Pressable>

        <Text style={styles.appTitle}>Krishisath AI</Text>

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setSidebarOpen(true)}
          style={styles.avatarBtn}
        >
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </Pressable>
      </View>
      <NetworkBanner />

      {/* ── Scroll content ─────────────────────────────────────────── */}
      <ModelDownloadBanner />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>
            {t("home.welcomeMessage", { name: greetingName })}
          </Text>
          {placeLabel ? (
            <Text style={styles.greetingSub}>
              {t("home.farmStatus", { place: placeLabel })}
            </Text>
          ) : null}
        </View>

        {/* ── Weather card ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.weatherTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.weatherLabel}>{t("home.weatherUpdate")}</Text>
              <View style={styles.weatherTempRow}>
                <Text style={styles.weatherTemp}>{tempLabel}</Text>
                <Text style={styles.weatherCondition}>{conditionLabel}</Text>
              </View>
            </View>
            <View style={styles.weatherIconWrap}>
              <MaterialCommunityIcons
                name="weather-partly-cloudy"
                size={42}
                color={AMBER_LABEL}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh weather"
                onPress={refreshWeather}
                disabled={isRefreshingWeather || (weatherPending && !weatherData)}
                hitSlop={8}
                style={styles.weatherRefreshBtn}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: spinAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    }],
                  }}
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={16}
                    color={isRefreshingWeather ? AMBER_LABEL : INK_MUTED}
                  />
                </Animated.View>
              </Pressable>
            </View>
          </View>
          <View style={styles.weatherStats}>
            <View style={styles.weatherStat}>
              <MaterialCommunityIcons
                name="water-outline"
                size={15}
                color={INK_MUTED}
              />
              <Text style={styles.weatherStatText}>{humidityLabel}</Text>
            </View>
            <View style={styles.weatherStat}>
              <MaterialCommunityIcons
                name="weather-windy"
                size={15}
                color={INK_MUTED}
              />
              <Text style={styles.weatherStatText}>
                {t("home.windSpeed", { speed: "12" })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Bento row: Soil Health + AI Insights ─────────────────── */}
        <View style={styles.bentoRow}>
          {/* Soil Health — dark green */}
          <View style={[styles.bentoCard, { backgroundColor: SOIL_CARD_BG }]}>
            <MaterialCommunityIcons
              name="flask-outline"
              size={28}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.bentoTitleLight}>{t("home.soilHealth")}</Text>
            <Text style={styles.bentoDescLight}>
              {t("home.soilHealthDesc")}
            </Text>
          </View>

          {/* AI Insights — warm peach */}
          <View style={[styles.bentoCard, { backgroundColor: AI_CARD_BG }]}>
            <MaterialCommunityIcons
              name="head-lightbulb-outline"
              size={28}
              color="#A16207"
            />
            <Text style={[styles.bentoTitle, { color: "#7C2D12" }]}>
              {t("home.aiInsights")}
            </Text>
            <Text style={[styles.bentoDesc, { color: "#92400E" }]}>
              {t("home.aiInsightsDesc")}
            </Text>
          </View>
        </View>

        {/* ── Market Pulse card ─────────────────────────────────────── */}
        <View style={[styles.card, styles.marketCard]}>
          <View style={styles.marketIcon}>
            <MaterialCommunityIcons
              name="trending-up"
              size={22}
              color={INK_MUTED}
            />
          </View>
          <View style={{ flex: 1, marginHorizontal: 14 }}>
            <Text style={styles.marketTitle}>{t("home.marketPulse")}</Text>
            <Text style={styles.marketDesc} numberOfLines={2}>
              {primaryMandi
                ? `${primaryMandi.label ?? ""} ${primaryMandi.changeLabel ?? ""} in local Mandi`
                : t("home.marketPulseDesc")}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.viewPricesBtn}
            onPress={() => router.push("/(tabs)/mandi" as never)}
          >
            <Text style={styles.viewPricesText}>{t("home.viewPrices")}</Text>
          </Pressable>
        </View>

        {/* ── Guide / article card ──────────────────────────────────── */}
        <Pressable accessibilityRole="button" style={styles.guideCard}>
          <LinearGradient
            colors={[GUIDE_GRAD_START, GUIDE_GRAD_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guideGradient}
          >
            {/* Background pattern circles */}
            <View style={styles.guideCircle1} />
            <View style={styles.guideCircle2} />

            {/* Badge */}
            <View style={styles.guideBadge}>
              <Text style={styles.guideBadgeText}>
                {t("home.sustainableFarming")}
              </Text>
            </View>

            {/* Title row */}
            <View style={styles.guideTitleRow}>
              <Text style={styles.guideTitle} numberOfLines={3}>
                {t("home.guideTitle")}
              </Text>
              <View style={styles.guidePlusBtn}>
                <MaterialCommunityIcons name="plus" size={20} color={INK} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </ScrollView>

      {/* ── Sidebar drawer ─────────────────────────────────────────── */}
      <SidebarDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        displayName={displayName}
        district={district ?? ""}
        state={state ?? ""}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  appTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: INK,
    letterSpacing: -0.3,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#001E2B",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: "700",
    color: "#00ED64",
    fontFamily: "PlusJakartaSans_700Bold",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  // Greeting
  greetingSection: {
    marginBottom: 22,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: INK,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  greetingSub: {
    marginTop: 6,
    fontSize: 14,
    color: INK_MUTED,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },

  // Generic white card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  // Weather card
  weatherTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  weatherLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    color: AMBER_LABEL,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  weatherTempRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  weatherTemp: {
    fontSize: 36,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: INK,
    lineHeight: 42,
  },
  weatherCondition: {
    fontSize: 16,
    color: INK_MUTED,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  weatherIconWrap: {
    marginLeft: 12,
    marginTop: 4,
    alignItems: "center",
    gap: 6,
  },
  weatherRefreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2EDE4",
    alignItems: "center",
    justifyContent: "center",
  },
  weatherStats: {
    flexDirection: "row",
    marginTop: 16,
    gap: 20,
  },
  weatherStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  weatherStatText: {
    fontSize: 14,
    color: INK_MUTED,
    fontFamily: "Inter_400Regular",
  },

  // Bento row
  bentoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    minHeight: 160,
    justifyContent: "space-between",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  bentoTitleLight: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#FFFFFF",
    marginTop: 12,
  },
  bentoDescLight: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 4,
  },
  bentoTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    marginTop: 12,
  },
  bentoDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 4,
  },

  // Market Pulse
  marketCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  marketIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F2EDE4",
    alignItems: "center",
    justifyContent: "center",
  },
  marketTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: INK,
  },
  marketDesc: {
    fontSize: 12,
    color: INK_MUTED,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 3,
  },
  viewPricesBtn: {
    backgroundColor: VIEW_PRICES_BG,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
  },
  viewPricesText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Guide card
  guideCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  guideGradient: {
    minHeight: 180,
    padding: 20,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  guideCircle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -40,
    right: -30,
  },
  guideCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -20,
    left: -20,
  },
  guideBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#22C55E",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  guideBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  guideTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 40,
  },
  guideTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#FFFFFF",
    lineHeight: 26,
    marginRight: 12,
  },
  guidePlusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

