import {
  loadModel,
  generateText,
  generateTextWithImage,
  cancelGeneration,
  isNativeGemmaModuleLinked,
} from "@/modules/gemma-llm/src";
import type { GenerateInput, GenerateOutput, GemmaBackend } from "./gemma";
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";

const clampConfidence = (raw: number): number =>
  Math.min(0.99, Math.max(0, Number.isFinite(raw) ? raw : CONFIDENCE_THRESHOLD_LOW));

export function createNativeBackend(modelPath: string): GemmaBackend {
  let ready = false;

  const backend: GemmaBackend = {
    supportsVision: false,

    loadModel: async () => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        await loadModel(modelPath);
        ready = true;
        // Vision is not supported by our current native module implementation.
        // (We intentionally avoid probing with fake base64 payloads.)
        backend.supportsVision = false;
      }
    },

    cancel: () => {
      cancelGeneration();
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

    generateWithImage: async (
      prompt: string,
      imageBase64: string,
      mimeType: string,
    ): Promise<GenerateOutput> => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        await loadModel(modelPath);
        ready = true;
      }
      const out = await generateTextWithImage(prompt, imageBase64, mimeType);
      return {
        text: out,
        confidence: clampConfidence(0.72),
        modelUsed: "gemma-4-e4b-it",
      };
    },
  };

  return backend;
}
