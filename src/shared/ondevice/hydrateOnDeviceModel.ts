import Constants from "expo-constants";
import { setGemmaBackend } from "./gemma";
import { createNativeBackend } from "./createNativeBackend";
import { mockGemmaBackend } from "./mock";
import { isNativeGemmaModuleLinked } from "@/modules/gemma-llm/src";
import {
  getDeviceGemmaVariantPolicy,
  resolveLocalGemmaModelOnDisk,
  type ModelVariant,
} from "./localGemmaModelFile";
import { clearModelReady, getModelPath, isModelReady } from "./modelState";

export type HydrateOnDeviceModelOpts = {
  preferredVariant?: ModelVariant;
  strictPreferred?: boolean;
};

/** Dev/adb paths — respects device policy so E2B-only phones never load E4B sideloads. */
function buildDevModelPaths(
  envPath: string | undefined,
  variant: ModelVariant,
  strictOnly: boolean,
): string[] {
  const out: string[] = [];
  const env = envPath?.trim();
  if (env && !env.toLowerCase().endsWith("-web.task")) {
    const envVariant =
      env.toLowerCase().includes("e2b") ? "e2b" : env.toLowerCase().includes("e4b") ? "e4b" : null;
    if (!strictOnly || envVariant === null || envVariant === variant) {
      out.push(env);
    }
  }
  if (variant === "e2b") {
    out.push("/data/local/tmp/gemma-4-E2B-it.litertlm");
  }
  if (variant === "e4b" && !strictOnly) {
    out.push("/data/local/tmp/gemma-4-E4B-it.litertlm");
  }
  return [...new Set(out)];
}

/** Re-scan disk and wire Gemma backend. Safe to call after download or on app resume. */
export async function hydrateOnDeviceModelFromDisk(
  opts?: HydrateOnDeviceModelOpts,
): Promise<boolean> {
  const policy = await getDeviceGemmaVariantPolicy();
  const preferredVariant = policy.strictOnly
    ? policy.variant
    : (opts?.preferredVariant ?? policy.variant);
  const extraPath = Constants.expoConfig?.extra?.nativeGemmaModelPath as string | undefined;
  const resolved = await resolveLocalGemmaModelOnDisk({
    preferredVariant,
    strictPreferred: opts?.strictPreferred ?? policy.strictOnly,
    additionalPaths: buildDevModelPaths(extraPath, preferredVariant, policy.strictOnly),
  });

  if (!resolved.exists) {
    clearModelReady();
    return false;
  }

  const modelPath = resolved.path || getModelPath();
  if (!modelPath.trim()) {
    return false;
  }

  const useNative = Constants.expoConfig?.extra?.useNativeGemma === "1";
  if (useNative && isNativeGemmaModuleLinked()) {
    // Defer native loadModel to first inference — avoids marking download "failed" on OOM.
    setGemmaBackend(createNativeBackend(modelPath));
  } else {
    setGemmaBackend(mockGemmaBackend);
  }

  return isModelReady();
}
