import { useEffect, useState, type ReactNode } from "react";
import type { Connectivity } from "@/shared/api/types";
import { ConnectivityContext } from "./connectivityContext";
import { subscribeNetInfoConnectivity } from "./subscribeNetInfoConnectivity";

/**
 * Single NetInfo subscription for the whole native app. All `useConnectivity()` consumers
 * read the same value from context.
 */
export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState<Connectivity>("online");

  useEffect(() => subscribeNetInfoConnectivity(setC), []);

  return <ConnectivityContext.Provider value={c}>{children}</ConnectivityContext.Provider>;
}
