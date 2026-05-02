import { Text, View, FlatList, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { runInitialSync } from "@/features/onboarding/useInitialSync";
import { useOnboarding } from "@/features/onboarding/store";
import {
  MANDI_QUERY_KEY,
  useMandiFromBundle,
  type MandiPriceRow,
} from "@/features/mandi/mandiFromBundle";
import { useState, memo, useEffect, useCallback } from "react";
import { useConnectivity } from "@/shared/network";

export default function MandiScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const state = useOnboarding((s) => s.state);
  const district = useOnboarding((s) => s.district);
  const { data, isLoading, refetch, isRefetching } = useMandiFromBundle();
  const [syncing, setSyncing] = useState(false);
  const connectivity = useConnectivity();

  const rows = data?.rows ?? [];
  const canSync = connectivity === "online" || connectivity === "degraded";

  const doSync = useCallback(async () => {
    if (!state || !district) {
      await refetch();
      return;
    }
    await runInitialSync({ state, district });
    await qc.invalidateQueries({ queryKey: MANDI_QUERY_KEY });
  }, [state, district, refetch, qc]);

  const onRefresh = useCallback(async () => {
    setSyncing(true);
    try {
      await doSync();
    } catch {
      Alert.alert(t("errors.retryLater"));
    } finally {
      setSyncing(false);
    }
  }, [doSync, t]);

  useEffect(() => {
    if (!state || !district || !canSync || rows.length > 0) return;
    void doSync().catch(() => undefined);
  }, [state, district, canSync, rows.length, doSync]);

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border/60 bg-card px-4 py-4">
        <Text className="font-display text-lg text-title-green">{t("mandi.title")}</Text>
        <Text className="mt-1 font-body text-sm text-ink-muted">
          {t("mandi.region", { state: data?.state ?? "—", district: data?.district ?? "—" })}
        </Text>
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1ed760" />
        </View>
      ) : (
        <FlatList
          className="flex-1 px-4 pt-2"
          data={rows}
          keyExtractor={(_, i) => `m-${i}`}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || syncing}
              onRefresh={onRefresh}
              tintColor="#1ed760"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-10">
              <Text className="text-center font-body text-ink-muted">{t("mandi.empty")}</Text>
            </View>
          }
          renderItem={({ item }) => <MandiRowItem item={item} />}
        />
      )}
    </View>
  );
}

const MandiRowItem = memo(function MandiRowItem({ item }: { item: MandiPriceRow }) {
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
            className={`font-body-semibold text-xs ${
              item.up === true
                ? "text-success"
                : item.up === false
                  ? "text-danger"
                  : "text-ink-muted"
            }`}
          >
            {item.changeLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
});
