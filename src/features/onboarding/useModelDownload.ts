import * as FileSystem from "expo-file-system/legacy";
import type { FileSystemDownloadResult } from "expo-file-system/legacy";
import { NativeModules, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { setModelReady } from "@/shared/ondevice/modelState";

export type DownloadProgress = { received: number; total: number };
export type ModelVariant = "e4b" | "e2b";

// TODO: Pin version before production release — verify against Google AI Edge Gallery
const MODEL_URLS: Record<ModelVariant, string> = {
  e4b: "https://storage.googleapis.com/mediapipe-models/llm_inference/gemma-4-e4b-it/float16/1/gemma-4-e4b-it.bin",
  e2b: "https://storage.googleapis.com/mediapipe-models/llm_inference/gemma-4-e2b-it/float16/1/gemma-4-e2b-it.bin",
};
const MODEL_FILENAMES: Record<ModelVariant, string> = {
  e4b: "gemma-4-e4b-it.bin",
  e2b: "gemma-4-e2b-it.bin",
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

export async function checkModelExists(
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

export async function checkIsOnWifi(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.type === "wifi";
  } catch {
    return true; // assume wifi if can't check
  }
}

export async function downloadGemmaModel(
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
  variant?: ModelVariant,
): Promise<{ variant: ModelVariant; path: string }> {
  const v = variant ?? (await detectModelVariant());
  const destPath = modelFilePath(v);
  const url = MODEL_URLS[v];

  const existing = await checkModelExists(v);
  if (existing.exists) {
    onProgress({ received: 100, total: 100 });
    return { variant: v, path: destPath };
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("cancelled"));
      return;
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      destPath,
      {},
      (downloadProgress: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
        if (signal?.aborted) {
          void downloadResumable.pauseAsync().catch(() => undefined);
          reject(new Error("cancelled"));
          return;
        }
        const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
        if (totalBytesExpectedToWrite > 0) {
          onProgress({
            received: totalBytesWritten,
            total: totalBytesExpectedToWrite,
          });
        }
      },
    );

    void downloadResumable
      .downloadAsync()
      .then((result: FileSystemDownloadResult | undefined) => {
        if (signal?.aborted) {
          reject(new Error("cancelled"));
          return;
        }
        if (!result || result.status < 200 || result.status >= 300) {
          reject(new Error(`Download failed with status: ${result?.status ?? "unknown"}`));
          return;
        }
        setModelReady(destPath);
        resolve({ variant: v, path: destPath });
      })
      .catch(reject);
  });
}

/** @deprecated Use downloadGemmaModel instead */
export const downloadGemmaE4B = async (
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> => {
  await downloadGemmaModel(onProgress, signal, "e4b");
};
