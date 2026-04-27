import { Platform } from "react-native";
import type RNVoice from "@react-native-voice/voice";

/**
 * @react-native-voice/voice is not bundled for web. This stays null in web builds.
 */
export const voiceStt: typeof RNVoice | null =
  Platform.OS === "web"
    ? null
    : (require("@react-native-voice/voice") as { default: typeof RNVoice }).default;
