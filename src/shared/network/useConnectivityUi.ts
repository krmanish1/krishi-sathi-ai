import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { buildConnectivityUiConfig, type ConnectivityUiConfig } from "@/shared/config/connectivityUi";
import type { OfflineModelDetail } from "@/shared/config/connectivityUi";
import {
  getPreferOffline,
  getDeviceGemmaVariantPolicy,
  scanLocalGemmaModelOnDisk,
  isModelReady,
  subscribeModelReady,
  subscribePreferOffline,
} from "@/shared/ondevice";
import { syncModelReadyFromDisk } from "@/shared/ondevice/syncModelReadyFromDisk";
import { useApiStatus } from "@/shared/api/apiStatus";
import { useConnectivity } from "./connectivityContext";

/**
 * **Single UI entry point for network mode.** Prefer this over `useConnectivity` in routes/screens:
 * all connectivity-driven colors, feature flags, and copy keys come from the returned object.
 * Use `ui.connectivity` when passing into domain hooks/APIs that expect raw `Connectivity`.
 *
 * **Do not use `useFocusEffect` here:** this hook is consumed by `NetworkBanner` and `KrishiTabBar`,
 * which render outside or at the edge of a screen — `expo-router`'s `useFocusEffect` calls
 * `useNavigation()` during render and can throw "Couldn't find a navigation context".
 * On-device model readiness refreshes on **app resume** (`AppState` active) instead.
 */
export function useConnectivityUi(): ConnectivityUiConfig {
  const connectivity = useConnectivity();
  const apiStatus = useApiStatus();
  /** Only treat cloud as reachable after a successful `/api/v1/health` (avoids stream/sync while DNS is failing). */
  const cloudReachable = apiStatus === "warm";
  const [onDeviceModelReady, setOnDeviceModelReady] = useState(() => isModelReady());
  const [offlineModelDetail, setOfflineModelDetail] = useState<OfflineModelDetail>("checking");
  const [preferOffline, setPreferOffline] = useState(() => getPreferOffline());

  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlightRef = useRef(false);

  const runModelSync = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      setOfflineModelDetail("checking");
      const synced = await syncModelReadyFromDisk().catch(() => ({
        ready: false,
        variant: null,
        path: null,
      }));
      const ready = synced.ready && isModelReady();
      if (ready) {
        setOfflineModelDetail("ready");
      } else {
        const policy = await getDeviceGemmaVariantPolicy().catch(() => ({
          variant: "e2b" as const,
          strictOnly: true,
        }));
        const probe = await scanLocalGemmaModelOnDisk({
          preferredVariant: policy.variant,
          strictPreferred: policy.strictOnly,
        }).catch(() => ({
          exists: false,
          variant: policy.variant,
          path: "",
        }));
        setOfflineModelDetail(probe.exists ? "failed" : "missing");
      }
      setOnDeviceModelReady(isModelReady());
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  const refreshModelReady = useCallback(() => {
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(() => {
      syncDebounceRef.current = null;
      void runModelSync();
    }, 500);
  }, [runModelSync]);

  useEffect(() => {
    refreshModelReady();
    const unsubReady = subscribeModelReady(() => {
      setOnDeviceModelReady(isModelReady());
      refreshModelReady();
    });
    const unsubPrefer = subscribePreferOffline(() => setPreferOffline(getPreferOffline()));
    return () => {
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      unsubReady();
      unsubPrefer();
    };
  }, [refreshModelReady]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        refreshModelReady();
        setPreferOffline(getPreferOffline());
      }
    });
    return () => sub.remove();
  }, [refreshModelReady]);

  return useMemo(
    () =>
      buildConnectivityUiConfig(connectivity, {
        onDeviceModelReady,
        preferOffline,
        cloudReachable,
        offlineModelDetail,
      }),
    [connectivity, onDeviceModelReady, preferOffline, cloudReachable, offlineModelDetail],
  );
}
