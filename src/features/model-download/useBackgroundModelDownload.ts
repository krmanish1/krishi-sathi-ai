import { useCallback, useRef } from "react";
import { useModelDownloadStore } from "./modelDownloadStore";
import {
  downloadGemmaModel,
  getDeviceGemmaVariantPolicy,
  syncModelReadyFromDisk,
} from "@/shared/ondevice";
import { logOnDevice } from "@/shared/ondevice/ondeviceLog";
import { isModelReady, setPreferOffline as syncPreferOfflineToRouting } from "@/shared/ondevice/modelState";
import {
  requestNotificationPermission,
  showProgressNotification,
  dismissProgressNotification,
  showCompletionNotification,
  showFailureNotification,
} from "./ModelDownloadNotification";

export function useBackgroundModelDownload() {
  const status = useModelDownloadStore((s) => s.status);
  const progress = useModelDownloadStore((s) => s.progress);
  const variant = useModelDownloadStore((s) => s.variant);
  const bannerDismissed = useModelDownloadStore((s) => s.bannerDismissed);
  const consentDeclined = useModelDownloadStore((s) => s.consentDeclined);
  const preferOffline = useModelDownloadStore((s) => s.preferOffline);
  const dismissBanner = useModelDownloadStore((s) => s.dismissBanner);
  const declineConsent = useModelDownloadStore((s) => s.declineConsent);
  const abortRef = useRef<AbortController | null>(null);
  const lastNotifiedPct = useRef(-1);

  const startDownload = useCallback(async () => {
    const s0 = useModelDownloadStore.getState();
    if (s0.status === "downloading") return;
    if (s0.status === "completed") {
      const already = await syncModelReadyFromDisk();
      if (already.ready && isModelReady()) return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    lastNotifiedPct.current = -1;

    const s = useModelDownloadStore.getState();
    s.setStatus("downloading");
    s.setProgress(0);

    await requestNotificationPermission();

    const policy = await getDeviceGemmaVariantPolicy();
    const v = policy.variant;
    logOnDevice("sync_disk", {
      phase: "download_start",
      variant: v,
      strictOnly: policy.strictOnly,
    });
    s.setVariant(v);

    await showProgressNotification(0);

    try {
      await downloadGemmaModel(
        ({ received, total }) => {
          if (ctrl.signal.aborted) return;
          const pct =
            total > 0
              ? Math.min(99, Math.floor((received / total) * 100))
              : received > 0
                ? 1
                : 0;
          useModelDownloadStore.getState().setProgress(pct);
          if (pct - lastNotifiedPct.current >= 5) {
            lastNotifiedPct.current = pct;
            void showProgressNotification(pct);
          }
        },
        ctrl.signal,
        v,
      );

      if (ctrl.signal.aborted) return;

      const synced = await syncModelReadyFromDisk({ preferredVariant: v });
      if (!synced.ready) {
        useModelDownloadStore.getState().setStatus("failed");
        await showFailureNotification();
        return;
      }

      const store = useModelDownloadStore.getState();
      if (synced.variant) store.setVariant(synced.variant);
      store.setProgress(100);
      store.setStatus("completed");
      await showCompletionNotification();
    } catch (e) {
      if (ctrl.signal.aborted) {
        useModelDownloadStore.getState().resetToIdle();
        await dismissProgressNotification();
        return;
      }
      if (__DEV__) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[ModelDownload] failed:", msg);
      }
      useModelDownloadStore.getState().setStatus("failed");
      await showFailureNotification();
    }
  }, []);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const setPreferOffline = useCallback(
    (prefer: boolean) => {
      useModelDownloadStore.getState().setPreferOffline(prefer);
      syncPreferOfflineToRouting(prefer);
    },
    [],
  );

  return {
    status,
    progress,
    variant,
    bannerDismissed,
    consentDeclined,
    preferOffline,
    startDownload,
    cancelDownload,
    dismissBanner,
    declineConsent,
    setPreferOffline,
  };
}
