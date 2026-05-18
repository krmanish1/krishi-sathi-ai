import { useMultibandTrackVolume } from "@livekit/react-native";
import type { LocalAudioTrack, RemoteAudioTrack } from "livekit-client";
import { useMemo } from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import { amplifyAudioLevel } from "../amplifyAudioLevel";

type AudioTrack = LocalAudioTrack | RemoteAudioTrack | undefined;

type Props = {
  /** Primary track (mic while listening). */
  track: AudioTrack;
  /** Optional second track — levels are merged with max() per band. */
  secondaryTrack?: AudioTrack;
  barCount?: number;
  barColor: ColorValue;
  minBarHeight?: number;
  maxBarHeight?: number;
  barWidth?: number;
  gap?: number;
  symmetricProfile?: boolean;
  /** Boost quiet WebRTC levels into a visible range (default 4). */
  levelGain?: number;
};

const WAVE_DARK = "#1B3A28";
const WAVE_MID = "#4A7A5A";
const WAVE_LIGHT = "#A8C5B0";
const WAVE_FAINT = "#C8DDD0";

function profileWeight(i: number, barCount: number): number {
  const centre = (barCount - 1) / 2;
  const d = Math.abs(i - centre) / centre;
  return 0.35 + (1 - d) * 0.65;
}

function barColour(i: number, barCount: number, fallback: ColorValue): ColorValue {
  const d = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
  if (d < 0.15) return WAVE_DARK;
  if (d < 0.35) return WAVE_MID;
  if (d < 0.6) return WAVE_LIGHT;
  return barCount > 11 ? WAVE_FAINT : fallback;
}

function mergeBands(a: number[], b: number[], barCount: number): number[] {
  return Array.from({ length: barCount }, (_, i) => Math.max(a[i] ?? 0, b[i] ?? 0));
}

export function LiveKitMultibandBars({
  track,
  secondaryTrack,
  barCount = 11,
  barColor,
  minBarHeight = 5,
  maxBarHeight = 56,
  barWidth = 5,
  gap = 4,
  symmetricProfile = false,
  levelGain = 4,
}: Props) {
  const primaryBands = useMultibandTrackVolume(track, {
    bands: barCount,
    updateInterval: 32,
  });
  const secondaryBands = useMultibandTrackVolume(secondaryTrack, {
    bands: barCount,
    updateInterval: 32,
  });

  const magnitudes = useMemo(
    () => mergeBands(primaryBands, secondaryBands, barCount),
    [primaryBands, secondaryBands, barCount],
  );

  const idle = track == null && secondaryTrack == null;

  return (
    <View style={[styles.row, { gap, height: maxBarHeight }]}>
      {Array.from({ length: barCount }, (_, i) => {
        const raw = magnitudes[i] ?? 0;
        const weighted = symmetricProfile ? raw * profileWeight(i, barCount) : raw;
        const clamped = idle ? 0.06 : amplifyAudioLevel(weighted, levelGain);
        const h = minBarHeight + (maxBarHeight - minBarHeight) * clamped;
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: h,
                backgroundColor: symmetricProfile ? barColour(i, barCount, barColor) : barColor,
                opacity: idle ? 0.3 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  bar: {
    borderRadius: 3,
  },
});
