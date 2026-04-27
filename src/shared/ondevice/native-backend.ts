import { loadModel, generateText, isNativeGemmaModuleLinked } from "@/modules/gemma-llm/src";
import type { GenerateInput, GenerateOutput, GemmaBackend } from "./gemma";
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";

const clampConfidence = (raw: number): number =>
  Math.min(0.99, Math.max(0, Number.isFinite(raw) ? raw : CONFIDENCE_THRESHOLD_LOW));

/**
 * Backs `generate()` with MediaPipe when the native module exists and the model is loaded.
 */
export function createNativeBackend(modelPath: string): GemmaBackend {
  let ready = false;
  return {
    loadModel: async () => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        await loadModel(modelPath);
        ready = true;
      }
    },
    generate: async ({ prompt }: GenerateInput): Promise<GenerateOutput> => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        await loadModel(modelPath);
        ready = true;
      }
      const out = await generateText(prompt);
      return {
        text: out,
        confidence: clampConfidence(0.72),
        modelUsed: "gemma-4-e4b-it",
      };
    },
  };
}
