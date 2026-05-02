import { mapNetInfoToConnectivity } from "./mapNetInfoToConnectivity";

describe("mapNetInfoToConnectivity", () => {
  it("returns offline only when isConnected is explicitly false", () => {
    expect(mapNetInfoToConnectivity({ isConnected: false, isInternetReachable: false })).toBe(
      "offline",
    );
    expect(mapNetInfoToConnectivity({ isConnected: false, isInternetReachable: null })).toBe(
      "offline",
    );
  });

  it("returns null when isConnected is unknown (do not flash offline)", () => {
    expect(mapNetInfoToConnectivity({ isConnected: null, isInternetReachable: null })).toBeNull();
    expect(mapNetInfoToConnectivity({ isConnected: null, isInternetReachable: false })).toBeNull();
  });

  it("returns degraded when connected but internet explicitly unreachable", () => {
    expect(mapNetInfoToConnectivity({ isConnected: true, isInternetReachable: false })).toBe(
      "degraded",
    );
  });

  it("returns online when connected and internet reachable or unknown", () => {
    expect(mapNetInfoToConnectivity({ isConnected: true, isInternetReachable: true })).toBe(
      "online",
    );
    expect(mapNetInfoToConnectivity({ isConnected: true, isInternetReachable: null })).toBe(
      "online",
    );
  });
});
