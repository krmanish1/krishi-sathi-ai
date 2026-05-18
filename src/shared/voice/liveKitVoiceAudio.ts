import { Platform } from "react-native";
import {
  disableAndroidVoiceMode,
  enableAndroidVoiceMode,
} from "@/modules/voice-audio/src";

type LiveKitRN = typeof import("@livekit/react-native");

/**
 * Custom Android audio options: uses STREAM_MUSIC + media usage so audio output
 * follows the media volume slider (much louder than STREAM_VOICE_CALL).
 * Keeps `inCommunication` audio mode for echo cancellation.
 */
const LOUD_COMMUNICATION = {
  manageAudioFocus: true,
  audioMode: "inCommunication" as const,
  audioFocusMode: "gain" as const,
  audioStreamType: "music" as const,
  audioAttributesUsageType: "media" as const,
  audioAttributesContentType: "speech" as const,
};

/**
 * Prepares OS audio for realtime voice (WebRTC).
 * Must run before `room.connect()`.
 */
export async function startLiveKitVoiceAudio(
  livekitRN: LiveKitRN,
  options?: { speakerFirst?: boolean },
): Promise<void> {
  if (Platform.OS === "android") {
    enableAndroidVoiceMode();
  }

  const { AudioSession, getDefaultAppleAudioConfigurationForMode } =
    livekitRN;
  const speakerFirst = options?.speakerFirst ?? true;
  await AudioSession.configureAudio({
    android: {
      preferredOutputList: speakerFirst ? ["speaker", "earpiece"] : ["earpiece", "speaker"],
      audioTypeOptions: LOUD_COMMUNICATION,
    },
    ios: { defaultOutput: speakerFirst ? "speaker" : "earpiece" },
  });
  await AudioSession.startAudioSession();
  try {
    await AudioSession.setDefaultRemoteAudioTrackVolume(1.0);
  } catch {
    // Older LiveKit RN builds may omit this API.
  }
  if (Platform.OS === "ios") {
    try {
      await AudioSession.setAppleAudioConfiguration(
        getDefaultAppleAudioConfigurationForMode("localAndRemote", speakerFirst),
      );
    } catch {
      // Best-effort — improves play+record routing for remote agent loudness.
    }
  }
}

export async function stopLiveKitVoiceAudio(livekitRN: LiveKitRN): Promise<void> {
  await livekitRN.AudioSession.stopAudioSession();
  if (Platform.OS === "android") {
    disableAndroidVoiceMode();
  }
}

/** Switch speaker/earpiece without restarting the Android voice pipeline. */
export async function setLiveKitSpeakerRoute(
  livekitRN: LiveKitRN,
  speakerFirst: boolean,
): Promise<void> {
  const { AudioSession, getDefaultAppleAudioConfigurationForMode } =
    livekitRN;
  await AudioSession.configureAudio({
    android: {
      preferredOutputList: speakerFirst ? ["speaker", "earpiece"] : ["earpiece", "speaker"],
      audioTypeOptions: LOUD_COMMUNICATION,
    },
    ios: { defaultOutput: speakerFirst ? "speaker" : "earpiece" },
  });
  if (Platform.OS === "ios") {
    try {
      await AudioSession.setAppleAudioConfiguration(
        getDefaultAppleAudioConfigurationForMode("localAndRemote", speakerFirst),
      );
    } catch {
      // ignore
    }
  }
}
