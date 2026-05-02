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
