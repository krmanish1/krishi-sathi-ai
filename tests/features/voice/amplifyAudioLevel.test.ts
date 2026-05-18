import { amplifyAudioLevel } from "@/features/voice/amplifyAudioLevel";

describe("amplifyAudioLevel", () => {
  it("returns 0 for silence", () => {
    expect(amplifyAudioLevel(0)).toBe(0);
    expect(amplifyAudioLevel(0.0005)).toBe(0);
  });

  it("boosts quiet levels into visible range", () => {
    const quiet = amplifyAudioLevel(0.08, 4);
    const loud = amplifyAudioLevel(0.35, 4);
    expect(quiet).toBeGreaterThan(0.2);
    expect(loud).toBeGreaterThan(quiet);
    expect(loud).toBeLessThanOrEqual(1);
  });
});
