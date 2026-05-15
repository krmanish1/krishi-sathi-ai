import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useConnectivityUi } from "@/shared/network";
import { hexToRgba } from "@/shared/utils";
import { theme } from "@/shared/ui/theme/tokens";

/** Left-to-right order — each gets equal column width for even gaps. */
const TAB_ORDER = ["home", "chats", "voice", "new-chat", "mandi", "profile"] as const;

const SIDE_ICON = 26;

const INACTIVE = "rgba(255,255,255,0.42)";

const springPress = {
  friction: 7,
  tension: 320,
  useNativeDriver: true,
} as const;

function orderedTabRoutes(
  order: readonly string[],
  routes: BottomTabBarProps["state"]["routes"],
) {
  return order
    .map((n) => routes.find((r) => r.name === n))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
}

function SideTabButton({
  route,
  isFocused,
  options,
  onPress,
  onLongPress,
  activeAccent,
}: {
  route: BottomTabBarProps["state"]["routes"][number];
  isFocused: boolean;
  options: BottomTabBarProps["descriptors"][string]["options"];
  onPress: () => void;
  onLongPress: () => void;
  activeAccent: string;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const color = isFocused ? activeAccent : INACTIVE;
  const labelText = typeof options.title === "string" ? options.title : route.name;

  const icon = options.tabBarIcon?.({
    focused: isFocused,
    color,
    size: SIDE_ICON,
  });

  const runSpring = (to: number) => {
    Animated.spring(scale, { ...springPress, toValue: to }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={labelText}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => runSpring(0.92)}
      onPressOut={() => runSpring(1)}
    >
      <Animated.View style={[styles.sideTab, { transform: [{ scale }] }]}>
        <View
          style={[
            styles.iconSlot,
            isFocused
              ? {
                  backgroundColor: hexToRgba(activeAccent, 0.08),
                  borderColor: hexToRgba(activeAccent, 0.55),
                  borderWidth: StyleSheet.hairlineWidth,
                }
              : styles.iconSlotIdle,
          ]}
        >
          {icon}
        </View>
        <Text
          style={[styles.label, isFocused ? { color: activeAccent, opacity: 1 } : styles.labelIdle]}
          numberOfLines={1}
        >
          {labelText}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function KrishiTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const ui = useConnectivityUi();
  const activeAccent = ui.headerAccentHex;
  const visibleRoutes = useMemo(
    () => state.routes.filter((r) => r.name !== "chat"),
    [state.routes],
  );

  const tabRoutes = useMemo(
    () => orderedTabRoutes(TAB_ORDER, visibleRoutes),
    [visibleRoutes],
  );

  const focusedRouteName = state.routes[state.index]?.name;

  const emitTabPress = (route: BottomTabBarProps["state"]["routes"][number]) => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    const prevented =
      typeof event === "object" &&
      event !== null &&
      "defaultPrevented" in event &&
      (event as { defaultPrevented: boolean }).defaultPrevented;
    if (!prevented) {
      navigation.navigate(route.name as never);
    }
  };

  const emitTabLongPress = (route: BottomTabBarProps["state"]["routes"][number]) => {
    navigation.emit({
      type: "tabLongPress",
      target: route.key,
    });
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.barTrack} pointerEvents="box-none">
        <View style={styles.barShadow}>
          <View style={styles.bar}>
            <View style={styles.row}>
              {tabRoutes.map((route) => {
                const desc = descriptors[route.key];
                if (!desc) return null;
                const isFocused =
                  route.name === "new-chat"
                    ? focusedRouteName === "new-chat" || focusedRouteName === "chat"
                    : focusedRouteName === route.name;
                return (
                  <View key={route.key} style={styles.tabCell}>
                    <SideTabButton
                      route={route}
                      isFocused={isFocused}
                      options={desc.options}
                      onPress={() => emitTabPress(route)}
                      onLongPress={() => emitTabLongPress(route)}
                      activeAccent={activeAccent}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent",
    alignSelf: "stretch",
    width: "100%",
  },
  barTrack: {
    alignSelf: "stretch",
    width: "100%",
  },
  barShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
      android: {
        elevation: 12,
      },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
      },
    }),
  },
  bar: {
    backgroundColor: theme.surface,
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 12,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  tabCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  sideTab: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 88,
    paddingVertical: 2,
    gap: 5,
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  iconSlotIdle: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.55,
    textTransform: "uppercase",
    maxWidth: 64,
    textAlign: "center",
  },
  labelIdle: {
    color: INACTIVE,
  },
});
