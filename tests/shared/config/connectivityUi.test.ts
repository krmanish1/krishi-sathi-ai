import { buildConnectivityUiConfig } from "@/shared/config/connectivityUi";

describe("buildConnectivityUiConfig", () => {
  it("online uses default composer copy and enables backend features", () => {
    const c = buildConnectivityUiConfig("online", { onDeviceModelReady: true });
    expect(c.mode).toBe("online");
    expect(c.backendReachable).toBe(true);
    expect(c.isFullyOffline).toBe(false);
    expect(c.enableChatHistoryRefresh).toBe(true);
    expect(c.enableStreamChat).toBe(true);
    expect(c.enableImageAttach).toBe(true);
    expect(c.chatModeBannerKey).toBeNull();
    expect(c.composerPlaceholderKey).toBe("placeholder");
    expect(c.chatEmptyHintKey).toBe("emptyHint");
    expect(c.newChatLoadingKey).toBe("sessionStarting");
    expect(c.showChatOfflineStrip).toBe(false);
    expect(c.showChatDegradedStrip).toBe(false);
    expect(c.gradientPartnerHex).toBe("#00684A");
    expect(c.homeExpertGradientHex[2]).toBe("#00ED64");
    expect(c.chatInlineBannerTextHex).toBe("#d97706");
    expect(c.weatherBadgeTextHex).toBe("#f59e0b");
    expect(c.offlineSyncAlertIconHex).toBe("#DB3030");
  });

  it("degraded disables streaming/image/history and shows degraded banner", () => {
    const c = buildConnectivityUiConfig("degraded", { onDeviceModelReady: false });
    expect(c.mode).toBe("degraded");
    expect(c.backendReachable).toBe(true);
    expect(c.enableStreamChat).toBe(false);
    expect(c.enableImageAttach).toBe(false);
    expect(c.enableChatHistoryRefresh).toBe(false);
    expect(c.showChatDegradedStrip).toBe(true);
    expect(c.chatModeBannerKey).toBe("modeBannerDegraded");
    expect(c.composerPlaceholderKey).toBe("placeholderDegraded");
    expect(c.gradientPartnerHex).toBe("#b45309");
    expect(c.homeExpertGradientHex[2]).toBe("#f59e0b");
    expect(c.chatInlineBannerTextHex).toBe("#d97706");
    expect(c.weatherBadgeTextHex).toBe("#f59e0b");
  });

  it("offline with on-device model disables remote features and switches copy", () => {
    const c = buildConnectivityUiConfig("offline", { onDeviceModelReady: true });
    expect(c.mode).toBe("offline");
    expect(c.backendReachable).toBe(false);
    expect(c.enableChatHistoryRefresh).toBe(false);
    expect(c.enableStreamChat).toBe(false);
    expect(c.enableImageAttach).toBe(false);
    expect(c.composerPlaceholderKey).toBe("placeholderOffline");
    expect(c.chatEmptyHintKey).toBe("emptyHintOffline");
    expect(c.chatModeBannerKey).toBe("modeBannerOffline");
    expect(c.newChatLoadingKey).toBe("sessionStartingOffline");
    expect(c.showChatOfflineStrip).toBe(true);
    expect(c.gradientPartnerHex).toBe("#334155");
    expect(c.homeExpertGradientHex[2]).toBe("#64748b");
    expect(c.weatherBadgeTextHex).toBe("#64748b");
    expect(c.chatInlineBannerTextHex).toBe("#94a3b8");
  });

  it("offline without model uses no-model copy and muted accent", () => {
    const c = buildConnectivityUiConfig("offline", { onDeviceModelReady: false });
    expect(c.composerPlaceholderKey).toBe("placeholderOfflineNoModel");
    expect(c.chatEmptyHintKey).toBe("emptyHintOfflineNoModel");
    expect(c.chatModeBannerKey).toBe("modeBannerOfflineNoModel");
    expect(c.accentHex).toBe("#94a3b8");
    expect(c.gradientPartnerHex).toBe("#475569");
    expect(c.homeExpertGradientHex[2]).toBe("#94a3b8");
  });
});
