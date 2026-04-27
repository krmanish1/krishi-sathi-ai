import { requireNativeModule } from "expo-modules-core";

type NativeGemma = {
  load: (modelPath: string) => Promise<boolean>;
  generate: (prompt: string) => Promise<string>;
};

let native: NativeGemma | null = null;
try {
  native = requireNativeModule<NativeGemma>("GemmaLlm");
} catch {
  native = null;
}

/**
 * @returns false when the Kotlin `GemmaLlmModule` is not in the build (e.g. dev without prebuild).
 */
export function isNativeGemmaModuleLinked(): boolean {
  return native != null;
}

export const loadModel = (modelPath: string): Promise<boolean> => {
  if (!native) {
    return Promise.reject(
      new Error("GemmaLlm native module not linked; run prebuild and add Task 6.1 module."),
    );
  }
  return native.load(modelPath);
};

export const generateText = (prompt: string): Promise<string> => {
  if (!native) {
    return Promise.reject(new Error("GemmaLlm native module not linked."));
  }
  return native.generate(prompt);
};
