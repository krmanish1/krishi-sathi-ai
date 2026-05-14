import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEnamMandiPricesFromGov, getMandiPricesFromGov } from "@/shared/api";
import type { DataGovMandiRecord } from "@/shared/api";
import { useConnectivityUi } from "@/shared/network";
import { useOnboarding } from "@/features/onboarding/store";
import { useMandiFromBundle } from "./mandiFromBundle";
import type { MandiPriceRow } from "./mandiFromBundle";
import { mandiRowsFromEnamRecords } from "./mandiGovWire";

export type MandiFilter = {
  state: string;
  district: string;
};

export type MandiLiveSource = "agmarknet_district" | "agmarknet_state" | "enam" | null;

export const MANDI_GOV_QUERY_KEY = (state: string, district: string) =>
  ["mandi", "gov", state, district] as const;

function govRecordToRow(r: DataGovMandiRecord): MandiPriceRow {
  const rangeLabel =
    r.min_price !== r.max_price
      ? `₹${r.min_price.toLocaleString("en-IN")} – ₹${r.max_price.toLocaleString("en-IN")}`
      : "—";
  return {
    label: r.commodity,
    price: `₹${r.modal_price.toLocaleString("en-IN")}`,
    place: r.market,
    changeLabel: rangeLabel,
    up: null,
  };
}

/**
 * Primary mandi data source.
 *
 * Filter: manual override via `setFilter`, else onboarding state + district (reactive).
 *
 * Data (online, in order):
 * 1. AGMARKNET (data.gov.in 9ef84268…) — state + district, then state-only if empty.
 * 2. eNAM (data.gov.in 5d623a19…) — state + district, then state-only if still empty.
 * 3. Cached sync bundle when offline or all live sources empty.
 */
export function useMandiApi() {
  const obState = useOnboarding((s) => s.state) ?? "";
  const obDistrict = useOnboarding((s) => s.district) ?? "";

  const [manualFilter, setManualFilter] = useState<MandiFilter | null>(null);
  const filter: MandiFilter = manualFilter ?? { state: obState, district: obDistrict };

  const ui = useConnectivityUi();
  const isOnline = ui.backendReachable;
  const hasLocation = !!filter.state || !!filter.district;

  const districtQuery = useQuery({
    queryKey: MANDI_GOV_QUERY_KEY(filter.state, filter.district),
    queryFn: ({ signal }) => {
      const params: Parameters<typeof getMandiPricesFromGov>[0] = { limit: 100, signal };
      if (filter.state) params.state = filter.state;
      if (filter.district) params.district = filter.district;
      return getMandiPricesFromGov(params);
    },
    enabled: isOnline && hasLocation,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const districtEmptyOrMissing =
    districtQuery.isSuccess &&
    (districtQuery.data === null || (districtQuery.data.records?.length ?? 0) === 0);

  const shouldTryAgmState =
    isOnline &&
    !!filter.state &&
    districtQuery.isFetched &&
    (districtEmptyOrMissing || districtQuery.isError);

  const stateOnlyQuery = useQuery({
    queryKey: MANDI_GOV_QUERY_KEY(filter.state, ""),
    queryFn: ({ signal }) => {
      const params: Parameters<typeof getMandiPricesFromGov>[0] = { limit: 100, signal };
      if (filter.state) params.state = filter.state;
      return getMandiPricesFromGov(params);
    },
    enabled: shouldTryAgmState,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const agmDistrictOk =
    districtQuery.isSuccess && districtQuery.data != null && (districtQuery.data.records?.length ?? 0) > 0;
  const agmStateOk =
    stateOnlyQuery.isSuccess && stateOnlyQuery.data != null && (stateOnlyQuery.data.records?.length ?? 0) > 0;

  const agmStateResolved = !shouldTryAgmState || stateOnlyQuery.isFetched;

  const agmExhaustedOnline =
    isOnline &&
    hasLocation &&
    !!filter.state &&
    districtQuery.isFetched &&
    agmStateResolved &&
    !agmDistrictOk &&
    !agmStateOk;

  const enamQuery = useQuery({
    queryKey: ["mandi", "enam", filter.state, filter.district] as const,
    queryFn: async ({ signal }) => {
      const st = filter.state.trim();
      const dist = filter.district.trim();
      if (!st) return null;
      if (dist.length > 0) {
        const r1 = await getEnamMandiPricesFromGov({
          state: st,
          district: dist,
          limit: 100,
          signal,
        });
        if (r1 && r1.records.length > 0) return { records: r1.records, total: r1.total, level: "district" as const };
      }
      const r2 = await getEnamMandiPricesFromGov({ state: st, limit: 100, signal });
      if (r2 && r2.records.length > 0) return { records: r2.records, total: r2.total, level: "state" as const };
      return null;
    },
    enabled: agmExhaustedOnline,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const bundleQuery = useMandiFromBundle();

  const districtRows = districtQuery.data?.records ?? [];
  const stateRows = stateOnlyQuery.data?.records ?? [];

  const isLiveDistrict = agmDistrictOk;
  const isLiveState = !isLiveDistrict && agmStateOk;
  const isLiveEnam = !isLiveDistrict && !isLiveState && enamQuery.isSuccess && enamQuery.data != null;

  const liveSource: MandiLiveSource = isLiveDistrict
    ? "agmarknet_district"
    : isLiveState
      ? "agmarknet_state"
      : isLiveEnam
        ? "enam"
        : null;

  const isLive = liveSource !== null;

  const rows: MandiPriceRow[] = isLiveDistrict
    ? districtRows.map(govRecordToRow)
    : isLiveState
      ? stateRows.map(govRecordToRow)
      : isLiveEnam
        ? mandiRowsFromEnamRecords(enamQuery.data!.records)
        : (bundleQuery.data?.rows ?? []);

  const displayState = filter.state || bundleQuery.data?.state || "—";
  const displayDistrict =
    isLiveState || (isLiveEnam && enamQuery.data?.level === "state")
      ? ""
      : filter.district || bundleQuery.data?.district || "—";

  const firstAgmRecord = isLiveDistrict
    ? districtQuery.data?.records[0]
    : isLiveState
      ? stateOnlyQuery.data?.records[0]
      : null;

  const firstEnam = isLiveEnam && enamQuery.data?.records[0];
  const enamArrival =
    firstEnam && typeof firstEnam === "object"
      ? String((firstEnam as Record<string, unknown>).arrival_date ?? "").trim()
      : "";

  return {
    rows,
    total: isLiveDistrict
      ? (districtQuery.data?.total ?? rows.length)
      : isLiveState
        ? (stateOnlyQuery.data?.total ?? rows.length)
        : isLiveEnam
          ? (enamQuery.data?.total ?? rows.length)
          : rows.length,
    filter,
    setFilter: (f: MandiFilter) => setManualFilter(f),
    resetFilter: () => setManualFilter(null),
    isManualFilter: manualFilter !== null,
    isLoading:
      districtQuery.isLoading ||
      (shouldTryAgmState && stateOnlyQuery.isLoading) ||
      (agmExhaustedOnline && enamQuery.isLoading) ||
      bundleQuery.isLoading,
    isRefetching:
      districtQuery.isRefetching ||
      stateOnlyQuery.isRefetching ||
      enamQuery.isRefetching ||
      bundleQuery.isRefetching,
    isLive,
    liveSource,
    isStateLevelFallback: isLiveState || (isLiveEnam && enamQuery.data?.level === "state"),
    refetch: () => {
      void districtQuery.refetch();
      void stateOnlyQuery.refetch();
      void enamQuery.refetch();
      void bundleQuery.refetch();
    },
    state: displayState,
    district: displayDistrict,
    arrivalDate: firstAgmRecord?.arrival_date || (enamArrival.length > 0 ? enamArrival : null),
  };
}
