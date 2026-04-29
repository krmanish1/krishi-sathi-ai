import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import { useAuthReady, useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivity } from "@/shared/network/useConnectivity";
import {
  useChatThread,
  useSendChatMessage,
  CONFIDENCE_THRESHOLD_LOW,
  useImageAttachment,
  guessImagePurpose,
} from "@/features/chat";
import type { ChatMessageRow, SendQueryInput } from "@/features/chat";
import { voiceStt } from "@/shared/voice/voiceClient";
import type { Language } from "@/shared/config/constants";

const mdStyles = StyleSheet.create({
  body: { color: "#1C1917", fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 6 },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  list_item: { marginBottom: 2 },
  strong: { fontWeight: "700" },
  em: { fontStyle: "italic" },
  code_inline: {
    backgroundColor: "#F5F5F4",
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: "monospace",
    fontSize: 13,
  },
  fence: {
    backgroundColor: "#F5F5F4",
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    fontFamily: "monospace",
    fontSize: 13,
  },
  heading1: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  heading2: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  heading3: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
});

// WhatsApp-style bubble tails
const tailStyle = StyleSheet.create({
  user: {
    position: "absolute",
    bottom: 0,
    right: -7,
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderTopColor: "#0D631B",
    borderLeftWidth: 8,
    borderLeftColor: "transparent",
  },
  assistant: {
    position: "absolute",
    bottom: 0,
    left: -7,
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderTopColor: "#FFFFFF",
    borderRightWidth: 8,
    borderRightColor: "transparent",
  },
});

const localeForSpeech = (lng: string) => (lng === "hi" ? "hi-IN" : "en-US");

function TypingIndicator() {
  return (
    <View className="mb-3 max-w-[92%] self-start">
      <View className="rounded-2xl border border-border bg-card px-4 py-3">
        <View className="flex-row items-center gap-1.5">
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
  onSpeak,
  busy,
}: {
  item: ChatMessageRow;
  prev: ChatMessageRow | undefined;
  showEscalation: boolean;
  onTryOnline: (userText: string) => void;
  onSpeak: (text: string) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const isUser = item.role === "user";

  return (
    <View
      className={`mb-3 max-w-[88%] ${isUser ? "self-end" : "self-start"}`}
      style={{ overflow: "visible" }}
    >
      <View
        style={{ overflow: "visible", position: "relative" }}
        className={`px-4 py-3 ${
          isUser
            ? "rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl bg-brand"
            : "rounded-tl-2xl rounded-tr-2xl rounded-br-2xl border border-border bg-card"
        }`}
      >
        {/* WhatsApp tail */}
        <View style={isUser ? tailStyle.user : tailStyle.assistant} />

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
            <Text className="font-body text-base leading-6 text-white">{item.text}</Text>
          ) : (
            <Markdown style={mdStyles}>{item.text}</Markdown>
          )
        ) : null}

        {/* Source label */}
        {!isUser && item.source ? (
          <Text className="mt-1 font-body text-xs text-ink-muted">
            {item.source === "ondevice" ? t("chat.sourceOnDevice") : t("chat.sourceOnline")}
            {item.confidence != null ? ` · ${(item.confidence * 100).toFixed(0)}%` : ""}
          </Text>
        ) : null}

        {/* Speak button */}
        {!isUser ? (
          <Pressable
            accessibilityRole="button"
            className="mt-2 min-h-[32px] flex-row items-center gap-1 self-end"
            onPress={() => onSpeak(item.text)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="volume-medium" size={18} color="#6B7280" />
            <Text className="font-body text-xs text-ink-muted">{t("chat.speak")}</Text>
          </Pressable>
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
  const farmerId = useFarmerId();
  const ready = useAuthReady();
  const language = (useOnboarding((s) => s.language) ?? "en") as Language;
  const state = useOnboarding((s) => s.state) ?? "—";
  const district = useOnboarding((s) => s.district) ?? "—";
  const connectivity = useConnectivity();
  const { data: messages = [], isLoading } = useChatThread();
  const send = useSendChatMessage();
  const attachment = useImageAttachment();
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const listRef = useRef<FlatList<ChatMessageRow>>(null);
  const isOnline = connectivity === "online" || connectivity === "degraded";

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

  const sendPayload = useCallback(
    (text: string, opt?: { skipUserMessage?: boolean; forceBackend?: boolean }) => {
      if (!farmerId) return;
      setDraft("");
      const payload: SendQueryInput = {
        text,
        farmerId,
        language,
        state,
        district,
        connectivity,
        ...(opt?.skipUserMessage ? { skipUserMessage: true } : {}),
        ...(opt?.forceBackend ? { forceBackend: true } : {}),
      };
      void send.mutateAsync(payload).catch(() => undefined);
    },
    [farmerId, language, state, district, connectivity, send],
  );

  const onSend = useCallback(async () => {
    const hasImage = !!attachment.pickedUri;
    const hasText = !!draft.trim();
    if ((!hasText && !hasImage) || send.isPending || attachment.isUploading) return;
    if (hasImage && !isOnline) {
      // uploadError banner handles display — we just block the send
      return;
    }
    if (!farmerId) return;
    const text = draft.trim() || t("chat.analyzeImagePrompt");
    const localUri = attachment.pickedUri ?? undefined;
    setDraft("");
    let imageRef: string | undefined;
    if (hasImage) {
      try {
        imageRef = await attachment.upload(farmerId, guessImagePurpose(draft.trim()));
      } catch {
        return; // uploadError set inside hook
      }
      attachment.clearImage();
    }
    const payload: SendQueryInput = {
      text,
      farmerId,
      language,
      state,
      district,
      connectivity,
      ...(imageRef ? { imageRef } : {}),
      ...(localUri ? { imageLocalUri: localUri } : {}),
    };
    void send.mutateAsync(payload).catch(() => undefined);
  }, [attachment, draft, farmerId, language, state, district, connectivity, send, isOnline, t]);

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

  const onSpeak = (line: string) => {
    Speech.stop();
    Speech.speak(line, { language: localeForSpeech(i18n.language) });
  };

  const isBusy = send.isPending || attachment.isUploading;
  const canSend = (!!draft.trim() || !!attachment.pickedUri) && !isBusy;

  if (!ready || isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-page"
        style={{ paddingTop: insets.top }}
        accessibilityLabel={t("chat.loading")}
      >
        <ActivityIndicator color="#0D631B" />
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top + 8}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border/60 bg-card px-4 py-3">
        <View className="flex-1">
          <Text className="font-display text-lg text-title-green">{t("chat.title")}</Text>
          <Text className="font-body text-xs text-ink-muted">{t("chat.subtitle")}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${isOnline ? "bg-brand/10" : "bg-muted"}`}>
          <Text
            className={`font-body-semibold text-xs ${isOnline ? "text-brand" : "text-ink-muted"}`}
          >
            {isOnline ? t("chat.modeOnline") : t("chat.modeOffline")}
          </Text>
        </View>
      </View>

      {/* Message list */}
      <FlatList
        ref={listRef}
        className="flex-1 px-3 pt-3"
        data={messages}
        keyExtractor={(m) => m.id}
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
                sendPayload(userText, { skipUserMessage: true, forceBackend: true });
              }}
              onSpeak={onSpeak}
              busy={isBusy}
            />
          );
        }}
        ListEmptyComponent={
          <Text className="px-2 py-8 text-center font-body text-ink-muted">
            {t("chat.empty")}
          </Text>
        }
        ListFooterComponent={send.isPending ? <TypingIndicator /> : null}
      />

      {/* Error banners */}
      {send.isError ? (
        <View className="bg-danger/10 px-4 py-2">
          <Text className="text-center font-body text-sm text-danger">
            {send.error instanceof Error ? send.error.message : t("errors.generic")}
          </Text>
        </View>
      ) : null}
      {attachment.uploadError ? (
        <View className="bg-danger/10 px-4 py-2">
          <Text className="text-center font-body text-sm text-danger">
            {t("chat.imageUploadFailed")}
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
        <View className="flex-row items-center gap-3 border-t border-border/60 bg-card px-4 py-2">
          <Image
            source={{ uri: attachment.pickedUri }}
            style={{ width: 60, height: 60, borderRadius: 8 }}
            resizeMode="cover"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.removeImage")}
            onPress={attachment.clearImage}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="close-circle" size={24} color="#6B7280" />
          </Pressable>
        </View>
      ) : null}

      {/* Input row */}
      <View
        className="border-t border-border/60 bg-card px-3 pt-2"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <View className="flex-row items-end gap-2">
          {/* Gallery picker */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.attachImage")}
            onPress={() => { void attachment.pickImage("gallery"); }}
            className="mb-1 p-1"
            disabled={isBusy}
          >
            <MaterialCommunityIcons name="paperclip" size={26} color="#0D631B" />
          </Pressable>

          {/* Voice mic (only shown when voiceStt available) */}
          {voiceStt ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: listening }}
              onPress={() => { void toggleVoice(); }}
              className="mb-1 p-1"
            >
              <MaterialCommunityIcons
                name={listening ? "microphone" : "microphone-outline"}
                size={26}
                color={listening ? "#B45309" : "#0D631B"}
              />
            </Pressable>
          ) : null}

          <TextInput
            className="max-h-28 min-h-[48px] flex-1 rounded-2xl border border-border bg-muted px-4 py-3 font-body text-base text-ink"
            placeholder={t("chat.placeholder")}
            placeholderTextColor="#78716C"
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!isBusy}
            returnKeyType="send"
            onSubmitEditing={() => { void onSend(); }}
            blurOnSubmit={false}
          />

          {/* Camera picker */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.takePhoto")}
            onPress={() => { void attachment.pickImage("camera"); }}
            className="mb-1 p-1"
            disabled={isBusy}
          >
            <MaterialCommunityIcons name="camera-outline" size={26} color="#0D631B" />
          </Pressable>

          {/* Send / uploading */}
          <Pressable
            accessibilityRole="button"
            onPress={() => { void onSend(); }}
            disabled={!canSend}
            className="mb-1 rounded-full bg-brand p-3 disabled:opacity-40"
          >
            {attachment.isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={22} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
