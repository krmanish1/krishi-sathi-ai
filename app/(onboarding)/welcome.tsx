import { Text, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { OnboardingShell } from "@/features/onboarding";

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <OnboardingShell
      step={1}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.continue")}
          onPress={() => router.push("/(onboarding)/language")}
          className="min-h-[52px] items-center justify-center rounded-full bg-brand px-6 shadow-dialog active:opacity-90"
        >
          <Text className="text-base font-semibold uppercase tracking-button text-on-brand">
            {t("onboarding.continue")}
          </Text>
        </Pressable>
      }
    >
      <View className="flex-1 justify-center pb-8">
        <LinearGradient
          colors={["rgba(30,215,96,0.22)", "rgba(22,141,64,0.08)", "transparent"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="mb-8 self-start overflow-hidden rounded-3xl p-5"
        >
          <View className="h-20 w-20 items-center justify-center rounded-full bg-brand shadow-dialog">
            <MaterialCommunityIcons name="tractor" size={36} color="#000000" />
          </View>
        </LinearGradient>

        <Text className="font-display text-4xl leading-tight tracking-tight text-ink" accessibilityRole="header">
          {t("app.name")}
        </Text>
        <Text className="mt-4 max-w-[340px] font-body text-lg leading-7 text-ink-muted">{t("onboarding.welcome")}</Text>

        <View className="mt-10 flex-row flex-wrap gap-2">
          <View className="rounded-full border border-white/[0.08] bg-muted/80 px-4 py-2">
            <Text className="font-body-semibold text-[11px] uppercase tracking-wide text-brand">{t("tabs.assistant")}</Text>
          </View>
          <View className="rounded-full border border-white/[0.08] bg-muted/80 px-4 py-2">
            <Text className="font-body-semibold text-[11px] uppercase tracking-wide text-ink-muted">{t("tabs.markets")}</Text>
          </View>
          <View className="rounded-full border border-white/[0.08] bg-muted/80 px-4 py-2">
            <Text className="font-body-semibold text-[11px] uppercase tracking-wide text-ink-muted">{t("home.quickActions")}</Text>
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
}
