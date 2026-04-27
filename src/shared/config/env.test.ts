import { getApiBaseUrl } from "./env";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiBaseUrl: "http://x" } } },
}));

describe("getApiBaseUrl", () => {
  it("returns apiBaseUrl from expo config", () => {
    expect(getApiBaseUrl()).toBe("http://x");
  });
});
