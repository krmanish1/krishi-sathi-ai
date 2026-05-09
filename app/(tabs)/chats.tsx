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
import { useConnectivity } from "@/shared/network";
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
  const connectivity = useConnectivity();
  const isOnline = connectivity === "online" || connectivity === "degraded";
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
        <ActivityIndicator color="#1ed760" />
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
      <View className="border-b border-border/60 bg-card px-4 py-3">
        <Text className="font-display text-lg text-title-green">{t("chat.sessionsTitle")}</Text>
        <Text className="mt-1 font-body text-xs text-ink-muted">{t("chat.listTabSubtitle")}</Text>
      </View>

      {!isOnline ? (
        <Text className="px-4 py-6 text-center font-body text-ink-muted">
          {t("chat.sessionsOffline")}
        </Text>
      ) : sessionsLoading && sessions.length === 0 ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#1ed760" />
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
              tintColor="#1ed760"
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
                  backgroundColor: active ? "#1a3d24" : "#1f1f1f",
                  borderWidth: 1,
                  borderColor: active ? "#1ed760" : "#333",
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
