import { getApiBaseUrl } from "./env";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiBaseUrl: "http://fallback" } } },
}));

describe("getApiBaseUrl", () => {
  const original = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = original;
  });

  it("prefers EXPO_PUBLIC_API_BASE_URL env var", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://live.example.com";
    expect(getApiBaseUrl()).toBe("https://live.example.com");
  });

  it("falls back to Constants.expoConfig.extra.apiBaseUrl", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(getApiBaseUrl()).toBe("http://fallback");
  });
});
