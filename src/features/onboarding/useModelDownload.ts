export type DownloadProgress = { received: number; total: number };

/**
 * v1: deterministic progress. Replace with real MediaPipe / Edge Gallery download in the native module task.
 */
export const downloadGemmaE4B = async (
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const total = 100;
  for (let i = 1; i <= total; i++) {
    if (signal?.aborted) {
      throw new Error("cancelled");
    }
    await new Promise<void>((r) => setTimeout(r, 12));
    onProgress({ received: i, total });
  }
};
