/* Mocks for unit-ts (node) Jest */
jest.mock("react-native", () => ({
  Platform: {
    OS: "web",
    select: (spec) => spec.web ?? spec.default,
  },
}));

jest.mock("expo-crypto", () => ({
  randomUUID: () => "a0000000-0000-4000-8000-000000000001",
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "test-dir/",
  cacheDirectory: "test-cache/",
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: "http://test",
        useNativeGemma: "0",
        nativeGemmaModelPath: "",
      },
    },
  },
}));

jest.mock("expo-modules-core", () => ({
  requireNativeModule: jest.fn(),
}));
