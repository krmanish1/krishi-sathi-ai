import { type ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

type Props = {
  headline: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** e.g. back button — pinned to top safe area, does not scroll with the form */
  topAccessory?: ReactNode;
};

/** Non-interactive visuals so the upper screen never reads as “blank”. */
function AuthAtmosphere({ insetTop }: { insetTop: number }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const ringSize = Math.min(width * 0.92, 340);
  const innerSize = ringSize * 0.72;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={["#0f1a12", "#121a14", "#121212", "#121212"]}
        locations={[0, 0.22, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.glowBlob, { top: -40, right: width * 0.15 }]} />
      <View style={[styles.glowBlob, styles.glowBlobMuted, { top: 80, left: -60 }]} />
      <View style={[styles.glowBlobSmall, { top: insetTop + 140, left: "50%", marginLeft: -60 }]} />

      {/* Centered orbit rings — nested so layout stays aligned */}
      <View style={[styles.orbitWrap, { top: insetTop + 24 }]}>
        <View
          style={[
            styles.orbitOuterDisk,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
            },
          ]}
        >
          <View
            style={[
              styles.orbitInnerDisk,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
              },
            ]}
          />
        </View>
      </View>

      <Text
        style={[styles.watermark, { top: insetTop + 48 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.2}
      >
        {t("app.name")}
      </Text>

      <View style={[styles.decorStrip, { top: insetTop + 24 + ringSize * 0.38 }]}>
        {[
          { name: "sprout" as const },
          { name: "weather-partly-cloudy" as const },
          { name: "chart-line" as const },
        ].map(({ name }) => (
          <View key={name} style={styles.decorIconBubble}>
            <MaterialCommunityIcons name={name} size={22} color="rgba(30,215,96,0.35)" />
          </View>
        ))}
      </View>
    </View>
  );
}

export function AuthScreenLayout({ headline, subtitle, children, footer, topAccessory }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <AuthAtmosphere insetTop={insets.top} />

      {topAccessory ? (
        <View style={[styles.topAccessoryWrap, { paddingTop: insets.top + 6 }]}>{topAccessory}</View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 10) + 8,
            paddingHorizontal: 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cluster}>
          <View style={styles.brand}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <MaterialCommunityIcons name="sprout" size={32} color="#1ed760" />
              </View>
            </View>
            <Text
              className="mt-5 text-center font-display text-[26px] leading-8 tracking-tight text-ink"
              accessibilityRole="header"
            >
              {headline}
            </Text>
            <Text className="mt-2 max-w-[340px] text-center font-body text-[15px] leading-[22px] text-ink-muted">
              {subtitle}
            </Text>
          </View>

          <View style={styles.form}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#121212",
  },
  glowBlob: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#1ed760",
    opacity: 0.07,
  },
  glowBlobMuted: {
    opacity: 0.045,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  glowBlobSmall: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1ed760",
    opacity: 0.05,
  },
  orbitWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  orbitOuterDisk: {
    borderWidth: 1,
    borderColor: "rgba(30, 215, 96, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  orbitInnerDisk: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  watermark: {
    position: "absolute",
    left: 20,
    right: 20,
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.05)",
    letterSpacing: 0.5,
  },
  decorStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  decorIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  topAccessoryWrap: {
    position: "absolute",
    left: 20,
    zIndex: 2,
  },
  cluster: {
    width: "100%",
  },
  brand: {
    alignItems: "center",
    marginBottom: 22,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#1ed760",
    padding: 3,
    shadowColor: "#1ed760",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  logoInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: "#14532d",
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    width: "100%",
  },
  footer: {
    marginTop: 18,
    alignItems: "center",
  },
});
