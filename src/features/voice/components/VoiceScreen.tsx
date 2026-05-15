import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { VoiceSessionAudioTracks } from "../useVoiceSession";
import type { VoicePhase } from "../useVoiceSessionStore";
import { useVoiceSessionStore } from "../useVoiceSessionStore";
import type { Language } from "@/shared/config/constants";

const V = {
  bg: "#0C1E14",
  orb: "#8DD4A6",
  orbDim: "#3B7A56",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.55)",
  card: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.09)",
  muteBg: "#1A3D28",
  muteBorder: "rgba(141,212,166,0.2)",
  muteText: "#8DD4A6",
  endBg: "#7A1515",
  endBorder: "rgba(255,100,100,0.2)",
  endText: "#FFFFFF",
};

type Props = {
  phase: VoicePhase;
  agentJoined: boolean;
  muted: boolean;
  audioTracks: VoiceSessionAudioTracks;
  language: Language;
  onStop: () => void;
  onToggleMute: () => void;
};

// Bar heights (relative 0–1) — varied natural profile
const BAR_PROFILES = [0.35, 0.65, 0.85, 1.0, 0.85, 0.65, 0.35];
// Each bar gets unique speed+phase so they look independent
const BAR_SPEEDS   = [900, 720, 550, 680, 530, 750, 880];
const BAR_OFFSETS  = [0, 180, 90, 270, 45, 225, 135];

// ── Animated equalizer bars — fully JS-driven, always works ─────────────────
function VoiceEqualizer({ active, barColor }: { active: boolean; barColor: string }) {
  const anims = useMemo(() => BAR_PROFILES.map(() => new Animated.Value(0.08)), []);
  const refs  = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    refs.current.forEach((a) => a.stop());
    refs.current = [];

    if (!active) {
      anims.forEach((a) => a.setValue(0.08));
      return;
    }

    anims.forEach((anim, i) => {
      const peak = BAR_PROFILES[i] ?? 0.5;
      const dur  = BAR_SPEEDS[i] ?? 700;
      const delay = BAR_OFFSETS[i] ?? 0;
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
            toValue: 0.12,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      );
      refs.current.push(loop);
      loop.start();
    });

    return () => refs.current.forEach((a) => a.stop());
  }, [active, anims]);

  const MAX_H = 48;
  const MIN_H = 5;

  return (
    <View style={eqStyles.row}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            eqStyles.bar,
            {
              backgroundColor: barColor,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [MIN_H, MAX_H],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const eqStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
    height: 52,
  },
  bar: {
    width: 7,
    borderRadius: 4,
  },
});

// ── Halo ring — pulses only during active audio ───────────────────────────
function HaloRing({ active }: { active: boolean }) {
  const s1 = useMemo(() => new Animated.Value(1), []);
  const s2 = useMemo(() => new Animated.Value(1), []);
  const o1 = useMemo(() => new Animated.Value(0.18), []);
  const o2 = useMemo(() => new Animated.Value(0.08), []);

  useEffect(() => {
    if (!active) {
      s1.setValue(1); s2.setValue(1); o1.setValue(0.18); o2.setValue(0.08);
      return;
    }
    const a1 = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(s1, { toValue: 1.13, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(o1, { toValue: 0.28, duration: 650, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(s1, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(o1, { toValue: 0.13, duration: 650, useNativeDriver: true }),
      ]),
    ]));
    const a2 = Animated.loop(Animated.sequence([
      Animated.delay(280),
      Animated.parallel([
        Animated.timing(s2, { toValue: 1.26, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(o2, { toValue: 0.13, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(s2, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(o2, { toValue: 0.05, duration: 800, useNativeDriver: true }),
      ]),
    ]));
    a1.start(); a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, [active, s1, s2, o1, o2]);

  return (
    <>
      <Animated.View style={[styles.haloOuter, { transform: [{ scale: s2 }], opacity: o2 }]} />
      <Animated.View style={[styles.haloInner, { transform: [{ scale: s1 }], opacity: o1 }]} />
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export function VoiceScreen({
  phase,
  agentJoined,
  muted,
  audioTracks: _audioTracks,
  language: _language,
  onStop,
  onToggleMute,
}: Props) {
  const { t } = useTranslation();
  const { transcript, errorMessage } = useVoiceSessionStore();
  const insets = useSafeAreaInsets();

  const isActive = phase !== "idle" && phase !== "error";
  // Equalizer + rings animate only when actual audio is flowing
  const audioActive = (phase === "listening" && !muted) || phase === "speaking";

  const statusLabel = (() => {
    switch (phase) {
      case "idle":       return t("voice.tapToStart");
      case "connecting": return t("voice.connectingAgent");
      case "listening":  return muted ? t("voice.muted") : t("voice.listening");
      case "speaking":   return t("voice.agentSpeaking");
      case "error":      return errorMessage ?? t("voice.error.unavailable");
    }
  })();

  const tabBarReserve = 76;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>KrishiSaathi AI</Text>
        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: isActive ? V.orb : V.orbDim }]} />
          <Text style={styles.badgeText}>{t("tabs.voice")}</Text>
        </View>
      </View>

      {/* Orb + rings */}
      <View style={styles.orbArea}>
        <View style={styles.orbStage}>
          <HaloRing active={audioActive} />
          <View style={styles.orb}>
            {phase === "connecting" ? (
              <ActivityIndicator color={V.bg} size="large" />
            ) : (
              <VoiceEqualizer active={audioActive} barColor={V.bg} />
            )}
          </View>
        </View>

        <Text style={styles.statusLabel}>{statusLabel}</Text>

        {transcript?.user && phase === "listening" && (
          <Text style={styles.quoteText} numberOfLines={3}>
            "{transcript.user}"
          </Text>
        )}
      </View>

      {/* Last topic */}
      {transcript && (
        <View style={styles.topicSection}>
          <View style={styles.topicCard}>
            <View style={styles.topicIconWrap}>
              <MaterialCommunityIcons name="history" size={20} color={V.orb} />
            </View>
            <View style={styles.topicTextWrap}>
              <Text style={styles.topicLabel}>LAST TOPIC</Text>
              <Text style={styles.topicTitle} numberOfLines={1}>{transcript.user}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 8) + tabBarReserve }]}>
        <View style={styles.dockRow}>
          <Pressable
            style={[styles.sideBtn, muted && styles.sideBtnMuted]}
            onPress={onToggleMute}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name={muted ? "microphone-off" : "microphone"}
              size={26}
              color={muted ? "#FF8080" : V.muteText}
            />
            <Text style={[styles.sideBtnLabel, muted && { color: "#FF8080" }]}>
              {muted ? t("voice.unmute").toUpperCase() : t("voice.mute").toUpperCase()}
            </Text>
          </Pressable>

          <Pressable style={styles.endBtn} onPress={onStop} accessibilityRole="button">
            <MaterialCommunityIcons name="phone-hangup" size={26} color={V.endText} />
            <Text style={styles.endBtnLabel}>END CALL</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const ORB = 152;
const HALO_I = 214;
const HALO_O = 278;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: V.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: V.text,
    letterSpacing: -0.3,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: "600", color: V.text },

  orbArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 24,
  },
  orbStage: {
    width: HALO_O + 10,
    height: HALO_O + 10,
    alignItems: "center",
    justifyContent: "center",
  },
  haloOuter: {
    position: "absolute",
    width: HALO_O,
    height: HALO_O,
    borderRadius: HALO_O / 2,
    backgroundColor: V.orb,
  },
  haloInner: {
    position: "absolute",
    width: HALO_I,
    height: HALO_I,
    borderRadius: HALO_I / 2,
    backgroundColor: V.orb,
  },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    backgroundColor: V.orb,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: V.orb, shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 14 },
    }),
  },

  statusLabel: {
    fontSize: 28,
    fontWeight: "700",
    color: V.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  quoteText: {
    fontSize: 15,
    color: V.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 22,
  },

  topicSection: { paddingHorizontal: 16, marginBottom: 10 },
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: V.card,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: V.cardBorder,
  },
  topicIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(141,212,166,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  topicTextWrap: { flex: 1 },
  topicLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: V.textMuted,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  topicTitle: { fontSize: 15, fontWeight: "600", color: V.text },

  dock: {
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  dockRow: {
    flexDirection: "row",
    gap: 12,
  },
  sideBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: V.muteBg,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: V.muteBorder,
    minHeight: 76,
  },
  sideBtnMuted: {
    backgroundColor: "rgba(255,60,60,0.1)",
    borderColor: "rgba(255,80,80,0.3)",
  },
  sideBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: V.muteText,
    letterSpacing: 0.8,
  },
  endBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: V.endBg,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: V.endBorder,
    minHeight: 76,
  },
  endBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: V.endText,
    letterSpacing: 0.8,
  },
});
