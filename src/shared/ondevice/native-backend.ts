import {
  loadModel,
  generateText,
  generateTextWithImage,
  cancelGeneration,
  isNativeGemmaModuleLinked,
  addTokenListener,
} from "@/modules/gemma-llm/src";
import type { GenerateInput, GenerateOutput, GemmaBackend } from "./gemma";
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";
import { getModelPath } from "./modelState";

const clampConfidence = (raw: number): number =>
  Math.min(0.99, Math.max(0, Number.isFinite(raw) ? raw : CONFIDENCE_THRESHOLD_LOW));

export function createNativeBackend(modelPath: string): GemmaBackend {
  let ready = false;

  const backend: GemmaBackend = {
    supportsVision: true,

    loadModel: async () => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        await loadModel(modelPath);
        ready = true;
      }
    },

    cancel: () => {
      cancelGeneration();
    },

    generate: async ({ prompt, onToken }: GenerateInput): Promise<GenerateOutput> => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        // Use the most current path — modelState may have been updated after this backend was created.
        const resolvedPath = modelPath || getModelPath();
        if (!resolvedPath) throw new Error("Model path unknown — download the model first");
        await loadModel(resolvedPath);
        ready = true;
      }
      const sub = onToken
        ? addTokenListener((token, done) => {
            if (!done && token) onToken(token);
          })
        : null;
      try {
        const out = await generateText(prompt);
        return {
          text: out,
          confidence: clampConfidence(0.72),
          modelUsed: "gemma-4-e4b-it",
        };
      } finally {
        sub?.remove();
      }
    },

    generateWithImage: async (
      prompt: string,
      imageBase64: string,
      mimeType: string,
      onToken?: (token: string) => void,
    ): Promise<GenerateOutput> => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        const resolvedPath = modelPath || getModelPath();
        if (!resolvedPath) throw new Error("Model path unknown — download the model first");
        await loadModel(resolvedPath);
        ready = true;
      }
      const sub = onToken
        ? addTokenListener((token, done) => {
            if (!done && token) onToken(token);
          })
        : null;
      try {
        const out = await generateTextWithImage(prompt, imageBase64, mimeType);
        return {
          text: out,
          confidence: clampConfidence(0.72),
          modelUsed: "gemma-4-e4b-it",
        };
      } finally {
        sub?.remove();
      }
    },
  };

  return backend;
}
