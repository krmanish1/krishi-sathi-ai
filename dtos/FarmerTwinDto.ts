export type FarmerTwinDto = {
  farmer_id: string;
  name?: string | null;
  preferred_language?: string | null;
  location: {
    district: string;
    state: string;
    village?: string;
    lat?: number;
    lng?: number;
  };
  current_crops?: string[];
  land?: { total_acres?: number; soil_type?: string; irrigation?: string };
  financial?: {
    kcc_loan_amount?: number;
    kcc_bank?: string;
    pm_fasal_bima?: boolean;
  };
  risk_profile?: string | null;
  interaction_history?: unknown[];
  livestock?: { kind: string; count: number }[];
};
