import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const ACCENT = "#1B3A28";

export function ModelDownloadConsentModal({
  visible,
  onConfirm,
  onDecline,
}: {
  visible: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <MaterialCommunityIcons name="download-circle-outline" size={36} color={ACCENT} />
          </View>
          <Text style={styles.title}>{t("modelDownload.consentTitle")}</Text>
          <Text style={styles.body}>{t("modelDownload.consentBody")}</Text>
          <View style={styles.storageRow}>
            <MaterialCommunityIcons name="database-outline" size={18} color={INK_MUTED} />
            <Text style={styles.storageText}>{t("modelDownload.consentStorage")}</Text>
          </View>
          <View style={styles.btnRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onDecline}
              style={styles.declineBtn}
            >
              <Text style={styles.declineBtnText}>{t("modelDownload.consentDecline")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={styles.confirmBtn}
            >
              <Text style={styles.confirmBtnText}>{t("modelDownload.consentConfirm")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconRow: { alignItems: "center", marginBottom: 16 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: INK,
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 14,
  },
  storageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F3F6F4",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  storageText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: INK,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E5E2",
    alignItems: "center",
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
