import * as FileSystem from "expo-file-system/legacy";
import { NativeModules, Platform } from "react-native";
import { setModelReady } from "./modelState";

export type ModelVariant = "e4b" | "e2b";

const MODEL_FILENAMES: Record<ModelVariant, string> = {
  e4b: "gemma-4-E4B-it-web.task",
  e2b: "gemma-4-E2B-it-web.task",
};
const GB8_IN_BYTES = 8 * 1024 * 1024 * 1024;

// Conservative minimums — a valid model file cannot be smaller than this.
// E4B ~4 GB task file, E2B ~2 GB task file.
const MINIMUM_VALID_SIZE_BYTES: Record<ModelVariant, number> = {
  e4b: 1.5 * 1024 * 1024 * 1024, // 1.5 GB
  e2b: 0.8 * 1024 * 1024 * 1024, // 0.8 GB
};

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
    return totalMemory > 0 && totalMemory <= GB8_IN_BYTES ? "e2b" : "e4b";
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
    const size = (info as { size?: number }).size ?? 0;
    if (info.exists && size >= MINIMUM_VALID_SIZE_BYTES[v]) {
      setModelReady(path);
      return { exists: true, variant: v, path };
    }
    // Partial file — delete it so next download starts clean (no stale bytes).
    if (info.exists && size > 0) {
      await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
    }
  } catch {
    // ignore
  }
  return { exists: false, variant: v, path };
}
