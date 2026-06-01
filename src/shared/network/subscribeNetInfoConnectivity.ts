import type { Dispatch, SetStateAction } from "react";
import NetInfo from "@react-native-community/netinfo";
import type { Connectivity } from "@/shared/api/types";
import { mapNetInfoToConnectivity, type NetInfoLike } from "./mapNetInfoToConnectivity";

function pick(s: { isConnected: boolean | null; isInternetReachable: boolean | null }): NetInfoLike {
  return { isConnected: s.isConnected, isInternetReachable: s.isInternetReachable };
}

export type SubscribeNetInfoOptions = {
  /**
   * Periodic `NetInfo.fetch` (e.g. on web when `online`/`offline` events are unreliable
   * or never attached) so UI does not stay stuck on a false offline state.
   */
  pollIntervalMs?: number;
};

/**
 * Subscribes to NetInfo and maps snapshots into {@link Connectivity}.
 * Confirms "offline" and "online" signals with an immediate second fetch to avoid
 * transient false state changes on some devices.
 */
export function subscribeNetInfoConnectivity(
  setC: Dispatch<SetStateAction<Connectivity>>,
  opts: SubscribeNetInfoOptions = {},
): () => void {
  let cancelled = false;
  let pollId: ReturnType<typeof setInterval> | undefined;

  const confirm = (state: NetInfoLike) => {
    void NetInfo.fetch().then((s2) => {
      if (cancelled) return;
      const n2 = mapNetInfoToConnectivity(pick(s2));
      if (n2 != null) setC(n2);
    });
  };

  const apply = (state: NetInfoLike) => {
    const next = mapNetInfoToConnectivity(state);
    if (cancelled || next == null) return;

    if (next === "offline" || next === "online") {
      confirm(state);
      return;
    }

    setC(next);
  };

  // Initial boot fetch — confirm "online" with a second fetch after 2s to avoid
  // transient false positives (e.g. airplane mode where captive portal check hasn't
  // resolved yet). The context stays at the initial "offline" until confirmed.
  void NetInfo.fetch().then((s) => {
    if (cancelled) return;
    const next = mapNetInfoToConnectivity(pick(s));
    if (next == null) return;
    if (next === "online") {
      setTimeout(() => {
        if (cancelled) return;
        void NetInfo.fetch().then((s2) => {
          if (cancelled) return;
          setC(mapNetInfoToConnectivity(pick(s2)) ?? next);
        });
      }, 2000);
      return;
    }
    setC(next);
  });

  const unsub = NetInfo.addEventListener((s) => apply(pick(s)));

  const { pollIntervalMs } = opts;
  if (pollIntervalMs != null && pollIntervalMs > 0) {
    pollId = setInterval(() => {
      void NetInfo.fetch().then((s) => {
        if (!cancelled) apply(pick(s));
      });
    }, pollIntervalMs);
  }

  return () => {
    cancelled = true;
    if (pollId != null) clearInterval(pollId);
    void unsub();
  };
}
