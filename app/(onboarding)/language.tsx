import { Text, View, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { Language } from "@/shared/config/constants";
import { useOnboarding } from "@/features/onboarding/store";
import { OnboardingShell } from "@/features/onboarding";
import { useConnectivityUi } from "@/shared/network";
import { hexToRgba } from "@/shared/utils";

const CHOICES: { key: Language; title: string; subtitle: string; icon: string; iconBg: string }[] = [
  { key: "hi", title: "हिंदी", subtitle: "Hindi", icon: "translate-variant", iconBg: "#252525" },
  { key: "en", title: "English", subtitle: "English", icon: "alphabetical-variant", iconBg: "#272727" },
];

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const ui = useConnectivityUi();
  const setLanguage = useOnboarding((s) => s.setLanguage);
  const selectedLanguage = (useOnboarding((s) => s.language) ?? "hi") as Language;

  const onNext = () => {
    router.push("/(onboarding)/location");
  };

  return (
    <OnboardingShell
      step={2}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={onNext}
          className="min-h-[52px] flex-row items-center justify-center rounded-full bg-brand shadow-dialog active:opacity-90"
        >
          <Text className="font-display text-base uppercase tracking-button text-on-brand">
            {t("onboarding.continue")}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#000000" style={{ marginLeft: 8 }} />
        </Pressable>
      }
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="items-center pb-4 pt-1">
          <LinearGradient
            colors={[ui.headerAccentHex, ui.gradientPartnerHex]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="h-16 w-16 items-center justify-center rounded-full shadow-dialog"
          >
            <MaterialCommunityIcons name="tractor" size={28} color="#000000" />
          </LinearGradient>
          <Text className="mt-3 text-center font-display text-2xl tracking-tight text-ink">{t("app.name")}</Text>
          <Text className="mt-1.5 px-2 text-center font-body text-sm leading-5 text-ink-muted">
            {t("onboarding.pickLanguage")}
          </Text>
        </View>

        <View className="gap-2">
          {CHOICES.map((item) => {
            const selected = selectedLanguage === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.subtitle}
                onPress={() => {
                  setLanguage(item.key);
                  void i18n.changeLanguage(item.key);
                }}
                className={`min-h-[68px] flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                  selected ? "border-brand bg-card-mid" : "border-white/[0.06] bg-muted"
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: item.iconBg }}
                  >
                    <MaterialCommunityIcons name={item.icon as never} size={20} color={ui.headerAccentHex} />
                  </View>
                  <View>
                    <Text className="font-display text-lg leading-6 text-ink">{item.title}</Text>
                    <Text className="mt-0.5 font-body-medium text-xs text-ink-muted">{item.subtitle}</Text>
                  </View>
                </View>
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full ${
                    selected ? "bg-brand" : "border-2 border-border-light bg-transparent"
                  }`}
                >
                  {selected ? <MaterialCommunityIcons name="check" size={14} color="#000000" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <LinearGradient
          colors={[hexToRgba(ui.headerAccentHex, 0.12), "rgba(18,18,18,0.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="mt-4 min-h-[96px] justify-end overflow-hidden rounded-xl border border-white/[0.06] px-4 py-3"
        >
          <MaterialCommunityIcons name="sprout-outline" size={36} color={ui.headerAccentHex} style={{ opacity: 0.35 }} />
          <Text className="mt-2 font-body-semibold text-[10px] uppercase tracking-[1.6px] text-brand">
            {t("home.recommended")}
          </Text>
          <Text className="font-display text-lg leading-6 text-ink">{t("onboarding.pickLocation")}</Text>
        </LinearGradient>
      </ScrollView>
    </OnboardingShell>
  );
}
