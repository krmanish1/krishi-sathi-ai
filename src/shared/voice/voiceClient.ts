import { Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

/**
 * Voice adapter used by chat screen. We keep a small compatibility layer
 * so feature code remains unchanged while using expo-speech-recognition.
 */
type VoiceCompat = {
  onSpeechResults?: (e: { value?: string[] }) => void;
  onSpeechError?: () => void;
  onSpeechEnd?: () => void;
  start: (lang: string) => Promise<void>;
  stop: () => Promise<void>;
  removeAllListeners: () => void;
};

let resultSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;
let endSub: { remove: () => void } | null = null;

const voiceCompat: VoiceCompat = {
  async start(lang: string) {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Speech recognition permission not granted");
    }
    if (!resultSub) {
      resultSub = ExpoSpeechRecognitionModule.addListener("result", (event: ExpoSpeechRecognitionResultEvent) => {
        const values = event.results.map((r) => r.transcript).filter(Boolean);
        voiceCompat.onSpeechResults?.({ value: values });
        if (event.isFinal) {
          voiceCompat.onSpeechEnd?.();
        }
      });
    }
    if (!errorSub) {
      errorSub = ExpoSpeechRecognitionModule.addListener("error", (_event: ExpoSpeechRecognitionErrorEvent) => {
        voiceCompat.onSpeechError?.();
      });
    }
    if (!endSub) {
      endSub = ExpoSpeechRecognitionModule.addListener("end", () => {
        voiceCompat.onSpeechEnd?.();
      });
    }
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
    });
  },
  async stop() {
    ExpoSpeechRecognitionModule.stop();
  },
  removeAllListeners() {
    resultSub?.remove();
    errorSub?.remove();
    endSub?.remove();
    resultSub = null;
    errorSub = null;
    endSub = null;
  },
};

export const voiceStt: VoiceCompat | null = Platform.OS === "web" ? null : voiceCompat;
