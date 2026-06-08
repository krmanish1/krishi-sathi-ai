import { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
} from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import { useFarmerId, useSupabaseAuth, useSupabaseSession } from "@/shared/auth";
import { greetingFirstName, useDisplayName, useFarmerTwin } from "@/features/twin";
import i18n from "@/shared/i18n";
import type { Language } from "@/shared/config/constants";
import { useConnectivityUi, NetworkBanner } from "@/shared/network";
import { SidebarDrawer } from "@/shared/ui/primitives";

const APP_LANG: Language[] = ["en", "hi"];
const APP_VERSION = (Constants.expoConfig?.version as string | undefined) ?? "1.0.0";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={styles.sectionLabel}>{label}</Text>
  );
}

function NavRow({
  icon,
  label,
  onPress,
  last = false,
  danger = false,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={[
          styles.navRow,
          !last && styles.navRowBorder,
        ]}
      >
        <View style={[styles.navIconWrap, danger && { backgroundColor: "#FFF0F0" }]}>
          <MaterialCommunityIcons
            name={icon as never}
            size={18}
            color={danger ? "#C0392B" : "#1B3A28"}
          />
        </View>
        <Text style={[styles.navLabel, danger && { color: "#C0392B" }]}>{label}</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={danger ? "#C0392B" : "#8997A0"}
        />
      </View>
    </Pressable>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon as never} size={22} color="#1B3A28" />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const ui = useConnectivityUi();
  const farmerId = useFarmerId();
  const session = useSupabaseSession();
  const { signOutSocial } = useSupabaseAuth();
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const setLanguageStore = useOnboarding((s) => s.setLanguage);
  const { data: twin, isLoading } = useFarmerTwin();
  const displayName = useDisplayName();
  const [name, setName] = useState("");
  const [farmState, setFarmState] = useState("");
  const [farmDistrict, setFarmDistrict] = useState("");
  const farmHydratedForFarmer = useRef<string | null>(null);

  useEffect(() => {
    farmHydratedForFarmer.current = null;
  }, [farmerId]);

  useEffect(() => {
    if (!twin) return;
    const fid = twin.farmer_id;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled || farmHydratedForFarmer.current === fid) return;
        farmHydratedForFarmer.current = fid;
        const ob = useOnboarding.getState();
        setName(twin.name ?? "");
        setFarmState(twin.location?.state?.trim() || ob.state || "");
        setFarmDistrict(twin.location?.district?.trim() || ob.district || "");
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [twin]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t("auth.signOutConfirmTitle"),
      t("auth.signOutConfirmBody"),
      [
        { text: t("auth.signOutConfirmCancel"), style: "cancel" },
        {
          text: t("auth.signOutConfirmYes"),
          style: "destructive",
          onPress: () => {
            setSignOutBusy(true);
            void signOutSocial()
              .catch(() => undefined)
              .finally(() => {
                setSignOutBusy(false);
                router.replace("/(auth)/login");
              });
          },
        },
      ],
    );
  }, [t, signOutSocial]);

  const headerDisplayName = name.trim() ? name.trim() : displayName;
  const avatarLetter = (() => {
    const first = greetingFirstName(headerDisplayName);
    return first ? first.charAt(0).toUpperCase() : "K";
  })();

  const locationText = (() => {
    const parts = [farmDistrict, farmState].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  })();

  const memberSinceYear = (() => {
    const raw = session?.user?.created_at;
    if (!raw) return null;
    const yr = new Date(raw).getFullYear();
    return Number.isFinite(yr) ? String(yr) : null;
  })();

  const totalLand = twin?.land?.total_acres;
  const landLabel = totalLand != null ? `${totalLand} Ha` : "—";
  const cropCount = twin?.current_crops?.length ?? 0;

  if (!farmerId) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F2EDE4", paddingTop: insets.top }}>
        <ActivityIndicator size="large" color={ui.accentHex} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F2EDE4" }}>

      {/* ── Top header bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable hitSlop={10} accessibilityRole="button" onPress={() => setSidebarOpen(true)}>
          <MaterialCommunityIcons name="menu" size={24} color="#001E2B" />
        </Pressable>
        <Text style={styles.topBarTitle}>Krishisath AI</Text>
        <Pressable hitSlop={10} accessibilityRole="button" onPress={() => setSidebarOpen(true)}>
          <View style={styles.topBarAvatar}>
            <Text style={styles.topBarAvatarLetter}>{avatarLetter}</Text>
          </View>
        </Pressable>
      </View>
      <NetworkBanner />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {/* ── Profile hero ── */}
        <View style={styles.hero}>
          {/* Large avatar circle */}
          <View style={styles.heroAvatar}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.heroAvatarLetter}>{avatarLetter}</Text>
            )}
          </View>

          {/* Premium badge */}
          <View style={styles.premiumBadge}>
            <MaterialCommunityIcons name="crown-outline" size={13} color="#FFFFFF" />
            <Text style={styles.premiumBadgeText}>Premium Member</Text>
          </View>

          {/* Name */}
          <Text style={styles.heroName}>{headerDisplayName}</Text>

          {/* Location */}
          {locationText ? (
            <View style={styles.heroLocation}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color="#5C6C75" />
              <Text style={styles.heroLocationText}>{locationText}</Text>
            </View>
          ) : null}

          {/* Member since */}
          {memberSinceYear ? (
            <Text style={styles.heroMemberSince}>Member since {memberSinceYear}</Text>
          ) : null}
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatCard icon="terrain" label="Total Land" value={landLabel} />
          <StatCard icon="sprout-outline" label="Active Crops" value={String(cropCount)} />
          <StatCard icon="chart-bar" label="Soil Health" value="Optimal" />
        </View>

        {/* ── Account section ── */}
        <View style={styles.sectionWrap}>
          <SectionLabel label="Account" />
          <View style={styles.card}>
            <NavRow
              icon="account-outline"
              label="Personal Info"
              onPress={() => router.push("/farm-settings")}
            />
            <NavRow
              icon="shield-lock-outline"
              label="Security"
              onPress={() => {}}
            />
            <NavRow
              icon="card-account-details-outline"
              label="Membership"
              onPress={() => {}}
              last
            />
          </View>
        </View>

        {/* ── Farm section ── */}
        <View style={styles.sectionWrap}>
          <SectionLabel label="Farm" />
          <View style={styles.card}>
            <NavRow
              icon="cog-outline"
              label={t("farmSettings.title")}
              onPress={() => router.push("/farm-settings")}
            />
            <NavRow
              icon="history"
              label={t("soilHistory.title")}
              onPress={() => router.push("/soil-history")}
            />
            <NavRow
              icon="headset"
              label={t("expertSupport.title")}
              onPress={() => router.push("/expert-support")}
              last
            />
          </View>
        </View>

        {/* ── App & Language section ── */}
        <View style={styles.sectionWrap}>
          <SectionLabel label="App" />
          <View style={styles.card}>
            {/* Language toggle */}
            <View style={[styles.navRow, styles.navRowBorder]}>
              <View style={styles.navIconWrap}>
                <MaterialCommunityIcons name="translate" size={18} color="#1B3A28" />
              </View>
              <Text style={styles.navLabel}>Language</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {APP_LANG.map((lg) => {
                  const active = i18n.language === lg;
                  return (
                    <Pressable
                      key={lg}
                      accessibilityRole="button"
                      onPress={() => {
                        void i18n.changeLanguage(lg);
                        setLanguageStore(lg);
                      }}
                      style={[styles.langPill, active && styles.langPillActive]}
                    >
                      <Text style={[styles.langPillText, active && styles.langPillTextActive]}>
                        {t(`profile.lang.${lg}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <NavRow
              icon="information-outline"
              label={`${t("profile.version")} ${APP_VERSION}`}
              onPress={() => {}}
            />
            <NavRow
              icon="shield-lock-outline"
              label={t("profile.privacy")}
              onPress={() => void Linking.openURL("https://krishisaathi.ai/privacy")}
              last
            />
          </View>
        </View>

        {/* ── Sign out ── */}
        <View style={[styles.sectionWrap, { marginTop: 4 }]}>
          <View style={styles.card}>
            <NavRow
              icon="logout-variant"
              label={signOutBusy ? "Signing out…" : t("auth.signOut")}
              onPress={handleSignOut}
              last
              danger
            />
          </View>
        </View>
      </ScrollView>

      {/* Profile sidebar */}
      <SidebarDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        displayName={headerDisplayName}
        district={farmDistrict}
        state={farmState}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#001E2B",
  },
  topBarAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1B3A28",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarAvatarLetter: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  heroAvatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "#1B3A28",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  heroAvatarLetter: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F59E0B",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  premiumBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#001E2B",
    marginTop: 14,
    textAlign: "center",
  },
  heroLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  heroLocationText: {
    fontSize: 13,
    color: "#5C6C75",
  },
  heroMemberSince: {
    fontSize: 12,
    color: "#8997A0",
    marginTop: 4,
    fontWeight: "500",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#5C6C75",
    marginTop: 7,
    textAlign: "center",
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#001E2B",
    marginTop: 3,
    textAlign: "center",
  },

  // Sections
  sectionWrap: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#001E2B",
    marginBottom: 8,
    marginLeft: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Nav rows
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    columnGap: 12,
  },
  navRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8EDEB",
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0F5F2",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#001E2B",
  },

  langPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8EDEB",
    backgroundColor: "transparent",
  },
  langPillActive: {
    backgroundColor: "#1B3A28",
    borderColor: "#1B3A28",
  },
  langPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5C6C75",
  },
  langPillTextActive: {
    color: "#FFFFFF",
  },
});
