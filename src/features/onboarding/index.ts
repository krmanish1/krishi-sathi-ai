/**
 * Public API for the onboarding feature.
 */
export { readOnboarding, writeOnboarding } from "./onboardingStorage";
export type { PersistedOnboarding } from "./onboardingStorage";
export { rehydrateOnboardingFromStorage, useOnboarding } from "./store";
export { runInitialSync } from "./useInitialSync";
export { detectLocation } from "./useLocation";
export { downloadGemmaE4B } from "./useModelDownload";
export type { DownloadProgress } from "./useModelDownload";
export { useSyncTwin, syncTwinOnboarding } from "./useSyncTwin";
