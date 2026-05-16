import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { voiceStt, speak as speakFn, cancelSpeech as cancelSpeechFn } from "./voiceClient";

export type UseVoiceReturn = {
  listening: boolean;
  speaking: boolean;
  startListening: (locale?: string) => Promise<void>;
  stopListening: () => Promise<void>;
  speak: (text: string, locale?: string) => Promise<void>;
  cancelSpeech: () => void;
};

const DEFAULT_SILENCE_TIMEOUT_MS = 30_000;

export function useVoice(opts?: {
  silenceTimeoutMs?: number;
  onSpeechResult?: (text: string) => void;
}): UseVoiceReturn {
  const silenceTimeoutMs = opts?.silenceTimeoutMs ?? DEFAULT_SILENCE_TIMEOUT_MS;
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSpeechResultRef = useRef(opts?.onSpeechResult);
  useLayoutEffect(() => {
    onSpeechResultRef.current = opts?.onSpeechResult;
  });

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      setListening(false);
      voiceStt?.stop().catch(() => undefined);
    }, silenceTimeoutMs);
  }, [silenceTimeoutMs]);

  const lastResultRef = useRef<string | null>(null);

  useEffect(() => {
    if (!voiceStt) return;
    voiceStt.onSpeechResults = (e) => {
      const v = e.value?.[0];
      if (v) {
        lastResultRef.current = v;
        resetSilenceTimer();
      }
    };
    voiceStt.onSpeechError = () => setListening(false);
    voiceStt.onSpeechEnd = () => {
      setListening(false);
      const final = lastResultRef.current;
      lastResultRef.current = null;
      if (final) onSpeechResultRef.current?.(final);
    };
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      voiceStt?.removeAllListeners();
    };
  }, [resetSilenceTimer]);

  const startListening = useCallback(
    async (locale = "hi-IN") => {
      if (!voiceStt) return;
      try {
        setListening(true);
        await voiceStt.start(locale);
        resetSilenceTimer();
      } catch {
        setListening(false);
      }
    },
    [resetSilenceTimer],
  );

  const stopListening = useCallback(async () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setListening(false);
    await voiceStt?.stop().catch(() => undefined);
  }, []);

  const speak = useCallback(async (text: string, locale?: string) => {
    setSpeaking(true);
    try {
      await speakFn(text, locale ?? "hi");
    } finally {
      setSpeaking(false);
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    cancelSpeechFn();
    setSpeaking(false);
  }, []);

  return { listening, speaking, startListening, stopListening, speak, cancelSpeech };
}
