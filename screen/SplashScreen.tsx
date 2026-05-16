import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export function SplashScreen() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-page" accessibilityLabel={t("app.name")}>
      <ActivityIndicator size="large" color="#1ed760" />
      <Text className="mt-3 text-sm text-text-muted opacity-80">{t("app.name")}</Text>
    </View>
  );
}
