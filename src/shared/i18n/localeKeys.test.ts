import en from "./locales/en.json";
import hi from "./locales/hi.json";

const flatten = (o: Record<string, unknown>, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? flatten(v as Record<string, unknown>, `${p}${k}.`)
      : [`${p}${k}`],
  );

describe("i18n key parity", () => {
  it("Hindi has the same structure keys as English", () => {
    expect(flatten(hi as Record<string, unknown>).sort()).toEqual(
      flatten(en as Record<string, unknown>).sort(),
    );
  });
});
