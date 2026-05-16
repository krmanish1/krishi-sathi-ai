import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Image,
  RefreshControl,
  Modal,
  Animated,
  useWindowDimensions,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useOnboarding } from "@/features/onboarding/store";
import { useAuthReady, useFarmerId } from "@/shared/auth";
import { useConnectivityUi } from "@/shared/network";
import {
  useChatThread,
  useSendChatMessage,
  useStreamChatMessage,
  useConversation,
  useChatStore,
  useFarmerConversations,
  useChatSessionActions,
  applyConversationHistoryPayloadToLocalThread,
  CHAT_THREAD_QUERY_KEY,
  CONVERSATION_HISTORY_QUERY_KEY,
  MAIN_THREAD_ID,
  StreamingStatusBox,
  CONFIDENCE_THRESHOLD_LOW,
  useImageAttachment,
  guessImagePurpose,
} from "@/features/chat";
import { getConversationHistory } from "@/shared/api";
import type { ChatMessageRow, SendQueryInput } from "@/features/chat";
import type { Conversation } from "@/shared/api/types";
import { useVoice } from "@/shared/voice";
import type { Language } from "@/shared/config/constants";

const mdStyles = StyleSheet.create({
  body: { color: "#001E2B", fontSize: 15, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: 4 },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  strong: { fontWeight: "700", color: "#001E2B" },
  em: { fontStyle: "italic", color: "#5C6C75" },
  code_inline: {
    backgroundColor: "#F3F6F4",
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: "monospace",
    fontSize: 13,
    color: "#00684A",
  },
  fence: {
    backgroundColor: "#F3F6F4",
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    fontFamily: "monospace",
    fontSize: 13,
    color: "#001E2B",
  },
  heading1: { fontSize: 18, fontWeight: "700", marginBottom: 6, color: "#001E2B" },
  heading2: { fontSize: 16, fontWeight: "700", marginBottom: 4, color: "#001E2B" },
  heading3: { fontSize: 15, fontWeight: "600", marginBottom: 4, color: "#001E2B" },
});

function TypingIndicator() {
  return (
    <View className="mb-4 w-full">
      <View
        className="rounded-3xl rounded-bl-lg bg-card px-4 py-3.5"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-ink-muted" style={{ opacity: 0.7 }} />
          <View className="h-2 w-2 rounded-full bg-ink-muted" style={{ opacity: 0.45 }} />
          <View className="h-2 w-2 rounded-full bg-ink-muted" style={{ opacity: 0.2 }} />
        </View>
      </View>
    </View>
  );
}

function MessageBubble({
  item,
  prev,
  showEscalation,
  onTryOnline,
  busy,
}: {
  item: ChatMessageRow;
  prev: ChatMessageRow | undefined;
  showEscalation: boolean;
  onTryOnline: (userText: string) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const isUser = item.role === "user";

  return (
    <View
      className={`mb-4 ${isUser ? "max-w-[82%] self-end" : "w-full"}`}
      style={{ overflow: "visible" }}
    >
      <View
        style={{
          overflow: "hidden",
          position: "relative",
          backgroundColor: isUser ? "#1B3A28" : "#FFFFFF",
          shadowColor: "#001E2B",
          shadowOffset: { width: 0, height: isUser ? 4 : 2 },
          shadowOpacity: isUser ? 0.18 : 0.08,
          shadowRadius: isUser ? 12 : 8,
          elevation: isUser ? 4 : 2,
        }}
        className={`${
          isUser
            ? "rounded-3xl rounded-br-md px-[18px] py-[14px]"
            : "rounded-3xl rounded-bl-lg px-4 py-3.5"
        }`}
      >
        {/* Image thumbnail (optimistic only — from local URI) */}
        {isUser && item.imageLocalUri ? (
          <Image
            source={{ uri: item.imageLocalUri }}
            style={{ width: 200, height: 150, borderRadius: 10, marginBottom: item.text ? 8 : 0 }}
            resizeMode="cover"
          />
        ) : null}

        {/* Message text */}
        {item.text ? (
          isUser ? (
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                lineHeight: 22,
                fontWeight: "500",
                letterSpacing: 0.15,
              }}
            >
              {item.text}
            </Text>
          ) : (
            <Markdown style={mdStyles}>{item.text}</Markdown>
          )
        ) : null}

        {/* Escalation CTA */}
        {showEscalation && !isUser && prev?.role === "user" ? (
          <Pressable
            accessibilityRole="button"
            className="mt-3 min-h-[44px] items-center justify-center rounded-xl border border-amber bg-amber/10 px-3"
            disabled={busy}
            onPress={() => onTryOnline(prev.text)}
          >
            <Text className="font-body-semibold text-sm text-amber">{t("chat.tryOnline")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Chat header + drawer styles ─────────────────────────────────────────────

const chatHeaderStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8EDEB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1B3A28",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerInfo: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#001E2B",
  },
  aiBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    color: "#16A34A",
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#5C6C75",
    marginTop: 2,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F5F1EA",
    flexShrink: 0,
  },
});

const drawerStyles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    shadowColor: "#001E2B",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8EDEB",
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#001E2B",
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1B3A28",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  newBtnText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  chatItemActive: { backgroundColor: "#E8F5EE" },
  chatTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: "#001E2B",
    lineHeight: 20,
  },
  chatTitleActive: { color: "#1B3A28", fontWeight: "600" },
  chatDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8997A0",
    marginTop: 2,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#5C6C75",
    lineHeight: 20,
  },
});

// ─── ChatHistoryDrawer ────────────────────────────────────────────────────────

function ChatHistoryDrawer({
  open,
  onClose,
  sessions,
  activeConversationId,
  onPickSession,
  onNewChat,
  onDeleteSession,
  sessionsLoading,
  i18nLang,
}: {
  open: boolean;
  onClose: () => void;
  sessions: Conversation[];
  activeConversationId: string | null;
  onPickSession: (c: Conversation) => void;
  onNewChat: () => void;
  onDeleteSession: (conversationId: string) => Promise<void>;
  sessionsLoading: boolean;
  i18nLang: string;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const DRAWER_W = Math.min(width * 0.82, 340);

  const [slideX] = useState(() => new Animated.Value(DRAWER_W));
  const [bgOpacity] = useState(() => new Animated.Value(0));
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = useCallback(async (conversationId: string) => {
    setDeletingIds((prev) => new Set(prev).add(conversationId));
    try {
      await onDeleteSession(conversationId);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
    }
  }, [onDeleteSession]);

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          tension: 280,
          friction: 26,
          useNativeDriver: true,
        }),
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: DRAWER_W,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open, DRAWER_W, slideX, bgOpacity]);

  const formatDate = useCallback(
    (iso: string) => {
      try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        const loc = i18nLang.startsWith("hi") ? "hi-IN" : "en-IN";
        return d.toLocaleString(loc, { dateStyle: "medium", timeStyle: "short" });
      } catch {
        return "";
      }
    },
    [i18nLang],
  );

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.35)", opacity: bgOpacity },
          ]}
          pointerEvents={open ? "auto" : "none"}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        {/* Panel slides in from right */}
        <Animated.View
          style={[
            drawerStyles.panel,
            {
              width: DRAWER_W,
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
              transform: [{ translateX: slideX }],
            },
          ]}
          pointerEvents="auto"
        >
          {/* Header */}
          <View style={drawerStyles.drawerHeader}>
            <Text style={drawerStyles.drawerTitle}>Recent Chats</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="close" size={22} color="#001E2B" />
            </Pressable>
          </View>

          {/* New chat CTA */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              setTimeout(onNewChat, 260);
            }}
            style={drawerStyles.newBtn}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
            <Text style={drawerStyles.newBtnText}>New Session</Text>
          </Pressable>

          {/* Sessions list */}
          {sessionsLoading && sessions.length === 0 ? (
            <View style={drawerStyles.emptyWrap}>
              <ActivityIndicator color="#1B3A28" />
            </View>
          ) : sessions.length === 0 ? (
            <View style={drawerStyles.emptyWrap}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={36}
                color="#A0ADB3"
              />
              <Text style={drawerStyles.emptyText}>
                {t("chat.sessionsEmpty")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(c) => c.conversation_id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: 8,
                paddingBottom: 24,
                paddingHorizontal: 16,
              }}
              renderItem={({ item }) => {
                const active = item.conversation_id === activeConversationId;
                return (
                  <View
                    style={[
                      drawerStyles.chatItem,
                      active ? drawerStyles.chatItemActive : null,
                    ]}
                  >
                    {/* Tap the row to open the conversation */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        onPickSession(item);
                        onClose();
                      }}
                      style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 }}
                    >
                      <MaterialCommunityIcons
                        name="message-outline"
                        size={18}
                        color={active ? "#1B3A28" : "#A0ADB3"}
                        style={{ marginTop: 1 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            drawerStyles.chatTitle,
                            active ? drawerStyles.chatTitleActive : null,
                          ]}
                          numberOfLines={2}
                        >
                          {item.title?.trim() || t("chat.sessionUntitled")}
                        </Text>
                        <Text style={drawerStyles.chatDate}>
                          {formatDate(item.updated_at)}
                        </Text>
                      </View>
                    </Pressable>

                    {/* Delete button */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("chat.deleteSession")}
                      hitSlop={8}
                      disabled={deletingIds.has(item.conversation_id)}
                      onPress={() => void handleDelete(item.conversation_id)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        marginLeft: 4,
                        alignSelf: "center",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {deletingIds.has(item.conversation_id) ? (
                        <ActivityIndicator size="small" color="#C0392B" />
                      ) : (
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#C0392B" />
                      )}
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const routerNav = useRouter();
  const qc = useQueryClient();
  const { newChat } = useLocalSearchParams<{
    newChat?: string;
  }>();
  const farmerId = useFarmerId();
  const ready = useAuthReady();
  const language = (useOnboarding((s) => s.language) ?? "en") as Language;
  const state = useOnboarding((s) => s.state) ?? "—";
  const district = useOnboarding((s) => s.district) ?? "—";
  const latRaw = useOnboarding((s) => s.lat);
  const lngRaw = useOnboarding((s) => s.lng);
  const lat = latRaw != null && Number.isFinite(latRaw) ? latRaw : undefined;
  const lng = lngRaw != null && Number.isFinite(lngRaw) ? lngRaw : undefined;
  const ui = useConnectivityUi();
  const connectivity = ui.connectivity;

  // Bootstrap session on first open / web reload; does not reset on tab blur.
  useConversation({ farmerId, connectivity });
  const conversationId = useChatStore((s) => s.conversationId);
  const isCreating = useChatStore((s) => s.isCreatingConversation);
  const conversationError = useChatStore((s) => s.conversationError);

  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  const { startNewSession, openSession, deleteSession } = useChatSessionActions({
    farmerId,
    connectivity,
  });
  const { data: sessionsRaw = [], refetch: refetchSessions } = useFarmerConversations({
    farmerId,
    connectivity,
  });
  const sessions = useMemo(() => {
    return [...sessionsRaw].sort((a, b) =>
      String(b.updated_at).localeCompare(String(a.updated_at)),
    );
  }, [sessionsRaw]);

  const headerSubtitle = useMemo(() => {
    if (!ui.backendReachable) return t("chat.offlineStrip");
    const hit = sessions.find((s) => s.conversation_id === conversationId);
    if (hit?.title?.trim()) return hit.title.trim();
    if (conversationId !== MAIN_THREAD_ID) return t("chat.sessionUntitled");
    return t("chat.headerSubtitleDefault");
  }, [sessions, conversationId, ui.backendReachable, t]);

  const [refreshing, setRefreshing] = useState(false);

  const { data: messagesData, isPending: threadPending } = useChatThread(conversationId);
  const messages = messagesData ?? [];
  const send = useSendChatMessage();
  const stream = useStreamChatMessage({
    farmerId: farmerId ?? "",
    language,
    state,
    district,
    ...(lat !== undefined ? { lat } : {}),
    ...(lng !== undefined ? { lng } : {}),
    connectivity,
    conversationId,
  });
  const attachment = useImageAttachment();
  const [draft, setDraft] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevListeningRef = useRef(false);
  const lastMsgRef = useRef<string | null>(null);
  const voiceModeStartTimeRef = useRef<number | null>(null);
  const listRef = useRef<FlatList<ChatMessageRow>>(null);
  const userScrolledUpRef = useRef(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const voice = useVoice({
    onSpeechResult: (text) => {
      setDraft((d) => (d ? `${d} ${text}` : text));
    },
  });

  const scrollToBottom = useCallback(() => {
    userScrolledUpRef.current = false;
    setShowScrollToBottom(false);
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const onScrollHandler = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      const isNearBottom = distanceFromBottom < 80;
      if (isNearBottom) {
        if (userScrolledUpRef.current) {
          userScrolledUpRef.current = false;
          setShowScrollToBottom(false);
        }
      } else {
        if (!userScrolledUpRef.current) {
          userScrolledUpRef.current = true;
          setShowScrollToBottom(true);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      if (!userScrolledUpRef.current) {
        listRef.current?.scrollToEnd({ animated: true });
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    userScrolledUpRef.current = false;
    const frame = requestAnimationFrame(() => {
      setShowScrollToBottom(false);
      listRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [conversationId]);

  const onThreadRefresh = useCallback(async () => {
    if (!farmerId || !ui.backendReachable || conversationId === MAIN_THREAD_ID) return;
    setRefreshing(true);
    try {
      // Always hit GET …/history on pull-to-refresh (not only SQLite hydrate).
      let raw: Record<string, unknown>;
      try {
        raw = await getConversationHistory(farmerId, conversationId, connectivity);
      } catch {
        return;
      }
      qc.setQueryData(CONVERSATION_HISTORY_QUERY_KEY(farmerId, conversationId, connectivity), raw);
      await applyConversationHistoryPayloadToLocalThread(conversationId, raw, {
        replaceLocal: true,
      });
      await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(conversationId) });
      void refetchSessions();
    } finally {
      setRefreshing(false);
    }
  }, [farmerId, ui.backendReachable, conversationId, connectivity, qc, refetchSessions]);

  useEffect(() => {
    const raw = newChat;
    const flag = raw === "1" || (Array.isArray(raw) && raw[0] === "1");
    if (!flag) return;
    if (
      !farmerId ||
      !ui.backendReachable ||
      send.isPending ||
      stream.isStreaming ||
      attachment.isUploading ||
      isCreating
    ) {
      routerNav.setParams({ newChat: undefined });
      return;
    }
    let cancelled = false;
    void (async () => {
      await startNewSession();
      if (!cancelled) routerNav.setParams({ newChat: undefined });
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    newChat,
    farmerId,
    ui.backendReachable,
    send.isPending,
    stream.isStreaming,
    attachment.isUploading,
    isCreating,
    startNewSession,
    routerNav,
  ]);

  const sendPayload = useCallback(
    (text: string, opt?: { skipUserMessage?: boolean }) => {
      if (!farmerId) return;
      setDraft("");
      userScrolledUpRef.current = false;
      setShowScrollToBottom(false);
      const trimmed = text.trim();
      if (ui.enableStreamChat) {
        void stream
          .send(
            trimmed,
            opt?.skipUserMessage === true ? { skipUserMessage: true } : undefined,
          )
          .catch(() => undefined);
        return;
      }
      abortControllerRef.current?.abort();
      const ac = new AbortController();
      abortControllerRef.current = ac;
      const payload: SendQueryInput = {
        text: trimmed,
        farmerId,
        language,
        state,
        district,
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
        connectivity,
        conversationId,
        ...(opt?.skipUserMessage ? { skipUserMessage: true } : {}),
        signal: ac.signal,
      };
      void send.mutateAsync(payload).catch(() => undefined);
    },
    [farmerId, language, state, district, lat, lng, connectivity, conversationId, send, stream, ui.enableStreamChat],
  );

  const onSend = useCallback(async () => {
    const hasImage = !!attachment.pickedUri;
    const hasText = !!draft.trim();
    if ((!hasText && !hasImage) || send.isPending || stream.isStreaming || attachment.isUploading) return;
    if (hasImage && !ui.backendReachable) {
      // uploadError banner handles display — we just block the send
      return;
    }
    if (!farmerId) return;
    const draftTrimmed = draft.trim();
    const text = draftTrimmed || t("chat.analyzeImagePrompt");
    const localUri = attachment.pickedUri ?? undefined;
    setDraft("");
    userScrolledUpRef.current = false;
    setShowScrollToBottom(false);
    let imageRef: string | undefined;
    if (hasImage) {
      try {
        imageRef = await attachment.upload(farmerId, guessImagePurpose(draftTrimmed));
      } catch {
        return; // uploadError set inside hook
      }
      attachment.clearImage();
    }

    if (ui.backendReachable) {
      void stream
        .send(text, {
          ...(imageRef ? { imageRef } : {}),
          ...(localUri ? { imageLocalUri: localUri } : {}),
        })
        .catch(() => undefined);
      return;
    }

    // Offline / prefer-offline text-only path (images already blocked above).
    const payload: SendQueryInput = {
      text,
      farmerId,
      language,
      state,
      district,
      ...(lat !== undefined ? { lat } : {}),
      ...(lng !== undefined ? { lng } : {}),
      connectivity,
      conversationId,
    };
    void send.mutateAsync(payload).catch(() => undefined);
  }, [attachment, draft, farmerId, language, state, district, lat, lng, connectivity, conversationId, send, stream, ui.backendReachable, t]);

  const handleMicPress = useCallback(async () => {
    if (send.isPending) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      if (voice.speaking) voice.cancelSpeech();
      return;
    }
    if (voice.listening) {
      await voice.stopListening();
      return;
    }
    if (voice.speaking) {
      voice.cancelSpeech();
      return;
    }
    setVoiceMode(true);
    await voice.startListening(i18n.language === "hi" ? "hi-IN" : "en-US");
  }, [send.isPending, voice, i18n.language]);

  // Auto-send when mic stops and we have draft text
  useEffect(() => {
    if (prevListeningRef.current && !voice.listening && voiceMode && draft.trim()) {
      const timer = setTimeout(() => {
        void sendPayload(draft);
      }, 300);
      return () => clearTimeout(timer);
    }
    prevListeningRef.current = voice.listening;
  }, [voice.listening, voiceMode, draft, sendPayload]);

  // Track when voice mode starts so we don't TTS historical messages on tab-return
  useEffect(() => {
    if (voiceMode) {
      voiceModeStartTimeRef.current = Date.now();
    } else {
      voiceModeStartTimeRef.current = null;
    }
  }, [voiceMode]);

  // Auto-TTS on new assistant messages when in voice mode
  useEffect(() => {
    if (!voiceMode || voice.speaking || voiceModeStartTimeRef.current === null) return;
    const last = messages[messages.length - 1];
    const text = typeof last?.text === "string" ? last.text.trim() : "";
    if (
      last?.role === "assistant" &&
      text.length > 0 &&
      last.id !== lastMsgRef.current &&
      last.created_at >= (voiceModeStartTimeRef.current ?? Infinity)
    ) {
      lastMsgRef.current = last.id;
      void voice.speak(text, i18n.language === "hi" ? "hi" : "en");
    }
  }, [messages, voiceMode, voice, i18n.language]);

  const isBusy = send.isPending || stream.isStreaming || attachment.isUploading || isCreating;
  const canSend = (!!draft.trim() || !!attachment.pickedUri) && !isBusy;

  /** Full-screen spinner only before the first SQLite read — not during background refetch. */
  if (!ready || (threadPending && messagesData === undefined)) {
    return (
      <View
        className="flex-1 items-center justify-center bg-page"
        style={{ paddingTop: insets.top }}
        accessibilityLabel={t("chat.loading")}
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
    // Outer shell — fills screen, handles top safe area
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", paddingTop: insets.top }}>

      {/* ── Header (always visible, never pushed by keyboard) ── */}
      <View style={chatHeaderStyles.header}>
        <View style={chatHeaderStyles.avatarCircle}>
          <MaterialCommunityIcons name="leaf" size={22} color="#FFFFFF" />
        </View>

        <View style={chatHeaderStyles.headerInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={chatHeaderStyles.headerTitle} numberOfLines={1}>
              {t("chat.title")}
            </Text>
            <View style={chatHeaderStyles.aiBadge}>
              <Text style={chatHeaderStyles.aiBadgeText}>AI POWERED</Text>
            </View>
          </View>
          <Text style={chatHeaderStyles.headerSubtitle} numberOfLines={1}>
            {isCreating
              ? t(`chat.${ui.newChatLoadingKey}`)
              : headerSubtitle || "AI Agent · Always Active"}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.backToChatsA11y")}
          hitSlop={8}
          onPress={() => setChatDrawerOpen(true)}
          style={chatHeaderStyles.iconBtn}
        >
          <MaterialCommunityIcons name="message-text-outline" size={22} color="#1B3A28" />
        </Pressable>
      </View>

      {/* Connectivity banner (outside KAV — doesn't move with keyboard) */}
      {ui.chatModeBannerKey ? (
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            backgroundColor: ui.chatInlineBannerBackgroundRgba,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0,30,43,0.08)",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              lineHeight: 17,
              color: ui.chatInlineBannerTextHex,
              fontWeight: "500",
            }}
          >
            {t(`chat.${ui.chatModeBannerKey}`)}
          </Text>
        </View>
      ) : null}

      {/*
        ── KeyboardAvoidingView only wraps message list + input footer ──
        • iOS: behavior="padding" shrinks the KAV from the bottom
        • Android: behavior="height" shrinks the KAV height
        keyboardVerticalOffset is 0 because the header is now outside KAV
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >

      {/* Message list */}
      <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12 }}
        data={messages}
        keyExtractor={(m) => m.id}
        refreshControl={
          ui.enableChatHistoryRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onThreadRefresh()}
              tintColor={ui.accentHex}
            />
          ) : undefined
        }
        onScroll={onScrollHandler}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          if (!userScrolledUpRef.current) {
            listRef.current?.scrollToEnd({ animated: true });
          }
        }}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : undefined;
          const canEscalate =
            item.role === "assistant" &&
            item.source === "ondevice" &&
            item.confidence != null &&
            item.confidence < CONFIDENCE_THRESHOLD_LOW &&
            ui.backendReachable;
          return (
            <>
              <MessageBubble
                item={item}
                prev={prev}
                showEscalation={
                  canEscalate && index === messages.length - 1 && prev?.role === "user"
                }
                onTryOnline={(userText) => {
                  if (!userText) return;
                  sendPayload(userText, { skipUserMessage: true });
                }}
                busy={isBusy}
              />
              {item.role === "assistant" && item.source === "ondevice" && (
                <Text style={{ fontSize: 10, color: "#8997A0", marginLeft: 12, marginTop: 2, marginBottom: 6 }}>
                  {t("chat.offlineBadge", { model: "Gemma 4 E4B" })}
                </Text>
              )}
              {item.role === "assistant" && item.source === "backend" && (
                <Text style={{ fontSize: 10, color: ui.headerAccentHex, marginLeft: 12, marginTop: 2, marginBottom: 6 }}>
                  {t("chat.onlineBadge", { model: "Gemma 4" })}
                </Text>
              )}
            </>
          );
        }}
        ListEmptyComponent={
          refreshing ? (
            <View className="items-center px-6 py-14" accessibilityLabel={t("chat.loading")}>
              <ActivityIndicator color={ui.accentHex} />
              <Text className="mt-4 text-center font-body text-sm text-ink-muted">{t("chat.loading")}</Text>
            </View>
          ) : (
            <View className="items-center px-6 py-14">
              <View className="items-center justify-center rounded-3xl bg-muted/50 p-5">
                <MaterialCommunityIcons name="message-text-outline" size={36} color="#6b7280" />
              </View>
              <Text className="mt-5 text-center font-display text-lg text-ink">{t("chat.emptyTitle")}</Text>
              <Text className="mt-2 max-w-[280px] text-center font-body text-sm leading-5 text-ink-muted">
                {t(`chat.${ui.chatEmptyHintKey}`)}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          stream.isStreaming ? (
            <StreamingStatusBox
              key={stream.streamPhase}
              phase={stream.streamPhase}
              text={stream.streamingText}
              reasoningText={stream.streamingReasoning}
              stageEvents={stream.stageEvents}
              mdStyles={mdStyles}
              isStreaming={stream.isStreaming}
            />
          ) : send.isPending ? (
            <TypingIndicator />
          ) : null
        }
      />
      {showScrollToBottom ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scroll to latest message"
          onPress={scrollToBottom}
          style={{
            position: "absolute",
            bottom: 12,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: ui.accentHex,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <MaterialCommunityIcons name="chevron-down" size={24} color="#001E2B" />
        </Pressable>
      ) : null}
      </View>


      {/* Session creation failed */}
      {!isCreating && conversationError ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 5,
            paddingHorizontal: 16,
            backgroundColor: "#FFF0F0",
            borderTopWidth: 1,
            borderTopColor: "#DB3030",
          }}
        >
          <MaterialCommunityIcons name="wifi-off" size={13} color="#ff6b6b" />
          <Text style={{ fontSize: 12, color: "#ff6b6b", fontWeight: "500" }}>
            {t("chat.sessionError")}
          </Text>
        </View>
      ) : null}

      {/* Error banners */}
      {send.isError ? (
        <View className="bg-danger/10 px-4 py-2">
          <Text className="text-center font-body text-sm text-danger">
            {send.error instanceof Error ? send.error.message : t("errors.generic")}
          </Text>
        </View>
      ) : null}
      {stream.streamError ? (
        <View className="bg-danger/10 px-4 py-2">
          <Text className="text-center font-body text-sm text-danger">
            {stream.streamError instanceof Error
              ? stream.streamError.message
              : t("errors.generic")}
          </Text>
        </View>
      ) : null}
      {attachment.uploadError ? (
        <View className="bg-danger/10 px-4 py-2">
          <Text className="text-center font-body text-sm text-danger">
            {attachment.uploadError}
          </Text>
        </View>
      ) : null}
      {attachment.pickedUri && !ui.backendReachable ? (
        <View className="bg-amber/10 px-4 py-2">
          <Text className="text-center font-body text-sm text-amber">
            {t("chat.imageRequiresInternet")}
          </Text>
        </View>
      ) : null}

      {/* Image preview strip */}
      {attachment.pickedUri ? (
        <View
          className="border-t border-border/60 bg-card px-4 py-2"
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View style={{ position: "relative" }}>
            <Image
              source={{ uri: attachment.pickedUri }}
              style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#F3F6F4" }}
              resizeMode="cover"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.removeImage")}
              onPress={attachment.clearImage}
              hitSlop={4}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#5C6C75" />
            </Pressable>
          </View>
          <Text style={{ fontSize: 13, color: "#5C6C75", flex: 1 }}>
            {t("chat.imageAttached")}
          </Text>
        </View>
      ) : null}

      {/* Input row — pinned to the bottom edge of the KAV */}
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "rgba(0,30,43,0.1)",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: keyboardHeight > 0 ? 6 : Math.max(insets.bottom, 8),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>

          {/* Pill input bar */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(0,30,43,0.12)",
              backgroundColor: "#FFFFFF",
              shadowColor: "#001E2B",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
              minHeight: 56,
              paddingVertical: 10,
            }}
          >
            {/* Paperclip — left */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.attachImage")}
              onPress={() => { void attachment.pickImage("gallery"); }}
              style={{ paddingLeft: 12, paddingRight: 6 }}
              hitSlop={8}
              disabled={isBusy || !ui.enableImageAttach}
            >
              <MaterialCommunityIcons
                name="paperclip"
                size={22}
                color={ui.enableImageAttach ? "#5C6C75" : "#C8D5D1"}
              />
            </Pressable>

            {/* Text field */}
            <TextInput
              style={{
                flex: 1,
                maxHeight: 120,
                fontSize: 13,
                lineHeight: 19,
                color: "#001E2B",
                paddingVertical: 0,
                paddingHorizontal: 6,
                textAlignVertical: "center",
              }}
              placeholder={t(`chat.${ui.composerPlaceholderKey}`)}
              placeholderTextColor="#8997A0"
              value={draft}
              onChangeText={setDraft}
              multiline
              editable={!isBusy}
              returnKeyType="send"
              onSubmitEditing={() => { void onSend(); }}
            />

            {/* Camera — right */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.takePhoto")}
              onPress={() => { void attachment.pickImage("camera"); }}
              style={{ paddingLeft: 6, paddingRight: 12 }}
              hitSlop={8}
              disabled={isBusy || !ui.enableImageAttach}
            >
              <MaterialCommunityIcons
                name="camera-outline"
                size={22}
                color={ui.enableImageAttach ? "#5C6C75" : "#C8D5D1"}
              />
            </Pressable>
          </View>

          {/* FAB — mic when idle, send when text/image ready */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={!canSend ? { selected: voice.listening || voice.speaking } : undefined}
            onPress={() => {
              if (canSend) { void onSend(); }
              else { void handleMicPress(); }
            }}
            disabled={isBusy && !canSend}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: voice.listening ? "#ffa42b" : voice.speaking ? "#a78bfa" : "#1B3A28",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 5,
              opacity: isBusy && !canSend ? 0.5 : 1,
              marginBottom: 0,
            }}
          >
            {attachment.isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : canSend ? (
              <MaterialCommunityIcons name="send" size={22} color="#FFFFFF" style={{ marginLeft: 2 }} />
            ) : (
              <MaterialCommunityIcons
                name={voice.speaking ? "volume-high" : voice.listening ? "microphone" : "microphone-outline"}
                size={22}
                color="#FFFFFF"
              />
            )}
          </Pressable>

        </View>
      </View>

      </KeyboardAvoidingView>

      {/* Session-starting overlay — centered on screen */}
      {isCreating ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#001E2B",
              borderRadius: 999,
              paddingVertical: 14,
              paddingHorizontal: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 14,
              elevation: 10,
            }}
          >
            <ActivityIndicator size="small" color="#00ED64" />
            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "600", fontFamily: "Inter_600SemiBold" }}>
              {t(`chat.${ui.newChatLoadingKey}`)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Chat history right drawer — outside KAV so it overlays the full screen */}
      <ChatHistoryDrawer
        open={chatDrawerOpen}
        onClose={() => setChatDrawerOpen(false)}
        sessions={sessions}
        activeConversationId={conversationId}
        onPickSession={(c) => {
          void openSession(c.conversation_id);
        }}
        onNewChat={() => void startNewSession()}
        onDeleteSession={deleteSession}
        sessionsLoading={false}
        i18nLang={i18n.language}
      />
    </View>
  );
}
