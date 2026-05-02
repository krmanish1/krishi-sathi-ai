import type { Connectivity } from "@/shared/api/types";

/** Minimal NetInfo fields — avoids importing NetInfo in pure mapper tests. */
export type NetInfoLike = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

/**
 * Map a NetInfo snapshot to app connectivity.
 * Returns `null` when the OS has not reported connection yet (`isConnected === null`) —
 * callers should keep the previous value instead of treating unknown as offline.
 */
export function mapNetInfoToConnectivity(s: NetInfoLike): Connectivity | null {
  if (s.isConnected === false) return "offline";
  if (s.isConnected === true) {
    if (s.isInternetReachable === false) return "degraded";
    return "online";
  }
  return null;
}
