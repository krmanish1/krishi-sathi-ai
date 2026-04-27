import { isNonEmptyString } from "./guards";

describe("isNonEmptyString", () => {
  it("returns true for non-empty strings", () => {
    expect(isNonEmptyString("x")).toBe(true);
  });

  it("returns false for empty or non-strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(0 as unknown as string)).toBe(false);
  });
});
