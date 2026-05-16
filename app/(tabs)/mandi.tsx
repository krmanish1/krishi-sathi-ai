import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import {
  useMandiApi,
  MandiFilterModal,
  useIndiaLocationLists,
  type MandiFilter,
  type MandiPriceRow,
} from "@/features/mandi";
import { useConnectivityUi } from "@/shared/network";
import { useDisplayName, greetingFirstName } from "@/features/twin";
import { SidebarDrawer } from "@/shared/ui/primitives";

// ─── Design tokens ────────────────────────────────────────────────────────────

const PAGE_BG = "#F2EDE4";
const CARD_BG = "#FFFFFF";
const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const BRAND_GREEN = "#1B3A28";
const TREND_UP = "#16A34A";
const TREND_DOWN = "#DC2626";
const TREND_NEUTRAL = "#5C6C75";

// ─── Sparkline ────────────────────────────────────────────────────────────────

const UP_POINTS = [28, 32, 30, 38, 36, 44, 42, 50, 48, 55];
const DOWN_POINTS = [55, 50, 52, 45, 48, 40, 42, 36, 33, 28];

function Sparkline({
  up,
  color,
}: {
  up: boolean | null;
  color: string;
}) {
  const points = up === false ? DOWN_POINTS : UP_POINTS;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  return (
    <View style={sparkStyles.row}>
      {points.map((p, i) => {
        const h = Math.round(((p - min) / range) * 22 + 6);
        return (
          <View
            key={i}
            style={[
              sparkStyles.bar,
              {
                height: h,
                backgroundColor: color,
                opacity: 0.18 + (0.55 * i) / points.length,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const sparkStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 32,
    gap: 2,
    marginTop: 12,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
});

// ─── Crop price card ─────────────────────────────────────────────────────────

function CropPriceCard({ row }: { row: MandiPriceRow }) {
  const trendUp = row.up === true;
  const trendDown = row.up === false;
  const trendColor = trendUp ? TREND_UP : trendDown ? TREND_DOWN : TREND_NEUTRAL;
  const trendIcon = trendUp ? "trending-up" : trendDown ? "trending-down" : "minus";

  return (
    <View style={cropStyles.card}>
      <View style={cropStyles.topRow}>
        <Text style={cropStyles.cropName} numberOfLines={1}>
          {row.label}
        </Text>
        {row.changeLabel !== "—" ? (
          <View style={cropStyles.trendBadge}>
            <MaterialCommunityIcons
              name={trendIcon}
              size={12}
              color={trendColor}
            />
            <Text style={[cropStyles.trendText, { color: trendColor }]}>
              {row.changeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={cropStyles.price} numberOfLines={1}>
        {row.price}
        <Text style={cropStyles.priceUnit}>/qtl</Text>
      </Text>

      <Sparkline up={row.up} color={trendColor} />
    </View>
  );
}

const cropStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cropName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: INK,
    flex: 1,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  trendText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  price: {
    fontSize: 22,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    color: INK,
    marginTop: 6,
  },
  priceUnit: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
    color: INK_MUTED,
  },
});

// ─── Nearby Mandi card ────────────────────────────────────────────────────────

type MandiStatus = "bullish" | "bearish" | "stable" | "neutral";

function nearbyMandiFromRows(
  rows: MandiPriceRow[],
  district: string,
): {
  name: string;
  distance: string;
  status: MandiStatus;
  volume: "High" | "Med" | "Low";
  iconBg: string;
}[] {
  // Group rows by place
  const placeMap = new Map<string, MandiPriceRow[]>();
  rows.forEach((r) => {
    const place = r.place || district || "Local";
    const existing = placeMap.get(place) ?? [];
    existing.push(r);
    placeMap.set(place, existing);
  });

  const places = [...placeMap.entries()].slice(0, 3);

  const STATUS_CYCLE: MandiStatus[] = ["stable", "bullish", "neutral"];
  const DISTANCES = ["2.4 km away", "15.8 km away", "10.2 km away"];
  const VOLUMES: ("High" | "Med" | "Low")[] = ["High", "Med", "Low"];
  const ICON_BGS = ["#1B3A28", "#FEF3C7", "#F3F6F4"];

  return places.map(([place, priceRows], idx) => {
    const upCount = priceRows.filter((r) => r.up === true).length;
    const downCount = priceRows.filter((r) => r.up === false).length;
    let status: MandiStatus = STATUS_CYCLE[idx] ?? "neutral";
    if (priceRows.length > 0) {
      if (upCount > downCount) status = "bullish";
      else if (downCount > upCount) status = "bearish";
      else status = idx === 0 ? "stable" : "neutral";
    }
    return {
      name: `${place} Mandi`,
      distance: DISTANCES[idx] ?? "—",
      status,
      volume: VOLUMES[idx] ?? "Low",
      iconBg: ICON_BGS[idx] ?? "#F3F6F4",
    };
  });
}

function MandiStatusChip({ status }: { status: MandiStatus }) {
  const label =
    status === "bullish"
      ? "Bullish"
      : status === "bearish"
        ? "Bearish"
        : status === "stable"
          ? "Stable"
          : "Neutral";
  const icon =
    status === "bullish"
      ? "trending-up"
      : status === "bearish"
        ? "trending-down"
        : "minus";
  const color =
    status === "bullish"
      ? TREND_DOWN
      : status === "bearish"
        ? TREND_DOWN
        : status === "stable"
          ? INK
          : TREND_NEUTRAL;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <MaterialCommunityIcons name={icon} size={14} color={color} />
      <Text style={[nearbyStyles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function NearbyMandiRow({
  item,
  idx,
}: {
  item: ReturnType<typeof nearbyMandiFromRows>[number];
  idx: number;
}) {
  const iconColor = idx === 0 ? "#FFFFFF" : idx === 1 ? "#D97706" : "#5C6C75";

  return (
    <View style={nearbyStyles.card}>
      <View
        style={[nearbyStyles.iconWrap, { backgroundColor: item.iconBg }]}
      >
        <MaterialCommunityIcons
          name="map-marker-outline"
          size={20}
          color={iconColor}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={nearbyStyles.mandiName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={nearbyStyles.mandiDist}>{item.distance}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <MandiStatusChip status={item.status} />
        <Text style={nearbyStyles.volumeText}>
          Market Volume: {item.volume}
        </Text>
      </View>
    </View>
  );
}

const nearbyStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mandiName: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    color: INK,
  },
  mandiDist: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    marginTop: 2,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  volumeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
  },
});

// ─── AI Insights banner ───────────────────────────────────────────────────────

function AiInsightsBanner({ topCrop }: { topCrop: MandiPriceRow | null }) {
  const cropName = topCrop?.label ?? "Wheat";
  const isUp = topCrop?.up === true;

  return (
    <View style={insightStyles.banner}>
      {/* Background stars */}
      <View style={[insightStyles.star, { top: 8, right: 16 }]}>
        <MaterialCommunityIcons name="star-four-points" size={24} color="rgba(255,255,255,0.12)" />
      </View>
      <View style={[insightStyles.star, { bottom: 12, right: 48 }]}>
        <MaterialCommunityIcons name="star-four-points" size={16} color="rgba(255,255,255,0.08)" />
      </View>

      {/* Header row */}
      <View style={insightStyles.headerRow}>
        <MaterialCommunityIcons name="robot-outline" size={18} color="#00ED64" />
        <Text style={insightStyles.headerLabel}>AI INSIGHTS</Text>
      </View>

      {/* Body */}
      <Text style={insightStyles.body}>
        {cropName} prices are expected to{" "}
        <Text style={insightStyles.highlight}>
          {isUp ? "peak in 10" : "stabilise soon"}
        </Text>
        {" "}— optimal selling window ahead.
      </Text>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  banner: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 18,
    padding: 20,
    overflow: "hidden",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  star: { position: "absolute" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
    color: "#00ED64",
    letterSpacing: 1.2,
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 22,
  },
  highlight: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontWeight: "700",
    color: "#00ED64",
  },
});

// ─── All prices modal row ─────────────────────────────────────────────────────

function AllPricesSection({
  rows,
  isLive,
}: {
  rows: MandiPriceRow[];
  isLive: boolean;
}) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map((item, i) => (
        <View
          key={i}
          style={[
            allStyles.row,
            i < rows.length - 1 ? allStyles.rowBorder : null,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={allStyles.label}>{item.label}</Text>
            <Text style={allStyles.place} numberOfLines={1}>
              {t("mandi.mandiPlace", { place: item.place })}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={allStyles.price}>{item.price}</Text>
            {item.changeLabel !== "—" ? (
              <Text
                style={[
                  allStyles.change,
                  {
                    color: isLive
                      ? INK_MUTED
                      : item.up === true
                        ? TREND_UP
                        : item.up === false
                          ? TREND_DOWN
                          : INK_MUTED,
                  },
                ]}
              >
                {isLive
                  ? t("mandi.priceRange", { range: item.changeLabel })
                  : item.changeLabel}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </>
  );
}

const allStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8EDEB",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: INK,
  },
  place: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  price: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: INK,
  },
  change: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MandiScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const obState = useOnboarding((s) => s.state) ?? "";
  const obDistrict = useOnboarding((s) => s.district) ?? "";
  const ui = useConnectivityUi();
  const displayName = useDisplayName();
  const avatarLetter = (() => {
    const first = greetingFirstName(displayName);
    return first ? first.charAt(0).toUpperCase() : "K";
  })();

  const {
    rows,
    filter,
    setFilter,
    resetFilter: resetMandiFilter,
    isManualFilter,
    isLoading,
    isRefetching,
    isLive,
    isStateLevelFallback,
    refetch,
    state,
    district,
    liveSource,
    arrivalDate,
  } = useMandiApi();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [showAllPrices, setShowAllPrices] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draftState, setDraftState] = useState(filter.state);
  const [draftDistrict, setDraftDistrict] = useState(filter.district);

  const locationLists = useIndiaLocationLists(draftState);

  const openFilter = useCallback(() => {
    setDraftState(filter.state);
    setDraftDistrict(filter.district);
    setFilterModalVisible(true);
  }, [filter]);

  const applyFilter = useCallback(() => {
    const next: MandiFilter = {
      state: draftState.trim(),
      district: draftDistrict.trim(),
    };
    setFilter(next);
    setFilterModalVisible(false);
  }, [draftState, draftDistrict, setFilter]);

  const resetFilter = useCallback(() => {
    resetMandiFilter();
    setDraftState(obState);
    setDraftDistrict(obDistrict);
    setFilterModalVisible(false);
  }, [resetMandiFilter, obState, obDistrict]);

  // Top 2 crops for "My Crop Prices" cards
  const topCrops = useMemo(() => rows.slice(0, 2), [rows]);

  // Filter rows by search query for full price list
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.place.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  // Nearby mandis derived from actual data
  const nearbyMandis = useMemo(
    () => nearbyMandiFromRows(rows, district || obDistrict),
    [rows, district, obDistrict],
  );

  const topCrop = topCrops[0] ?? null;

  const sourceLabel = (() => {
    if (!isLive) return t("mandi.cachedBadge");
    if (liveSource === "enam") return `${t("mandi.liveBadge")} · eNAM`;
    if (liveSource?.startsWith("agmarknet")) return `${t("mandi.liveBadge")} · Agmarknet`;
    return t("mandi.liveBadge");
  })();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setSidebarOpen(true)}
          style={styles.headerIconBtn}
        >
          <MaterialCommunityIcons name="menu" size={24} color={INK} />
        </Pressable>

        <Text style={styles.headerTitle}>{t("mandi.title")}</Text>

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setSidebarOpen(true)}
          style={styles.avatarBtn}
        >
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </Pressable>
      </View>

      {/* ── Scrollable content ─────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={BRAND_GREEN}
          />
        }
      >
        {/* Search + filter row */}
        <View style={styles.searchRow}>
          {/* Search input */}
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={INK_MUTED} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Mandis or crops..."
              placeholderTextColor="#A0ADB3"
              style={styles.searchInput}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={6}>
                <MaterialCommunityIcons name="close-circle" size={18} color={INK_MUTED} />
              </Pressable>
            ) : null}
          </View>

          {/* Filter button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter by location"
            onPress={openFilter}
            style={[styles.filterBtn, isManualFilter && styles.filterBtnActive]}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={20}
              color={isManualFilter ? "#FFFFFF" : INK}
            />
            {isManualFilter ? (
              <View style={styles.filterDot} />
            ) : null}
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", paddingTop: 48 }}>
            <ActivityIndicator color={BRAND_GREEN} />
          </View>
        ) : (
          <>
            {/* ── My Crop Prices ───────────────────────────────── */}
            {topCrops.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>My Crop Prices</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowAllPrices((v) => !v)}
                  >
                    <Text style={styles.viewAllText}>
                      {showAllPrices ? "Show Less" : "View All"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.cropRow}>
                  {topCrops.map((row, i) => (
                    <CropPriceCard key={i} row={row} />
                  ))}
                  {topCrops.length === 1 ? (
                    <View style={{ flex: 1 }} />
                  ) : null}
                </View>
              </>
            ) : null}

            {/* ── Nearby Mandis ────────────────────────────────── */}
            {nearbyMandis.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                  Nearby Mandis
                </Text>
                {nearbyMandis.map((mandi, idx) => (
                  <NearbyMandiRow key={mandi.name} item={mandi} idx={idx} />
                ))}
              </>
            ) : null}

            {/* ── All Prices (expanded) ────────────────────────── */}
            {showAllPrices && filteredRows.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>All Prices</Text>
                  {/* Location + source info */}
                  <Text style={styles.sourceBadge}>{sourceLabel}</Text>
                </View>

                {isStateLevelFallback || arrivalDate ? (
                  <Text style={styles.regionNote}>
                    {isStateLevelFallback
                      ? t("mandi.regionStateOnly", { state })
                      : t("mandi.region", { state, district: district || "—" })}
                    {arrivalDate
                      ? `  ·  ${t("mandi.arrivalDate", { date: arrivalDate })}`
                      : ""}
                  </Text>
                ) : null}

                <View style={styles.allPricesCard}>
                  <AllPricesSection rows={filteredRows} isLive={isLive} />
                </View>
              </>
            ) : null}

            {/* Empty state */}
            {!isLoading && rows.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons
                  name="storefront-outline"
                  size={40}
                  color="#A0ADB3"
                />
                <Text style={styles.emptyText}>
                  {ui.backendReachable &&
                  (filter.state.trim() || filter.district.trim())
                    ? t("mandi.emptyNoReport")
                    : t("mandi.empty")}
                </Text>
              </View>
            ) : null}

            {/* ── AI Insights ──────────────────────────────────── */}
            <AiInsightsBanner topCrop={topCrop} />
          </>
        )}
      </ScrollView>

      {/* Filter modal */}
      <MandiFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        draftState={draftState}
        draftDistrict={draftDistrict}
        onDraftStateChange={setDraftState}
        onDraftDistrictChange={setDraftDistrict}
        onApply={applyFilter}
        onReset={resetFilter}
        states={locationLists.states}
        districts={locationLists.districts}
        statesLoading={locationLists.statesLoading}
        districtsLoading={locationLists.districtsLoading}
        statesError={locationLists.statesError}
        districtsError={locationLists.districtsError}
        listsBlocked={locationLists.listsBlocked}
        onRefetchStates={locationLists.refetchStates}
        onRefetchDistricts={locationLists.refetchDistricts}
        ui={ui}
      />

      {/* Profile sidebar */}
      <SidebarDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        displayName={displayName}
        district={obDistrict}
        state={obState}
      />
    </View>
  );
}

// ─── Root styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: BRAND_GREEN,
    letterSpacing: -0.3,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: "700",
    color: "#00ED64",
    fontFamily: "PlusJakartaSans_700Bold",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  filterBtnActive: {
    backgroundColor: "#1B3A28",
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#F59E0B",
    borderWidth: 1.5,
    borderColor: CARD_BG,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: INK,
    padding: 0,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: INK,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: BRAND_GREEN,
    fontWeight: "600",
  },
  sourceBadge: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
  },
  regionNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    marginBottom: 10,
  },

  cropRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  allPricesCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    textAlign: "center",
  },
});
