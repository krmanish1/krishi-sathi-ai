import { Text, View, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboarding } from "@/features/onboarding/store";
import {
  useMandiApi,
  useIndiaLocationLists,
  MandiFilterModal,
  type MandiFilter,
  type MandiPriceRow,
} from "@/features/mandi";
import { useState, memo, useCallback } from "react";
import { useConnectivityUi } from "@/shared/network";

export default function MandiScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const obState = useOnboarding((s) => s.state) ?? "";
  const obDistrict = useOnboarding((s) => s.district) ?? "";
  const ui = useConnectivityUi();

  const {
    rows,
    total,
    filter,
    setFilter,
    resetFilter: resetMandiFilter,
    isManualFilter,
    isLoading,
    isRefetching,
    isLive,
    liveSource,
    isStateLevelFallback,
    refetch,
    state,
    district,
    arrivalDate,
  } = useMandiApi();

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [draftState, setDraftState] = useState(filter.state);
  const [draftDistrict, setDraftDistrict] = useState(filter.district);

  const {
    states,
    districts,
    statesLoading,
    districtsLoading,
    statesError,
    districtsError,
    listsBlocked,
    refetchStates,
    refetchDistricts,
  } = useIndiaLocationLists(draftState);

  const openFilter = useCallback(() => {
    setDraftState(filter.state);
    setDraftDistrict(filter.district);
    setFilterModalVisible(true);
  }, [filter]);

  const applyFilter = useCallback(() => {
    const next: MandiFilter = { state: draftState.trim(), district: draftDistrict.trim() };
    setFilter(next);
    setFilterModalVisible(false);
  }, [draftState, draftDistrict, setFilter]);

  const resetFilter = useCallback(() => {
    resetMandiFilter();
    setDraftState(obState);
    setDraftDistrict(obDistrict);
    setFilterModalVisible(false);
  }, [resetMandiFilter, obState, obDistrict]);

  const onRefresh = useCallback(async () => {
    refetch();
  }, [refetch]);

  const sourceShort =
    liveSource === "enam"
      ? t("mandi.sourceEnamShort")
      : liveSource === "agmarknet_district" || liveSource === "agmarknet_state"
        ? t("mandi.sourceAgmarknetShort")
        : null;

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="border-b border-border/60 px-4 pb-3 pt-4"
        style={{ backgroundColor: ui.chatsHeaderSurfaceHex }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-lg text-title-green">{t("mandi.title")}</Text>
          <View className="flex-row items-center gap-2">
            {/* Live / Cached badge */}
            <View
              className={`rounded-full px-2 py-0.5 ${isLive ? "bg-success/15" : "bg-border/60"}`}
            >
              <Text
                className={`font-body text-xs ${isLive ? "text-success" : "text-ink-muted"}`}
              >
                {isLive && sourceShort
                  ? `${t("mandi.liveBadge")} · ${sourceShort}`
                  : isLive
                    ? t("mandi.liveBadge")
                    : t("mandi.cachedBadge")}
              </Text>
            </View>
            {/* Filter button */}
            <TouchableOpacity
              onPress={openFilter}
              className="rounded-full border border-border/60 px-3 py-1"
              accessibilityLabel={t("mandi.filterBtn")}
            >
              <Text className="font-body text-xs text-ink-muted">{t("mandi.filterBtn")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="mt-1 font-body text-sm text-ink-muted">
          {isStateLevelFallback
            ? t("mandi.regionStateOnly", { state })
            : t("mandi.region", { state, district: district || "—" })}
        </Text>

        {/* Arrival date + count row */}
        {(arrivalDate || rows.length > 0) && (
          <View className="mt-1 flex-row items-center gap-3">
            {arrivalDate ? (
              <Text className="font-body text-xs text-ink-muted">
                {t("mandi.arrivalDate", { date: arrivalDate })}
              </Text>
            ) : null}
            {rows.length > 0 && (
              <Text className="font-body text-xs text-ink-muted">
                {t("mandi.totalRecords", { count: total })}
              </Text>
            )}
          </View>
        )}

        {/* Manual filter active indicator */}
        {isManualFilter && (
          <TouchableOpacity onPress={resetFilter} className="mt-1.5 self-start">
            <Text className="font-body text-xs text-ink-muted underline">
              {t("mandi.filterReset")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ui.accentHex} />
        </View>
      ) : (
        <FlatList
          className="flex-1 px-4 pt-2"
          data={rows}
          keyExtractor={(_, i) => `m-${i}`}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={ui.accentHex}
            />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-10">
              <Text className="text-center font-body text-ink-muted">
                {ui.backendReachable && (filter.state.trim() || filter.district.trim())
                  ? t("mandi.emptyNoReport")
                  : t("mandi.empty")}
              </Text>
            </View>
          }
          renderItem={({ item }) => <MandiRowItem item={item} isLive={isLive} />}
        />
      )}

      <MandiFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        draftState={draftState}
        draftDistrict={draftDistrict}
        onDraftStateChange={setDraftState}
        onDraftDistrictChange={setDraftDistrict}
        onApply={applyFilter}
        onReset={resetFilter}
        states={states}
        districts={districts}
        statesLoading={statesLoading}
        districtsLoading={districtsLoading}
        statesError={statesError}
        districtsError={districtsError}
        listsBlocked={listsBlocked}
        onRefetchStates={refetchStates}
        onRefetchDistricts={refetchDistricts}
        ui={ui}
      />
    </View>
  );
}

const MandiRowItem = memo(function MandiRowItem({
  item,
  isLive,
}: {
  item: MandiPriceRow;
  isLive: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between py-4">
      <View className="mr-2 flex-1">
        <Text className="font-body-semibold text-ink">{item.label}</Text>
        <Text className="mt-0.5 font-body text-xs uppercase tracking-wide text-ink-muted">
          {t("mandi.mandiPlace", { place: item.place })}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-body-semibold text-ink">{item.price}</Text>
        {item.changeLabel !== "—" ? (
          <Text
            className={`font-body text-xs ${
              isLive
                ? "text-ink-muted"
                : item.up === true
                  ? "text-success"
                  : item.up === false
                    ? "text-danger"
                    : "text-ink-muted"
            }`}
          >
            {isLive ? t("mandi.priceRange", { range: item.changeLabel }) : item.changeLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
});
