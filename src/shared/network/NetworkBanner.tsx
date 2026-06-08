import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { hexToRgba } from "@/shared/utils";
import { useConnectivityUi } from "./useConnectivityUi";

export const NetworkBanner = () => {
  const ui = useConnectivityUi();
  const { t } = useTranslation();
  if (ui.connectivity !== "offline") {
    return null;
  }
  const accent = ui.headerAccentHex;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${t("network.offlineTitle")}. ${t("network.offlineBody")}`}
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
        {t("network.offlineTitle")}
      </Text>
      <Text
        className="text-center font-body text-[13px] leading-[18px]"
        style={{ color: accent, opacity: 0.92 }}
      >
        {t("network.offlineBody")}
      </Text>
    </View>
  );
};
