import { syncTwinOnboarding } from "./useSyncTwin";
import * as endpoints from "@/shared/api/endpoints";
import * as twinCache from "@/features/twin/twinCache";

jest.mock("@/shared/api/endpoints", () => ({
  putFarmerTwin: jest.fn(),
}));
jest.mock("@/features/twin/twinCache", () => ({
  setCachedTwin: jest.fn(),
}));
jest.mock("@/shared/auth/AuthProvider", () => ({
  useFarmerId: jest.fn(),
}));
jest.mock("@/features/onboarding/store", () => ({
  useOnboarding: jest.fn(),
}));

const mockPut = endpoints.putFarmerTwin as jest.Mock;
const mockSet = twinCache.setCachedTwin as jest.Mock;

describe("syncTwinOnboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
  });

  it("calls putFarmerTwin with minimal twin payload and caches the server response", async () => {
    const serverResponse = {
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
    };
    mockPut.mockResolvedValue(serverResponse);

    await syncTwinOnboarding(
      {
        farmerId: "anon_abc",
        state: "Punjab",
        district: "Ludhiana",
        language: "hi",
      },
      "online",
    );

    expect(mockPut).toHaveBeenCalledWith(
      "anon_abc",
      {
        farmer_id: "anon_abc",
        location: { state: "Punjab", district: "Ludhiana" },
        preferred_language: "hi",
        current_crops: [],
      },
      "online",
      undefined,
    );
    expect(mockSet).toHaveBeenCalledWith("anon_abc", serverResponse);
  });

  it("caches the local draft when putFarmerTwin rejects", async () => {
    mockPut.mockRejectedValue(new Error("network error"));

    await syncTwinOnboarding(
      {
        farmerId: "anon_abc",
        state: "Punjab",
        district: "Ludhiana",
        language: "hi",
      },
      "online",
    );

    expect(mockSet).toHaveBeenCalledWith("anon_abc", {
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
    });
  });

  it("does nothing when farmerId is null", async () => {
    await syncTwinOnboarding({ farmerId: null, state: "Punjab", district: "Ludhiana", language: "hi" }, "online");
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("does nothing when state is null", async () => {
    await syncTwinOnboarding({ farmerId: "anon_abc", state: null, district: "Ludhiana", language: "hi" }, "online");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("includes land when onboarding extras are provided", async () => {
    mockPut.mockResolvedValue({
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
      land: { total_acres: 5.5, irrigation: "irrigated" },
    });
    await syncTwinOnboarding(
      {
        farmerId: "anon_abc",
        state: "Punjab",
        district: "Ludhiana",
        language: "hi",
        landAcres: "5.5",
        irrigation: true,
      },
      "online",
    );
    expect(mockPut).toHaveBeenCalledWith(
      "anon_abc",
      expect.objectContaining({
        land: { total_acres: 5.5, irrigation: "irrigated" },
      }),
      "online",
      undefined,
    );
  });

  it("includes GPS coordinates on location when provided", async () => {
    mockPut.mockResolvedValue({
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana", lat: 30.9, lng: 75.85 },
      preferred_language: "hi",
      current_crops: [],
    });
    await syncTwinOnboarding(
      {
        farmerId: "anon_abc",
        state: "Punjab",
        district: "Ludhiana",
        language: "hi",
        lat: 30.9,
        lng: 75.85,
      },
      "online",
    );
    expect(mockPut).toHaveBeenCalledWith(
      "anon_abc",
      expect.objectContaining({
        location: { state: "Punjab", district: "Ludhiana", lat: 30.9, lng: 75.85 },
      }),
      "online",
      undefined,
    );
  });

  it("passes access token to putFarmerTwin when provided", async () => {
    mockPut.mockResolvedValue({
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
    });
    await syncTwinOnboarding(
      {
        farmerId: "anon_abc",
        state: "Punjab",
        district: "Ludhiana",
        language: "hi",
        accessToken: "jwt-here",
      },
      "online",
    );
    expect(mockPut).toHaveBeenCalledWith(
      "anon_abc",
      expect.objectContaining({ farmer_id: "anon_abc" }),
      "online",
      "jwt-here",
    );
  });

  it("defaults preferred_language to 'en' when language is null", async () => {
    mockPut.mockResolvedValue({
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "en",
      current_crops: [],
    });
    await syncTwinOnboarding(
      {
        farmerId: "anon_abc",
        state: "Punjab",
        district: "Ludhiana",
        language: null,
      },
      "online",
    );
    expect(mockPut).toHaveBeenCalledWith(
      "anon_abc",
      expect.objectContaining({
        preferred_language: "en",
      }),
      "online",
      undefined,
    );
  });
});
