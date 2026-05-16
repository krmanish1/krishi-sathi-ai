export type FarmerTwinModel = {
  farmerId: string;
  name?: string | null;
  preferredLanguage?: string | null;
  location: {
    district: string;
    state: string;
    village?: string;
    lat?: number;
    lng?: number;
  };
  currentCrops?: string[];
  land?: {
    totalAcres?: number;
    soilType?: string;
    irrigation?: string;
  };
};
