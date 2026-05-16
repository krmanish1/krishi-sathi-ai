import { parseKnownStage, titleAndSubtitleFromStageData } from "@/features/chat/formatStagePayload";

describe("parseKnownStage", () => {
  it("returns enum for known stage strings", () => {
    expect(parseKnownStage({ stage: "tools" })).toBe("tools");
  });

  it("returns undefined for unknown stage", () => {
    expect(parseKnownStage({ stage: "custom" })).toBeUndefined();
  });
});

describe("titleAndSubtitleFromStageData", () => {
  it("uses title and description from backend", () => {
    expect(
      titleAndSubtitleFromStageData({
        stage: "routing",
        title: "Analyzing intent",
        description: "Fetching context",
      }),
    ).toEqual({
      title: "Analyzing intent",
      subtitle: "Fetching context",
    });
  });

  it("puts extra keys in subtitle JSON when no description", () => {
    const r = titleAndSubtitleFromStageData({
      stage: "tools",
      title: "Kb lookup",
      query: "staffing levels",
    });
    expect(r.title).toBe("Kb lookup");
    expect(r.subtitle).toContain("staffing");
    expect(r.subtitle).toContain("query");
  });
});
