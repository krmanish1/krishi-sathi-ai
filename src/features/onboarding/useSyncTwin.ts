import { useCallback } from "react";
import { putFarmerTwin } from "@/shared/api/endpoints";
import { setCachedTwin } from "@/features/twin/twinCache";
import type { FarmerTwin } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useOnboarding } from "@/features/onboarding/store";

export type SyncTwinParams = {
  farmerId: string | null;
  state: string | null;
  district: string | null;
  language: Language | null;
};

export const syncTwinOnboarding = async (p: SyncTwinParams): Promise<void> => {
  if (!p.farmerId || !p.state || !p.district) return;
  const twin: FarmerTwin = {
    farmer_id: p.farmerId,
    location: { state: p.state, district: p.district },
    preferred_language: p.language ?? "en",
    current_crops: [],
  };
  try {
    const saved = await putFarmerTwin(p.farmerId, twin);
    await setCachedTwin(p.farmerId, saved);
  } catch {
    await setCachedTwin(p.farmerId, twin);
  }
};

export const useSyncTwin = (): (() => void) => {
  const farmerId = useFarmerId();
  const state = useOnboarding((s) => s.state);
  const district = useOnboarding((s) => s.district);
  const language = useOnboarding((s) => s.language);

  return useCallback(() => {
    void syncTwinOnboarding({ farmerId, state, district, language });
  }, [farmerId, state, district, language]);
};
