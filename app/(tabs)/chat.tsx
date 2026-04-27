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
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import { useAuthReady, useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivity } from "@/shared/network/useConnectivity";
import { useChatThread } from "@/features/chat/useChatThread";
import { useSendChatMessage, CONFIDENCE_THRESHOLD_LOW } from "@/features/chat/useSendQuery";
import type { ChatMessageRow } from "@/features/chat/chatMessagesRepo";
import type { SendQueryInput } from "@/features/chat/useSendQuery";
import { voiceStt } from "@/shared/voice/voiceClient";
import type { Language } from "@/shared/config/constants";

const localeForSpeech = (lng: string) => (lng === "hi" ? "hi-IN" : "en-US");

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
    <View className={`mb-3 max-w-[92%] ${isUser ? "self-end" : "self-start"}`}>
      <View
        className={`rounded-2xl px-4 py-3 ${isUser ? "bg-brand" : "border border-border bg-card"}`}
      >
        <Text className={`font-body text-base leading-6 ${isUser ? "text-white" : "text-ink"}`}>
          {item.text}
        </Text>
        {!isUser && item.source ? (
          <Text className="mt-1 font-body text-xs text-ink-muted">
            {item.source === "ondevice" ? t("chat.sourceOnDevice") : t("chat.sourceOnline")}
            {item.confidence != null ? ` · ${(item.confidence * 100).toFixed(0)}%` : ""}
          </Text>
        ) : null}
        {!isUser && item.role === "assistant" ? (
          <Pressable
            accessibilityRole="button"
            className="mt-2 min-h-[40px] flex-row items-center gap-1 self-end"
            onPress={() => onSpeak(item.text)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="volume-medium" size={20} color="#0D631B" />
            <Text className="font-body-semibold text-sm text-brand">{t("chat.speak")}</Text>
          </Pressable>
        ) : null}
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
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const listRef = useRef<FlatList<ChatMessageRow>>(null);
  useEffect(() => {
    if (!voiceStt) {
      return;
    }
    const onRes = (e: { value?: string[] }) => {
      const v = e.value?.[0];
      if (v) {
        setDraft((d) => (d ? `${d} ${v}` : v));
      }
    };
    const onEnd = () => {
      setListening(false);
    };
    voiceStt.onSpeechResults = onRes;
    voiceStt.onSpeechError = onEnd;
    voiceStt.onSpeechEnd = onEnd;
    return () => {
      voiceStt?.removeAllListeners();
    };
  }, []);

  const sendPayload = useCallback(
    (text: string, opt?: { skipUserMessage?: boolean; forceBackend?: boolean }) => {
      if (!farmerId) {
        return;
      }
      setDraft("");
      const payload: SendQueryInput = {
        text,
        farmerId,
        language,
        state,
        district,
        connectivity,
      };
      if (opt?.skipUserMessage) {
        payload.skipUserMessage = true;
      }
      if (opt?.forceBackend) {
        payload.forceBackend = true;
      }
      void send.mutateAsync(payload);
    },
    [farmerId, language, state, district, connectivity, send],
  );

  const onSend = () => {
    if (!draft.trim() || send.isPending) {
      return;
    }
    sendPayload(draft);
  };

  const toggleVoice = async () => {
    if (!voiceStt) {
      return;
    }
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
      <View className="border-b border-border/60 bg-card px-4 py-3">
        <Text className="font-display text-lg text-title-green">{t("chat.title")}</Text>
        <Text className="font-body text-sm text-ink-muted">{t("chat.subtitle")}</Text>
      </View>

      <FlatList
        ref={listRef}
        className="flex-1 px-3 pt-3"
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : undefined;
          const canEscalateUI =
            item.role === "assistant" &&
            item.source === "ondevice" &&
            item.confidence != null &&
            item.confidence < CONFIDENCE_THRESHOLD_LOW &&
            (connectivity === "online" || connectivity === "degraded");
          const isLast = index === messages.length - 1;
          return (
            <MessageBubble
              item={item}
              prev={prev}
              showEscalation={canEscalateUI && isLast && prev?.role === "user"}
              onTryOnline={(userText) => {
                if (!userText) {
                  return;
                }
                const p: SendQueryInput = {
                  text: userText,
                  farmerId: farmerId!,
                  language,
                  state,
                  district,
                  connectivity,
                  skipUserMessage: true,
                  forceBackend: true,
                };
                void send.mutateAsync(p);
              }}
              onSpeak={onSpeak}
              busy={send.isPending}
            />
          );
        }}
        ListEmptyComponent={
          <Text className="px-2 py-8 text-center font-body text-ink-muted">{t("chat.empty")}</Text>
        }
      />

      {send.isError ? (
        <View className="bg-danger/10 px-4 py-2">
          <Text className="text-center text-sm text-danger">
            {send.error instanceof Error ? send.error.message : t("errors.generic")}
          </Text>
        </View>
      ) : null}

      <View
        className="border-t border-border/60 bg-card px-2 pb-2"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <View className="flex-row items-end gap-2">
          {voiceStt ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: listening }}
              onPress={() => {
                void toggleVoice();
              }}
              className="mb-1 p-2"
            >
              <MaterialCommunityIcons
                name={listening ? "microphone" : "microphone-outline"}
                size={28}
                color={listening ? "#B45309" : "#0D631B"}
              />
            </Pressable>
          ) : null}
          <TextInput
            className="max-h-28 min-h-[48px] flex-1 rounded-2xl border border-border bg-muted px-4 py-3 font-body text-ink"
            placeholder={t("chat.placeholder")}
            placeholderTextColor="#78716C"
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!send.isPending}
            onSubmitEditing={onSend}
            blurOnSubmit={false}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onSend}
            disabled={!draft.trim() || send.isPending}
            className="mb-1 rounded-full bg-brand p-3 opacity-100 disabled:opacity-40"
          >
            {send.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={24} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
