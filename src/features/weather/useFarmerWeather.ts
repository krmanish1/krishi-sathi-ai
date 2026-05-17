import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Connectivity } from "@/shared/api/types";
import { getFarmerWeather } from "@/shared/api";
import { weatherDisplayFromReport } from "./weatherDisplayFromReport";
import { getCachedWeather, setCachedWeather } from "./weatherCache";

export const FARMER_WEATHER_QUERY_KEY = (farmerId: string, connectivity: Connectivity) =>
  ["farmer", "weather", farmerId, connectivity] as const;

export function useFarmerWeather(opts: {
  farmerId: string | null | undefined;
  connectivity: Connectivity;
  fallbackPlace: string;
}) {
  const { farmerId, connectivity, fallbackPlace } = opts;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: farmerId ? FARMER_WEATHER_QUERY_KEY(farmerId, connectivity) : ["farmer", "weather", "disabled"],
    queryFn: async ({ signal }) => {
      if (!farmerId) throw new Error("no farmer");
      if (connectivity === "offline") {
        const cached = await getCachedWeather(farmerId);
        if (cached) return cached;
        throw new Error("no_cached_weather");
      }
      const result = await getFarmerWeather(farmerId, connectivity, { forceRefresh: false, signal });
      void setCachedWeather(farmerId, result).catch(() => undefined);
      return result;
    },
    enabled: !!farmerId,
    staleTime: 5 * 60 * 1000,
  });

  const forceRefresh = useMutation({
    mutationFn: () => {
      if (!farmerId || connectivity === "offline") {
        throw new Error("weather_offline");
      }
      return getFarmerWeather(farmerId, connectivity, { forceRefresh: true });
    },
    onSuccess: (data) => {
      if (farmerId) {
        qc.setQueryData(FARMER_WEATHER_QUERY_KEY(farmerId, connectivity), data);
      }
    },
  });

  const display = useMemo(
    () => weatherDisplayFromReport(query.data, fallbackPlace),
    [query.data, fallbackPlace],
  );

  const refreshWeather = useCallback(() => {
    void forceRefresh.mutateAsync().catch(() => undefined);
  }, [forceRefresh]);

  const isRefreshingWeather = query.isFetching || forceRefresh.isPending;

  return {
    ...query,
    display,
    refreshWeather,
    isRefreshingWeather,
    weatherError: query.isError ? query.error : forceRefresh.isError ? forceRefresh.error : null,
  };
}
