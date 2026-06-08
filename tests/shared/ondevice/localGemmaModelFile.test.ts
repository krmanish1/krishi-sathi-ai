import * as FileSystem from "expo-file-system/legacy";
import { NativeModules, Platform } from "react-native";
import {
  deviceGemmaVariantPolicyFromRam,
  modelFilePath,
  modelVariantFromDeviceRam,
  resolveLocalGemmaModelOnDisk,
  scanLocalGemmaModelOnDisk,
} from "@/shared/ondevice/localGemmaModelFile";
import { getModelPath, isModelReady, resetModelState } from "@/shared/ondevice/modelState";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: { PlatformConstants: { totalMemory: 8 * 1024 * 1024 * 1024 } },
}));

const GB = 1024 * 1024 * 1024;

const getInfoAsync = FileSystem.getInfoAsync as jest.Mock;

describe("modelVariantFromDeviceRam", () => {
  it("chooses e2b when Android RAM is within 12 GB ceiling", () => {
    expect(modelVariantFromDeviceRam(8 * GB, "android")).toBe("e2b");
    expect(modelVariantFromDeviceRam(6 * GB, "android")).toBe("e2b");
    expect(modelVariantFromDeviceRam(12 * GB, "android")).toBe("e2b");
    expect(modelVariantFromDeviceRam(11 * GB, "android")).toBe("e2b");
  });

  it("chooses e4b when Android RAM is above 12 GB ceiling", () => {
    expect(modelVariantFromDeviceRam(12 * GB + 1, "android")).toBe("e4b");
  });

  it("defaults to e4b on iOS", () => {
    expect(modelVariantFromDeviceRam(8 * GB, "ios")).toBe("e4b");
  });

  it("defaults to e2b on Android when RAM is unknown (0)", () => {
    expect(modelVariantFromDeviceRam(0, "android")).toBe("e2b");
  });

  it("marks ≤12 GB Android as E2B-only (strict)", () => {
    const p = deviceGemmaVariantPolicyFromRam(11 * GB, "android");
    expect(p.variant).toBe("e2b");
    expect(p.strictOnly).toBe(true);
  });
});

describe("scanLocalGemmaModelOnDisk E2B-only devices", () => {
  beforeEach(() => {
    resetModelState();
    getInfoAsync.mockReset();
    (Platform as { OS: string }).OS = "android";
    (NativeModules as { PlatformConstants: { totalMemory: number } }).PlatformConstants = {
      totalMemory: 8 * GB,
    };
  });

  it("ignores E4B file when device policy is E2B-only", async () => {
    const e4bPath = modelFilePath("e4b");
    const e2bPath = modelFilePath("e2b");
    getInfoAsync.mockImplementation(async (path: string) => {
      if (path === e4bPath) return { exists: true, size: 3.6 * 1024 * 1024 * 1024 };
      if (path === e2bPath) return { exists: false };
      return { exists: false };
    });

    const r = await scanLocalGemmaModelOnDisk();
    expect(r.exists).toBe(false);
    expect(isModelReady()).toBe(false);
  });
});

describe("resolveLocalGemmaModelOnDisk", () => {
  beforeEach(() => {
    resetModelState();
    getInfoAsync.mockReset();
  });

  it("checks e2b path when e4b is missing (variant mismatch)", async () => {
    const e4bPath = modelFilePath("e4b");
    const e2bPath = modelFilePath("e2b");
    getInfoAsync.mockImplementation(async (path: string) => {
      if (path === e4bPath) return { exists: false };
      if (path === e2bPath) return { exists: true, size: 2.5 * 1024 * 1024 * 1024 };
      return { exists: false };
    });

    const r = await resolveLocalGemmaModelOnDisk({ preferredVariant: "e4b" });
    expect(r.exists).toBe(true);
    expect(r.variant).toBe("e2b");
    expect(isModelReady()).toBe(true);
    expect(getModelPath()).toBe(e2bPath);
  });

  it("accepts env path when document files are absent", async () => {
    (NativeModules as { PlatformConstants: { totalMemory: number } }).PlatformConstants = {
      totalMemory: 12 * GB + 1,
    };
    const adbPath = "/data/local/tmp/gemma-4-E4B-it.litertlm";
    getInfoAsync.mockImplementation(async (path: string) => {
      if (path === adbPath) return { exists: true, size: 3.6 * 1024 * 1024 * 1024 };
      return { exists: false };
    });

    const r = await resolveLocalGemmaModelOnDisk({
      preferredVariant: "e4b",
      additionalPaths: [adbPath],
    });
    expect(r.exists).toBe(true);
    expect(getModelPath()).toBe(adbPath);
  });
});
