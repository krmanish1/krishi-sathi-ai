import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { greetingFirstName } from "@/features/twin";

const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const SIDEBAR_WIDTH_RATIO = 0.82;

// ─── SidebarDrawer ────────────────────────────────────────────────────────────

export function SidebarDrawer({
  open,
  onClose,
  displayName,
  district,
  state,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  district: string;
  state: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sidebarW = width * SIDEBAR_WIDTH_RATIO;

  const [translateX] = useState(() => new Animated.Value(-sidebarW));
  const [backdropOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 280,
          friction: 26,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -sidebarW,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open, sidebarW, translateX, backdropOpacity]);

  const avatarLetter = (() => {
    const first = greetingFirstName(displayName);
    return first ? first.charAt(0).toUpperCase() : "K";
  })();

  const navigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as never), 250);
  };

  const MENU_ITEMS = [
    {
      key: "profile",
      label: t("sidebar.profile"),
      icon: "account-outline" as const,
      route: "/(tabs)/profile",
    },
    {
      key: "settings",
      label: t("sidebar.settings"),
      icon: "cog-outline" as const,
      route: "/settings",
    },
    {
      key: "farmSettings",
      label: t("sidebar.farmSettings"),
      icon: "tractor" as const,
      route: "/farm-settings",
    },
    {
      key: "soilHistory",
      label: t("sidebar.soilHistory"),
      icon: "layers-outline" as const,
      route: "/soil-history",
    },
    {
      key: "expertSupport",
      label: t("sidebar.expertSupport"),
      icon: "headset" as const,
      route: "/expert-support",
    },
  ] as const;

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.38)", opacity: backdropOpacity },
          ]}
          pointerEvents={open ? "auto" : "none"}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        {/* Sliding panel */}
        <Animated.View
          style={[
            styles.panel,
            {
              width: sidebarW,
              paddingTop: insets.top + 28,
              paddingBottom: insets.bottom + 20,
              transform: [{ translateX }],
            },
          ]}
          pointerEvents="auto"
        >
          {/* User avatar */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>

          {/* Name + location */}
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          {district && state ? (
            <Text style={styles.userLocation}>
              Village: {district}, {state}
            </Text>
          ) : null}

          {/* Premium badge */}
          <View style={styles.premiumBadge}>
            <MaterialCommunityIcons
              name="shield-star-outline"
              size={13}
              color="#D97706"
            />
            <Text style={styles.premiumText}>
              {t("sidebar.premiumMember")}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Menu items */}
          {MENU_ITEMS.map((item, idx) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => navigate(item.route)}
              style={[
                styles.menuItem,
                idx === 0 ? styles.menuItemActive : null,
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={idx === 0 ? "#D97706" : INK_MUTED}
              />
              <Text
                style={[
                  styles.menuLabel,
                  idx === 0 ? styles.menuLabelActive : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    shadowColor: "#001E2B",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#001E2B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarLetter: {
    fontSize: 26,
    fontWeight: "700",
    color: "#00ED64",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: INK,
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 13,
    color: INK_MUTED,
    marginBottom: 14,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: "#D97706",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 22,
  },
  premiumText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E8EDEB",
    marginBottom: 18,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: "#FCDDB5",
  },
  menuLabel: {
    fontSize: 16,
    color: INK_MUTED,
  },
  menuLabelActive: {
    fontWeight: "600",
    color: "#92400E",
  },
});
