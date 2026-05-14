/**
 * Public API for the onboarding feature.
 */
/** `readOnboarding` / `writeOnboarding` require Supabase `session.user.id`. */
export { readOnboarding, writeOnboarding } from "./onboardingStorage";
export type { PersistedOnboarding } from "./onboardingStorage";
export {
  flushOnboardingToStorage,
  rehydrateOnboardingFromStorage,
  shouldSkipOnboardingAfterSignIn,
  useOnboarding,
} from "./store";
export { runInitialSync } from "./useInitialSync";
export { detectLocation } from "./useLocation";
export {
  checkModelExists,
  downloadGemmaE4B,
  downloadGemmaModel,
  modelFilePath,
} from "./useModelDownload";
export type { DownloadProgress } from "./useModelDownload";
export { useSyncTwin, syncTwinOnboarding } from "./useSyncTwin";
export { OnboardingShell } from "./components/OnboardingShell";
