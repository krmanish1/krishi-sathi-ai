import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import type { Connectivity } from "@/shared/api/types";

export const useConnectivity = (): Connectivity => {
  const [c, setC] = useState<Connectivity>("online");
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => {
      if (!s.isConnected) {
        setC("offline");
      } else if (s.isInternetReachable === false) {
        setC("degraded");
      } else {
        setC("online");
      }
    });
    return () => {
      void unsub();
    };
  }, []);
  return c;
};
