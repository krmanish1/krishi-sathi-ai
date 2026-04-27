import { useEffect, useState } from "react";
import type { Connectivity } from "@/shared/api/types";

/**
 * NetInfo on web can mark `isConnected: false` when the Network Information API
 * reports `type: "none"` even while `navigator.onLine` is true. For browsers,
 * trust `navigator.onLine` + online/offline events for the top-level banner.
 */
const readNavigator = (): Connectivity => {
  if (typeof navigator === "undefined") {
    return "online";
  }
  return navigator.onLine ? "online" : "offline";
};

export const useConnectivity = (): Connectivity => {
  const [c, setC] = useState<Connectivity>(readNavigator);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const sync = () => {
      setC(readNavigator());
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return c;
};
