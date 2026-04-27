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
