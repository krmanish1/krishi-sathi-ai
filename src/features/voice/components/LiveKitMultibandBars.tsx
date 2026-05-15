import { useMultibandTrackVolume } from "@livekit/react-native";
import type { LocalAudioTrack, RemoteAudioTrack } from "livekit-client";
import { StyleSheet, View, type ColorValue } from "react-native";

type Props = {
  /** LiveKit mic / playback track — same source as official `BarVisualizer` / multiband processor. */
  track: LocalAudioTrack | RemoteAudioTrack | undefined;
  barCount?: number;
  barColor: ColorValue;
  minBarHeight?: number;
  maxBarHeight?: number;
  barWidth?: number;
  gap?: number;
};

/**
 * Real-time frequency-band levels from the native LiveKit multiband volume processor
 * (`useMultibandTrackVolume`). This is the React Native equivalent of wiring
 * [`BarVisualizer`](https://github.com/livekit/client-sdk-react-native) to a `trackRef`.
 */
export function LiveKitMultibandBars({
  track,
  barCount = 11,
  barColor,
  minBarHeight = 5,
  maxBarHeight = 56,
  barWidth = 5,
  gap = 4,
}: Props) {
  const magnitudes = useMultibandTrackVolume(track, {
    bands: barCount,
    updateInterval: 48,
  });

  return (
    <View style={[styles.row, { gap, height: maxBarHeight }]}>
      {Array.from({ length: barCount }, (_, i) => {
        const raw = magnitudes[i] ?? 0;
        const clamped = Math.min(1, Math.max(0, raw));
        const h = minBarHeight + (maxBarHeight - minBarHeight) * clamped;
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: h,
                backgroundColor: barColor,
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
