import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFarmerTwin, putFarmerTwin } from "@/shared/api/endpoints";
import { ApiError } from "@/shared/api/errors";
import type { FarmerTwin } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import { getCachedTwin, setCachedTwin } from "./twinCache";
import { useOnboarding } from "@/features/onboarding/store";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivity } from "@/shared/network/useConnectivity";

export const TWIN_QUERY_KEY = (farmerId: string | null) => ["farmer", "twin", farmerId] as const;

export function useFarmerTwin() {
  const farmerId = useFarmerId();
  const connectivity = useConnectivity();
  const locState = useOnboarding((s) => s.state);
  const locDistrict = useOnboarding((s) => s.district);
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
        if (c) {
          return c;
        }
        return {
          farmer_id: farmerId,
          preferred_language: lang,
          location: { state: locState ?? "—", district: locDistrict ?? "—" },
          current_crops: [],
        };
      }
      try {
        const t = await getFarmerTwin(farmerId);
        await setCachedTwin(farmerId, t);
        return t;
      } catch (e) {
        if (
          e instanceof ApiError &&
          (e.status === 404 || e.code === "FARMER_NOT_FOUND" || e.code === "NOT_FOUND")
        ) {
          const draft: FarmerTwin = {
            farmer_id: farmerId,
            preferred_language: lang,
            location: { state: locState ?? "—", district: locDistrict ?? "—" },
            current_crops: [],
          };
          await setCachedTwin(farmerId, draft);
          return draft;
        }
        const c = await getCachedTwin(farmerId);
        if (c) {
          return c;
        }
        throw e;
      }
    },
  });
}

export function useUpdateFarmerTwin() {
  const qc = useQueryClient();
  const farmerId = useFarmerId();
  return useMutation({
    mutationKey: ["farmer", "twin", "put"],
    mutationFn: async (twin: FarmerTwin) => {
      if (!farmerId) {
        throw new Error("no farmer");
      }
      const next = { ...twin, farmer_id: farmerId };
      try {
        const r = await putFarmerTwin(farmerId, next);
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
