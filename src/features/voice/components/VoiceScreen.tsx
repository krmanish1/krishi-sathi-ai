import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { VoiceSessionAudioTracks } from "../useVoiceSession";
import type { VoicePhase } from "../useVoiceSessionStore";
import { useVoiceSessionStore } from "../useVoiceSessionStore";
import type { Language } from "@/shared/config/constants";

// ─── Design tokens ────────────────────────────────────────────────────────────

const PAGE_BG = "#ECEAE4";
const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const PILL_BG = "#FFFFFF";
const PILL_DOT_ACTIVE = "#16A34A";
const PILL_DOT_IDLE = "#A0ADB3";
const WAVE_DARK = "#1B3A28";   // centre bars
const WAVE_MID = "#4A7A5A";    // mid bars
const WAVE_LIGHT = "#A8C5B0";  // outer bars
const WAVE_FAINT = "#C8DDD0";  // edge bars
const CTRL_BG = "#FFFFFF";
const CTRL_BORDER = "#E0E5E2";
const END_BG = "#DC2626";

// ─── Waveform ─────────────────────────────────────────────────────────────────
//
// 19 bars: symmetric mountain profile, colour darkens towards centre.
// Each bar has an independent oscillation speed so the animation looks organic.

const NUM_BARS = 19;

// Height profile 0-1 (index 0 = leftmost)
const BAR_PROFILE = [
  0.12, 0.20, 0.34, 0.52, 0.66, 0.78, 0.90, 0.96, 1.00,
  0.96,
  1.00, 0.96, 0.90, 0.78, 0.66, 0.52, 0.34, 0.20, 0.12,
] as const;

// Colour per bar — dark in the centre, fading outward
const barColour = (i: number): string => {
  const d = Math.abs(i - (NUM_BARS - 1) / 2) / ((NUM_BARS - 1) / 2); // 0=centre,1=edge
  if (d < 0.15) return WAVE_DARK;
  if (d < 0.35) return WAVE_MID;
  if (d < 0.60) return WAVE_LIGHT;
  return WAVE_FAINT;
};

const BAR_SPEEDS = Array.from({ length: NUM_BARS }, (_, i) =>
  500 + Math.abs(i - (NUM_BARS - 1) / 2) * 40 + (i % 3) * 70,
);
const BAR_PHASE_OFFSETS = Array.from({ length: NUM_BARS }, (_, i) =>
  (i * 60) % 400,
);

const MAX_BAR_H = 120;
const MIN_BAR_H = 6;

function VoiceWaveform({ active }: { active: boolean }) {
  const anims = useMemo(
    () => Array.from({ length: NUM_BARS }, () => new Animated.Value(0.1)),
    [],
  );
  const loops = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    loops.current.forEach((l) => l.stop());
    loops.current = [];

    if (!active) {
      anims.forEach((a, i) => a.setValue(((BAR_PROFILE as readonly number[])[i] ?? 0.1) * 0.18));
      return;
    }

    anims.forEach((anim, i) => {
      const peak = (BAR_PROFILE as readonly number[])[i] ?? 0.5;
      const dur = BAR_SPEEDS[i] ?? 600;
      const delay = BAR_PHASE_OFFSETS[i] ?? 0;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: peak,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: peak * 0.18,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      );
      loops.current.push(loop);
      loop.start();
    });

    return () => loops.current.forEach((l) => l.stop());
  }, [active, anims]);

  return (
    <View style={waveStyles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              backgroundColor: barColour(i),
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [MIN_BAR_H, MAX_BAR_H],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: MAX_BAR_H + 8,
    paddingHorizontal: 8,
  },
  bar: {
    width: 5,
    borderRadius: 3,
  },
});

// ─── Control button ───────────────────────────────────────────────────────────

function CtrlBtn({
  icon,
  label,
  size = 56,
  bg = CTRL_BG,
  iconColor = INK_MUTED,
  labelColor = INK_MUTED,
  onPress,
  active = false,
}: {
  icon: string;
  label: string;
  size?: number;
  bg?: string;
  iconColor?: string;
  labelColor?: string;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        ctrlStyles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
        active ? ctrlStyles.btnActive : null,
      ]}
    >
      <MaterialCommunityIcons
        name={icon as never}
        size={size > 60 ? 28 : 22}
        color={iconColor}
      />
      <Text style={[ctrlStyles.label, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const ctrlStyles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: CTRL_BORDER,
    gap: 5,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  btnActive: {
    borderColor: "rgba(220,38,38,0.35)",
    backgroundColor: "rgba(220,38,38,0.08)",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
    position: "absolute",
    bottom: -20,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export type VoiceScreenProps = {
  phase: VoicePhase;
  agentJoined: boolean;
  muted: boolean;
  speakerOn: boolean;
  audioTracks: VoiceSessionAudioTracks;
  language: Language;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
};

export function VoiceScreen({
  phase,
  muted,
  speakerOn,
  onStart,
  onStop,
  onToggleMute,
  onToggleSpeaker,
}: VoiceScreenProps) {
  const { t } = useTranslation();
  const { transcript } = useVoiceSessionStore();
  const insets = useSafeAreaInsets();

  const isActive = phase !== "idle" && phase !== "error";
  const audioActive = (phase === "listening" && !muted) || phase === "speaking";
  const isMuted = muted && phase === "listening";

  const statusText = (() => {
    switch (phase) {
      case "idle":       return t("voice.tapToStart");
      case "connecting": return "Connecting…";
      case "listening":  return muted ? "MUTED" : "AI IS LISTENING…";
      case "speaking":   return "AI IS SPEAKING…";
      case "error":      return "Session Error";
    }
  })();

  const statusDotActive = isActive && !isMuted;
  const currentTopic = transcript?.user ?? null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Status pill ──────────────────────────────────────────── */}
      <View style={styles.pillWrap}>
        <View style={styles.pill}>
          <View
            style={[
              styles.pillDot,
              { backgroundColor: statusDotActive ? PILL_DOT_ACTIVE : PILL_DOT_IDLE },
            ]}
          />
          <Text style={styles.pillText}>{statusText}</Text>
        </View>
        <Text style={styles.pillSubtitle}>Krishisath AI Voice Session</Text>
      </View>

      {/* ── Waveform — tappable when idle to start session ──────── */}
      <Pressable
        style={styles.waveArea}
        onPress={phase === "idle" ? onStart : undefined}
        accessibilityRole={phase === "idle" ? "button" : "none"}
        accessibilityLabel={phase === "idle" ? t("voice.tapToStart") : undefined}
      >
        <VoiceWaveform active={audioActive} />
        {phase === "idle" && (
          <View style={styles.idleOverlay}>
            <MaterialCommunityIcons name="microphone" size={36} color={INK_MUTED} />
          </View>
        )}
      </Pressable>

      {/* ── Current topic ────────────────────────────────────────── */}
      <View style={styles.topicSection}>
        {/* <Text style={styles.topicHeading}>{t("voice.currentTopic")}</Text> */}
        {currentTopic ? (
          <Text style={styles.topicText} numberOfLines={3}>
            {currentTopic}
          </Text>
        ) : (
          <Text style={styles.topicPlaceholder}>
            {t("voice.topicWaiting")}
          </Text>
        )}
      </View>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(insets.bottom, 28) + 12 },
        ]}
      >
        {/* Mute */}
        <View style={styles.ctrlWrap}>
          <CtrlBtn
            icon={muted ? "microphone-off" : "microphone-off"}
            label="Mute"
            onPress={onToggleMute}
            active={isMuted}
          />
        </View>

        {/* End Session */}
        <View style={styles.ctrlWrap}>
          <CtrlBtn
            icon="phone-hangup"
            label="End Session"
            size={72}
            bg={END_BG}
            iconColor="#FFFFFF"
            labelColor={END_BG}
            onPress={onStop}
          />
        </View>

        {/* Speaker */}
        <View style={styles.ctrlWrap}>
          <CtrlBtn
            icon={speakerOn ? "volume-high" : "volume-off"}
            label="Speaker"
            onPress={onToggleSpeaker}
            active={!speakerOn}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
    alignItems: "center",
  },

  // Pill
  pillWrap: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 0,
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PILL_BG,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    color: INK,
    letterSpacing: 0.5,
  },
  pillSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
  },

  // Waveform area
  waveArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
  },

  // Topic
  topicSection: {
    alignItems: "center",
    paddingHorizontal: 40,
    marginBottom: 52,
    gap: 8,
  },
  topicHeading: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: INK,
  },
  topicText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    color: INK_MUTED,
    textAlign: "center",
    lineHeight: 22,
  },
  topicPlaceholder: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.6,
  },
  idleOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.45,
  },

  // Controls row
  controls: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 40,
    paddingTop: 8,
    width: "100%",
  },
  ctrlWrap: {
    alignItems: "center",
    paddingBottom: 24,
  },
});
