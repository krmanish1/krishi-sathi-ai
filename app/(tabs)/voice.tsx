import { useCallback, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { VoiceScreen } from "@/features/voice/components/VoiceScreen";
import { useVoiceSession, useVoiceSessionStore } from "@/features/voice";
import { useFarmerId } from "@/shared/auth";
import { useOnboarding } from "@/features/onboarding";
import type { Language } from "@/shared/config/constants";
import { SUPPORTED_LANGUAGES } from "@/shared/config/constants";
import { useTranslation } from "react-i18next";

export default function VoiceTab() {
  const router = useRouter();
  const farmerId = useFarmerId() ?? "";
  const { state, district, language } = useOnboarding();
  const { i18n } = useTranslation();

  const i18nBase = i18n.language?.split("-")[0] as Language | undefined;
  const onboardingLang = language as Language | null;
  const defaultLang: Language =
    onboardingLang ??
    (SUPPORTED_LANGUAGES.includes(i18nBase as Language) ? (i18nBase as Language) : "en");

  const [sessionLanguage] = useState<Language>(defaultLang);

  const { phase, muted, speakerOn, start, stop, toggleMute, toggleSpeaker, stopping } =
    useVoiceSession({
      farmerId,
      language: sessionLanguage,
      state: state ?? "",
      district: district ?? "",
    });

  // Start/stop only on tab focus/blur — not when start/stop callback identity changes.
  // Assigning ref.current during render is the standard stale-closure workaround here.
  const startRef = useRef(start);
  const stopRef = useRef(stop);
  // eslint-disable-next-line react-hooks/refs
  startRef.current = start;
  // eslint-disable-next-line react-hooks/refs
  stopRef.current = stop;

  // Start once when opening the voice tab; stay connected until "End Session" (no stop on tab blur).
  useFocusEffect(
    useCallback(() => {
      if (useVoiceSessionStore.getState().phase === "idle") {
        void startRef.current();
      }
    }, []),
  );

  const handleEndSession = useCallback(async () => {
    await stop();
    router.replace("/(tabs)/home");
  }, [stop, router]);

  return (
    <VoiceScreen
      phase={phase}
      muted={muted}
      language={sessionLanguage}
      onStart={start}
      onStop={handleEndSession}
      onToggleMute={toggleMute}
      speakerOn={speakerOn}
      onToggleSpeaker={toggleSpeaker}
      stopping={stopping}
    />
  );
}
