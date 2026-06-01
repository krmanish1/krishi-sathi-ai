import { useCallback, useEffect, useState } from "react";
import {
  syncModelReadyFromDisk,
  isModelReady,
  subscribeModelReady,
} from "@/shared/ondevice";
import { useModelDownloadStore } from "./modelDownloadStore";

/**
 * Whether the model file is on disk and (when native is enabled) loadable.
 * Unlike {@link useModelDownloadStore} `status === "completed"`, this reflects real readiness for chat.
 */
export function useModelDiskReady() {
  const variant = useModelDownloadStore((s) => s.variant);
  const [diskReady, setDiskReady] = useState(() => isModelReady());

  const refresh = useCallback(async () => {
    const synced = await syncModelReadyFromDisk(
      variant !== null ? { preferredVariant: variant } : undefined,
    ).catch(() => ({ ready: false, variant: null, path: null }));
    setDiskReady(synced.ready);
    return synced.ready;
  }, [variant]);

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh();
    }, 0);
    const unsub = subscribeModelReady(() => setDiskReady(isModelReady()));
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [refresh]);

  return { diskReady, refresh };
}
