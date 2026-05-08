import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Platform } from "react-native";
import { CustomTabBar } from "./CustomTabBar";
import type { MainTabParamList } from "@/types/RootStackParamList";
import { HomeScreen } from "@/screen/HomeScreen";
import { ChatListScreen } from "@/screen/ChatListScreen";
import { MandiScreen } from "@/screen/MandiScreen";
import { ProfileScreen } from "@/screen/ProfileScreen";
import { ChatScreen } from "@/screen/ChatScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function WithAuthScreens() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1ed760",
        tabBarInactiveTintColor: "#8e8e8e",
        tabBarShowLabel: true,
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          paddingTop: 0,
          paddingBottom: 0,
          ...Platform.select({
            ios: {
              shadowOpacity: 0,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 0 },
            },
            default: {},
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "PlusJakartaSans_600SemiBold",
          letterSpacing: 0.85,
          textTransform: "uppercase" as const,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          title: t("tabs.chats"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="NewChat"
        component={ChatScreen}
        options={{
          title: t("tabs.newChat"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="plus-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Mandi"
        component={MandiScreen}
        options={{
          title: t("tabs.markets"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tab.Navigator>
  );
}
