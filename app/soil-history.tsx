import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const CARD_BG = "#FFFFFF";
const PAGE_BG = "#F2EDE4";
const SOIL_DARK = "#1B3A28";

const SOIL_RECORDS = [
  {
    date: "May 12, 2026",
    label: "Spring Test",
    nitrogen: 78,
    phosphorus: 62,
    potassium: 85,
    moisture: 68,
    ph: 6.8,
    status: "Optimal",
    statusColor: "#16A34A",
  },
  {
    date: "Feb 5, 2026",
    label: "Winter Test",
    nitrogen: 64,
    phosphorus: 55,
    potassium: 72,
    moisture: 54,
    ph: 6.5,
    status: "Good",
    statusColor: "#D97706",
  },
  {
    date: "Oct 18, 2025",
    label: "Rabi Season",
    nitrogen: 52,
    phosphorus: 48,
    potassium: 66,
    moisture: 45,
    ph: 7.1,
    status: "Fair",
    statusColor: "#EA580C",
  },
] as const;

function NutrientBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${value}%` as never, backgroundColor: color }]} />
      </View>
      <Text style={barStyles.value}>{value}%</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  track: {
    height: 6,
    backgroundColor: "#E8EDEB",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
  value: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    marginTop: 3,
  },
});

export default function SoilHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        <Text style={styles.title}>{t("soilHistory.title")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <MaterialCommunityIcons
              name="flask-outline"
              size={32}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.heroTitle}>Latest Soil Report</Text>
            <Text style={styles.heroSub}>May 12, 2026 · Spring Test</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroPh}>pH 6.8</Text>
            <View style={styles.heroStatusBadge}>
              <Text style={styles.heroStatusText}>Optimal</Text>
            </View>
          </View>
        </View>

        {/* Records list */}
        <Text style={styles.sectionLabel}>Test History</Text>
        {SOIL_RECORDS.map((record) => (
          <View key={record.date} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <View>
                <Text style={styles.recordDate}>{record.date}</Text>
                <Text style={styles.recordLabel}>{record.label}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: `${record.statusColor}18` },
                ]}
              >
                <Text style={[styles.statusText, { color: record.statusColor }]}>
                  {record.status}
                </Text>
              </View>
            </View>

            <View style={styles.nutrientRow}>
              <NutrientBar label="N" value={record.nitrogen} color="#16A34A" />
              <NutrientBar label="P" value={record.phosphorus} color="#D97706" />
              <NutrientBar label="K" value={record.potassium} color="#2563EB" />
            </View>

            <View style={styles.recordFooter}>
              <View style={styles.footerStat}>
                <MaterialCommunityIcons
                  name="water-outline"
                  size={14}
                  color={INK_MUTED}
                />
                <Text style={styles.footerStatText}>
                  Moisture {record.moisture}%
                </Text>
              </View>
              <View style={styles.footerStat}>
                <MaterialCommunityIcons
                  name="flask-outline"
                  size={14}
                  color={INK_MUTED}
                />
                <Text style={styles.footerStatText}>pH {record.ph}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* CTA */}
        <Pressable accessibilityRole="button" style={styles.addTestBtn}>
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color={SOIL_DARK} />
          <Text style={styles.addTestText}>Add New Soil Test</Text>
        </Pressable>
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
  heroCard: {
    backgroundColor: SOIL_DARK,
    borderRadius: 18,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroLeft: { gap: 6 },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#FFFFFF",
  },
  heroSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  heroRight: { alignItems: "flex-end", gap: 8 },
  heroPh: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#FFFFFF",
  },
  heroStatusBadge: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroStatusText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  recordCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  recordDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    marginBottom: 3,
  },
  recordLabel: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: INK,
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  nutrientRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  recordFooter: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8EDEB",
  },
  footerStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerStatText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
  },
  addTestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: SOIL_DARK,
    marginTop: 4,
  },
  addTestText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: SOIL_DARK,
  },
});
