import { buildThinkingSteps } from "./thinkingStages";

describe("buildThinkingSteps", () => {
  it("uses phase when no stage events yet while streaming", () => {
    expect(buildThinkingSteps([], "routing", true)).toEqual([
      expect.objectContaining({
        data: { stage: "routing" },
        knownStage: "routing",
        done: false,
        active: true,
      }),
    ]);
  });

  it("preserves every data-stage payload in order", () => {
    const events = [
      { data: { stage: "routing", title: "A", description: "d1" } },
      { data: { stage: "tools", title: "Tool run", query: "x" } },
    ];
    expect(buildThinkingSteps(events, "tools", true)).toEqual([
      expect.objectContaining({
        data: events[0]?.data,
        knownStage: "routing",
        done: true,
        active: false,
      }),
      expect.objectContaining({
        data: events[1]?.data,
        knownStage: "tools",
        done: false,
        active: true,
      }),
    ]);
  });

  it("returns empty when not streaming and no events", () => {
    expect(buildThinkingSteps([], "idle", false)).toEqual([]);
  });
});
