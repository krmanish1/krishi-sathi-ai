import * as FileSystem from "expo-file-system/legacy";
import { NativeModules, Platform } from "react-native";
import { setModelReady } from "./modelState";

export type ModelVariant = "e4b" | "e2b";

const MODEL_FILENAMES: Record<ModelVariant, string> = {
  e4b: "gemma-4-E4B-it-web.task",
  e2b: "gemma-4-E2B-it-web.task",
};
const GB4_IN_BYTES = 4 * 1024 * 1024 * 1024;

function getModelDir(): string {
  return FileSystem.documentDirectory ?? "";
}

export function modelFilePath(variant: ModelVariant): string {
  return `${getModelDir()}${MODEL_FILENAMES[variant]}`;
}

export async function detectModelVariant(): Promise<ModelVariant> {
  if (Platform.OS !== "android") return "e4b";
  try {
    const totalMemory: number =
      ((NativeModules.PlatformConstants as Record<string, unknown>)?.totalMemory as number) ?? 0;
    return totalMemory > 0 && totalMemory < GB4_IN_BYTES ? "e2b" : "e4b";
  } catch {
    return "e4b";
  }
}

/**
 * If the LiteRT Gemma task file is on disk, marks model state ready so routing and chat can use it.
 * Safe to call at app boot (no network).
 */
export async function checkLocalGemmaModelOnDisk(
  variant?: ModelVariant,
): Promise<{ exists: boolean; variant: ModelVariant; path: string }> {
  const v = variant ?? (await detectModelVariant());
  const path = modelFilePath(v);
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      setModelReady(path);
      return { exists: true, variant: v, path };
    }
  } catch {
    // ignore
  }
  return { exists: false, variant: v, path };
}
