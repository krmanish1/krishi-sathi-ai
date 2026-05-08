export type OnboardingModel = {
  language?: string;
  farmerName?: string;
  state?: string;
  district?: string;
  village?: string;
  landAcres?: number;
  soilType?: string;
  crops?: string[];
  gpsLocation?: { lat: number; lng: number };
  hasCompletedOnboarding: boolean;
};
