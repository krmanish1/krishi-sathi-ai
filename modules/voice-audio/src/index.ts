import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

type VoiceAudioNative = {
  enableVoiceMode: () => void;
  disableVoiceMode: () => void;
};

let native: VoiceAudioNative | null = null;
if (Platform.OS === "android") {
  try {
    native = requireNativeModule<VoiceAudioNative>("VoiceAudio");
  } catch {
    native = null;
  }
}

export function isVoiceAudioModuleLinked(): boolean {
  return native != null;
}

/** Call before LiveKit AudioSession + room.connect on Android. */
export function enableAndroidVoiceMode(): void {
  native?.enableVoiceMode();
}

/** Call after LiveKit AudioSession.stop on Android. */
export function disableAndroidVoiceMode(): void {
  native?.disableVoiceMode();
}
