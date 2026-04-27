/* Mocks for unit-ts (node) Jest */
jest.mock("expo-crypto", () => ({
  randomUUID: () => "a0000000-0000-4000-8000-000000000001",
}));
