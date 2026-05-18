import { Platform } from "react-native";
import * as Speech from "expo-speech";

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

type NativeSpeechRecognitionModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (eventName: string, listener: (event: unknown) => void) => { remove: () => void };
  start: (options: {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
  }) => void;
  stop: () => void;
};

type WebSpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: unknown) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

let resultSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;
let endSub: { remove: () => void } | null = null;
let nativeSpeechModule: NativeSpeechRecognitionModule | null = null;

if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule?: NativeSpeechRecognitionModule;
    };
    nativeSpeechModule = loaded.ExpoSpeechRecognitionModule ?? null;
  } catch {
    nativeSpeechModule = null;
  }
}

const voiceCompat: VoiceCompat = {
  async start(lang: string) {
    if (!nativeSpeechModule) {
      throw new Error("Speech recognition unavailable in this runtime");
    }
    const permission = await nativeSpeechModule.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Speech recognition permission not granted");
    }
    if (!resultSub) {
      resultSub = nativeSpeechModule.addListener("result", (event) => {
        const maybeEvent = event as { results?: { transcript?: string }[]; isFinal?: boolean };
        const values = (maybeEvent.results ?? []).map((r) => r.transcript ?? "").filter(Boolean);
        voiceCompat.onSpeechResults?.({ value: values });
        if (maybeEvent.isFinal) {
          voiceCompat.onSpeechEnd?.();
        }
      });
    }
    if (!errorSub) {
      errorSub = nativeSpeechModule.addListener("error", () => {
        voiceCompat.onSpeechError?.();
      });
    }
    if (!endSub) {
      endSub = nativeSpeechModule.addListener("end", () => {
        voiceCompat.onSpeechEnd?.();
      });
    }
    nativeSpeechModule.start({
      lang,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
    });
  },
  async stop() {
    nativeSpeechModule?.stop();
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

let webRecognition: WebSpeechRecognitionLike | null = null;

const webVoiceCompat: VoiceCompat = {
  async start(lang: string) {
    const webApi = globalThis as {
      webkitSpeechRecognition?: new () => WebSpeechRecognitionLike;
      SpeechRecognition?: new () => WebSpeechRecognitionLike;
    };
    const Ctor = webApi.SpeechRecognition ?? webApi.webkitSpeechRecognition;
    if (!Ctor) {
      throw new Error("Web Speech API unavailable");
    }
    webRecognition = new Ctor();
    webRecognition.lang = lang;
    webRecognition.interimResults = true;
    webRecognition.maxAlternatives = 1;
    webRecognition.continuous = false;
    webRecognition.onresult = (event) => {
      const maybeEvent = event as { results?: ArrayLike<ArrayLike<{ transcript?: string }>> };
      const first = maybeEvent.results?.[0];
      const transcript = first?.[0]?.transcript;
      if (transcript) {
        voiceStt?.onSpeechResults?.({ value: [transcript] });
      }
    };
    webRecognition.onerror = () => {
      voiceStt?.onSpeechError?.();
    };
    webRecognition.onend = () => {
      voiceStt?.onSpeechEnd?.();
    };
    webRecognition.start();
  },
  async stop() {
    webRecognition?.stop();
  },
  removeAllListeners() {
    if (!webRecognition) {
      return;
    }
    webRecognition.onresult = null;
    webRecognition.onerror = null;
    webRecognition.onend = null;
    webRecognition = null;
  },
};

export const voiceStt: VoiceCompat | null =
  Platform.OS === "web" ? webVoiceCompat : nativeSpeechModule ? voiceCompat : null;

export async function speak(text: string, locale = "hi"): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: locale,
      rate: 0.85,
      volume: 1.0,
      onDone: () => resolve(),
      onError: () => resolve(),
    });
  });
}

export function cancelSpeech(): void {
  Speech.stop();
}
