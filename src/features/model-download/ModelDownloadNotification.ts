import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import i18n from "@/shared/i18n";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let _progressNotifId: string | null = null;

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function showProgressNotification(progress: number): Promise<void> {
  try {
    if (_progressNotifId) {
      await Notifications.dismissNotificationAsync(_progressNotifId).catch(() => undefined);
      _progressNotifId = null;
    }
    _progressNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t("modelDownload.downloading", { pct: progress }),
      },
      trigger: null,
    });
  } catch {
    // notifications unavailable (Expo Go, permission denied) — silent
  }
}

export async function dismissProgressNotification(): Promise<void> {
  if (!_progressNotifId) return;
  try {
    await Notifications.dismissNotificationAsync(_progressNotifId);
  } catch {
    // ignore
  }
  _progressNotifId = null;
}

export async function showCompletionNotification(): Promise<void> {
  await dismissProgressNotification();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t("modelDownload.completed"),
      },
      trigger: null,
    });
  } catch {
    // silent
  }
}

export async function showFailureNotification(): Promise<void> {
  await dismissProgressNotification();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t("modelDownload.failed"),
      },
      trigger: null,
    });
  } catch {
    // silent
  }
}
