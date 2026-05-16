import { detectLocation } from "@/features/onboarding/useLocation";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  hasServicesEnabledAsync: jest.fn(),
  enableNetworkProviderAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

describe("detectLocation", () => {
  const locationModule = jest.requireMock("expo-location") as {
    hasServicesEnabledAsync: jest.Mock;
    enableNetworkProviderAsync: jest.Mock;
    requestForegroundPermissionsAsync: jest.Mock;
    getCurrentPositionAsync: jest.Mock;
    reverseGeocodeAsync: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns nulls when device location services are disabled", async () => {
    locationModule.hasServicesEnabledAsync.mockResolvedValue(false);

    await expect(detectLocation()).resolves.toEqual({
      state: null,
      district: null,
      failureReason: "services_disabled",
    });
    expect(locationModule.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns nulls when geocoding fails", async () => {
    locationModule.hasServicesEnabledAsync.mockResolvedValue(true);
    locationModule.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    locationModule.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 12.34, longitude: 56.78 },
    });
    locationModule.reverseGeocodeAsync.mockRejectedValue(new Error("reverse geocode failed"));

    await expect(detectLocation()).resolves.toEqual({
      state: null,
      district: null,
      latitude: 12.34,
      longitude: 56.78,
      failureReason: "unavailable",
    });
  });

  it("returns derived state and district when geocoding succeeds", async () => {
    locationModule.hasServicesEnabledAsync.mockResolvedValue(true);
    locationModule.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    locationModule.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 12.34, longitude: 56.78 },
    });
    locationModule.reverseGeocodeAsync.mockResolvedValue([
      { region: "Punjab", subregion: "Ludhiana", district: null, city: null },
    ]);

    await expect(detectLocation()).resolves.toEqual({
      state: "Punjab",
      district: "Ludhiana",
      latitude: 12.34,
      longitude: 56.78,
    });
  });
});
