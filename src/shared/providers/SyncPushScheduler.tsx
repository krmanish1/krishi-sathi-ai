import { useEffect } from "react";
import { postSyncPush } from "@/shared/api";
import { useFarmerId, useSupabaseSession } from "@/shared/auth";
import { useConnectivity } from "@/shared/network";

/**
 * Calls `POST /api/v1/sync/push` when the user is signed in and the device has connectivity
 * (including right after login while online, and when coming back online from offline).
 */
export function SyncPushScheduler() {
  const farmerId = useFarmerId();
  const session = useSupabaseSession();
  const connectivity = useConnectivity();
  const online = connectivity === "online" || connectivity === "degraded";

  useEffect(() => {
    if (!farmerId || !online) return;
    const token = session?.access_token ?? null;
    void postSyncPush(token).catch(() => undefined);
  }, [farmerId, online, session?.access_token]);

  return null;
}
