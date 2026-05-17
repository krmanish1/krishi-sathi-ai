import * as FileSystem from "expo-file-system/legacy";
import type { FileSystemDownloadResult, DownloadResumable } from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { setModelReady } from "./modelState";
import {
  type ModelVariant,
  checkLocalGemmaModelOnDisk,
  detectModelVariant,
  modelFilePath,
} from "./localGemmaModelFile";

const RESUME_STATE_KEY = (variant: ModelVariant) => `gemma-download-resume-${variant}`;

export type DownloadProgress = { received: number; total: number };
export { detectModelVariant, modelFilePath };
export type { ModelVariant };

// Hosted on Hugging Face (official @mediapipe/tasks-genai points here; GCS llm_inference URLs 404).
const MODEL_URLS: Record<ModelVariant, string> = {
  e4b: "https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it-web.task",
  e2b: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task",
};

export async function checkIsOnWifi(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.type === "wifi";
  } catch {
    return true; // assume wifi if can't check
  }
}

export async function checkModelExists(
  variant?: ModelVariant,
): Promise<{ exists: boolean; variant: ModelVariant; path: string }> {
  return checkLocalGemmaModelOnDisk(variant);
}

export async function downloadGemmaModel(
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
  variant?: ModelVariant,
): Promise<{ variant: ModelVariant; path: string }> {
  const v = variant ?? (await detectModelVariant());
  const destPath = modelFilePath(v);
  const url = MODEL_URLS[v];

  const existing = await checkLocalGemmaModelOnDisk(v);
  if (existing.exists) {
    onProgress({ received: 100, total: 100 });
    return { variant: v, path: destPath };
  }

  // Restore resume data string from a previous interrupted download.
  const savedResumeData = await AsyncStorage.getItem(RESUME_STATE_KEY(v)).catch(() => null);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("cancelled"));
      return;
    }

    let downloadResumable: DownloadResumable;

    const progressCallback = (downloadProgress: {
      totalBytesWritten: number;
      totalBytesExpectedToWrite: number;
    }) => {
      if (signal?.aborted) {
        void downloadResumable.pauseAsync()
          .then(() => {
            const state = downloadResumable.savable();
            const resumeData = state.resumeData;
            if (resumeData) {
              return AsyncStorage.setItem(RESUME_STATE_KEY(v), resumeData);
            }
          })
          .catch(() => undefined);
        reject(new Error("cancelled"));
        return;
      }
      const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
      if (totalBytesExpectedToWrite > 0) {
        onProgress({ received: totalBytesWritten, total: totalBytesExpectedToWrite });
      }
    };

    // 5th arg is resumeData string — pass saved string directly (no JSON.parse needed).
    downloadResumable = FileSystem.createDownloadResumable(
      url,
      destPath,
      {},
      progressCallback,
      savedResumeData ?? undefined,
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
        // Clear saved resume state — download complete.
        void AsyncStorage.removeItem(RESUME_STATE_KEY(v)).catch(() => undefined);
        setModelReady(destPath);
        resolve({ variant: v, path: destPath });
      })
      .catch(async (err: unknown) => {
        // Save resume state so next attempt picks up from current byte offset.
        try {
          const state = downloadResumable.savable();
          if (state.resumeData) {
            await AsyncStorage.setItem(RESUME_STATE_KEY(v), state.resumeData);
          }
        } catch {
          // ignore — next attempt restarts from 0
        }
        reject(err);
      });
  });
}

/** @deprecated Use downloadGemmaModel instead */
export const downloadGemmaE4B = async (
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> => {
  await downloadGemmaModel(onProgress, signal, "e4b");
};
