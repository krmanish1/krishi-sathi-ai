import { useCallback } from "react";
import { putFarmerTwin } from "@/shared/api/endpoints";
import { setCachedTwin } from "@/features/twin/twinCache";
import type { FarmerTwin } from "@/shared/api/types";
import type { Connectivity } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import { useFarmerId, useSupabaseSession } from "@/shared/auth";
import { useConnectivity } from "@/shared/network/useConnectivity";
import { useOnboarding } from "@/features/onboarding/store";

export type SyncTwinParams = {
  farmerId: string | null;
  state: string | null;
  district: string | null;
  village?: string | null;
  language: Language | null;
  /** Supabase JWT for authenticated PUT /farmer/:id/twin */
  accessToken?: string | null;
  /** WGS84 from device GPS during onboarding; omitted if unknown. */
  lat?: number | null;
  lng?: number | null;
  /** From signup metadata — used when onboarding did not set a name */
  displayName?: string | null;
  /** Twin `name` from onboarding (preferred over displayName) */
  onboardingFarmerName?: string | null;
  landAcres?: string | null;
  soilType?: string | null;
  cropsText?: string | null;
};

function currentCropsFromOnboardingText(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function landFromOnboarding(
  landAcres: string | null | undefined,
  soilType: string | null | undefined,
): FarmerTwin["land"] | undefined {
  const raw = landAcres?.trim().replace(",", ".") ?? "";
  const parsed = raw ? parseFloat(raw) : NaN;
  const hasAcres = Number.isFinite(parsed) && parsed > 0;
  const soil = soilType?.trim();
  if (!hasAcres && !soil) {
    return undefined;
  }
  const land: NonNullable<FarmerTwin["land"]> = {};
  if (hasAcres) land.total_acres = parsed;
  if (soil) land.soil_type = soil;
  return Object.keys(land).length ? land : undefined;
}

export const syncTwinOnboarding = async (
  p: SyncTwinParams,
  connectivity: Connectivity,
): Promise<void> => {
  if (!p.farmerId || !p.state || !p.district) return;
  const land = landFromOnboarding(p.landAcres, p.soilType);
  const loc: FarmerTwin["location"] = { state: p.state, district: p.district };
  const v = p.village?.trim();
  if (v) loc.village = v;
  if (p.lat != null && Number.isFinite(p.lat)) loc.lat = p.lat;
  if (p.lng != null && Number.isFinite(p.lng)) loc.lng = p.lng;
  const resolvedName = p.onboardingFarmerName?.trim() || p.displayName?.trim() || "";
  const crops = currentCropsFromOnboardingText(p.cropsText);
  const twin: FarmerTwin = {
    farmer_id: p.farmerId,
    location: loc,
    preferred_language: p.language ?? "en",
    current_crops: crops,
    ...(resolvedName ? { name: resolvedName } : {}),
    ...(land ? { land } : {}),
  };
  try {
    const saved = await putFarmerTwin(p.farmerId, twin, connectivity, p.accessToken);
    await setCachedTwin(p.farmerId, saved);
  } catch {
    await setCachedTwin(p.farmerId, twin);
  }
};

export const useSyncTwin = (): (() => Promise<void>) => {
  const farmerId = useFarmerId();
  const state = useOnboarding((s) => s.state);
  const district = useOnboarding((s) => s.district);
  const village = useOnboarding((s) => s.village);
  const farmerName = useOnboarding((s) => s.farmerName);
  const cropsText = useOnboarding((s) => s.cropsText);
  const soilType = useOnboarding((s) => s.soilType);
  const lat = useOnboarding((s) => s.lat);
  const lng = useOnboarding((s) => s.lng);
  const language = useOnboarding((s) => s.language);
  const landAcres = useOnboarding((s) => s.landAcres);
  const connectivity = useConnectivity();
  const session = useSupabaseSession();

  const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    typeof meta?.name === "string"
      ? meta.name
      : typeof meta?.full_name === "string"
        ? meta.full_name
        : null;

  return useCallback(async () => {
    await syncTwinOnboarding(
      {
        farmerId,
        state,
        district,
        village,
        language,
        accessToken: session?.access_token ?? null,
        lat,
        lng,
        displayName: fromMeta,
        onboardingFarmerName: farmerName,
        landAcres,
        soilType,
        cropsText,
      },
      connectivity,
    );
  }, [
    farmerId,
    state,
    district,
    village,
    farmerName,
    cropsText,
    soilType,
    lat,
    lng,
    language,
    session?.access_token,
    fromMeta,
    landAcres,
    connectivity,
  ]);
};
