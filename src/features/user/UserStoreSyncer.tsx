import { useEffect } from "react";
import { useAuthReady, useFarmerId } from "@/shared/auth";
import { useOnboarding } from "@/features/onboarding";
import { useUserStore } from "./userStore";

/**
 * Null-rendering bridge component.
 *
 * Mount this once inside `AuthProvider` (so it can read auth context) and
 * inside `QueryClientProvider` (for any future TanStack Query bridges).
 * It reactively syncs `AuthProvider` + `useOnboarding` → `useUserStore`
 * so that all screens can read user state from a single Zustand store.
 *
 * Never renders any UI — place it as a sibling to children in the provider
 * tree, not wrapping them.
 */
export function UserStoreSyncer(): null {
  const farmerId = useFarmerId();
  const authReady = useAuthReady();

  // Onboarding / profile fields
  const farmerName = useOnboarding((s) => s.farmerName);
  const language = useOnboarding((s) => s.language);
  const state = useOnboarding((s) => s.state);
  const district = useOnboarding((s) => s.district);
  const village = useOnboarding((s) => s.village);
  const lat = useOnboarding((s) => s.lat);
  const lng = useOnboarding((s) => s.lng);
  const landAcres = useOnboarding((s) => s.landAcres);
  const cropsText = useOnboarding((s) => s.cropsText);
  const soilType = useOnboarding((s) => s.soilType);
  const hasCompletedOnboarding = useOnboarding((s) => s.hasCompletedOnboarding);

  // Sync auth identity
  useEffect(() => {
    useUserStore.getState()._sync({
      farmerId,
      authReady,
      isSignedIn: farmerId !== null,
    });
  }, [farmerId, authReady]);

  // Sync profile / farm details
  useEffect(() => {
    useUserStore.getState()._sync({
      farmerName,
      language,
      state,
      district,
      village,
      lat,
      lng,
      landAcres,
      cropsText,
      soilType,
      hasCompletedOnboarding,
    });
  }, [
    farmerName,
    language,
    state,
    district,
    village,
    lat,
    lng,
    landAcres,
    cropsText,
    soilType,
    hasCompletedOnboarding,
  ]);

  return null;
}
