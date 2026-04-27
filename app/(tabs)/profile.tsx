import { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboarding } from "@/features/onboarding/store";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useFarmerTwin, useUpdateFarmerTwin } from "@/features/twin/useFarmerTwin";
import type { FarmerTwin } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import i18n from "@/shared/i18n";

const APP_LANG: Language[] = ["en", "hi"];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const farmerId = useFarmerId();
  const setLanguageStore = useOnboarding((s) => s.setLanguage);
  const { data: twin, isLoading, error } = useFarmerTwin();
  const update = useUpdateFarmerTwin();
  const [name, setName] = useState("");
  const [crops, setCrops] = useState("");

  useEffect(() => {
    if (!twin) {
      return;
    }
    queueMicrotask(() => {
      setName(twin.name ?? "");
      setCrops(twin.crops?.map((c) => c.name).join(", ") ?? "");
    });
  }, [twin]);

  if (!farmerId) {
    return (
      <View
        className="flex-1 items-center justify-center bg-page px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-ink-muted">{t("errors.farmerMissing")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="font-display text-xl text-title-green">{t("profile.title")}</Text>
        <Text className="mt-1 font-mono text-xs text-ink-muted" selectable>
          {farmerId}
        </Text>

        {isLoading ? (
          <View className="mt-6 items-center">
            <ActivityIndicator color="#0D631B" />
          </View>
        ) : error ? (
          <Text className="mt-4 text-sm text-danger">{t("errors.generic")}</Text>
        ) : null}

        <Text className="mt-6 font-body-semibold text-ink">{t("profile.appLanguage")}</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {APP_LANG.map((lg) => (
            <Pressable
              key={lg}
              onPress={() => {
                void i18n.changeLanguage(lg);
                setLanguageStore(lg);
              }}
              className={`rounded-full border border-border px-4 py-2 ${
                i18n.language === lg ? "bg-brand" : "bg-card"
              }`}
            >
              <Text
                className={`font-body-semibold text-sm ${
                  i18n.language === lg ? "text-white" : "text-ink"
                }`}
              >
                {t(`profile.lang.${lg}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {twin ? (
          <>
            <Text className="mt-6 font-body-semibold text-ink">{t("profile.twinName")}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="mt-1 min-h-[48px] rounded-xl border border-border bg-card px-3 py-2 font-body text-ink"
              placeholderTextColor="#78716C"
            />
            <Text className="mt-4 font-body-semibold text-ink">{t("profile.crops")}</Text>
            <Text className="font-body text-xs text-ink-muted">{t("profile.cropsHint")}</Text>
            <TextInput
              value={crops}
              onChangeText={setCrops}
              className="mt-1 min-h-[48px] rounded-xl border border-border bg-card px-3 py-2 font-body text-ink"
              placeholderTextColor="#78716C"
            />
            <Text className="mt-4 font-body text-sm text-ink-muted">
              {twin.location.state} · {twin.location.district}
            </Text>
            <Pressable
              className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-brand"
              disabled={update.isPending}
              onPress={() => {
                const names = crops
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                const nm = name.trim();
                const lg: Language = APP_LANG.includes(i18n.language as Language)
                  ? (i18n.language as Language)
                  : twin.language;
                const next: FarmerTwin = {
                  farmer_id: twin.farmer_id,
                  language: lg,
                  location: twin.location,
                  crops: names.map((n) => ({ name: n, area_acres: 0 })),
                  ...(nm ? { name: nm } : {}),
                  ...(twin.livestock ? { livestock: twin.livestock } : {}),
                };
                void update
                  .mutateAsync(next)
                  .then(() => {
                    Alert.alert(t("profile.saved"));
                  })
                  .catch(() => {
                    Alert.alert(t("errors.generic"));
                  });
              }}
            >
              {update.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-body-semibold text-white">{t("profile.save")}</Text>
              )}
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
