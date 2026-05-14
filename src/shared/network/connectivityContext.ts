import { createContext, useContext } from "react";
import type { Connectivity } from "@/shared/api/types";

/**
 * Default when no `ConnectivityProvider` is mounted (e.g. isolated tests): assume reachable.
 * The real app always wraps with `ConnectivityProvider` in `RootProviders`.
 */
const defaultConnectivity: Connectivity = "online";

export const ConnectivityContext = createContext<Connectivity>(defaultConnectivity);

/**
 * Raw connectivity from NetInfo (`"online" | "offline" | "degraded"`).
 * Use in **non-UI** code (API clients, hooks, sync). Screens should use
 * `useConnectivityUi` and read `ui.connectivity` only when passing into domain APIs.
 */
export function useConnectivity(): Connectivity {
  return useContext(ConnectivityContext);
}
