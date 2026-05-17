import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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
  const isOnline = connectivity !== "offline";
  const s = useRef({ attempts: 0, cancelled: false, timer: null as ReturnType<typeof setTimeout> | null });

  useEffect(() => {
    if (!isOnline) {
      setStatus("unknown");
      return;
    }

    const ref = s.current;
    ref.cancelled = false;
    ref.attempts = 0;

    const ping = async (): Promise<void> => {
      try {
        await getHealth();
        if (!ref.cancelled) setStatus("warm");
      } catch {
        if (ref.cancelled) return;
        ref.attempts += 1;
        if (ref.attempts >= MAX_RETRIES) {
          setStatus("down");
        } else {
          setStatus("cold");
          ref.timer = setTimeout(() => { void ping(); }, RETRY_INTERVAL_MS);
        }
      }
    };

    // Brief delay so the first health check doesn’t race the same CDN slot as sync bundle / twin.
    const kickoff = setTimeout(() => {
      void ping();
    }, 500);

    return () => {
      ref.cancelled = true;
      clearTimeout(kickoff);
      if (ref.timer) clearTimeout(ref.timer);
    };
  }, [isOnline]);

  return (
    <ApiStatusContext.Provider value={status}>
      {children}
    </ApiStatusContext.Provider>
  );
};
