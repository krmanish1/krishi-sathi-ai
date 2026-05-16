import { useModelDownloadStore } from "@/features/model-download/modelDownloadStore";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  mergeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

describe("modelDownloadStore", () => {
  beforeEach(() => {
    useModelDownloadStore.setState({
      status: "idle",
      progress: 0,
      variant: null,
      bannerDismissed: false,
      preferOffline: false,
    });
  });

  it("initial status is idle", () => {
    expect(useModelDownloadStore.getState().status).toBe("idle");
  });

  it("setStatus updates status", () => {
    useModelDownloadStore.getState().setStatus("downloading");
    expect(useModelDownloadStore.getState().status).toBe("downloading");
  });

  it("setProgress updates progress", () => {
    useModelDownloadStore.getState().setProgress(42);
    expect(useModelDownloadStore.getState().progress).toBe(42);
  });

  it("dismissBanner sets bannerDismissed", () => {
    useModelDownloadStore.getState().dismissBanner();
    expect(useModelDownloadStore.getState().bannerDismissed).toBe(true);
  });

  it("setPreferOffline updates preferOffline", () => {
    useModelDownloadStore.getState().setPreferOffline(true);
    expect(useModelDownloadStore.getState().preferOffline).toBe(true);
  });

  it("setVariant updates variant", () => {
    useModelDownloadStore.getState().setVariant("e2b");
    expect(useModelDownloadStore.getState().variant).toBe("e2b");
  });

  it("resetToIdle resets status, progress, and variant", () => {
    useModelDownloadStore.getState().setStatus("downloading");
    useModelDownloadStore.getState().setProgress(55);
    useModelDownloadStore.getState().setVariant("e4b");
    useModelDownloadStore.getState().resetToIdle();
    expect(useModelDownloadStore.getState().status).toBe("idle");
    expect(useModelDownloadStore.getState().progress).toBe(0);
    expect(useModelDownloadStore.getState().variant).toBeNull();
  });
});
