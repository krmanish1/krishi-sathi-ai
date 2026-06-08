import * as FileSystem from "expo-file-system/legacy";
import { NativeModules, Platform } from "react-native";
import { pathsForFileSystemCheck, toNativeFilesystemPath } from "./nativeModelPath";
import { setModelReady } from "./modelState";

export type ModelVariant = "e4b" | "e2b";

/** Android LiteRT-LM needs `.litertlm` (not `*-web.task`, which is for web/WASM). */
const MODEL_FILENAMES: Record<ModelVariant, string> = {
  e4b: "gemma-4-E4B-it.litertlm",
  e2b: "gemma-4-E2B-it.litertlm",
};

const LEGACY_WEB_TASK_FILENAMES: Record<ModelVariant, string> = {
  e4b: "gemma-4-E4B-it-web.task",
  e2b: "gemma-4-E2B-it-web.task",
};
/**
 * Retail "8 GB" phones often report 9–11 GB via `PlatformConstants.totalMemory`
 * (kernel + GPU shared memory). Use E2B at or below this ceiling.
 */
const E2B_RAM_CEILING_BYTES = 12 * 1024 * 1024 * 1024;

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

/** For logs / UI — whether the expected `.litertlm` exists and its size (if reported). */
export async function probeModelFileOnDisk(variant: ModelVariant): Promise<{
  path: string;
  exists: boolean;
  sizeBytes: number | null;
  meetsMinimum: boolean;
}> {
  const path = modelFilePath(variant);
  for (const candidate of pathsForFileSystemCheck(path)) {
    try {
      const info = await FileSystem.getInfoAsync(candidate);
      if (!info.exists) continue;
      const sizeBytes = (info as { size?: number }).size ?? null;
      const meetsMinimum = await fileMeetsMinimum(candidate, variant);
      return {
        path: toNativeFilesystemPath(candidate),
        exists: true,
        sizeBytes,
        meetsMinimum,
      };
    } catch {
      // try next path form
    }
  }
  return {
    path: toNativeFilesystemPath(path),
    exists: false,
    sizeBytes: null,
    meetsMinimum: false,
  };
}

export function legacyWebTaskFilePath(variant: ModelVariant): string {
  return `${getModelDir()}${LEGACY_WEB_TASK_FILENAMES[variant]}`;
}

/** Old Hugging Face `*-web.task` artifacts do not load in native LiteRT-LM on Android. */
export function isLegacyWebTaskModelPath(path: string): boolean {
  return /-web\.task$/i.test(path.trim());
}

function isNativeRunnableModelPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(".litertlm") || lower.endsWith(".task");
}

/** Picks E2B on Android at or below {@link E2B_RAM_CEILING_BYTES}; otherwise E4B. */
export function modelVariantFromDeviceRam(
  totalMemoryBytes: number,
  platformOs: typeof Platform.OS,
): ModelVariant {
  if (platformOs !== "android") return "e4b";
  if (totalMemoryBytes > E2B_RAM_CEILING_BYTES) return "e4b";
  // ≤12 GB ceiling, or RAM unknown (0) — use smaller E2B.
  return "e2b";
}

export function readAndroidTotalMemoryBytes(): number {
  return (
    ((NativeModules.PlatformConstants as Record<string, unknown>)?.totalMemory as number) ?? 0
  );
}

export type DeviceGemmaVariantPolicy = {
  variant: ModelVariant;
  /** When true, never download, scan, or load the other variant on this device. */
  strictOnly: boolean;
};

export function deviceGemmaVariantPolicyFromRam(
  totalMemoryBytes: number,
  platformOs: typeof Platform.OS,
): DeviceGemmaVariantPolicy {
  const variant = modelVariantFromDeviceRam(totalMemoryBytes, platformOs);
  return {
    variant,
    // ≤8 GB / unknown-RAM Android must not run the larger E4B weights.
    strictOnly: platformOs === "android" && variant === "e2b",
  };
}

export async function getDeviceGemmaVariantPolicy(): Promise<DeviceGemmaVariantPolicy> {
  try {
    const totalMemory = readAndroidTotalMemoryBytes();
    return deviceGemmaVariantPolicyFromRam(totalMemory, Platform.OS);
  } catch {
    return Platform.OS === "android"
      ? { variant: "e2b", strictOnly: true }
      : { variant: "e4b", strictOnly: false };
  }
}

export async function detectModelVariant(): Promise<ModelVariant> {
  const policy = await getDeviceGemmaVariantPolicy();
  return policy.variant;
}

export function modelVariantFromFilename(path: string): ModelVariant | null {
  const lower = path.toLowerCase();
  if (lower.includes("e2b")) return "e2b";
  if (lower.includes("e4b")) return "e4b";
  return null;
}

export function modelVariantToOnDeviceModelId(
  variant: ModelVariant,
): "gemma-4-e4b-it" | "gemma-4-e2b-it" {
  return variant === "e2b" ? "gemma-4-e2b-it" : "gemma-4-e4b-it";
}

async function variantScanOrder(opts?: ResolveLocalGemmaOpts): Promise<ModelVariant[]> {
  const policy = await getDeviceGemmaVariantPolicy();
  const preferred = opts?.preferredVariant ?? policy.variant;

  if (opts?.strictPreferred && opts.preferredVariant !== undefined) {
    return [opts.preferredVariant];
  }
  if (policy.strictOnly) {
    return [policy.variant];
  }
  return preferred === "e4b" ? ["e4b", "e2b"] : ["e2b", "e4b"];
}

async function fileMeetsMinimum(path: string, variant: ModelVariant): Promise<boolean> {
  if (isLegacyWebTaskModelPath(path)) {
    return false;
  }
  if (!isNativeRunnableModelPath(path)) {
    return false;
  }
  const candidates = [...new Set(pathsForFileSystemCheck(path))];
  for (const candidate of candidates) {
    try {
      const info = await FileSystem.getInfoAsync(candidate);
      if (!info.exists) continue;
      const size = (info as { size?: number }).size;
      // Some Android builds omit `size` for large files — accept known extensions if present.
      if (size === undefined) {
        return candidate.toLowerCase().endsWith(".litertlm");
      }
      if (size >= MINIMUM_VALID_SIZE_BYTES[variant]) return true;
      // Partial download — remove so the next download starts clean.
      if (size > 0) {
        await FileSystem.deleteAsync(candidate, { idempotent: true }).catch(() => undefined);
      }
    } catch {
      // try next path form
    }
  }
  return false;
}

export type ResolveLocalGemmaOpts = {
  preferredVariant?: ModelVariant;
  /** When true with preferredVariant, do not fall back to the other variant (post-download verify). */
  strictPreferred?: boolean;
  /** e.g. EXPO_PUBLIC_NATIVE_GEMMA_MODEL_PATH or adb-pushed path */
  additionalPaths?: string[];
};

/** Scans disk only — does not update {@link setModelReady}. */
export async function scanLocalGemmaModelOnDisk(
  opts?: ResolveLocalGemmaOpts,
): Promise<{ exists: boolean; variant: ModelVariant; path: string }> {
  const policy = await getDeviceGemmaVariantPolicy();
  const preferred = policy.strictOnly
    ? policy.variant
    : (opts?.preferredVariant ?? policy.variant);
  const variantOrder = await variantScanOrder({
    ...opts,
    preferredVariant: preferred,
    strictPreferred: opts?.strictPreferred ?? policy.strictOnly,
  });

  for (const v of variantOrder) {
    const path = modelFilePath(v);
    if (await fileMeetsMinimum(path, v)) {
      return { exists: true, variant: v, path };
    }
  }

  const extras = [...new Set((opts?.additionalPaths ?? []).filter((p) => p.trim().length > 0))];
  for (const path of extras) {
    const hinted = modelVariantFromFilename(path);
    if (policy.strictOnly && hinted !== null && hinted !== policy.variant) {
      continue;
    }
    for (const v of variantOrder) {
      if (await fileMeetsMinimum(path, v)) {
        return { exists: true, variant: v, path };
      }
    }
  }

  return { exists: false, variant: preferred, path: modelFilePath(preferred) };
}

/**
 * Finds a valid Gemma .litertlm on disk and marks runtime state ready when found.
 */
export async function resolveLocalGemmaModelOnDisk(
  opts?: ResolveLocalGemmaOpts,
): Promise<{ exists: boolean; variant: ModelVariant; path: string }> {
  const scanned = await scanLocalGemmaModelOnDisk(opts);
  if (scanned.exists) {
    setModelReady(scanned.path);
  }
  return scanned;
}

/**
 * If the LiteRT Gemma task file is on disk, marks model state ready so routing and chat can use it.
 * Safe to call at app boot (no network).
 */
export async function checkLocalGemmaModelOnDisk(
  variant?: ModelVariant,
): Promise<{ exists: boolean; variant: ModelVariant; path: string }> {
  return resolveLocalGemmaModelOnDisk(
    variant !== undefined ? { preferredVariant: variant, strictPreferred: false } : undefined,
  );
}
