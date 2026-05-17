import { useEffect } from "react";
import { AppState } from "react-native";
import { useConnectivity } from "./connectivityContext";
import { runInitialSync } from "@/features/onboarding/useInitialSync";
import { postSyncPush } from "@/shared/api/endpoints";
import { loadBundleVersion } from "@/shared/storage/bundle";
import { getSupabase } from "@/shared/supabase";
import { useOnboarding } from "@/features/onboarding/store";

const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastSyncAt = 0;

export function useSyncOnResume(): void {
  const connectivity = useConnectivity();
  const isOnline = connectivity === "online";

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !isOnline) return;
      const now = Date.now();
      if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;
      lastSyncAt = now;
      void (async () => {
        try {
          const supabase = getSupabase();
          const session = supabase
            ? (await supabase.auth.getSession().catch(() => null))?.data?.session
            : null;
          const bundleVer = await loadBundleVersion().catch(() => null);
          const onboarding = useOnboarding.getState();
          await runInitialSync({
            state: onboarding.state ?? "",
            district: onboarding.district ?? "",
            ...(bundleVer ? { bundleVersion: bundleVer } : {}),
          }).catch(() => undefined);
          // Stagger push after bundle/sync traffic so HF Spaces doesn't hit connection limits.
          await new Promise((r) => setTimeout(r, 3500));
          await postSyncPush(session?.access_token, undefined).catch(() => undefined);
        } catch (e) {
          console.warn("[useSyncOnResume] sync failed", e);
          // Silent — sync on resume must never crash the app
        }
      })();
    });
    return () => sub.remove();
  }, [isOnline]);
}
