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
import { clearModelReady, getModelPath, isModelReady } from "./modelState";
import { modelVariantFromFilename, modelVariantToOnDeviceModelId } from "./localGemmaModelFile";
import { logOnDevice } from "./ondeviceLog";
import { toNativeFilesystemPath } from "./nativeModelPath";

const clampConfidence = (raw: number): number =>
  Math.min(0.99, Math.max(0, Number.isFinite(raw) ? raw : CONFIDENCE_THRESHOLD_LOW));

async function tryLoadNativeModel(path: string): Promise<void> {
  const nativePath = toNativeFilesystemPath(path);
  if (!nativePath) throw new Error("Model path unknown — download the model first");
  logOnDevice("load_model_start", {
    nativeLinked: isNativeGemmaModuleLinked(),
    path: nativePath,
  });
  await loadModel(nativePath);
  logOnDevice("load_model_ok", { path: nativePath });
}

async function ensureNativeLoaded(modelPath: string, ready: { value: boolean }): Promise<void> {
  if (ready.value) return;
  let resolvedPath = modelPath || getModelPath();
  if (!resolvedPath) throw new Error("Model path unknown — download the model first");
  try {
    await tryLoadNativeModel(resolvedPath);
    ready.value = true;
  } catch (e) {
    clearModelReady();
    const { syncModelReadyFromDisk } = await import("./syncModelReadyFromDisk");
    await syncModelReadyFromDisk();
    const retryPath = getModelPath();
    if (isModelReady() && retryPath && retryPath !== resolvedPath) {
      try {
        await tryLoadNativeModel(retryPath);
        ready.value = true;
        return;
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        logOnDevice("load_model_fail", {
          phase: "after_resync",
          path: toNativeFilesystemPath(retryPath),
          error: msg,
        });
      }
    }
    clearModelReady();
    ready.value = false;
    const msg = e instanceof Error ? e.message : String(e);
    logOnDevice("load_model_fail", {
      path: toNativeFilesystemPath(resolvedPath),
      nativeLinked: isNativeGemmaModuleLinked(),
      error: msg,
    });
    throw e;
  }
}

export function createNativeBackend(modelPath: string): GemmaBackend {
  const ready = { value: false };
  const modelId = modelVariantToOnDeviceModelId(
    modelVariantFromFilename(modelPath) ?? "e2b",
  );

  const backend: GemmaBackend = {
    supportsVision: true,

    loadModel: async () => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      await ensureNativeLoaded(modelPath, ready);
    },

    cancel: () => {
      cancelGeneration();
    },

    generate: async ({ prompt, onToken }: GenerateInput): Promise<GenerateOutput> => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      await ensureNativeLoaded(modelPath, ready);
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
          modelUsed: modelId,
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
      await ensureNativeLoaded(modelPath, ready);
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
          modelUsed: modelId,
        };
      } finally {
        sub?.remove();
      }
    },
  };

  return backend;
}
