import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { VoiceScreen } from "@/features/voice/components/VoiceScreen";
import { useVoiceSession } from "@/features/voice";
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

  const { phase, agentJoined, muted, speakerOn, audioTracks, start, stop, toggleMute, toggleSpeaker } =
    useVoiceSession({
      farmerId,
      language: sessionLanguage,
      state: state ?? "",
      district: district ?? "",
    });

  // Auto-start when the voice tab is entered
  useEffect(() => {
    void start();
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndSession = useCallback(async () => {
    await stop();
    router.replace("/(tabs)/home");
  }, [stop, router]);

  return (
    <VoiceScreen
      phase={phase}
      agentJoined={agentJoined}
      muted={muted}
      audioTracks={audioTracks}
      language={sessionLanguage}
      onStop={handleEndSession}
      onToggleMute={toggleMute}
      speakerOn={speakerOn}
      onToggleSpeaker={toggleSpeaker}
    />
  );
}
