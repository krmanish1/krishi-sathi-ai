import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { buildConnectivityUiConfig, type ConnectivityUiConfig } from "@/shared/config/connectivityUi";
import { isModelReady } from "@/shared/ondevice";
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
  const [onDeviceModelReady, setOnDeviceModelReady] = useState(() => isModelReady());

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") setOnDeviceModelReady(isModelReady());
    });
    return () => sub.remove();
  }, []);

  return useMemo(
    () => buildConnectivityUiConfig(connectivity, { onDeviceModelReady }),
    [connectivity, onDeviceModelReady],
  );
}
