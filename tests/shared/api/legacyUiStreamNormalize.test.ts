import {
  createLegacyUiStreamNormalizeState,
  normalizeLegacyUiStreamChunk,
} from "@/shared/api/legacyUiStreamNormalize";

jest.mock("@/shared/utils/uuid", () => ({
  randomUUID: jest.fn(() => "test-text-part-id"),
}));

describe("normalizeLegacyUiStreamChunk", () => {
  it("injects text-start and id when backend sends bare text-delta", () => {
    const state = createLegacyUiStreamNormalizeState();
    const out = normalizeLegacyUiStreamChunk(
      { type: "text-delta", delta: "Hello" },
      state,
    );
    expect(out).toEqual([
      { type: "text-start", id: "test-text-part-id" },
      { type: "text-delta", id: "test-text-part-id", delta: "Hello" },
    ]);
  });

  it("reuses id across deltas after implicit start", () => {
    const state = createLegacyUiStreamNormalizeState();
    const first = normalizeLegacyUiStreamChunk(
      { type: "text-delta", delta: "a" },
      state,
    );
    const second = normalizeLegacyUiStreamChunk({ type: "text-delta", delta: "b" }, state);
    expect(first).toHaveLength(2);
    expect(second).toEqual([
      { type: "text-delta", id: "test-text-part-id", delta: "b" },
    ]);
  });

  it("respects explicit text-start id for subsequent deltas without id", () => {
    const state = createLegacyUiStreamNormalizeState();
    normalizeLegacyUiStreamChunk({ type: "text-start", id: "explicit" }, state);
    const next = normalizeLegacyUiStreamChunk(
      { type: "text-delta", delta: "x" },
      state,
    );
    expect(next).toEqual([{ type: "text-delta", id: "explicit", delta: "x" }]);
  });

  it("resets text tracking on start chunk", () => {
    const state = createLegacyUiStreamNormalizeState();
    normalizeLegacyUiStreamChunk({ type: "text-delta", delta: "a" }, state);
    normalizeLegacyUiStreamChunk({ type: "start" }, state);
    const again = normalizeLegacyUiStreamChunk({ type: "text-delta", delta: "b" }, state);
    expect(again[0]).toEqual({ type: "text-start", id: "test-text-part-id" });
  });
});
