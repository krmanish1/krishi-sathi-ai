import type { Connectivity } from "@/shared/api/types";
import { useConnectivity } from "./connectivityContext";

/**
 * Connectivity passed into backend APIs (`postQuery`, sync, weather, voice token).
 * Matches NetInfo: when the device is `online`, callers hit the cloud API with
 * `connectivity: "online"`; on-device fallback happens only after request failure
 * (see `askAgent` / stream fallback), not because a health probe failed first.
 */
export function useApiConnectivity(): Connectivity {
  return useConnectivity();
}
