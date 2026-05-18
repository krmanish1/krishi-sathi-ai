import type { LocalAudioTrack, RemoteAudioTrack } from "livekit-client";
import { StyleSheet, View } from "react-native";
import type { VoicePhase } from "../useVoiceSessionStore";
import type { VoiceSessionAudioTracks } from "../useVoiceSession";
import { LiveKitMultibandBars } from "./LiveKitMultibandBars";

type Props = {
  phase: VoicePhase;
  muted: boolean;
  audioTracks: VoiceSessionAudioTracks;
  /** Compact strip above transcript vs large backdrop behind agent bubble. */
  variant?: "compact" | "hero";
  /**
   * Which audio drives the bars.
   * - `both`: merge mic + agent (default idle / generic)
   * - `user` | `agent`: that side only — use for separate “who is speaking” meters
   */
  audioFocus?: "user" | "agent" | "both";
};

function tracksForPhase(
  phase: VoicePhase,
  muted: boolean,
  tracks: VoiceSessionAudioTracks,
  audioFocus: "user" | "agent" | "both",
): {
  primary: LocalAudioTrack | RemoteAudioTrack | undefined;
  secondary: LocalAudioTrack | RemoteAudioTrack | undefined;
} {
  const { localMic, remoteAgent } = tracks;
  if (phase === "idle" || phase === "connecting" || phase === "error") {
    return { primary: undefined, secondary: undefined };
  }
  if (muted && phase === "listening") {
    return { primary: undefined, secondary: undefined };
  }
  if (audioFocus === "user") {
    return { primary: localMic, secondary: undefined };
  }
  if (audioFocus === "agent") {
    return { primary: remoteAgent, secondary: undefined };
  }
  return {
    primary: localMic ?? remoteAgent,
    secondary: localMic && remoteAgent ? remoteAgent : undefined,
  };
}

/** Real-time multiband visualizer driven by LiveKit mic / agent audio levels. */
export function VoiceLiveKitVisualizer({
  phase,
  muted,
  audioTracks,
  variant = "compact",
  audioFocus = "both",
}: Props) {
  const { primary, secondary } = tracksForPhase(phase, muted, audioTracks, audioFocus);
  const hero = variant === "hero";

  const barColor =
    audioFocus === "user" ? "#4A6FA8" : audioFocus === "agent" ? "#1B3A28" : "#1B3A28";

  return (
    <View style={[styles.wrap, hero ? styles.wrapHero : null]}>
      <LiveKitMultibandBars
        track={primary}
        secondaryTrack={secondary}
        barCount={hero ? 21 : 11}
        barColor={barColor}
        minBarHeight={hero ? 12 : 6}
        maxBarHeight={hero ? 132 : 44}
        barWidth={hero ? 6 : 4}
        gap={hero ? 5 : 3}
        symmetricProfile
        levelGain={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 8,
  },
  wrapHero: {
    paddingVertical: 0,
    minHeight: 200,
  },
});
