import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
} from "react-native";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { VoiceWaveform } from "./VoiceWaveform";
import type { VoicePhase } from "../useVoiceSessionStore";

type Props = {
  phase: VoicePhase;
  onStart: () => void;
  onStop: () => void;
};

function PhaseIcon({ phase }: { phase: VoicePhase }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase === "listening") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase, pulseAnim]);

  if (phase === "connecting") {
    return <ActivityIndicator color="#fff" size="small" />;
  }
  if (phase === "speaking") {
    return <VoiceWaveform active color="#fff" />;
  }
  return (
    <Animated.Text
      style={[styles.micIcon, { transform: [{ scale: pulseAnim }] }]}
    >
      🎤
    </Animated.Text>
  );
}

function fabColor(phase: VoicePhase): string {
  switch (phase) {
    case "idle":       return "#2E7D32";
    case "connecting": return "#F9A825";
    case "listening":  return "#C62828";
    case "speaking":   return "#1565C0";
    case "error":      return "#616161";
  }
}

export function VoiceFAB({ phase, onStart, onStop }: Props) {
  const { t } = useTranslation();

  const handlePress = () => {
    if (phase === "idle" || phase === "error") {
      onStart();
    } else {
      onStop();
    }
  };

  const label =
    phase === "idle"         ? t("voice.start")
    : phase === "connecting" ? t("voice.connecting")
    : phase === "listening"  ? t("voice.listening")
    : phase === "speaking"   ? t("voice.speaking")
    : t("voice.start");

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.fab, { backgroundColor: fabColor(phase) }]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <PhaseIcon phase={phase} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 90,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 100,
  },
  micIcon: { fontSize: 22 },
});
