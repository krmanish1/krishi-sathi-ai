import "../global.css";
import { Stack } from "expo-router";
import { View } from "react-native";
import { RootProviders } from "@/shared/providers/RootProviders";
import { NetworkBanner } from "@/shared/network/NetworkBanner";

export default function RootLayout() {
  return (
    <RootProviders>
      <View className="flex-1">
        <NetworkBanner />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F9F9F9" } }}
        />
      </View>
    </RootProviders>
  );
}
