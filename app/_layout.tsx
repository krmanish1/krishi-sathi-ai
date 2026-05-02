import "../polyfills";
import "../global.css";
import { Stack } from "expo-router";
import { View } from "react-native";
import { RootProviders } from "@/shared/providers/RootProviders";
import { NetworkBanner } from "@/shared/network/NetworkBanner";
import { ServerWakingBanner } from "@/shared/api";

export default function RootLayout() {
  return (
    <RootProviders>
      <View className="flex-1">
        <NetworkBanner />
        <ServerWakingBanner />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#121212" } }}
        />
      </View>
    </RootProviders>
  );
}
