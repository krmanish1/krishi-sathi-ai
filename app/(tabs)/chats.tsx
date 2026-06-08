import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuthReady, useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivityUi, NetworkBanner } from "@/shared/network";
import {
  useChatStore,
  useFarmerConversations,
  useChatSessionActions,
} from "@/features/chat";
import type { Conversation } from "@/shared/api/types";

export default function ChatsListScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const farmerId = useFarmerId();
  const ready = useAuthReady();
  const ui = useConnectivityUi();
  const connectivity = ui.apiConnectivity;
  const conversationId = useChatStore((s) => s.conversationId);

  const { openSession, deleteSession } = useChatSessionActions({
    farmerId,
    connectivity,
  });
  const {
    data: sessionsRaw = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
    isRefetching: sessionsRefetching,
  } = useFarmerConversations({ farmerId, connectivity });

  const sessions = useMemo(() => {
    return [...sessionsRaw].sort((a, b) =>
      String(b.updated_at).localeCompare(String(a.updated_at)),
    );
  }, [sessionsRaw]);

  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const formatSessionDate = useCallback(
    (iso: string) => {
      try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        const loc = i18n.language?.startsWith("hi") ? "hi-IN" : "en-IN";
        return d.toLocaleString(loc, { dateStyle: "medium", timeStyle: "short" });
      } catch {
        return "";
      }
    },
    [i18n.language],
  );

  const onPickSession = useCallback(
    (c: Conversation) => {
      void openSession(c.conversation_id);
      router.push("/(tabs)/chat" as never);
    },
    [openSession, router],
  );

  const confirmDeleteSession = useCallback(
    (item: Conversation) => {
      const label = item.title?.trim() || t("chat.sessionUntitled");
      Alert.alert(t("chat.deleteSessionTitle"), t("chat.deleteSessionMessage", { title: label }), [
        { text: t("chat.deleteSessionCancel"), style: "cancel" },
        {
          text: t("chat.deleteSessionConfirm"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeletingSessionId(item.conversation_id);
              try {
                await deleteSession(item.conversation_id);
              } catch {
                Alert.alert(
                  t("chat.deleteSessionFailedTitle"),
                  t("chat.deleteSessionFailedBody"),
                );
              } finally {
                setDeletingSessionId(null);
              }
            })();
          },
        },
      ]);
    },
    [t, deleteSession],
  );

  if (!ready) {
    return (
      <View
        className="flex-1 items-center justify-center bg-page"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator color={ui.accentHex} />
      </View>
    );
  }

  if (!farmerId) {
    return (
      <View
        className="flex-1 items-center justify-center bg-page px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-ink-muted">{t("errors.farmerMissing")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View
        className="border-b border-border/60 px-4 py-3"
        style={{ backgroundColor: ui.chatsHeaderSurfaceHex }}
      >
        <Text className="font-display text-lg text-title-green">{t("chat.sessionsTitle")}</Text>
        <Text className="mt-1 font-body text-xs text-ink-muted">{t("chat.listTabSubtitle")}</Text>
      </View>
      <NetworkBanner />

      {!ui.backendReachable ? (
        ui.onDeviceModelReady ? (
          <View className="flex-1 justify-center px-6 py-10">
            <MaterialCommunityIcons name="wifi-off" size={36} color="#6b7280" style={{ alignSelf: "center" }} />
            <Text className="mt-4 text-center font-body text-sm leading-5 text-ink-muted">
              {t("chat.sessionsOfflineWithModel")}
            </Text>
            <Text className="mt-3 text-center font-body text-xs leading-5 text-ink-muted/90">
              {t("chat.offlineSessionsFootnote")}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-6 min-h-[48px] items-center justify-center rounded-xl bg-brand px-6 py-3 active:opacity-90"
              onPress={() => router.push("/(tabs)/chat" as never)}
            >
              <Text className="font-body-semibold text-base text-black">{t("chat.openOfflineChat")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="mt-3 min-h-[48px] items-center justify-center rounded-xl border border-border-light bg-muted px-6 py-3 active:opacity-90"
              onPress={() => router.push("/(tabs)/new-chat" as never)}
            >
              <Text className="font-body-semibold text-base text-ink">{t("chat.startNewOfflineChat")}</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="px-4 py-6 text-center font-body text-ink-muted">
            {t("chat.sessionsOffline")}
          </Text>
        )
      ) : sessionsLoading && sessions.length === 0 ? (
        <View className="items-center py-16">
          <ActivityIndicator color={ui.accentHex} />
        </View>
      ) : sessions.length === 0 ? (
        <View className="items-center px-6 py-12">
          <MaterialCommunityIcons name="message-text-outline" size={40} color="#6b7280" />
          <Text className="mt-4 text-center font-body text-ink-muted">{t("chat.sessionsEmpty")}</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(c) => c.conversation_id}
          contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={sessionsRefetching}
              onRefresh={() => void refetchSessions()}
              tintColor={ui.accentHex}
            />
          }
          renderItem={({ item }) => {
            const active = item.conversation_id === conversationId;
            const busyRow = deletingSessionId === item.conversation_id;
            return (
              <View
                style={{
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 12,
                  backgroundColor: active ? "#E3FCF7" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: active ? ui.headerAccentHex : "#E8EDEB",
                  overflow: "hidden",
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onPickSession(item)}
                  disabled={busyRow}
                  style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 14 }}
                >
                  <Text className="font-body-semibold text-base text-ink" numberOfLines={2}>
                    {item.title?.trim() || t("chat.sessionUntitled")}
                  </Text>
                  <Text className="mt-1 font-body text-xs text-ink-muted">
                    {formatSessionDate(item.updated_at)}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("chat.deleteSessionA11y")}
                  onPress={() => confirmDeleteSession(item)}
                  disabled={busyRow || !!deletingSessionId}
                  style={{ paddingHorizontal: 14, paddingVertical: 14 }}
                  hitSlop={6}
                >
                  {busyRow ? (
                    <ActivityIndicator size="small" color="#ff6b6b" />
                  ) : (
                    <MaterialCommunityIcons name="delete-outline" size={22} color="#ff6b6b" />
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
