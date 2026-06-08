import type { Connectivity } from "@/shared/api/types";
import { hexToRgba } from "@/shared/utils/hexToRgba";

/** UI mode derived from network + optional on-device model (for offline chat). */
export type ConnectivityUiMode = "online" | "degraded" | "offline";

/** Offline chat: file + runtime state for the on-device model. */
export type OfflineModelDetail = "checking" | "ready" | "missing" | "failed";

export type ChatOfflineModelStatusKey =
  | "offlineModelStatusChecking"
  | "offlineModelStatusReady"
  | "offlineModelStatusMissing"
  | "offlineModelStatusFailed";

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
  brand: "#00ED64",
  brandDeep: "#00684A",
  expertOnline: ["#00684A", "#00A35C", "#00ED64"] as const,
  amber: "#f59e0b",
  amberDeep: "#b45309",
  amberSoftText: "#d97706",
  amberIcon: "#f59e0b",
  expertDegraded: ["#92400E", "#b45309", "#f59e0b"] as const,
  slate: "#64748b",
  slateDeep: "#334155",
  slateDeep2: "#475569",
  slateMuted: "#94a3b8",
  expertOffline: ["#1e3a5f", "#334155", "#64748b"] as const,
  expertOfflineNoModel: ["#2d3748", "#475569", "#94a3b8"] as const,
  surfaceOnline: "#F0FFF7",
  surfaceDegraded: "#FFFBEB",
  surfaceOffline: "#F1F5F9",
  syncAlert: "#DB3030",
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
  /** Same as `connectivity` — online devices call the cloud API (`online` wire param). */
  apiConnectivity: Connectivity;
  /** Last successful `/api/v1/health` — UI hint only; does not block API calls when online. */
  cloudReachable: boolean;
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
  /** Shown on chat when fully offline — explicit model file/runtime status. */
  chatOfflineModelStatusKey: ChatOfflineModelStatusKey | null;
  offlineModelStatusIcon: "check-circle" | "download" | "alert-circle" | "progress-clock";
  offlineModelStatusBannerBackgroundRgba: string;
  offlineModelStatusBannerTextHex: string;
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

function offlineModelStatusKey(
  detail: OfflineModelDetail,
  onDeviceModelReady: boolean,
): ChatOfflineModelStatusKey {
  if (detail === "checking") return "offlineModelStatusChecking";
  if (onDeviceModelReady || detail === "ready") return "offlineModelStatusReady";
  if (detail === "failed") return "offlineModelStatusFailed";
  return "offlineModelStatusMissing";
}

export function buildConnectivityUiConfig(
  connectivity: Connectivity,
  opts?: {
    onDeviceModelReady?: boolean;
    preferOffline?: boolean;
    cloudReachable?: boolean;
    offlineModelDetail?: OfflineModelDetail;
  },
): ConnectivityUiConfig {
  const onDeviceModelReady = opts?.onDeviceModelReady ?? false;
  const offlineModelDetail = opts?.offlineModelDetail ?? "checking";
  const preferOffline = opts?.preferOffline ?? false;
  const cloudReachable = opts?.cloudReachable ?? true;
  const apiConnectivity = connectivity;
  const backendReachable = connectivity === "online" || connectivity === "degraded";
  /** Stream when NetInfo is online and user has not opted into on-device-only. */
  const enableStreamChat =
    connectivity === "online" && !(preferOffline && onDeviceModelReady);
  const isFullyOffline = connectivity === "offline";
  const mode: ConnectivityUiMode = isFullyOffline
    ? "offline"
    : connectivity === "degraded"
      ? "degraded"
      : "online";

  let composerPlaceholderKey: ConnectivityUiComposerKey = "placeholder";
  let chatEmptyHintKey: ConnectivityUiConfig["chatEmptyHintKey"] = "emptyHint";
  let newChatLoadingKey: ConnectivityUiConfig["newChatLoadingKey"] = "sessionStarting";
  let chatModeBannerKey: ConnectivityUiConfig["chatModeBannerKey"] = null;

  if (isFullyOffline) {
    newChatLoadingKey = "sessionStartingOffline";
    chatModeBannerKey = onDeviceModelReady ? "modeBannerOffline" : "modeBannerOfflineNoModel";
    composerPlaceholderKey = "placeholderOffline";
    chatEmptyHintKey = "emptyHintOffline";
  } else if (mode === "degraded") {
    chatModeBannerKey = "modeBannerDegraded";
    composerPlaceholderKey = "placeholderDegraded";
  } else {
    chatModeBannerKey = null;
  }

  const vk = visualKey(connectivity, onDeviceModelReady);
  const v = VISUAL[vk];

  let chatOfflineModelStatusKey: ConnectivityUiConfig["chatOfflineModelStatusKey"] = null;
  let offlineModelStatusIcon: ConnectivityUiConfig["offlineModelStatusIcon"] = "progress-clock";
  let offlineModelStatusBannerBackgroundRgba: string = hexToRgba(C.slate, 0.12);
  let offlineModelStatusBannerTextHex: string = C.slateMuted;

  if (isFullyOffline) {
    chatOfflineModelStatusKey = offlineModelStatusKey(offlineModelDetail, onDeviceModelReady);
    if (chatOfflineModelStatusKey === "offlineModelStatusReady") {
      offlineModelStatusIcon = "check-circle";
      offlineModelStatusBannerBackgroundRgba = hexToRgba(C.brandDeep, 0.12);
      offlineModelStatusBannerTextHex = C.brandDeep;
    } else if (chatOfflineModelStatusKey === "offlineModelStatusFailed") {
      offlineModelStatusIcon = "alert-circle";
      offlineModelStatusBannerBackgroundRgba = hexToRgba(C.syncAlert, 0.1);
      offlineModelStatusBannerTextHex = C.syncAlert;
    } else if (chatOfflineModelStatusKey === "offlineModelStatusMissing") {
      offlineModelStatusIcon = "download";
    }
  }

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
    apiConnectivity,
    cloudReachable,
    mode,
    backendReachable,
    isFullyOffline,
    onDeviceModelReady,
    enableChatHistoryRefresh: connectivity === "online",
    enableStreamChat,
    enableImageAttach: connectivity === "online",
    showChatOfflineStrip: isFullyOffline,
    showChatDegradedStrip: mode === "degraded",
    composerPlaceholderKey,
    chatEmptyHintKey,
    newChatLoadingKey,
    chatModeBannerKey,
    chatOfflineModelStatusKey,
    offlineModelStatusIcon,
    offlineModelStatusBannerBackgroundRgba,
    offlineModelStatusBannerTextHex,
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
