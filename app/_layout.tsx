import "reflect-metadata";
import "../polyfills";
import "../global.css";
import { Stack } from "expo-router";
import { View } from "react-native";
import { RootProviders } from "@/shared/providers/RootProviders";
import { ServerWakingBanner } from "@/shared/api";

export default function RootLayout() {
  return (
    <RootProviders>
      <View className="flex-1">
        <ServerWakingBanner />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
        />
      </View>
    </RootProviders>
  );
}
