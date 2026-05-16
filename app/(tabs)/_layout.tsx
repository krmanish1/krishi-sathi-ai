import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { KrishiTabBar } from "@/shared/ui/primitives/KrishiTabBar";
import { useConnectivityUi } from "@/shared/network";

export default function TabsLayout() {
  const { t } = useTranslation();
  const ui = useConnectivityUi();

  return (
    <Tabs
      safeAreaInsets={{ left: 0, right: 0 }}
      tabBar={(props) => <KrishiTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ui.headerAccentHex,
        tabBarInactiveTintColor: "#8997A0",
        tabBarShowLabel: true,
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.chats"),
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={focused ? "message" : "message-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: t("tabs.voice"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="microphone" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mandi"
        options={{
          title: t("tabs.markets"),
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={focused ? "storefront" : "storefront-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={focused ? "account" : "account-outline"} size={size} color={color} />
          ),
        }}
      />

      {/* ── Hidden routes (no tab button rendered) ── */}
      <Tabs.Screen name="chats" options={{ href: null }} />
      <Tabs.Screen name="new-chat" options={{ href: null }} />
    </Tabs>
  );
}
