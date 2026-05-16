import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DownloadStatus = "idle" | "downloading" | "completed" | "failed";

type State = {
  status: DownloadStatus;
  progress: number;
  variant: "e2b" | "e4b" | null;
  bannerDismissed: boolean;
  preferOffline: boolean;
};

type Actions = {
  setStatus: (status: DownloadStatus) => void;
  setProgress: (progress: number) => void;
  setVariant: (variant: "e2b" | "e4b") => void;
  dismissBanner: () => void;
  setPreferOffline: (prefer: boolean) => void;
  resetToIdle: () => void;
};

export const useModelDownloadStore = create<State & Actions>()(
  persist(
    (set) => ({
      status: "idle",
      progress: 0,
      variant: null,
      bannerDismissed: false,
      preferOffline: false,
      setStatus: (status) => set({ status }),
      setProgress: (progress) => set({ progress }),
      setVariant: (variant) => set({ variant }),
      dismissBanner: () => set({ bannerDismissed: true }),
      setPreferOffline: (preferOffline) => set({ preferOffline }),
      resetToIdle: () => set({ status: "idle", progress: 0 }),
    }),
    {
      name: "krishi-model-download",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        status: s.status,
        progress: s.progress,
        variant: s.variant,
        bannerDismissed: s.bannerDismissed,
        preferOffline: s.preferOffline,
      }),
    },
  ),
);
