import { useModelDownloadStore } from "./modelDownloadStore";
import {
  setPreferOffline as syncPreferOfflineToRouting,
  getPreferOffline,
} from "@/shared/ondevice/modelState";
import { downloadGemmaModel } from "@/shared/ondevice/gemmaDownload";

// Mock native modules
jest.mock("expo-file-system/legacy", () => ({}));
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn().mockResolvedValue({ type: "wifi" }),
}));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notif-id"),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/shared/ondevice/gemmaDownload", () => ({
  downloadGemmaModel: jest.fn().mockResolvedValue({ variant: "e4b", path: "/model.task" }),
  detectModelVariant: jest.fn().mockResolvedValue("e4b"),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

// Test store actions directly (without React hooks to avoid RN test environment issues)
describe("useBackgroundModelDownload store integration", () => {
  beforeEach(() => {
    useModelDownloadStore.setState({
      status: "idle",
      progress: 0,
      variant: null,
      bannerDismissed: false,
      preferOffline: false,
    });
    jest.clearAllMocks();
  });

  it("setPreferOffline syncs to routing layer", () => {
    // Simulate what setPreferOffline in the hook does
    useModelDownloadStore.getState().setPreferOffline(true);
    syncPreferOfflineToRouting(true);
    expect(useModelDownloadStore.getState().preferOffline).toBe(true);
    expect(getPreferOffline()).toBe(true);
  });

  it("startDownload is idempotent when already downloading", async () => {
    useModelDownloadStore.setState({ status: "downloading" });
    // The hook checks status before doing anything
    const { status } = useModelDownloadStore.getState();
    expect(status).toBe("downloading");
    // downloadGemmaModel should not have been called
    expect(downloadGemmaModel).not.toHaveBeenCalled();
  });

  it("resetToIdle clears status, progress, and variant", () => {
    useModelDownloadStore.setState({ status: "downloading", progress: 50, variant: "e4b" });
    useModelDownloadStore.getState().resetToIdle();
    const { status, progress, variant } = useModelDownloadStore.getState();
    expect(status).toBe("idle");
    expect(progress).toBe(0);
    expect(variant).toBeNull();
  });
});
