import { useEffect } from "react";
import { useModelDownloadStore } from "./modelDownloadStore";
import {
  getDeviceGemmaVariantPolicy,
  syncModelReadyFromDisk,
  setPreferOffline as syncPreferOfflineToRouting,
} from "@/shared/ondevice";

export function ModelDownloadBootSyncer(): null {
  const status = useModelDownloadStore((s) => s.status);
  const variant = useModelDownloadStore((s) => s.variant);
  const preferOffline = useModelDownloadStore((s) => s.preferOffline);
  const resetToIdle = useModelDownloadStore((s) => s.resetToIdle);

  // Only clear stale persisted "downloading" after app cold start — not during an active download.
  useEffect(() => {
    const clearStaleDownloading = () => {
      if (useModelDownloadStore.getState().status === "downloading") {
        resetToIdle();
      }
    };
    if (useModelDownloadStore.persist.hasHydrated()) {
      clearStaleDownloading();
      return;
    }
    return useModelDownloadStore.persist.onFinishHydration(clearStaleDownloading);
  }, [resetToIdle]);

  useEffect(() => {
    syncPreferOfflineToRouting(preferOffline);
  }, [preferOffline]);

  // Align persisted download state + runtime isModelReady() with files on disk.
  useEffect(() => {
    void (async () => {
      const policy = await getDeviceGemmaVariantPolicy();
      const store = useModelDownloadStore.getState();
      if (store.variant !== null && store.variant !== policy.variant) {
        store.setVariant(policy.variant);
        if (store.status === "completed") {
          store.resetToIdle();
        }
      } else if (store.variant === null) {
        store.setVariant(policy.variant);
      }

      const { ready, variant: onDiskVariant } = await syncModelReadyFromDisk({
        preferredVariant: policy.variant,
      });
      const s = useModelDownloadStore.getState();
      if (ready) {
        if (onDiskVariant) s.setVariant(onDiskVariant);
        if (s.status === "idle" || s.status === "failed") {
          s.setStatus("completed");
        }
        return;
      }
      if (s.status === "completed") {
        s.resetToIdle();
      }
    })();
  }, [status, variant]);

  return null;
}
