import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { hexToRgba } from "@/shared/utils";
import { useConnectivityUi } from "./useConnectivityUi";

export const NetworkBanner = () => {
  const ui = useConnectivityUi();
  const { t } = useTranslation();
  if (ui.mode === "online") {
    return null;
  }
  const accent = ui.headerAccentHex;
  const offline = ui.connectivity === "offline";
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${offline ? t("network.offlineTitle") : t("network.degradedTitle")}. ${offline ? t("network.offlineBody") : t("network.degradedBody")}`}
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: hexToRgba(accent, 0.35),
        backgroundColor: hexToRgba(accent, 0.12),
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
      }}
    >
      <Text
        className="text-center font-body-semibold text-sm leading-5"
        style={{ color: accent }}
      >
        {offline ? t("network.offlineTitle") : t("network.degradedTitle")}
      </Text>
      <Text
        className="text-center font-body text-[13px] leading-[18px]"
        style={{ color: accent, opacity: 0.92 }}
      >
        {offline ? t("network.offlineBody") : t("network.degradedBody")}
      </Text>
    </View>
  );
};
