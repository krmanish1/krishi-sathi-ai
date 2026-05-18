import { useEffect, useState, type ReactNode } from "react";
import type { Connectivity } from "@/shared/api/types";
import { ConnectivityContext } from "./connectivityContext";
import { subscribeNetInfoConnectivity } from "./subscribeNetInfoConnectivity";

/**
 * Single NetInfo subscription for the whole native app. All `useConnectivity()` consumers
 * read the same value from context.
 */
export function ConnectivityProvider({ children }: { children: ReactNode }) {
  // Start "offline" so no queries fire before NetInfo resolves (~50-100ms on Android).
  // subscribeNetInfoConnectivity calls setC immediately on first NetInfo.fetch().
  const [c, setC] = useState<Connectivity>("offline");

  useEffect(() => subscribeNetInfoConnectivity(setC), []);

  return <ConnectivityContext.Provider value={c}>{children}</ConnectivityContext.Provider>;
}
