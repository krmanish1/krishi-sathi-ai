import { greetingFirstName, resolveDisplayName } from "./displayName";

describe("resolveDisplayName", () => {
  const fb = "Farmer";

  it("prefers twin name", () => {
    expect(
      resolveDisplayName({
        twinName: "  Priya  ",
        metadataName: "Other",
        email: "x@y.com",
        fallback: fb,
      }),
    ).toBe("Priya");
  });

  it("uses metadata when no twin name", () => {
    expect(
      resolveDisplayName({
        twinName: null,
        metadataName: "Amit",
        email: "x@y.com",
        fallback: fb,
      }),
    ).toBe("Amit");
  });

  it("uses full_name when name missing", () => {
    expect(
      resolveDisplayName({
        twinName: "",
        metadataFullName: "Vijay Singh",
        email: null,
        fallback: fb,
      }),
    ).toBe("Vijay Singh");
  });

  it("derives from email local part", () => {
    expect(
      resolveDisplayName({
        twinName: null,
        metadataName: null,
        metadataFullName: null,
        email: "rajesh.kumar@farm.io",
        fallback: fb,
      }),
    ).toBe("Rajesh Kumar");
  });

  it("uses fallback when nothing else", () => {
    expect(resolveDisplayName({ twinName: "", email: null, fallback: fb })).toBe("Farmer");
  });
});

describe("greetingFirstName", () => {
  it("returns first token", () => {
    expect(greetingFirstName("Manish Kumar")).toBe("Manish");
  });
});
