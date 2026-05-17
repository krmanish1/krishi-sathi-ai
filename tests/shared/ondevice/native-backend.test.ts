import type { GemmaBackend, GenerateInput } from "@/shared/ondevice/gemma";

function createTestBackend(tokens: string[]): GemmaBackend {
  return {
    supportsVision: true,
    generate: async ({ onToken }: GenerateInput) => {
      const text = tokens.join("");
      for (const token of tokens) {
        onToken?.(token);
      }
      return { text, confidence: 0.72, modelUsed: "gemma-4-e4b-it" };
    },
  };
}

describe("native backend streaming", () => {
  it("calls onToken for each partial token", async () => {
    const received: string[] = [];
    const backend = createTestBackend(["Hello", " world", "!"]);
    const result = await backend.generate({
      prompt: "hi",
      language: "en",
      intent: "general",
      onToken: (t: string) => received.push(t),
    });
    expect(received).toEqual(["Hello", " world", "!"]);
    expect(result.text).toBe("Hello world!");
  });

  it("works without onToken callback", async () => {
    const backend = createTestBackend(["Hello"]);
    const result = await backend.generate({
      prompt: "hi",
      language: "en",
      intent: "general",
    });
    expect(result.text).toBe("Hello");
  });
});
