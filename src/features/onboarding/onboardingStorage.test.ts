import { readOnboarding, writeOnboarding } from "./onboardingStorage";
import { secureDelete, secureGet, secureSet } from "@/shared/storage/secure";

jest.mock("@/shared/storage/secure", () => ({
  secureGet: jest.fn(),
  secureSet: jest.fn(),
  secureDelete: jest.fn(),
}));

const mockGet = secureGet as jest.Mock;
const mockSet = secureSet as jest.Mock;
const mockDelete = secureDelete as jest.Mock;

describe("onboardingStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
  });

  it("reads per-user key onboarding_v1_<userId> (SecureStore-safe)", async () => {
    mockGet.mockImplementation((k: string) => {
      if (k === "onboarding_v1_user-a") {
        return Promise.resolve(
          JSON.stringify({
            language: "hi",
            state: "Punjab",
            district: "Ludhiana",
            village: null,
            farmerName: null,
            cropsText: null,
            soilType: null,
            lat: null,
            lng: null,
            landAcres: null,
            hasCompletedOnboarding: true,
          }),
        );
      }
      return Promise.resolve(null);
    });
    const p = await readOnboarding("user-a");
    expect(p?.hasCompletedOnboarding).toBe(true);
    expect(p?.district).toBe("Ludhiana");
    expect(mockGet).toHaveBeenCalledWith("onboarding_v1_user-a");
  });

  it("returns null for a new user id with no blob (signup must onboard)", async () => {
    mockGet.mockResolvedValue(null);
    const p = await readOnboarding("brand-new-user");
    expect(p).toBeNull();
  });

  it("migrates legacy onboarding_v1 once into the current user key", async () => {
    const legacy = JSON.stringify({
      language: "en",
      state: "MH",
      district: "Pune",
      village: null,
      farmerName: null,
      cropsText: null,
      soilType: null,
      lat: null,
      lng: null,
      landAcres: null,
      hasCompletedOnboarding: false,
    });
    mockGet.mockImplementation((k: string) => {
      if (k === "onboarding_v1_uid-1") return Promise.resolve(null);
      if (k === "onboarding_v1") return Promise.resolve(legacy);
      return Promise.resolve(null);
    });
    const p = await readOnboarding("uid-1");
    expect(p?.state).toBe("MH");
    expect(mockSet).toHaveBeenCalledWith("onboarding_v1_uid-1", legacy);
    expect(mockDelete).toHaveBeenCalledWith("onboarding_v1");
  });

  it("writeOnboarding uses per-user key", async () => {
    const blob = {
      language: "hi" as const,
      state: "S",
      district: "D",
      village: null,
      farmerName: null,
      cropsText: null,
      soilType: null,
      lat: null,
      lng: null,
      landAcres: null,
      hasCompletedOnboarding: false,
    };
    await writeOnboarding("u-2", blob);
    expect(mockSet).toHaveBeenCalledWith("onboarding_v1_u-2", JSON.stringify(blob));
  });
});
