import {
  detectModelVariant,
  getDeviceGemmaVariantPolicy,
  readAndroidTotalMemoryBytes,
  probeModelFileOnDisk,
  resolveLocalGemmaModelOnDisk,
  type ModelVariant,
} from "./localGemmaModelFile";
import { Platform } from "react-native";
import { hydrateOnDeviceModelFromDisk } from "./hydrateOnDeviceModel";
import { clearModelReady, isModelReady } from "./modelState";
import { logOnDevice } from "./ondeviceLog";
import { toNativeFilesystemPath } from "./nativeModelPath";

export type SyncModelReadyOpts = {
  preferredVariant?: ModelVariant;
};

/**
 * Re-scan disk for a valid `.litertlm` file, wire the Gemma backend, and update {@link isModelReady}.
 * Honors device policy (E2B-only on typical Android phones).
 */
export type SyncModelReadyResult = {
  ready: boolean;
  variant: ModelVariant | null;
  path: string | null;
};

export async function syncModelReadyFromDisk(
  opts?: SyncModelReadyOpts,
): Promise<SyncModelReadyResult> {
  const policy = await getDeviceGemmaVariantPolicy();
  const preferredVariant = policy.strictOnly
    ? policy.variant
    : (opts?.preferredVariant ?? policy.variant);
  const resolved = await resolveLocalGemmaModelOnDisk({
    preferredVariant,
    strictPreferred: policy.strictOnly,
  });

  const logBase = {
    policyVariant: policy.variant,
    strictOnly: policy.strictOnly,
    ...(Platform.OS === "android"
      ? { totalMemoryBytes: readAndroidTotalMemoryBytes() }
      : {}),
  };

  if (!resolved.exists) {
    clearModelReady();
    const probe = await probeModelFileOnDisk(resolved.variant);
    logOnDevice("sync_disk", {
      ...logBase,
      ready: false,
      scannedVariant: resolved.variant,
      path: toNativeFilesystemPath(resolved.path),
      fileExists: probe.exists,
      fileSizeBytes: probe.sizeBytes,
      fileMeetsMinimum: probe.meetsMinimum,
      hint:
        !probe.exists
          ? "download_e2b_in_settings"
          : !probe.meetsMinimum
            ? "partial_or_corrupt_redownload"
            : "unknown",
    });
    return { ready: false, variant: null, path: null };
  }

  await hydrateOnDeviceModelFromDisk({
    preferredVariant: resolved.variant,
    strictPreferred: policy.strictOnly,
  });
  const ready = isModelReady();
  logOnDevice("sync_disk", {
    ...logBase,
    ready,
    variant: resolved.variant,
    path: toNativeFilesystemPath(resolved.path),
  });
  return {
    ready,
    variant: resolved.variant,
    path: resolved.path,
  };
}

/** Variant the app would download for this device (RAM-based on Android). */
export async function recommendedModelVariant(): Promise<ModelVariant> {
  return detectModelVariant();
}
