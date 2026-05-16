import { useEffect } from "react";
import { useModelDownloadStore } from "./modelDownloadStore";
import { setPreferOffline as syncPreferOfflineToRouting } from "@/shared/ondevice";

export function ModelDownloadBootSyncer(): null {
  const status = useModelDownloadStore((s) => s.status);
  const preferOffline = useModelDownloadStore((s) => s.preferOffline);
  const resetToIdle = useModelDownloadStore((s) => s.resetToIdle);

  useEffect(() => {
    if (status === "downloading") {
      resetToIdle();
    }
    syncPreferOfflineToRouting(preferOffline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once at boot only

  return null;
}
