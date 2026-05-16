import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useConnectivityUi } from "@/shared/network";

/** Visible tab order — voice occupies the centre FAB slot. */
const VISIBLE_TABS = ["home", "chat", "voice", "mandi", "profile"] as const;

const CENTER_BTN_SIZE = 58;
const CENTER_BTN_RADIUS = 16;
/** How many px the centre button rises above the pill bar top. */
const CENTER_OVERFLOW = 26;

const INACTIVE_COLOR = "#8997A0";

const springCfg = { friction: 7, tension: 320, useNativeDriver: true } as const;

// ─── Side tab item ────────────────────────────────────────────────────────────

function TabItem({
  label,
  icon,
  focused,
  activeColor,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  focused: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(1));

  const spring = (to: number) =>
    Animated.spring(scale, { ...springCfg, toValue: to }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      onPressIn={() => spring(0.91)}
      onPressOut={() => spring(1)}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        {icon}
        <Text
          style={[
            styles.tabLabel,
            { color: focused ? activeColor : INACTIVE_COLOR },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Mic FAB with pulse animation ────────────────────────────────────────────

function MicFab({
  onPress,
  accessibilityLabel,
  accessibilityState,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState: object;
}) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );

    const a1 = makeLoop(ring1, 0);
    const a2 = makeLoop(ring2, 700);
    a1.start();
    a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, [ring1, ring2]);

  const ringStyle = (anim: Animated.Value) => ({
    position: "absolute" as const,
    width: CENTER_BTN_SIZE,
    height: CENTER_BTN_SIZE,
    borderRadius: CENTER_BTN_RADIUS,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.45] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.75, 0] }),
  });

  return (
    <Pressable
      pointerEvents="auto"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={styles.centerFab}
      onPress={onPress}
    >
      <Animated.View style={ringStyle(ring1)} />
      <Animated.View style={ringStyle(ring2)} />
      <MaterialCommunityIcons name="microphone" size={28} color="#FFFFFF" />
    </Pressable>
  );
}

// ─── Main tab bar ─────────────────────────────────────────────────────────────

export function KrishiTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const ui = useConnectivityUi();
  const activeColor = "#1B3A28";
  const bottomPad = Math.max(insets.bottom, 12);

  const focusedName = state.routes[state.index]?.name ?? "";

  // Voice and chat screens are full-screen — hide the tab bar
  if (focusedName === "voice" || focusedName === "chat") return null;

  /** Find a route by name from the full state routes list. */
  const findRoute = (name: string) => state.routes.find((r) => r.name === name);

  const tabRoutes = VISIBLE_TABS.map(findRoute).filter(
    (r): r is NonNullable<typeof r> => Boolean(r),
  );

  const leftRoutes = tabRoutes.slice(0, 2);   // home, chats
  const voiceRoute = findRoute("voice");
  const rightRoutes = tabRoutes.slice(3);      // mandi, profile

  const isVoiceFocused = focusedName === "voice";

  const emit = (routeName: string, routeKey: string) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    const prevented =
      typeof event === "object" &&
      event !== null &&
      "defaultPrevented" in event &&
      (event as { defaultPrevented: boolean }).defaultPrevented;
    if (!prevented) {
      navigation.navigate(routeName as never);
    }
  };

  const renderSideTab = (
    route: (typeof tabRoutes)[number],
    nameOverride?: string,
  ) => {
    const desc = descriptors[route.key];
    const focused = focusedName === route.name;
    const iconColor = focused ? activeColor : INACTIVE_COLOR;
    const label =
      typeof desc?.options.title === "string" ? desc.options.title : route.name;
    const icon = desc?.options.tabBarIcon?.({ focused, color: iconColor, size: 24 });

    return (
      <TabItem
        key={route.key}
        label={nameOverride ?? label}
        icon={icon}
        focused={focused}
        activeColor={activeColor}
        onPress={() => emit(route.name, route.key)}
      />
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: bottomPad }]}
    >
      {/* ── Pill bar ── */}
      <View pointerEvents="auto" style={styles.pillShadow}>
        <View style={styles.pill}>
          {/* Left: Home + Chat */}
          <View style={styles.side}>
            {leftRoutes.map((r) => renderSideTab(r))}
          </View>

          {/* Centre gap — floated mic button sits here */}
          <View style={{ width: CENTER_BTN_SIZE + 16 }} />

          {/* Right: Market + Account */}
          <View style={styles.side}>
            {rightRoutes.map((r) => renderSideTab(r))}
          </View>
        </View>
      </View>

      {/* ── Floating centre mic FAB ── */}
      {voiceRoute ? (
        <MicFab
          onPress={() => emit(voiceRoute.name, voiceRoute.key)}
          accessibilityLabel={descriptors[voiceRoute.key]?.options.title ?? "Voice"}
          accessibilityState={isVoiceFocused ? { selected: true } : {}}
        />
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /** Outer container — tall enough to show the FAB overflow above the pill. */
  wrapper: {
    alignSelf: "stretch",
    paddingTop: CENTER_OVERFLOW + 6,
    overflow: "visible",
    backgroundColor: "#F2EDE4",
  },

  /** Shadow host — separate from pill so Android elevation renders correctly. */
  pillShadow: {
    marginHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#001E2B",
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -2 },
      },
      android: {
        elevation: 8,
        backgroundColor: "#FFFFFF",
      },
      default: {
        shadowColor: "#001E2B",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: -2 },
      },
    }),
  },

  /** White pill bar. */
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 4,
    overflow: "hidden",
  },

  /** Left or right group of 2 tabs. */
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },

  /** Individual tab pressable. */
  tabItem: {
    flex: 1,
    alignItems: "center",
  },

  tabContent: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },

  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },

  /** Floating centre mic button — absolutely positioned over the pill gap. */
  centerFab: {
    position: "absolute",
    top: 10,
    left: "50%" as unknown as number,
    transform: [{ translateX: -(CENTER_BTN_SIZE / 2) }],
    width: CENTER_BTN_SIZE,
    height: CENTER_BTN_SIZE,
    borderRadius: CENTER_BTN_RADIUS,
    backgroundColor: "#1B3A28",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#1B3A28",
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 14,
      },
      default: {
        shadowColor: "#1B3A28",
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
});
