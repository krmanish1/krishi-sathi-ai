/**
 * Public API for the user feature.
 *
 * `useUserStore` is the single place to read user identity and profile data.
 * Auth actions (sign-in, sign-out) remain in `@/shared/auth`.
 */
export {
  useUserStore,
  selectFarmerId,
  selectAuthReady,
  selectIsSignedIn,
  selectLanguage,
  selectLocation,
} from "./userStore";
export type { UserProfile, UserStore } from "./userStore";
export { UserStoreSyncer } from "./UserStoreSyncer";
