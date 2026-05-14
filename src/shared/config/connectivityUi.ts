import type { Connectivity } from "@/shared/api/types";
import { hexToRgba } from "@/shared/utils/hexToRgba";

/** UI mode derived from network + optional on-device model (for offline chat). */
export type ConnectivityUiMode = "online" | "degraded" | "offline";

export type ConnectivityUiComposerKey =
  | "placeholder"
  | "placeholderOffline"
  | "placeholderOfflineNoModel"
  | "placeholderDegraded";

/**
 * Single source of truth for connectivity-driven UI.
 * Adjust these constants (and `visualRow` below) to change look & feel app-wide.
 */
const C = {
  brand: "#1ed760",
  brandDeep: "#168d40",
  expertOnline: ["#0f3d22", "#168d40", "#1ed760"] as const,
  amber: "#f59e0b",
  amberDeep: "#b45309",
  amberSoftText: "#fbbf24",
  amberIcon: "#ffa42b",
  expertDegraded: ["#422006", "#b45309", "#f59e0b"] as const,
  slate: "#64748b",
  slateDeep: "#334155",
  slateDeep2: "#475569",
  slateMuted: "#94a3b8",
  expertOffline: ["#0f172a", "#334155", "#64748b"] as const,
  expertOfflineNoModel: ["#1e293b", "#475569", "#94a3b8"] as const,
  surfaceOnline: "#1f1f1f",
  surfaceDegraded: "#292524",
  surfaceOffline: "#1e293b",
  syncAlert: "#f3727f",
} as const;

type VisualRow = {
  headerAccentHex: string;
  accentHex: string;
  chatsHeaderSurfaceHex: string;
  gradientPartnerHex: string;
  homeExpertGradientHex: readonly [string, string, string];
  chatInlineBannerBackgroundRgba: string;
  chatInlineBannerTextHex: string;
  offlinePillBackgroundRgba: string;
  offlinePillBorderRgba: string;
  offlinePillTextHex: string;
  offlinePillIconHex: string;
  marketPendingChipBackgroundRgba: string;
  marketPendingDotHex: string;
  marketPendingLabelHex: string;
};

const VISUAL: Record<"online" | "degraded" | "offline" | "offlineNoModel", VisualRow> = {
  online: {
    headerAccentHex: C.brand,
    accentHex: C.brand,
    chatsHeaderSurfaceHex: C.surfaceOnline,
    gradientPartnerHex: C.brandDeep,
    homeExpertGradientHex: C.expertOnline,
    chatInlineBannerBackgroundRgba: hexToRgba(C.amber, 0.12),
    chatInlineBannerTextHex: C.amberSoftText,
    offlinePillBackgroundRgba: hexToRgba(C.slate, 0.1),
    offlinePillBorderRgba: hexToRgba(C.slate, 0.3),
    offlinePillTextHex: C.slate,
    offlinePillIconHex: C.slate,
    marketPendingChipBackgroundRgba: hexToRgba(C.amber, 0.12),
    marketPendingDotHex: C.amber,
    marketPendingLabelHex: C.amber,
  },
  degraded: {
    headerAccentHex: C.amber,
    accentHex: C.amber,
    chatsHeaderSurfaceHex: C.surfaceDegraded,
    gradientPartnerHex: C.amberDeep,
    homeExpertGradientHex: C.expertDegraded,
    chatInlineBannerBackgroundRgba: hexToRgba(C.amber, 0.12),
    chatInlineBannerTextHex: C.amberSoftText,
    offlinePillBackgroundRgba: hexToRgba(C.amber, 0.1),
    offlinePillBorderRgba: hexToRgba(C.amber, 0.3),
    offlinePillTextHex: C.amber,
    offlinePillIconHex: C.amberIcon,
    marketPendingChipBackgroundRgba: hexToRgba(C.amber, 0.12),
    marketPendingDotHex: C.amber,
    marketPendingLabelHex: C.amber,
  },
  offline: {
    headerAccentHex: C.slate,
    accentHex: C.slate,
    chatsHeaderSurfaceHex: C.surfaceOffline,
    gradientPartnerHex: C.slateDeep,
    homeExpertGradientHex: C.expertOffline,
    chatInlineBannerBackgroundRgba: hexToRgba(C.slate, 0.18),
    chatInlineBannerTextHex: C.slateMuted,
    offlinePillBackgroundRgba: hexToRgba(C.slate, 0.12),
    offlinePillBorderRgba: hexToRgba(C.slate, 0.3),
    offlinePillTextHex: C.slate,
    offlinePillIconHex: C.slate,
    marketPendingChipBackgroundRgba: hexToRgba(C.slate, 0.12),
    marketPendingDotHex: C.slate,
    marketPendingLabelHex: C.slate,
  },
  offlineNoModel: {
    headerAccentHex: C.slate,
    accentHex: C.slateMuted,
    chatsHeaderSurfaceHex: C.surfaceOffline,
    gradientPartnerHex: C.slateDeep2,
    homeExpertGradientHex: C.expertOfflineNoModel,
    chatInlineBannerBackgroundRgba: hexToRgba(C.slate, 0.18),
    chatInlineBannerTextHex: C.slateMuted,
    offlinePillBackgroundRgba: hexToRgba(C.slateMuted, 0.12),
    offlinePillBorderRgba: hexToRgba(C.slateMuted, 0.28),
    offlinePillTextHex: C.slateMuted,
    offlinePillIconHex: C.slateMuted,
    marketPendingChipBackgroundRgba: hexToRgba(C.slateMuted, 0.12),
    marketPendingDotHex: C.slateMuted,
    marketPendingLabelHex: C.slateMuted,
  },
};

function visualKey(connectivity: Connectivity, onDeviceModelReady: boolean): keyof typeof VISUAL {
  if (connectivity === "offline") return onDeviceModelReady ? "offline" : "offlineNoModel";
  if (connectivity === "degraded") return "degraded";
  return "online";
}

export type ConnectivityUiConfig = {
  connectivity: Connectivity;
  mode: ConnectivityUiMode;
  /** `online` or `degraded` — backend / stream can be used. */
  backendReachable: boolean;
  /** Airplane / no route — distinct from degraded. */
  isFullyOffline: boolean;
  onDeviceModelReady: boolean;
  enableChatHistoryRefresh: boolean;
  enableStreamChat: boolean;
  enableImageAttach: boolean;
  showChatOfflineStrip: boolean;
  showChatDegradedStrip: boolean;
  composerPlaceholderKey: ConnectivityUiComposerKey;
  chatEmptyHintKey: "emptyHint" | "emptyHintOffline" | "emptyHintOfflineNoModel";
  newChatLoadingKey: "sessionStarting" | "sessionStartingOffline";
  chatModeBannerKey: "modeBannerDegraded" | "modeBannerOffline" | "modeBannerOfflineNoModel" | null;
  headerAccentHex: string;
  accentHex: string;
  chatsHeaderSurfaceHex: string;
  gradientPartnerHex: string;
  homeExpertGradientHex: readonly [string, string, string];
  /** Chat screen mode strip under header. */
  chatInlineBannerBackgroundRgba: string;
  chatInlineBannerTextHex: string;
  /** Home top “offline” ribbon; scan / requires-backend notices. */
  offlinePillBackgroundRgba: string;
  offlinePillBorderRgba: string;
  offlinePillTextHex: string;
  offlinePillIconHex: string;
  /** Home bundled market “pending” chip when offline. */
  marketPendingChipBackgroundRgba: string;
  marketPendingDotHex: string;
  marketPendingLabelHex: string;
  /** Weather card badge + hero icon (follows backend vs offline). */
  weatherBadgeBackgroundRgba: string;
  weatherBadgeTextHex: string;
  weatherHeroIconHex: string;
  weatherHeroWellBackgroundRgba: string;
  /** Home sync callout icon when not reachable. */
  offlineSyncAlertIconHex: string;
};

export function buildConnectivityUiConfig(
  connectivity: Connectivity,
  opts?: { onDeviceModelReady?: boolean },
): ConnectivityUiConfig {
  const onDeviceModelReady = opts?.onDeviceModelReady ?? false;
  const backendReachable = connectivity === "online" || connectivity === "degraded";
  const isFullyOffline = connectivity === "offline";
  const mode: ConnectivityUiMode =
    connectivity === "offline" ? "offline" : connectivity === "degraded" ? "degraded" : "online";

  let composerPlaceholderKey: ConnectivityUiComposerKey = "placeholder";
  let chatEmptyHintKey: ConnectivityUiConfig["chatEmptyHintKey"] = "emptyHint";
  let newChatLoadingKey: ConnectivityUiConfig["newChatLoadingKey"] = "sessionStarting";
  let chatModeBannerKey: ConnectivityUiConfig["chatModeBannerKey"] = null;

  if (isFullyOffline) {
    newChatLoadingKey = "sessionStartingOffline";
    chatModeBannerKey = onDeviceModelReady ? "modeBannerOffline" : "modeBannerOfflineNoModel";
    if (onDeviceModelReady) {
      composerPlaceholderKey = "placeholderOffline";
      chatEmptyHintKey = "emptyHintOffline";
    } else {
      composerPlaceholderKey = "placeholderOfflineNoModel";
      chatEmptyHintKey = "emptyHintOfflineNoModel";
    }
  } else if (connectivity === "degraded") {
    chatModeBannerKey = "modeBannerDegraded";
    composerPlaceholderKey = "placeholderDegraded";
  } else {
    chatModeBannerKey = null;
  }

  const vk = visualKey(connectivity, onDeviceModelReady);
  const v = VISUAL[vk];

  const weatherBadgeBackgroundRgba = backendReachable
    ? hexToRgba(C.amber, 0.12)
    : hexToRgba(v.headerAccentHex, 0.12);
  const weatherBadgeTextHex = backendReachable ? C.amber : v.headerAccentHex;
  const weatherHeroIconHex = backendReachable ? C.amberIcon : v.headerAccentHex;
  const weatherHeroWellBackgroundRgba = backendReachable
    ? hexToRgba(C.amber, 0.15)
    : hexToRgba(v.headerAccentHex, 0.15);

  return {
    connectivity,
    mode,
    backendReachable,
    isFullyOffline,
    onDeviceModelReady,
    enableChatHistoryRefresh: backendReachable,
    enableStreamChat: backendReachable,
    enableImageAttach: backendReachable,
    showChatOfflineStrip: isFullyOffline,
    showChatDegradedStrip: connectivity === "degraded",
    composerPlaceholderKey,
    chatEmptyHintKey,
    newChatLoadingKey,
    chatModeBannerKey,
    headerAccentHex: v.headerAccentHex,
    accentHex: v.accentHex,
    chatsHeaderSurfaceHex: v.chatsHeaderSurfaceHex,
    gradientPartnerHex: v.gradientPartnerHex,
    homeExpertGradientHex: v.homeExpertGradientHex,
    chatInlineBannerBackgroundRgba: v.chatInlineBannerBackgroundRgba,
    chatInlineBannerTextHex: v.chatInlineBannerTextHex,
    offlinePillBackgroundRgba: v.offlinePillBackgroundRgba,
    offlinePillBorderRgba: v.offlinePillBorderRgba,
    offlinePillTextHex: v.offlinePillTextHex,
    offlinePillIconHex: v.offlinePillIconHex,
    marketPendingChipBackgroundRgba: v.marketPendingChipBackgroundRgba,
    marketPendingDotHex: v.marketPendingDotHex,
    marketPendingLabelHex: v.marketPendingLabelHex,
    weatherBadgeBackgroundRgba,
    weatherBadgeTextHex,
    weatherHeroIconHex,
    weatherHeroWellBackgroundRgba,
    offlineSyncAlertIconHex: C.syncAlert,
  };
}
