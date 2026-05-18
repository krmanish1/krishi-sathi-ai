jest.mock("expo-modules-core", () => ({
  requireNativeModule: () => {
    throw new Error("GemmaLlm native module not linked");
  },
}));

import { addTokenListener } from "../modules/gemma-llm/src/index";

describe("addTokenListener", () => {
  it("returns a removable subscription when module not linked", () => {
    const sub = addTokenListener(() => {});
    expect(sub).toBeDefined();
    expect(typeof sub.remove).toBe("function");
    expect(() => sub.remove()).not.toThrow();
  });
});
