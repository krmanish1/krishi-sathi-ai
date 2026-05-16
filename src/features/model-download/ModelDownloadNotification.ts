import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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
    }
    _progressNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Downloading offline model… ${progress}%`,
        body: "You can continue using the app.",
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
        title: "Offline model ready!",
        body: "Open app to enable offline mode.",
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
        title: "Download failed.",
        body: "Open app to retry.",
      },
      trigger: null,
    });
  } catch {
    // silent
  }
}
