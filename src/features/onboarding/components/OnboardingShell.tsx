import { type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  /** Primary actions pinned above home indicator */
  footer?: ReactNode;
  /** 1-based step */
  step: number;
  totalSteps?: number;
};

/**
 * Shared onboarding chrome: dark-green gradient, soft glows, step progress.
 */
export function OnboardingShell({ children, footer, step, totalSteps = 5 }: Props) {
  const insets = useSafeAreaInsets();
  const idx = Math.min(Math.max(step, 1), totalSteps);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0f1a12", "#141914", "#121212"]}
        locations={[0, 0.28, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.blob, styles.blobTR]} />
      <View style={[styles.blob, styles.blobMuted, styles.blobBL]} />

      <View style={[styles.main, { paddingTop: insets.top + 8 }]}>
        <View style={styles.progressTrack}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={String(i)}
              style={[styles.progressSeg, i < idx ? styles.progressSegOn : styles.progressSegOff]}
            />
          ))}
        </View>

        <View style={styles.body}>{children}</View>
      </View>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#121212",
  },
  blob: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#1ed760",
    opacity: 0.065,
  },
  blobMuted: {
    opacity: 0.04,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  blobTR: {
    top: -40,
    right: -50,
  },
  blobBL: {
    bottom: 120,
    left: -70,
  },
  main: {
    flex: 1,
    paddingHorizontal: 22,
  },
  progressTrack: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 18,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  progressSegOn: {
    backgroundColor: "#1ed760",
  },
  progressSegOff: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  body: {
    flex: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 22,
    paddingTop: 14,
    backgroundColor: "rgba(18,18,18,0.94)",
  },
});
