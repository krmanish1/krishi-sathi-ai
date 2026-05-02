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
  InteractionManager,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Markdown from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useOnboarding } from "@/features/onboarding/store";
import { useAuthReady, useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivity } from "@/shared/network";
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
import { voiceStt } from "@/shared/voice/voiceClient";
import type { Language } from "@/shared/config/constants";

const mdStyles = StyleSheet.create({
  body: { color: "#ffffff", fontSize: 15, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: 4 },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  strong: { fontWeight: "700", color: "#ffffff" },
  em: { fontStyle: "italic", color: "#cbcbcb" },
  code_inline: {
    backgroundColor: "#252525",
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: "monospace",
    fontSize: 13,
    color: "#86efac",
  },
  fence: {
    backgroundColor: "#252525",
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    fontFamily: "monospace",
    fontSize: 13,
    color: "#e5e5e5",
  },
  heading1: { fontSize: 18, fontWeight: "700", marginBottom: 6, color: "#ffffff" },
  heading2: { fontSize: 16, fontWeight: "700", marginBottom: 4, color: "#ffffff" },
  heading3: { fontSize: 15, fontWeight: "600", marginBottom: 4, color: "#ffffff" },
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: isUser ? 8 : 6 },
          shadowOpacity: isUser ? 0.35 : 0.32,
          shadowRadius: isUser ? 16 : 12,
          elevation: isUser ? 4 : 3,
        }}
        className={`${
          isUser
            ? "rounded-3xl rounded-br-md bg-brand px-[18px] py-[14px]"
            : "rounded-3xl rounded-bl-lg bg-card px-4 py-3.5"
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
                color: "#0a0a0a",
                fontSize: 16,
                lineHeight: 24,
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
  const connectivity = useConnectivity();
  const isOnline = connectivity === "online" || connectivity === "degraded";

  // Bootstrap session on first open / web reload; does not reset on tab blur.
  useConversation({ farmerId, connectivity });
  const conversationId = useChatStore((s) => s.conversationId);
  const isCreating = useChatStore((s) => s.isCreatingConversation);
  const conversationError = useChatStore((s) => s.conversationError);

  const { startNewSession } = useChatSessionActions({
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
    if (!isOnline) return t("chat.offlineStrip");
    const hit = sessions.find((s) => s.conversation_id === conversationId);
    if (hit?.title?.trim()) return hit.title.trim();
    if (conversationId !== MAIN_THREAD_ID) return t("chat.sessionUntitled");
    return t("chat.headerSubtitleDefault");
  }, [sessions, conversationId, isOnline, t]);

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
  const [listening, setListening] = useState(false);
  const listRef = useRef<FlatList<ChatMessageRow>>(null);

  useEffect(() => {
    if (!voiceStt) return;
    const onRes = (e: { value?: string[] }) => {
      const v = e.value?.[0];
      if (v) setDraft((d) => (d ? `${d} ${v}` : v));
    };
    const onEnd = () => setListening(false);
    voiceStt.onSpeechResults = onRes;
    voiceStt.onSpeechError = onEnd;
    voiceStt.onSpeechEnd = onEnd;
    return () => { voiceStt?.removeAllListeners(); };
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          if (!cancelled) listRef.current?.scrollToEnd({ animated: true });
        });
      });
      return () => {
        cancelled = true;
        task.cancel();
      };
    }, []),
  );

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(t);
  }, [conversationId]);

  const onThreadRefresh = useCallback(async () => {
    if (!farmerId || !isOnline || conversationId === MAIN_THREAD_ID) return;
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
  }, [farmerId, isOnline, conversationId, connectivity, qc, refetchSessions]);

  useEffect(() => {
    const raw = newChat;
    const flag = raw === "1" || (Array.isArray(raw) && raw[0] === "1");
    if (!flag) return;
    if (
      !farmerId ||
      !isOnline ||
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
    isOnline,
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
      const trimmed = text.trim();
      if (isOnline) {
        void stream
          .send(
            trimmed,
            opt?.skipUserMessage === true ? { skipUserMessage: true } : undefined,
          )
          .catch(() => undefined);
        return;
      }
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
      };
      void send.mutateAsync(payload).catch(() => undefined);
    },
    [farmerId, language, state, district, lat, lng, connectivity, conversationId, send, stream, isOnline],
  );

  const onSend = useCallback(async () => {
    const hasImage = !!attachment.pickedUri;
    const hasText = !!draft.trim();
    if ((!hasText && !hasImage) || send.isPending || stream.isStreaming || attachment.isUploading) return;
    if (hasImage && !isOnline) {
      // uploadError banner handles display — we just block the send
      return;
    }
    if (!farmerId) return;
    const draftTrimmed = draft.trim();
    const text = draftTrimmed || t("chat.analyzeImagePrompt");
    const localUri = attachment.pickedUri ?? undefined;
    setDraft("");
    let imageRef: string | undefined;
    if (hasImage) {
      try {
        imageRef = await attachment.upload(farmerId, guessImagePurpose(draftTrimmed));
      } catch {
        return; // uploadError set inside hook
      }
      attachment.clearImage();
    }

    if (!hasImage && isOnline) {
      void stream.send(text).catch(() => undefined);
      return;
    }

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
      ...(imageRef ? { imageRef } : {}),
      ...(localUri ? { imageLocalUri: localUri } : {}),
    };
    void send.mutateAsync(payload).catch(() => undefined);
  }, [attachment, draft, farmerId, language, state, district, lat, lng, connectivity, conversationId, send, stream, isOnline, t]);

  const toggleVoice = async () => {
    if (!voiceStt) return;
    try {
      if (listening) {
        await voiceStt.stop();
        setListening(false);
        return;
      }
      setListening(true);
      await voiceStt.start(i18n.language === "hi" ? "hi-IN" : "en-US");
    } catch {
      setListening(false);
    }
  };

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
    <KeyboardAvoidingView
      className="flex-1 bg-page"
      style={{ paddingTop: insets.top }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
    >
      {/* Header */}
      <View className="flex-row items-center border-b border-border/60 bg-card px-2 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.backToChatsA11y")}
          onPress={() => routerNav.push("/(tabs)/chats" as never)}
          hitSlop={8}
          className="mr-1 items-center justify-center rounded-xl p-2 active:opacity-80"
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color="#1ed760" />
        </Pressable>
        <View className="min-w-0 flex-1 flex-row items-center gap-3 pr-2">
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#1ed760",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="leaf" size={20} color="#000000" />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="font-display text-base text-title-green"
              style={{ lineHeight: 20 }}
              numberOfLines={1}
            >
              {t("chat.title")}
            </Text>
            <Text className="mt-0.5 font-body text-xs leading-4 text-ink-muted" numberOfLines={2}>
              {headerSubtitle}
            </Text>
          </View>
        </View>
        {isCreating ? <ActivityIndicator size="small" color="#1ed760" style={{ marginRight: 8 }} /> : null}
      </View>

      {/* Message list */}
      <FlatList
        ref={listRef}
        className="flex-1 px-3 pt-3"
        data={messages}
        keyExtractor={(m) => m.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onThreadRefresh()}
            tintColor="#1ed760"
          />
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : undefined;
          const canEscalate =
            item.role === "assistant" &&
            item.source === "ondevice" &&
            item.confidence != null &&
            item.confidence < CONFIDENCE_THRESHOLD_LOW &&
            isOnline;
          return (
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
          );
        }}
        ListEmptyComponent={
          refreshing ? (
            <View className="items-center px-6 py-14" accessibilityLabel={t("chat.loading")}>
              <ActivityIndicator color="#1ed760" />
              <Text className="mt-4 text-center font-body text-sm text-ink-muted">{t("chat.loading")}</Text>
            </View>
          ) : (
            <View className="items-center px-6 py-14">
              <View className="items-center justify-center rounded-3xl bg-muted/50 p-5">
                <MaterialCommunityIcons name="message-text-outline" size={36} color="#6b7280" />
              </View>
              <Text className="mt-5 text-center font-display text-lg text-ink">{t("chat.emptyTitle")}</Text>
              <Text className="mt-2 max-w-[280px] text-center font-body text-sm leading-5 text-ink-muted">
                {t("chat.emptyHint")}
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

      {/* Session-starting banner */}
      {isCreating ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 6,
            paddingHorizontal: 16,
            backgroundColor: "#1a2e1a",
            borderTopWidth: 1,
            borderTopColor: "#1e3a1e",
          }}
        >
          <ActivityIndicator size="small" color="#1ed760" />
          <Text style={{ fontSize: 12, color: "#1ed760", fontWeight: "500" }}>
            {t("chat.sessionStarting")}
          </Text>
        </View>
      ) : null}

      {/* Session creation failed — chat still works but replies won't be saved to a backend session. */}
      {!isCreating && conversationError ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 5,
            paddingHorizontal: 16,
            backgroundColor: "#2a1a1a",
            borderTopWidth: 1,
            borderTopColor: "#4a1a1a",
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
      {attachment.pickedUri && !isOnline ? (
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
              style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#252525" }}
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
                backgroundColor: "#181818",
                borderRadius: 12,
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#b3b3b3" />
            </Pressable>
          </View>
          <Text style={{ fontSize: 13, color: "#b3b3b3", flex: 1 }}>
            {t("chat.imageAttached")}
          </Text>
        </View>
      ) : null}

      {/* Input row */}
      <View
        className="border-t border-border/60 bg-card px-3 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) + 4 }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>

          {/* Pill input bar */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "#1a1a1a",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 3,
              minHeight: 48,
              paddingVertical: 6,
            }}
          >
            {/* Text field */}
            <TextInput
              style={{
                flex: 1,
                maxHeight: 120,
                fontSize: 15,
                lineHeight: 22,
                color: "#ffffff",
                paddingVertical: 0,
                paddingLeft: 14,
                textAlignVertical: "center",
              }}
              placeholder={t("chat.placeholder")}
              placeholderTextColor="#b3b3b3"
              value={draft}
              onChangeText={setDraft}
              multiline
              editable={!isBusy}
              returnKeyType="send"
              onSubmitEditing={() => { void onSend(); }}
            />

            {/* Attachment (gallery) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.attachImage")}
              onPress={() => { void attachment.pickImage("gallery"); }}
              style={{ paddingHorizontal: 8 }}
              hitSlop={8}
              disabled={isBusy}
            >
              <MaterialCommunityIcons name="paperclip" size={22} color="#b3b3b3" />
            </Pressable>

            {/* Camera */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chat.takePhoto")}
              onPress={() => { void attachment.pickImage("camera"); }}
              style={{ paddingLeft: 4, paddingRight: 14 }}
              hitSlop={8}
              disabled={isBusy}
            >
              <MaterialCommunityIcons name="camera-outline" size={22} color="#b3b3b3" />
            </Pressable>
          </View>

          {/* FAB — mic when idle, send when text/image ready */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={voiceStt && !canSend ? { selected: listening } : undefined}
            onPress={() => {
              if (canSend) { void onSend(); }
              else if (voiceStt) { void toggleVoice(); }
            }}
            disabled={isBusy && !canSend}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: listening ? "#ffa42b" : "#1ed760",
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
              <ActivityIndicator size="small" color="#000000" />
            ) : canSend ? (
              <MaterialCommunityIcons name="send" size={22} color="#000000" style={{ marginLeft: 2 }} />
            ) : (
              <MaterialCommunityIcons
                name={listening ? "microphone" : "microphone-outline"}
                size={22}
                color="#000000"
              />
            )}
          </Pressable>

        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
