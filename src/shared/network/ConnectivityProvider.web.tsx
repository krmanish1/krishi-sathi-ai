import { useEffect, useState, type ReactNode } from "react";
import type { Connectivity } from "@/shared/api/types";
import { ConnectivityContext } from "./connectivityContext";
import { subscribeNetInfoConnectivity } from "./subscribeNetInfoConnectivity";

/**
 * Web uses the same NetInfo mapping as native. Includes a light poll so if browser
 * `online`/`offline` events do not fire (or `navigator.onLine` was wrong on first paint),
 * we recover without a full reload.
 */
export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState<Connectivity>("online");

  useEffect(() => subscribeNetInfoConnectivity(setC, { pollIntervalMs: 20_000 }), []);

  return <ConnectivityContext.Provider value={c}>{children}</ConnectivityContext.Provider>;
}
