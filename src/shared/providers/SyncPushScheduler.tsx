import { useEffect } from "react";
import { postSyncPush } from "@/shared/api";
import { useFarmerId, useSupabaseSession } from "@/shared/auth";
import { useApiConnectivity } from "@/shared/network";

/**
 * Calls `POST /api/v1/sync/push` when the user is signed in and the device has connectivity
 * (including right after login while online, and when coming back online from offline).
 */
export function SyncPushScheduler() {
  const farmerId = useFarmerId();
  const session = useSupabaseSession();
  const connectivity = useApiConnectivity();
  const online = connectivity === "online";

  useEffect(() => {
    if (!farmerId || !online) return;
    const token = session?.access_token ?? null;
    // Defer push so cold HF / CDN isn’t hit at the same instant as health, twin, weather, bundle.
    const t = setTimeout(() => {
      void postSyncPush(token).catch(() => undefined);
    }, 4_500);
    return () => clearTimeout(t);
  }, [farmerId, online, session?.access_token]);

  return null;
}
