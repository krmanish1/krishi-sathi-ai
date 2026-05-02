import { create } from "zustand";
import type { Language } from "@/shared/config/constants";

/**
 * Authoritative read-store for the signed-in user.
 *
 * This store is the single place any component or hook reads user identity and
 * profile data from — no more juggling useFarmerId() + useAuthReady() +
 * multiple useOnboarding() selectors in every screen.
 *
 * It is kept in sync by `UserStoreSyncer` (mounted once at the root), which
 * bridges `AuthProvider` and `useOnboarding` → this store reactively.
 *
 * Auth actions (sign-in, sign-out) stay in `AuthProvider`/`useSupabaseAuth` —
 * this store is intentionally read-only for consumers.
 */

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type UserProfile = {
  /** Supabase user UUID — null until auth resolves and a session exists. */
  farmerId: string | null;
  /** True once the Supabase auth check has completed (session known). */
  authReady: boolean;
  /** Shortcut: farmerId !== null. */
  isSignedIn: boolean;

  /** Display name set during onboarding. */
  farmerName: string | null;
  /** UI language preferred by the user. */
  language: Language | null;

  // Location
  state: string | null;
  district: string | null;
  village: string | null;
  lat: number | null;
  lng: number | null;

  // Farm details
  landAcres: string | null;
  cropsText: string | null;
  soilType: string | null;

  /** Whether the farmer completed the onboarding flow. */
  hasCompletedOnboarding: boolean;
};

type UserActions = {
  /**
   * Internal — called only by UserStoreSyncer.
   * Merges a partial profile update into the store.
   */
  _sync: (partial: Partial<UserProfile>) => void;
};

export type UserStore = UserProfile & UserActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: UserProfile = {
  farmerId: null,
  authReady: false,
  isSignedIn: false,

  farmerName: null,
  language: null,

  state: null,
  district: null,
  village: null,
  lat: null,
  lng: null,

  landAcres: null,
  cropsText: null,
  soilType: null,

  hasCompletedOnboarding: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUserStore = create<UserStore>((set) => ({
  ...DEFAULTS,
  _sync: (partial) => set((prev) => ({ ...prev, ...partial })),
}));

// ---------------------------------------------------------------------------
// Convenience selectors (stable function refs — safe to use as deps)
// ---------------------------------------------------------------------------

/** Supabase user UUID. Null until signed in. */
export const selectFarmerId = (s: UserStore): string | null => s.farmerId;
/** True once the auth check completed — use to gate loading-state renders. */
export const selectAuthReady = (s: UserStore): boolean => s.authReady;
/** True when a Supabase session is active. */
export const selectIsSignedIn = (s: UserStore): boolean => s.isSignedIn;
/** User's preferred UI language. */
export const selectLanguage = (s: UserStore): Language | null => s.language;
/** State/district pair as a tuple for context payloads. */
export const selectLocation = (
  s: UserStore,
): { state: string | null; district: string | null; lat: number | null; lng: number | null } => ({
  state: s.state,
  district: s.district,
  lat: s.lat,
  lng: s.lng,
});
