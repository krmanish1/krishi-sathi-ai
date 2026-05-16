import type { GemmaBackend } from "./gemma";

export const mockGemmaBackend: GemmaBackend = {
  generate: async ({ prompt, language, intent }) => ({
    text: `[mock:${intent}:${language}] ${prompt}`,
    confidence: 0.65,
    modelUsed: "gemma-4-e4b-it",
  }),
  supportsVision: false,
};
