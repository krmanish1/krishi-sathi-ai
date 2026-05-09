import { useCallback } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthReady, useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivity } from "@/shared/network";
import { useChatSessionActions } from "@/features/chat";

/** Abort POST /conversation and leave this screen — avoids infinite spinner on flaky networks. */
const NEW_CHAT_GUARD_MS = 55_000;

/**
 * Tab target for the + action: creates a backend session then opens the hidden chat screen.
 */
export default function NewChatTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const farmerId = useFarmerId();
  const ready = useAuthReady();
  const connectivity = useConnectivity();
  const isOnline = connectivity === "online" || connectivity === "degraded";
  const { startNewSession } = useChatSessionActions({ farmerId, connectivity });

  // Tabs often stay mounted when switching away — `useLayoutEffect` only runs once, so a second
  // visit to this tab would show the spinner without calling `startNewSession`. Focus re-runs the flow.
  useFocusEffect(
    useCallback(() => {
      if (!ready) return undefined;

      let cancelled = false;
      const ac = new AbortController();

      if (!farmerId || !isOnline) {
        router.replace("/(tabs)/chats" as never);
        return undefined;
      }

      const guardTimer = setTimeout(() => {
        ac.abort();
      }, NEW_CHAT_GUARD_MS);

      void (async () => {
        try {
          await startNewSession(ac.signal);
        } finally {
          clearTimeout(guardTimer);
          if (!cancelled) router.replace("/(tabs)/chat" as never);
        }
      })();

      return () => {
        cancelled = true;
        clearTimeout(guardTimer);
        ac.abort();
      };
    }, [ready, farmerId, isOnline, router, startNewSession]),
  );

  return (
    <View className="flex-1 items-center justify-center bg-page" style={{ paddingTop: insets.top }}>
      <ActivityIndicator color="#1ed760" />
      <Text className="mt-4 px-6 text-center font-body text-sm text-ink-muted">
        {t("chat.sessionStarting")}
      </Text>
    </View>
  );
}
