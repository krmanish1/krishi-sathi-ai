import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFarmerTwin, putFarmerTwin } from "@/shared/api/endpoints";
import { ApiError } from "@/shared/api/errors";
import type { FarmerTwin } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import { getCachedTwin, setCachedTwin } from "./twinCache";
import { useOnboarding } from "@/features/onboarding/store";
import { useFarmerId, useSupabaseSession } from "@/shared/auth";
import { useConnectivity } from "@/shared/network";

/**
 * Best-effort registration: fire-and-forget `PUT /twin` so the backend
 * creates the farmer record. Errors are swallowed — the caller already has a
 * local draft to return, so failure here is non-fatal.
 */
async function registerFarmerOnBackend(
  draft: FarmerTwin,
  connectivity: Parameters<typeof putFarmerTwin>[2],
  accessToken?: string | null,
): Promise<void> {
  try {
    const saved = await putFarmerTwin(draft.farmer_id, draft, connectivity, accessToken);
    await setCachedTwin(draft.farmer_id, saved);
  } catch {
    /* non-fatal: already cached locally, will retry on next GET */
  }
}

export const TWIN_QUERY_KEY = (farmerId: string | null) => ["farmer", "twin", farmerId] as const;

export function useFarmerTwin() {
  const farmerId = useFarmerId();
  const connectivity = useConnectivity();
  const session = useSupabaseSession();
  const locState = useOnboarding((s) => s.state);
  const locDistrict = useOnboarding((s) => s.district);
  const locLat = useOnboarding((s) => s.lat);
  const locLng = useOnboarding((s) => s.lng);
  const locVillage = useOnboarding((s) => s.village);
  const farmerName = useOnboarding((s) => s.farmerName);
  const cropsText = useOnboarding((s) => s.cropsText);
  const lang = (useOnboarding((s) => s.language) ?? "en") as Language;

  return useQuery({
    queryKey: TWIN_QUERY_KEY(farmerId),
    enabled: !!farmerId,
    queryFn: async (): Promise<FarmerTwin> => {
      if (!farmerId) {
        throw new Error("no farmer");
      }

      if (connectivity === "offline") {
        const c = await getCachedTwin(farmerId);
        if (c) return c;
        return {
          farmer_id: farmerId,
          preferred_language: lang,
          location: {
            state: locState ?? "—",
            district: locDistrict ?? "—",
            ...(locLat != null && Number.isFinite(locLat) ? { lat: locLat } : {}),
            ...(locLng != null && Number.isFinite(locLng) ? { lng: locLng } : {}),
          },
          current_crops: [],
        };
      }

      try {
        const t = await getFarmerTwin(farmerId, connectivity);
        await setCachedTwin(farmerId, t);
        return t;
      } catch (e) {
        if (
          e instanceof ApiError &&
          (e.status === 404 || e.code === "FARMER_NOT_FOUND" || e.code === "NOT_FOUND")
        ) {
          /**
           * Farmer exists in Supabase auth but has no backend record yet.
           * This happens when onboarding's PUT /twin failed silently (offline,
           * network error, or app was killed before done.tsx ran).
           *
           * Build a draft from local onboarding data and fire PUT in the
           * background to register the farmer on the backend. The UI receives
           * the draft immediately — the background PUT ensures subsequent
           * calls (like POST /conversation) will succeed.
           */
          const crops = cropsText
            ?.split(",")
            .map((s) => s.trim())
            .filter(Boolean) ?? [];

          const location: FarmerTwin["location"] = {
            state: locState ?? "—",
            district: locDistrict ?? "—",
            ...(locVillage?.trim() ? { village: locVillage.trim() } : {}),
            ...(locLat != null && Number.isFinite(locLat) ? { lat: locLat } : {}),
            ...(locLng != null && Number.isFinite(locLng) ? { lng: locLng } : {}),
          };

          const draft: FarmerTwin = {
            farmer_id: farmerId,
            preferred_language: lang,
            location,
            current_crops: crops,
            ...(farmerName?.trim() ? { name: farmerName.trim() } : {}),
          };

          await setCachedTwin(farmerId, draft);

          // Fire-and-forget: create the farmer on the backend so every
          // subsequent API call (conversations, queries, etc.) finds the record.
          void registerFarmerOnBackend(draft, connectivity, session?.access_token);

          return draft;
        }

        // Non-404 error: serve stale cache if available
        const c = await getCachedTwin(farmerId);
        if (c) return c;
        throw e;
      }
    },
  });
}

export function useUpdateFarmerTwin() {
  const qc = useQueryClient();
  const farmerId = useFarmerId();
  const connectivity = useConnectivity();
  const session = useSupabaseSession();
  return useMutation({
    mutationKey: ["farmer", "twin", "put"],
    mutationFn: async (twin: FarmerTwin) => {
      if (!farmerId) {
        throw new Error("no farmer");
      }
      const next = { ...twin, farmer_id: farmerId };
      try {
        const r = await putFarmerTwin(farmerId, next, connectivity, session?.access_token ?? null);
        await setCachedTwin(farmerId, r);
        return r;
      } catch (e) {
        await setCachedTwin(farmerId, next);
        throw e;
      }
    },
    onSettled: async () => {
      if (farmerId) {
        await qc.invalidateQueries({ queryKey: TWIN_QUERY_KEY(farmerId) });
      }
    },
  });
}
