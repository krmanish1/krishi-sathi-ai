import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Switch,
} from "react-native";
import { useBackgroundModelDownload } from "@/features/model-download";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Constants from "expo-constants";
import { useOnboarding } from "@/features/onboarding/store";
import i18n from "@/shared/i18n";
import type { Language } from "@/shared/config/constants";

const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const CARD_BG = "#FFFFFF";
const PAGE_BG = "#F2EDE4";
const BORDER = "#E8EDEB";
const APP_LANG: Language[] = ["en", "hi"];
const APP_VERSION = (Constants.expoConfig?.version as string | undefined) ?? "1.0.0";

function SettingRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <MaterialCommunityIcons name={icon as never} size={18} color={INK_MUTED} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={18} color={INK_MUTED} />
      ) : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ opacity: 1 }}>
      {inner}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setLanguageStore = useOnboarding((s) => s.setLanguage);

  const {
    status: dlStatus,
    progress: dlProgress,
    preferOffline,
    startDownload,
    cancelDownload,
    setPreferOffline,
  } = useBackgroundModelDownload();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={INK} />
        </Pressable>
        <Text style={styles.title}>{t("settings.title")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Language section */}
        <Text style={styles.sectionLabel}>Language</Text>
        <View style={styles.card}>
          <View style={styles.langRow}>
            {APP_LANG.map((lg) => {
              const active = i18n.language === lg;
              return (
                <Pressable
                  key={lg}
                  accessibilityRole="button"
                  onPress={() => {
                    void i18n.changeLanguage(lg);
                    setLanguageStore(lg);
                  }}
                  style={[styles.langBtn, active ? styles.langBtnActive : null]}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      active ? styles.langBtnTextActive : null,
                    ]}
                  >
                    {lg === "en" ? "English" : "हिंदी"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* App info section */}
        <Text style={styles.sectionLabel}>App Information</Text>
        <View style={styles.card}>
          <SettingRow
            icon="information-outline"
            label="Version"
            value={APP_VERSION}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="shield-lock-outline"
            label="Privacy Policy"
            onPress={() => void Linking.openURL("https://krishisaathi.ai/privacy")}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="file-document-outline"
            label="Terms of Service"
            onPress={() => void Linking.openURL("https://krishisaathi.ai/terms")}
          />
        </View>

        {/* Offline Model section */}
        <Text style={styles.sectionLabel}>{t("modelDownload.settingsSection")}</Text>
        <View style={styles.card}>
          {dlStatus === "idle" || dlStatus === "failed" ? (
            <>
              {dlStatus === "failed" ? (
                <View style={[styles.row, { paddingBottom: 4 }]}>
                  <View style={styles.rowIconWrap}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#DC2626" />
                  </View>
                  <Text style={[styles.rowLabel, { color: "#DC2626" }]}>
                    {t("modelDownload.failed")}
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => void startDownload()}
                style={{ opacity: 1 }}
              >
                <View style={styles.row}>
                  <View style={styles.rowIconWrap}>
                    <MaterialCommunityIcons name="download-outline" size={18} color={INK_MUTED} />
                  </View>
                  <Text style={styles.rowLabel}>{t("modelDownload.settingsDownloadBtn")}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={INK_MUTED} />
                </View>
              </Pressable>
            </>
          ) : dlStatus === "downloading" ? (
            <View style={[styles.row, { flexDirection: "column", alignItems: "stretch", gap: 10 }]}>
              <Text style={styles.rowLabel}>
                {t("modelDownload.downloading", { pct: dlProgress })}
              </Text>
              <View style={dlStyles.trackBg}>
                <View style={[dlStyles.trackFill, { width: `${dlProgress}%` as `${number}%` }]} />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={cancelDownload}
                style={dlStyles.cancelBtn}
              >
                <Text style={dlStyles.cancelBtnText}>{t("modelDownload.cancel")}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.row}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#16A34A" />
                </View>
                <Text style={[styles.rowLabel, { color: "#16A34A" }]}>
                  {t("modelDownload.settingsStatus")}
                </Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.row}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="wifi-off" size={18} color={INK_MUTED} />
                </View>
                <Text style={styles.rowLabel}>{t("modelDownload.preferOfflineLabel")}</Text>
                <Switch
                  value={preferOffline}
                  onValueChange={setPreferOffline}
                  trackColor={{ true: "#1B3A28" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}
        </View>

        {/* Notifications section */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <SettingRow icon="bell-outline" label="Push Notifications" value="On" />
          <View style={styles.rowDivider} />
          <SettingRow icon="weather-cloudy" label="Weather Alerts" value="On" />
          <View style={styles.rowDivider} />
          <SettingRow icon="currency-inr" label="Mandi Price Alerts" value="Off" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: INK,
  },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 18,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 14,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F2EDE4",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: INK,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    marginRight: 4,
  },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 64 },
  langRow: { flexDirection: "row", gap: 12, padding: 16 },
  langBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  langBtnActive: { backgroundColor: "#1B3A28", borderColor: "#1B3A28" },
  langBtnText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
  },
  langBtnTextActive: { color: "#FFFFFF" },
});

const dlStyles = StyleSheet.create({
  trackBg: {
    height: 6,
    backgroundColor: "rgba(0,30,43,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  trackFill: {
    height: 6,
    backgroundColor: "#1B3A28",
    borderRadius: 3,
  },
  cancelBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#1B3A28",
    borderRadius: 20,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
