import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-brand"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-white" accessibilityRole="header">
          {t("app.name")}
        </Text>
        <Text className="mt-3 text-lg leading-6 text-white/90">{t("onboarding.welcome")}</Text>
      </View>
      <View className="px-6 pb-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.continue")}
          onPress={() => router.push("/(onboarding)/language")}
          className="min-h-[52px] cursor-pointer items-center justify-center rounded-2xl bg-wheat shadow-cta active:opacity-90"
        >
          <Text className="text-base font-semibold text-brand">{t("onboarding.continue")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
