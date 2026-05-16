import { useCallback, useRef } from "react";
import { useModelDownloadStore } from "./modelDownloadStore";
import {
  downloadGemmaModel,
  detectModelVariant,
} from "@/features/onboarding/useModelDownload";
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
    store.setVariant(v);
    store.setStatus("downloading");
    store.setProgress(0);

    await showProgressNotification(0);

    try {
      await downloadGemmaModel(
        ({ received, total }) => {
          if (ctrl.signal.aborted) return;
          const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
          store.setProgress(pct);
          if (pct - lastNotifiedPct.current >= 5) {
            lastNotifiedPct.current = pct;
            void showProgressNotification(pct);
          }
        },
        ctrl.signal,
        v,
      );

      if (ctrl.signal.aborted) return;
      store.setProgress(100);
      store.setStatus("completed");
      await showCompletionNotification();
    } catch (err) {
      if (ctrl.signal.aborted) {
        store.resetToIdle();
        await dismissProgressNotification();
        return;
      }
      store.setStatus("failed");
      await showFailureNotification();
    }
  }, [store]);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const setPreferOffline = useCallback(
    (prefer: boolean) => {
      store.setPreferOffline(prefer);
      syncPreferOfflineToRouting(prefer);
    },
    [store],
  );

  return {
    status: store.status,
    progress: store.progress,
    variant: store.variant,
    bannerDismissed: store.bannerDismissed,
    preferOffline: store.preferOffline,
    startDownload,
    cancelDownload,
    dismissBanner: store.dismissBanner,
    setPreferOffline,
  };
}
