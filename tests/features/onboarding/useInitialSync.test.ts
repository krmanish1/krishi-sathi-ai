import { runInitialSync } from "@/features/onboarding/useInitialSync";

jest.mock("@/shared/api/endpoints", () => ({
  getSyncBundle: jest.fn().mockResolvedValue({
    bundle_version: "v1",
    generated_at: "",
    district: "Ludhiana",
    state: "Punjab",
    data: { schemes: [], mandi_prices: [], crop_calendar: {}, weather_history: [] },
    ttl_hours: 24,
  }),
}));
jest.mock("@/shared/storage/bundle", () => ({ saveBundle: jest.fn() }));

describe("runInitialSync", () => {
  it("fetches the bundle and persists it", async () => {
    const { getSyncBundle } = jest.requireMock("@/shared/api/endpoints") as {
      getSyncBundle: jest.Mock;
    };
    const { saveBundle } = jest.requireMock("@/shared/storage/bundle") as {
      saveBundle: jest.Mock;
    };
    const ver = await runInitialSync({ state: "Punjab", district: "Ludhiana" });
    expect(getSyncBundle).toHaveBeenCalledWith({ state: "Punjab", district: "Ludhiana" });
    expect(saveBundle).toHaveBeenCalledWith("v1", expect.any(Object));
    expect(ver).toBe("v1");
  });
});
