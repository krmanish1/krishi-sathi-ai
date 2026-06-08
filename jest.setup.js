/* eslint-env node, jest */
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

require("react-native-gesture-handler/jestSetup");

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

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "test-dir/",
  cacheDirectory: "test-cache/",
  downloadAsync: jest.fn(),
  createDownloadResumable: jest.fn(),
}));
