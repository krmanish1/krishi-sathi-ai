import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getHealth } from "./endpoints";

export type ApiStatus = "unknown" | "cold" | "warm" | "down";

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 8_000;

const ApiStatusContext = createContext<ApiStatus>("unknown");

export const useApiStatus = (): ApiStatus => useContext(ApiStatusContext);

export const ApiStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<ApiStatus>("unknown");
  const s = useRef({ attempts: 0, cancelled: false, timer: null as ReturnType<typeof setTimeout> | null });

  useEffect(() => {
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

    void ping();

    return () => {
      ref.cancelled = true;
      if (ref.timer) clearTimeout(ref.timer);
    };
  }, []);

  return (
    <ApiStatusContext.Provider value={status}>
      {children}
    </ApiStatusContext.Provider>
  );
};
