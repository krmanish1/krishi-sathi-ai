import { useCallback } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthReady, useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivityUi } from "@/shared/network";
import {
  CHAT_THREAD_QUERY_KEY,
  MAIN_THREAD_ID,
  clearThread,
  useChatSessionActions,
  useChatStore,
} from "@/features/chat";

/** Abort POST /conversation and leave this screen — avoids infinite spinner on flaky networks. */
const NEW_CHAT_GUARD_MS = 55_000;

/**
 * Tab target for the + action: creates a backend session when online, or a fresh local session
 * when offline and the on-device model is ready, then opens the hidden chat screen.
 */
export default function NewChatTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const farmerId = useFarmerId();
  const ready = useAuthReady();
  const qc = useQueryClient();
  const ui = useConnectivityUi();
  const connectivity = ui.apiConnectivity;
  const { startNewSession } = useChatSessionActions({ farmerId, connectivity });

  // Tabs often stay mounted when switching away — focus re-runs the flow each visit.
  useFocusEffect(
    useCallback(() => {
      if (!ready) return undefined;

      let cancelled = false;

      if (!farmerId) {
        router.replace("/(tabs)/chats" as never);
        return undefined;
      }

      // Offline + on-device model: no backend session; use local "main" thread (askAgent → Gemma).
      if (!ui.backendReachable) {
        if (!ui.onDeviceModelReady) {
          router.replace("/(tabs)/chats" as never);
          return undefined;
        }
        void (async () => {
          try {
            useChatStore.getState().resetConversation();
            await clearThread(MAIN_THREAD_ID);
            await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID) });
          } finally {
            if (!cancelled) router.replace("/(tabs)/chat" as never);
          }
        })();
        return () => {
          cancelled = true;
        };
      }

      const ac = new AbortController();
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
    }, [ready, farmerId, ui.backendReachable, ui.onDeviceModelReady, router, startNewSession, qc]),
  );

  return (
    <View className="flex-1 items-center justify-center bg-page" style={{ paddingTop: insets.top }}>
      <ActivityIndicator color={ui.accentHex} />
      <Text className="mt-4 px-6 text-center font-body text-sm text-ink-muted">
        {t(`chat.${ui.newChatLoadingKey}`)}
      </Text>
    </View>
  );
}
