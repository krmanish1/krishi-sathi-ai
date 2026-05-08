import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";

export function OnboardingScreen() {
  useEffect(() => {
    router.replace("/(onboarding)/welcome");
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-page">
      <ActivityIndicator size="large" color="#1ed760" />
      <Text className="mt-3 text-sm text-text-muted">Loading onboarding...</Text>
    </View>
  );
}
