import {
  buildFallbackPlan,
  normalizePlannerSafe,
  parsePlannerJson,
} from "@/shared/ondevice/plannerParse";

describe("parsePlannerJson", () => {
  it("parses valid planner JSON", () => {
    const p = parsePlannerJson(
      '{"intent":"weather","tools":[{"tool":"climate","params":{}}],"safe":true}',
    );
    expect(p?.safe).toBe(true);
    expect(p?.tools[0]?.tool).toBe("climate");
  });

  it("defaults safe to true when field is missing", () => {
    const p = parsePlannerJson('{"intent":"general","tools":[{"tool":"general","params":{}}]}');
    expect(p?.safe).toBe(true);
  });

  it("returns null for non-JSON model output", () => {
    expect(parsePlannerJson("Here is my answer about wheat")).toBeNull();
  });
});

describe("normalizePlannerSafe", () => {
  it("only treats explicit false as unsafe", () => {
    expect(normalizePlannerSafe(undefined)).toBe(true);
    expect(normalizePlannerSafe(true)).toBe(true);
    expect(normalizePlannerSafe(false)).toBe(false);
    expect(normalizePlannerSafe("false")).toBe(false);
  });
});

describe("buildFallbackPlan", () => {
  it("maps weather intent to climate tool", () => {
    const p = buildFallbackPlan("weather");
    expect(p.safe).toBe(true);
    expect(p.tools[0]?.tool).toBe("climate");
  });
});
