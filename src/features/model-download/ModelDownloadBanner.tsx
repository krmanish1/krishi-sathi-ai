import { View, Text, StyleSheet, Pressable } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useBackgroundModelDownload } from "./useBackgroundModelDownload";

const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const ACCENT = "#1B3A28";

export function ModelDownloadBanner() {
  const { t } = useTranslation();
  const { status, progress, bannerDismissed, startDownload, cancelDownload, dismissBanner } =
    useBackgroundModelDownload();

  if (status === "completed" || (status === "idle" && bannerDismissed)) return null;
  if (status === "failed" && bannerDismissed) return null;

  const isDownloading = status === "downloading";

  return (
    <View style={styles.banner}>
      {!isDownloading ? (
        <>
          <MaterialCommunityIcons name="download-circle-outline" size={20} color={ACCENT} />
          <Text style={styles.text} numberOfLines={2}>
            {t("modelDownload.bannerText")}
          </Text>
          <Pressable
            onPress={() => void startDownload()}
            style={styles.actionBtn}
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnText}>
              {status === "failed" ? t("modelDownload.retry") : t("modelDownload.download")}
            </Text>
          </Pressable>
          <Pressable
            onPress={dismissBanner}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t("modelDownload.dismiss")}
          >
            <MaterialCommunityIcons name="close" size={16} color={INK_MUTED} />
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.progressGroup}>
            <Text style={styles.text}>{t("modelDownload.downloading", { pct: progress })}</Text>
            <View style={styles.trackBg}>
              <View style={[styles.trackFill, { width: `${progress}%` as `${number}%` }]} />
            </View>
          </View>
          <Pressable onPress={cancelDownload} style={styles.actionBtn} accessibilityRole="button">
            <Text style={styles.actionBtnText}>{t("modelDownload.cancel")}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FCDDB5",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: INK,
  },
  progressGroup: { flex: 1, gap: 6 },
  trackBg: {
    height: 4,
    backgroundColor: "rgba(0,30,43,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  trackFill: {
    height: 4,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: ACCENT,
    borderRadius: 20,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  closeBtn: { padding: 4 },
});
