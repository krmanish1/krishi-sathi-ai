import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type Props = {
  active: boolean;
  color?: string;
};

const BAR_COUNT = 5;
const BAR_WIDTH = 4;
const BAR_MAX_HEIGHT = 24;
const BAR_MIN_HEIGHT = 6;
const ANIMATION_DURATION = 500;

export function VoiceWaveform({ active, color = "#4CAF50" }: Props) {
  const animations = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN_HEIGHT)),
  ).current;

  useEffect(() => {
    if (!active) {
      animations.forEach((a) => a.setValue(BAR_MIN_HEIGHT));
      return;
    }
    const loops = animations.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.timing(anim, {
            toValue: BAR_MAX_HEIGHT,
            duration: ANIMATION_DURATION,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: BAR_MIN_HEIGHT,
            duration: ANIMATION_DURATION,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, animations]);

  return (
    <View style={styles.container}>
      {animations.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { height: anim, backgroundColor: color, marginHorizontal: 2 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: BAR_MAX_HEIGHT,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 2,
  },
});
