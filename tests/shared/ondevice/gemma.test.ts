import { generate, setGemmaBackend } from "@/shared/ondevice/gemma";
import { mockGemmaBackend } from "@/shared/ondevice/mock";

beforeAll(() => {
  setGemmaBackend(mockGemmaBackend);
});

describe("on-device gemma facade (mock backend)", () => {
  it("returns text and a confidence in [0,1]", async () => {
    const r = await generate({ prompt: "hi", language: "en", intent: "general" });
    expect(typeof r.text).toBe("string");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});
