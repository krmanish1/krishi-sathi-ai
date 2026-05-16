import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import { useFarmerTwin, useUpdateFarmerTwin } from "@/features/twin";
import type { FarmerTwin } from "@/shared/api/types";

const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const CARD_BG = "#FFFFFF";
const PAGE_BG = "#F2EDE4";
const BORDER = "#E8EDEB";
const BRAND_GREEN = "#1B3A28";

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad";
  suffix?: string;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A0ADB3"
          keyboardType={keyboardType}
          autoCorrect={false}
          style={[fieldStyles.input, suffix ? { paddingRight: 48 } : null]}
        />
        {suffix ? <Text style={fieldStyles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputRow: { position: "relative" },
  input: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: INK,
  },
  suffix: {
    position: "absolute",
    right: 14,
    top: 14,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
    textTransform: "uppercase",
  },
});

export default function FarmSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setLocationPersist = useOnboarding((s) => s.setLocation);
  const { data: twin, isLoading } = useFarmerTwin();
  const update = useUpdateFarmerTwin();

  const [state, setState] = useState(twin?.location?.state ?? "");
  const [district, setDistrict] = useState(twin?.location?.district ?? "");
  const [crops, setCrops] = useState(twin?.current_crops?.join(", ") ?? "");
  const [acres, setAcres] = useState(
    twin?.land?.total_acres != null ? String(twin.land.total_acres) : "",
  );

  const handleSave = () => {
    if (!twin) return;
    const st = state.trim();
    const dist = district.trim();
    if (st.length < 2 || dist.length < 2) {
      Alert.alert(
        t("profile.locationIncompleteTitle"),
        t("profile.locationIncompleteBody"),
      );
      return;
    }
    const cropList = crops
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const acresNum = parseFloat(acres.replace(",", "."));
    const acresOk = Number.isFinite(acresNum) && acresNum > 0;
    const land: NonNullable<FarmerTwin["land"]> = twin.land ? { ...twin.land } : {};
    if (acresOk) land.total_acres = acresNum;
    else delete land.total_acres;

    const next: FarmerTwin = {
      ...twin,
      location: { ...twin.location, state: st, district: dist },
      current_crops: cropList,
      ...(Object.keys(land).length ? { land } : {}),
    };
    void update
      .mutateAsync(next)
      .then(() => {
        setLocationPersist(st, dist, { landAcres: acres.trim() || null });
        Alert.alert(t("profile.saved"));
      })
      .catch(() => Alert.alert(t("errors.generic")));
  };

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
        <Text style={styles.title}>{t("farmSettings.title")}</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={BRAND_GREEN} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Location</Text>
          <InputField
            label="State"
            value={state}
            onChangeText={setState}
            placeholder="e.g. Haryana"
          />
          <InputField
            label="District"
            value={district}
            onChangeText={setDistrict}
            placeholder="e.g. Karnal"
          />

          <Text style={styles.sectionLabel}>Crops</Text>
          <InputField
            label="Current Crops (comma separated)"
            value={crops}
            onChangeText={setCrops}
            placeholder="e.g. Wheat, Rice, Sugarcane"
          />

          <Text style={styles.sectionLabel}>Land</Text>
          <InputField
            label="Total Land Area"
            value={acres}
            onChangeText={setAcres}
            placeholder="5.0"
            keyboardType="decimal-pad"
            suffix="Acres"
          />

          {/* Irrigation info card */}
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color="#D97706"
            />
            <Text style={styles.infoText}>
              Keeping your farm details updated helps us give you better crop advice
              and weather alerts tailored to your location.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={update.isPending}
            onPress={handleSave}
            style={styles.saveBtn}
          >
            {update.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
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
    marginBottom: 12,
    marginTop: 20,
  },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FEFCE8",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 22,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
