import React, { createContext, useContext, useEffect, useState } from "react";
import { ApiError } from "./errors";
import { getHealth } from "./endpoints";
import { isNetworkFetchError } from "./networkErrors";
import { resetBackendCircuit } from "./routing";
import { useConnectivity } from "@/shared/network/connectivityContext";

export type ApiStatus = "unknown" | "cold" | "warm" | "down";

const MAX_COLD_RETRIES = 3;
const RETRY_INTERVAL_MS = 8_000;
/** Fast fail for reachability probe — do not block UI on 60s HF cold-start timeout. */
const HEALTH_PROBE_TIMEOUT_MS = 12_000;

const ApiStatusContext = createContext<ApiStatus>("unknown");

export const useApiStatus = (): ApiStatus => useContext(ApiStatusContext);

function isUnreachableBackendError(e: unknown): boolean {
  if (isNetworkFetchError(e)) return true;
  if (e instanceof ApiError && e.status === 0) return true;
  const msg = e instanceof Error ? e.message : "";
  return msg.includes("Network request failed");
}

export const ApiStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [probeStatus, setProbeStatus] = useState<ApiStatus>("unknown");
  const connectivity = useConnectivity();
  // Only ping when connectivity is confirmed online — degraded means reachability
  // is unknown (isInternetReachable=null). Pinging then wastes a request that will
  // almost certainly time out on a device in airplane mode.
  const confirmed = connectivity === "online";
  const status: ApiStatus = confirmed ? probeStatus : "unknown";

  useEffect(() => {
    if (!confirmed) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const ping = async (): Promise<void> => {
      if (cancelled) return;
      try {
        await getHealth(undefined, { timeoutMs: HEALTH_PROBE_TIMEOUT_MS });
        if (!cancelled) {
          resetBackendCircuit();
          setProbeStatus("warm");
        }
      } catch (e) {
        if (cancelled) return;
        if (isUnreachableBackendError(e)) {
          if (__DEV__) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("UnknownHost") || msg.includes("Unable to resolve host")) {
              console.warn(
                "[ApiStatus] Cloud API host could not be resolved (DNS). " +
                  "Use on-device chat, fix Wi‑Fi/mobile DNS, or open the API URL in the phone browser. " +
                  msg,
              );
            }
          }
          setProbeStatus("down");
          return;
        }
        attempts += 1;
        if (attempts >= MAX_COLD_RETRIES) {
          setProbeStatus("down");
        } else {
          setProbeStatus("cold");
          timer = setTimeout(() => {
            void ping();
          }, RETRY_INTERVAL_MS);
        }
      }
    };

    const kickoff = setTimeout(() => {
      void ping();
    }, 500);

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
