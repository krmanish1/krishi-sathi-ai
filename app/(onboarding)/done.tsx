import { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useOnboarding } from "@/features/onboarding/store";
import { useSyncTwin } from "@/features/onboarding";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DoneScreen() {
  const insets = useSafeAreaInsets();
  const setCompleted = useOnboarding((s) => s.setCompleted);
  const syncTwin = useSyncTwin();

  useEffect(() => {
    setCompleted(true);
    syncTwin();
    const t = setTimeout(() => {
      router.replace("/(tabs)/home");
    }, 500);
    return () => clearTimeout(t);
  }, [setCompleted, syncTwin]);

  return (
    <View
      className="bg-paper flex-1 items-center justify-center"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="h-20 w-20 items-center justify-center rounded-full bg-brand/10">
        <Text className="text-3xl text-brand" accessible={false}>
          ✓
        </Text>
      </View>
    </View>
  );
}
