import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useApiStatus } from "./apiStatus";

export const ServerWakingBanner = () => {
  const { t } = useTranslation();
  const status = useApiStatus();
  const shownDown = useRef(false);

  useEffect(() => {
    if (status === "down" && !shownDown.current) {
      shownDown.current = true;
      Alert.alert(t("server.down"));
    }
    if (status === "warm" || status === "cold") {
      shownDown.current = false;
    }
  }, [status, t]);

  if (status !== "cold") return null;

  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-center justify-center gap-2 bg-amber/10 px-4 py-2"
    >
      <ActivityIndicator size="small" color="#6D5100" />
      <Text className="font-body text-sm text-amber">{t("server.waking")}</Text>
    </View>
  );
};
