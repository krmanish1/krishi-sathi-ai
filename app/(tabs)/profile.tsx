import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import {
  Text,
  View,
  TextInput,
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
import { greetingFirstName, useDisplayName, useFarmerTwin, useUpdateFarmerTwin } from "@/features/twin";
import type { FarmerTwin } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import i18n from "@/shared/i18n";
import { useConnectivityUi } from "@/shared/network";

const APP_LANG: Language[] = ["en", "hi"];
const APP_VERSION = (Constants.expoConfig?.version as string | undefined) ?? "1.0.0";

/* ─── Primitives ──────────────────────────────────────────────── */

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="mb-2 mt-6 px-1 font-body-semibold text-[11px] uppercase tracking-[1.4px] text-ink-muted">
      {label}
    </Text>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-bento border border-white/[0.07] bg-muted">
      {children}
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  last = false,
  danger = false,
  iconColor = "#b3b3b3",
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
  iconColor?: string;
}) {
  const inner = (
    <View
      className={`flex-row items-center px-4 py-4 ${!last ? "border-b border-white/[0.06]" : ""}`}
    >
      <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-card">
        <MaterialCommunityIcons
          name={icon as never}
          size={18}
          color={danger ? "#f3727f" : iconColor}
        />
      </View>
      <Text
        className={`flex-1 font-body-medium text-[15px] ${danger ? "text-danger" : "text-ink"}`}
      >
        {label}
      </Text>
      {value ? (
        <Text className="mr-2 font-body text-sm text-ink-muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={danger ? "#f3727f" : "#525252"}
        />
      ) : null}
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="active:opacity-75">
      {inner}
    </Pressable>
  );
}

/* ─── Main screen ─────────────────────────────────────────────── */

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const ui = useConnectivityUi();
  const avatarStyles = useMemo(
    () =>
      StyleSheet.create({
        avatarRing: {
          width: 60,
          height: 60,
          borderRadius: 30,
          borderWidth: 2,
          borderColor: ui.headerAccentHex,
          padding: 2,
        },
        avatarInner: {
          flex: 1,
          borderRadius: 28,
          backgroundColor: ui.gradientPartnerHex,
          alignItems: "center",
          justifyContent: "center",
        },
        avatarText: {
          fontSize: 22,
          fontWeight: "700",
          color: ui.headerAccentHex,
        },
      }),
    [ui.headerAccentHex, ui.gradientPartnerHex],
  );
  const farmerId = useFarmerId();
  const session = useSupabaseSession();
  const { signOutSocial } = useSupabaseAuth();
  const [signOutBusy, setSignOutBusy] = useState(false);
  const setLanguageStore = useOnboarding((s) => s.setLanguage);
  const setLocationPersist = useOnboarding((s) => s.setLocation);
  const { data: twin, isLoading } = useFarmerTwin();
  const update = useUpdateFarmerTwin();
  const displayName = useDisplayName();
  const [name, setName] = useState("");
  const [crops, setCrops] = useState("");
  const [farmState, setFarmState] = useState("");
  const [farmDistrict, setFarmDistrict] = useState("");
  const [farmLandAcres, setFarmLandAcres] = useState("");
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
        setCrops(twin.current_crops?.length ? twin.current_crops.join(", ") : "");
        setFarmState(twin.location?.state?.trim() || ob.state || "");
        setFarmDistrict(twin.location?.district?.trim() || ob.district || "");
        const twinAcres = twin.land?.total_acres;
        const acresStr =
          twinAcres != null && Number.isFinite(Number(twinAcres))
            ? String(twinAcres)
            : ob.landAcres ?? "";
        setFarmLandAcres(acresStr);
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
            // Fire-and-forget: always navigate to login regardless of signout errors
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

  const handleSaveProfile = useCallback(() => {
    if (!twin) return;
    const st = farmState.trim();
    const dist = farmDistrict.trim();
    if (st.length < 2 || dist.length < 2) {
      Alert.alert(t("profile.locationIncompleteTitle"), t("profile.locationIncompleteBody"));
      return;
    }
    const names = crops
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const nm = name.trim();
    const lg: Language = APP_LANG.includes(i18n.language as Language)
      ? (i18n.language as Language)
      : ((twin.preferred_language as Language | null) ?? "en");

    const acresRaw = farmLandAcres.trim().replace(",", ".");
    const acresNum = acresRaw ? parseFloat(acresRaw) : NaN;
    const acresOk = Number.isFinite(acresNum) && acresNum > 0;

    const land: NonNullable<FarmerTwin["land"]> = twin.land ? { ...twin.land } : {};
    delete land.irrigation;
    if (acresOk) land.total_acres = acresNum;
    else delete land.total_acres;

    const next: FarmerTwin = {
      ...twin,
      farmer_id: twin.farmer_id,
      preferred_language: lg,
      location: { ...twin.location, state: st, district: dist },
      current_crops: names,
      name: nm || null,
    };
    if (Object.keys(land).length) {
      next.land = land;
    } else {
      delete next.land;
    }
    void update
      .mutateAsync(next)
      .then(() => {
        setLocationPersist(st, dist, {
          landAcres: farmLandAcres.trim() || null,
        });
        Alert.alert(t("profile.saved"));
      })
      .catch(() => Alert.alert(t("errors.generic")));
  }, [
    crops,
    name,
    twin,
    update,
    t,
    farmState,
    farmDistrict,
    farmLandAcres,
    setLocationPersist,
  ]);

  const userEmail = session?.user?.email ?? null;
  const headerDisplayName = name.trim() ? name.trim() : displayName;
  const avatarLetter = (() => {
    const first = greetingFirstName(headerDisplayName);
    return first ? first.charAt(0).toUpperCase() : "K";
  })();

  if (!farmerId) {
    return (
      <View className="flex-1 items-center justify-center bg-page" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color={ui.accentHex} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <View
        className="border-b border-white/[0.07] px-5 pb-5"
        style={{ paddingTop: insets.top + 12, backgroundColor: ui.chatsHeaderSurfaceHex }}
      >
        <Text className="font-display text-base text-ink">{t("profile.title")}</Text>

        <View className="mt-5 flex-row items-center gap-4">
          <View style={avatarStyles.avatarRing}>
            <View style={avatarStyles.avatarInner}>
              <Text style={avatarStyles.avatarText}>{avatarLetter}</Text>
            </View>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-display text-lg leading-6 text-ink" numberOfLines={1}>
              {headerDisplayName}
            </Text>
            {userEmail ? (
              <Text className="mt-0.5 font-body text-xs text-ink-muted" numberOfLines={1}>
                {userEmail}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleSignOut}
            disabled={signOutBusy}
            className="h-9 w-9 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            {signOutBusy ? (
              <ActivityIndicator size="small" color="#f3727f" />
            ) : (
              <MaterialCommunityIcons name="logout-variant" size={18} color="#f3727f" />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Farm details ──────────────────────────────────────── */}
        <SectionHeader label={t("profile.sectionFarm")} />
        {isLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color={ui.accentHex} />
          </View>
        ) : twin ? (
          <>
            <SettingsCard>
              <View className="border-b border-white/[0.06] px-4 py-4">
                <Text className="mb-1.5 font-body-semibold text-[11px] uppercase tracking-[1.2px] text-ink-muted">
                  {t("profile.twinName")}
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="font-body text-[15px] text-ink"
                  placeholderTextColor="#737373"
                  placeholder={t("auth.namePlaceholder")}
                  style={{ minHeight: 32, padding: 0 }}
                />
              </View>
              <View className="border-b border-white/[0.06] px-4 py-4">
                <Text className="mb-1.5 font-body-semibold text-[11px] uppercase tracking-[1.2px] text-ink-muted">
                  {t("profile.crops")}
                </Text>
                <TextInput
                  value={crops}
                  onChangeText={setCrops}
                  className="font-body text-[15px] text-ink"
                  placeholderTextColor="#737373"
                  placeholder={t("profile.cropsPlaceholder")}
                  style={{ minHeight: 32, padding: 0 }}
                />
                <Text className="mt-1 font-body text-[11px] text-ink-muted">
                  {t("profile.cropsHint")}
                </Text>
              </View>
              <View className="border-b border-white/[0.06] px-4 py-4">
                <Text className="mb-1.5 font-body-semibold text-[11px] uppercase tracking-[1.2px] text-ink-muted">
                  {t("onboarding.stateLabel")}
                </Text>
                <TextInput
                  value={farmState}
                  onChangeText={setFarmState}
                  className="min-h-[44px] rounded-xl border border-white/[0.06] bg-card px-3 font-body text-[15px] text-ink"
                  placeholderTextColor="#737373"
                  placeholder={t("onboarding.statePlaceholder")}
                  autoCorrect={false}
                />
              </View>
              <View className="border-b border-white/[0.06] px-4 py-4">
                <Text className="mb-1.5 font-body-semibold text-[11px] uppercase tracking-[1.2px] text-ink-muted">
                  {t("onboarding.districtLabel")}
                </Text>
                <TextInput
                  value={farmDistrict}
                  onChangeText={setFarmDistrict}
                  className="min-h-[44px] rounded-xl border border-white/[0.06] bg-card px-3 font-body text-[15px] text-ink"
                  placeholderTextColor="#737373"
                  placeholder={t("onboarding.districtPlaceholder")}
                  autoCorrect={false}
                />
              </View>
              <View className="border-b border-white/[0.06] px-4 py-4">
                <Text className="mb-1.5 font-body-semibold text-[11px] uppercase tracking-[1.2px] text-ink-muted">
                  {t("onboarding.landSizeLabel")}
                </Text>
                <View className="relative">
                  <TextInput
                    value={farmLandAcres}
                    onChangeText={setFarmLandAcres}
                    placeholder={t("onboarding.landSizePlaceholder")}
                    keyboardType="decimal-pad"
                    className="min-h-[44px] rounded-xl border border-white/[0.06] bg-card px-3 pr-16 font-body text-[15px] text-ink"
                    placeholderTextColor="#737373"
                  />
                  <Text className="absolute right-3 top-3 font-body-semibold text-xs uppercase text-ink-muted">
                    {t("onboarding.landSizeUnit")}
                  </Text>
                </View>
              </View>
            </SettingsCard>
            <Pressable
              accessibilityRole="button"
              className="mt-4 min-h-[52px] items-center justify-center rounded-full bg-brand shadow-dialog active:opacity-90"
              disabled={update.isPending}
              onPress={handleSaveProfile}
            >
              {update.isPending ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text className="font-body-semibold text-[13px] uppercase tracking-button text-on-brand">
                  {t("profile.save")}
                </Text>
              )}
            </Pressable>
          </>
        ) : null}

        {/* ── Language ──────────────────────────────────────────── */}
        <SectionHeader label={t("profile.sectionLanguage")} />
        <SettingsCard>
          <View className="px-4 py-4">
            <Text className="mb-3 font-body-semibold text-[11px] uppercase tracking-[1.2px] text-ink-muted">
              {t("profile.appLanguage")}
            </Text>
            <View className="flex-row gap-3">
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
                    className={`flex-1 items-center rounded-full py-2.5 ${
                      active ? "bg-brand" : "border border-border-light bg-transparent"
                    }`}
                  >
                    <Text
                      className={`font-body-semibold text-[13px] uppercase tracking-button ${
                        active ? "text-on-brand" : "text-ink"
                      }`}
                    >
                      {t(`profile.lang.${lg}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SettingsCard>

        {/* ── App info ──────────────────────────────────────────── */}
        <SectionHeader label={t("profile.sectionApp")} />
        <SettingsCard>
          <SettingsRow
            icon="information-outline"
            label={t("profile.version")}
            value={APP_VERSION}
            iconColor="#539df5"
          />
          <SettingsRow
            icon="shield-lock-outline"
            label={t("profile.privacy")}
            onPress={() => void Linking.openURL("https://krishisaathi.ai/privacy")}
            iconColor="#b3b3b3"
            last
          />
        </SettingsCard>

        {/* ── Sign out ─────────────────────────────────────────── */}
        <SectionHeader label="" />
        <SettingsCard>
          <SettingsRow
            icon="logout-variant"
            label={t("auth.signOut")}
            onPress={handleSignOut}
            last
            danger
          />
        </SettingsCard>
      </ScrollView>
    </View>
  );
}

