import React, { createContext, useContext, useEffect, useState } from "react";
import { getHealth } from "./endpoints";
import { useConnectivity } from "@/shared/network";

export type ApiStatus = "unknown" | "cold" | "warm" | "down";

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 8_000;

const ApiStatusContext = createContext<ApiStatus>("unknown");

export const useApiStatus = (): ApiStatus => useContext(ApiStatusContext);

export const ApiStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<ApiStatus>("unknown");
  const connectivity = useConnectivity();
  // Only ping when connectivity is confirmed online — degraded means reachability
  // is unknown (isInternetReachable=null). Pinging then wastes a request that will
  // almost certainly time out on a device in airplane mode.
  const confirmed = connectivity === "online";

  useEffect(() => {
    if (!confirmed) {
      setStatus("unknown");
      return;
    }

    // Local closure vars — not a shared ref — so cleanup of one effect run cannot
    // accidentally clear the cancelled flag of the next run (shared-ref race).
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const ping = async (): Promise<void> => {
      try {
        await getHealth();
        if (!cancelled) setStatus("warm");
      } catch {
        if (cancelled) return;
        attempts += 1;
        if (attempts >= MAX_RETRIES) {
          setStatus("down");
        } else {
          setStatus("cold");
          timer = setTimeout(() => { void ping(); }, RETRY_INTERVAL_MS);
        }
      }
    };

    // Brief delay so the first health check doesn't race the same CDN slot as sync bundle / twin.
    const kickoff = setTimeout(() => { void ping(); }, 500);

    return () => {
      cancelled = true;
      clearTimeout(kickoff);
      if (timer) clearTimeout(timer);
    };
  }, [confirmed]);

  return (
    <ApiStatusContext.Provider value={status}>
      {children}
    </ApiStatusContext.Provider>
  );
};
