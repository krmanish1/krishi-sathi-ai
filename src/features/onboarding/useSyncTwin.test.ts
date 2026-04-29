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

    await syncTwinOnboarding({
      farmerId: "anon_abc",
      state: "Punjab",
      district: "Ludhiana",
      language: "hi",
    });

    expect(mockPut).toHaveBeenCalledWith("anon_abc", {
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
    });
    expect(mockSet).toHaveBeenCalledWith("anon_abc", serverResponse);
  });

  it("caches the local draft when putFarmerTwin rejects", async () => {
    mockPut.mockRejectedValue(new Error("network error"));

    await syncTwinOnboarding({
      farmerId: "anon_abc",
      state: "Punjab",
      district: "Ludhiana",
      language: "hi",
    });

    expect(mockSet).toHaveBeenCalledWith("anon_abc", {
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
    });
  });

  it("does nothing when farmerId is null", async () => {
    await syncTwinOnboarding({ farmerId: null, state: "Punjab", district: "Ludhiana", language: "hi" });
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("does nothing when state is null", async () => {
    await syncTwinOnboarding({ farmerId: "anon_abc", state: null, district: "Ludhiana", language: "hi" });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("defaults preferred_language to 'en' when language is null", async () => {
    mockPut.mockResolvedValue({
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "en",
      current_crops: [],
    });
    await syncTwinOnboarding({
      farmerId: "anon_abc",
      state: "Punjab",
      district: "Ludhiana",
      language: null,
    });
    expect(mockPut).toHaveBeenCalledWith("anon_abc", expect.objectContaining({
      preferred_language: "en",
    }));
  });
});
