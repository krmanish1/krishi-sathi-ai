import { useCallback, useRef } from "react";
import { useModelDownloadStore } from "./modelDownloadStore";
import { downloadGemmaModel, detectModelVariant } from "@/shared/ondevice";
import { setPreferOffline as syncPreferOfflineToRouting } from "@/shared/ondevice/modelState";
import {
  requestNotificationPermission,
  showProgressNotification,
  dismissProgressNotification,
  showCompletionNotification,
  showFailureNotification,
} from "./ModelDownloadNotification";

export function useBackgroundModelDownload() {
  const store = useModelDownloadStore();
  const abortRef = useRef<AbortController | null>(null);
  const lastNotifiedPct = useRef(-1);

  const startDownload = useCallback(async () => {
    if (store.status === "downloading" || store.status === "completed") return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    lastNotifiedPct.current = -1;

    await requestNotificationPermission();

    const v = await detectModelVariant();
    const s = useModelDownloadStore.getState();
    s.setVariant(v);
    s.setStatus("downloading");
    s.setProgress(0);

    await showProgressNotification(0);

    try {
      await downloadGemmaModel(
        ({ received, total }) => {
          if (ctrl.signal.aborted) return;
          const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
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
      useModelDownloadStore.getState().setProgress(100);
      useModelDownloadStore.getState().setStatus("completed");
      await showCompletionNotification();
    } catch {
      if (ctrl.signal.aborted) {
        useModelDownloadStore.getState().resetToIdle();
        await dismissProgressNotification();
        return;
      }
      useModelDownloadStore.getState().setStatus("failed");
      await showFailureNotification();
    }
  }, [store.status]);

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
    status: store.status,
    progress: store.progress,
    variant: store.variant,
    bannerDismissed: store.bannerDismissed,
    consentDeclined: store.consentDeclined,
    preferOffline: store.preferOffline,
    startDownload,
    cancelDownload,
    dismissBanner: store.dismissBanner,
    declineConsent: store.declineConsent,
    setPreferOffline,
  };
}
