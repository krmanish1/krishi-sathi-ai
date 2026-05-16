import { useEffect, useState } from "react";
import {
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import { detectLocation } from "@/features/onboarding/useLocation";
import { OnboardingShell } from "@/features/onboarding";
import { useConnectivityUi } from "@/shared/network";
import { hexToRgba } from "@/shared/utils";

/** Values match twin API `land.soil_type`. */
const SOIL_WIRE_OPTIONS = ["loamy", "clay", "sandy", "silt", "black", "red"] as const;

export default function LocationScreen() {
  const { t } = useTranslation();
  const ui = useConnectivityUi();
  const setLocation = useOnboarding((s) => s.setLocation);
  const [farmerName, setFarmerName] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [landSize, setLandSize] = useState("");
  const [soilType, setSoilType] = useState<string | null>(null);
  const [cropsText, setCropsText] = useState("");
  const [locating, setLocating] = useState(true);
  const [capturedLat, setCapturedLat] = useState<number | null>(null);
  const [capturedLng, setCapturedLng] = useState<number | null>(null);

  useEffect(() => {
    void detectLocation()
      .then((d) => {
        if (d.state) {
          setState(d.state);
        }
        if (d.district) {
          setDistrict(d.district);
        }
        if (d.latitude != null && d.longitude != null) {
          setCapturedLat(d.latitude);
          setCapturedLng(d.longitude);
        }
        if (!d.state && !d.district && d.failureReason) {
          Alert.alert(
            t("onboarding.locationEnableTitle"),
            t("onboarding.locationEnableBody"),
            [
              { text: t("onboarding.locationNotNow"), style: "cancel" },
              {
                text: t("onboarding.locationOpenSettings"),
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
        }
      })
      .finally(() => setLocating(false));
  }, [t]);

  const onContinue = () => {
    const s = state.trim();
    const di = district.trim();
    if (s.length < 2 || di.length < 2) {
      return;
    }
    setLocation(s, di, {
      farmerName: farmerName.trim() || null,
      village: village.trim() || null,
      landAcres: landSize.trim() || null,
      soilType,
      cropsText: cropsText.trim() || null,
      lat: capturedLat,
      lng: capturedLng,
    });
    router.push("/(onboarding)/done");
  };

  const canContinue = state.trim().length >= 2 && district.trim().length >= 2;

  return (
    <OnboardingShell
      step={3}
      footer={
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          disabled={!canContinue}
          className={`min-h-[56px] flex-row items-center justify-center rounded-full shadow-dialog ${
            canContinue ? "bg-brand active:opacity-90" : "bg-muted"
          }`}
        >
          <Text
            className={`font-display text-lg uppercase tracking-button ${canContinue ? "text-on-brand" : "text-ink-muted"}`}
          >
            {t("onboarding.ctaStartAdvisor")}
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={canContinue ? "#000000" : "#737373"}
            style={{ marginLeft: 10 }}
          />
        </Pressable>
      }
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="mb-6 mt-1 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <LinearGradient
              colors={[hexToRgba(ui.headerAccentHex, 0.2), hexToRgba(ui.gradientPartnerHex, 0.13)]}
              className="h-11 w-11 items-center justify-center rounded-full"
            >
              <MaterialCommunityIcons name="map-marker-radius" size={22} color={ui.headerAccentHex} />
            </LinearGradient>
            <Text className="font-display text-xl text-ink">{t("app.name")}</Text>
          </View>
        </View>

        <View className="mb-5">
          <View className="self-start rounded-full border border-brand/35 bg-brand/10 px-3 py-1.5">
            <Text className="font-body-semibold text-[10px] uppercase tracking-[1.6px] text-brand">
              {t("onboarding.locationBadge")}
            </Text>
          </View>
          <Text className="mt-4 font-display text-4xl leading-[44px] tracking-tight text-ink">
            {t("onboarding.locationHeadline")}{" "}
            <Text className="text-brand">{t("onboarding.locationHeadlineAccent")}</Text>
          </Text>
          <Text className="mt-3 font-body text-base leading-6 text-ink-muted">{t("onboarding.locationSub")}</Text>
        </View>

        <View className="rounded-bento border border-white/[0.06] bg-card/95 p-6 shadow-card">
          <View>
            <Text className="mb-2 font-body-semibold text-xs uppercase tracking-wide text-ink-muted">
              {t("profile.twinName")}
            </Text>
            <Text className="mb-2 font-body text-xs text-ink-muted">{t("onboarding.farmerNameHint")}</Text>
            <TextInput
              value={farmerName}
              onChangeText={setFarmerName}
              placeholder={t("auth.namePlaceholder")}
              className="min-h-[52px] rounded-xl border border-white/[0.06] bg-muted px-4 font-body text-[15px] text-ink"
              placeholderTextColor="#737373"
              autoCorrect={false}
            />
          </View>
          <View className="mt-4">
            <Text className="mb-2 font-body-semibold text-xs uppercase tracking-wide text-ink-muted">
              {t("onboarding.stateLabel")}
            </Text>
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder={t("onboarding.statePlaceholder")}
              className="min-h-[52px] rounded-xl border border-white/[0.06] bg-muted px-4 font-body text-[15px] text-ink"
              placeholderTextColor="#737373"
              autoCorrect={false}
            />
          </View>
          <View className="mt-4">
            <Text className="mb-2 font-body-semibold text-xs uppercase tracking-wide text-ink-muted">
              {t("onboarding.districtLabel")}
            </Text>
            <TextInput
              value={district}
              onChangeText={setDistrict}
              placeholder={t("onboarding.districtPlaceholder")}
              className="min-h-[52px] rounded-xl border border-white/[0.06] bg-muted px-4 font-body text-[15px] text-ink"
              placeholderTextColor="#737373"
              autoCorrect={false}
            />
          </View>
          <View className="mt-4">
            <Text className="mb-2 font-body-semibold text-xs uppercase tracking-wide text-ink-muted">
              {t("onboarding.villageLabel")}
            </Text>
            <TextInput
              value={village}
              onChangeText={setVillage}
              placeholder={t("onboarding.villagePlaceholder")}
              className="min-h-[52px] rounded-xl border border-white/[0.06] bg-muted px-4 font-body text-[15px] text-ink"
              placeholderTextColor="#737373"
              autoCorrect={false}
            />
          </View>
          <View className="mt-4">
            <Text className="mb-2 font-body-semibold text-xs uppercase tracking-wide text-ink-muted">
              {t("onboarding.landSizeLabel")}
            </Text>
            <View className="relative">
              <TextInput
                value={landSize}
                onChangeText={setLandSize}
                placeholder={t("onboarding.landSizePlaceholder")}
                keyboardType="decimal-pad"
                className="min-h-[52px] rounded-xl border border-white/[0.06] bg-muted px-4 pr-20 font-body text-[15px] text-ink"
                placeholderTextColor="#737373"
              />
              <Text className="absolute right-4 top-[15px] font-body-semibold text-xs uppercase text-ink-muted">
                {t("onboarding.landSizeUnit")}
              </Text>
            </View>
          </View>
          <View className="mt-4">
            <Text className="mb-2 font-body-semibold text-xs uppercase tracking-wide text-ink-muted">
              {t("onboarding.soilTypeLabel")}
            </Text>
            <Text className="mb-2 font-body text-xs text-ink-muted">{t("onboarding.soilTypeHint")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {SOIL_WIRE_OPTIONS.map((key) => {
                const selected = soilType === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSoilType(selected ? null : key)}
                    className={`rounded-full border px-3 py-2 ${
                      selected ? "border-brand bg-brand/15" : "border-white/[0.08] bg-muted"
                    }`}
                  >
                    <Text
                      className={`font-body-medium text-[13px] capitalize ${selected ? "text-brand" : "text-ink"}`}
                    >
                      {t(`onboarding.soil.${key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View className="mt-4">
            <Text className="mb-2 font-body-semibold text-xs uppercase tracking-wide text-ink-muted">
              {t("profile.crops")}
            </Text>
            <TextInput
              value={cropsText}
              onChangeText={setCropsText}
              className="min-h-[52px] rounded-xl border border-white/[0.06] bg-muted px-4 font-body text-[15px] text-ink"
              placeholderTextColor="#737373"
              placeholder={t("profile.cropsPlaceholder")}
            />
            <Text className="mt-1 font-body text-[11px] text-ink-muted">{t("profile.cropsHint")}</Text>
          </View>

          <View className="mt-5 flex-row gap-3 rounded-2xl border border-white/[0.08] bg-card/60 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand/20">
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color={ui.headerAccentHex} />
            </View>
            <View className="flex-1">
              <Text className="font-body-semibold text-xs uppercase tracking-wide text-ink-muted">
                {t("onboarding.locationGpsTitle")}
              </Text>
              <Text className="mt-1 font-body text-sm leading-5 text-ink">{t("onboarding.locationGpsHint")}</Text>
            </View>
          </View>
        </View>

        {locating ? (
          <View className="mt-4 flex-row items-center gap-2">
            <ActivityIndicator color={ui.accentHex} />
            <Text className="font-body text-sm text-ink-muted">{t("onboarding.detectingLocation")}</Text>
          </View>
        ) : null}
      </ScrollView>
    </OnboardingShell>
  );
}
