import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0D631B",
        tabBarInactiveTintColor: "#78716C",
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "PlusJakartaSans_600SemiBold",
          letterSpacing: 0.6,
          textTransform: "uppercase" as const,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 96 : 88,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 24 : 12,
          backgroundColor: "rgba(255,255,255,0.96)",
          borderTopWidth: 0,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -4 },
            },
            android: { elevation: 10 },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.assistant"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mandi"
        options={{
          title: t("tabs.markets"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
