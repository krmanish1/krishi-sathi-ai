import { Text, View } from "react-native";
import { useConnectivity } from "./useConnectivity";
import { useTranslation } from "react-i18next";

export const NetworkBanner = () => {
  const c = useConnectivity();
  const { t } = useTranslation();
  if (c === "online") {
    return null;
  }
  return (
    <View accessibilityRole="alert" className="border-b border-earth/20 bg-earth/10 px-4 py-2">
      <Text className="text-center font-body-medium text-sm text-earth">
        {c === "offline" ? t("network.offline") : t("network.degraded")}
      </Text>
    </View>
  );
};
