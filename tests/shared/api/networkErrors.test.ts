import { isNetworkFetchError } from "@/shared/api/networkErrors";

describe("isNetworkFetchError", () => {
  it("detects fetch failed and UnknownHost messages", () => {
    expect(
      isNetworkFetchError(
        new Error('fetch failed: java.net.UnknownHostException: Unable to resolve host "example.com"'),
      ),
    ).toBe(true);
    expect(isNetworkFetchError(new Error("Network request failed"))).toBe(true);
  });

  it("returns false for non-network errors", () => {
    expect(isNetworkFetchError(new Error("HTTP 500"))).toBe(false);
    expect(isNetworkFetchError("string")).toBe(false);
  });
});
