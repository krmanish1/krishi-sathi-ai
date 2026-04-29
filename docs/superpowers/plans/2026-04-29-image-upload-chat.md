# Image Upload in Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up `POST /api/v1/query/image` into the chat screen with a WhatsApp-style UI — camera/gallery buttons, image preview strip, image thumbnail in user bubbles, and purpose auto-detection from typed text.

**Architecture:** A new `useImageAttachment` hook manages picking + uploading; `guessImagePurpose` detects `crop_disease / soil_photo / pest_id` from the draft text. The image is uploaded at send time, returning an `image_ref` that is passed to the existing `useSendChatMessage` mutation alongside the text. `ChatMessageRow` gets an optional `imageLocalUri` field (client-only, never written to the DB) so the optimistic bubble can render a thumbnail.

**Tech Stack:** `expo-image-picker` (already installed ~55.0.19), `react-native` `Image`, existing `postQueryImage` in `src/shared/api/endpoints.ts`, NativeWind for styling.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/features/chat/guessImagePurpose.ts` |
| Create | `src/features/chat/guessImagePurpose.test.ts` |
| Create | `src/features/chat/useImageAttachment.ts` |
| Modify | `src/features/chat/chatMessagesRepo.ts` — add `imageLocalUri?: string` to `ChatMessageRow` |
| Modify | `src/features/chat/useSendQuery.ts` — add `imageLocalUri?` to `SendQueryInput`; set it on optimistic row |
| Modify | `src/features/chat/index.ts` — export new hook + function |
| Modify | `src/shared/i18n/locales/en.json` — add 6 new keys |
| Modify | `src/shared/i18n/locales/hi.json` — add 6 new keys (parity required) |
| Modify | `app/(tabs)/chat.tsx` — WhatsApp UI + image flow wiring |

---

## Task 1: `guessImagePurpose` — purpose detection (TDD)

**Files:**
- Create: `src/features/chat/guessImagePurpose.ts`
- Create: `src/features/chat/guessImagePurpose.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/chat/guessImagePurpose.test.ts`:

```ts
import { guessImagePurpose } from "./guessImagePurpose";

describe("guessImagePurpose", () => {
  it("detects soil keywords (English)", () => {
    expect(guessImagePurpose("soil looks bad today")).toBe("soil_photo");
  });
  it("detects soil keywords (Hindi)", () => {
    expect(guessImagePurpose("मिट्टी की जांच करें")).toBe("soil_photo");
  });
  it("detects pest keywords (English)", () => {
    expect(guessImagePurpose("there is a bug on my plant")).toBe("pest_id");
  });
  it("detects pest keywords (Hindi)", () => {
    expect(guessImagePurpose("फसल पर कीड़ा लग गया")).toBe("pest_id");
  });
  it("defaults to crop_disease", () => {
    expect(guessImagePurpose("my crop is yellow")).toBe("crop_disease");
  });
  it("defaults to crop_disease for empty text", () => {
    expect(guessImagePurpose("")).toBe("crop_disease");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest src/features/chat/guessImagePurpose.test.ts --no-coverage
```

Expected: `Cannot find module './guessImagePurpose'`

- [ ] **Step 3: Implement `guessImagePurpose.ts`**

Create `src/features/chat/guessImagePurpose.ts`:

```ts
export type ImagePurpose = "crop_disease" | "soil_photo" | "pest_id";

export function guessImagePurpose(text: string): ImagePurpose {
  const t = text.toLowerCase();
  if (/(soil|mitti|माटी|मिट्टी|माती)/.test(t)) return "soil_photo";
  if (/(pest|kida|कीड़ा|insect|bug|kirda|कीट)/.test(t)) return "pest_id";
  return "crop_disease";
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx jest src/features/chat/guessImagePurpose.test.ts --no-coverage
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/guessImagePurpose.ts src/features/chat/guessImagePurpose.test.ts
git commit -m "feat(chat): add guessImagePurpose purpose detection"
```

---

## Task 2: `useImageAttachment` hook

**Files:**
- Create: `src/features/chat/useImageAttachment.ts`

- [ ] **Step 1: Create the hook**

Create `src/features/chat/useImageAttachment.ts`:

```ts
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { postQueryImage } from "@/shared/api";
import type { ImagePurpose } from "./guessImagePurpose";

export type ImageAttachment = {
  pickedUri: string | null;
  isUploading: boolean;
  uploadError: string | null;
  pickImage: (source: "camera" | "gallery") => Promise<void>;
  clearImage: () => void;
  upload: (farmerId: string, purpose: ImagePurpose) => Promise<string>;
};

export function useImageAttachment(): ImageAttachment {
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pickImage = async (source: "camera" | "gallery") => {
    const fn =
      source === "camera"
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;
    const result = await fn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
      setUploadError(null);
    }
  };

  const clearImage = () => {
    setPickedUri(null);
    setUploadError(null);
  };

  const upload = async (farmerId: string, purpose: ImagePurpose): Promise<string> => {
    if (!pickedUri) throw new Error("No image selected");
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await postQueryImage({ uri: pickedUri, farmerId, purpose });
      return result.image_ref;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setUploadError(msg);
      throw e;
    } finally {
      setIsUploading(false);
    }
  };

  return { pickedUri, isUploading, uploadError, pickImage, clearImage, upload };
}
```

- [ ] **Step 2: Run typecheck — verify no errors**

```bash
npm run typecheck 2>&1 | head -30
```

Expected: no errors in `useImageAttachment.ts`

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/useImageAttachment.ts
git commit -m "feat(chat): add useImageAttachment hook"
```

---

## Task 3: i18n keys

**Files:**
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/hi.json`

- [ ] **Step 1: Add keys to `en.json`**

Inside the `"chat"` object, add these 6 entries (after the last existing key in the object):

```json
"attachImage": "Attach image",
"takePhoto": "Take photo",
"removeImage": "Remove image",
"imageUploadFailed": "Image upload failed. Try again or remove image.",
"imageRequiresInternet": "Image analysis requires internet connection.",
"analyzeImagePrompt": "Please analyze this image."
```

- [ ] **Step 2: Add keys to `hi.json`**

Inside the `"chat"` object, add the same 6 keys in Hindi:

```json
"attachImage": "फोटो जोड़ें",
"takePhoto": "फोटो लें",
"removeImage": "फोटो हटाएं",
"imageUploadFailed": "फोटो अपलोड नहीं हुई। पुनः प्रयास करें या फोटो हटाएं।",
"imageRequiresInternet": "फोटो विश्लेषण के लिए इंटरनेट की आवश्यकता है।",
"analyzeImagePrompt": "कृपया इस तस्वीर का विश्लेषण करें।"
```

- [ ] **Step 3: Run parity test — verify it passes**

```bash
npx jest src/shared/i18n/localeKeys.test.ts --no-coverage
```

Expected: `passed`

- [ ] **Step 4: Commit**

```bash
git add src/shared/i18n/locales/en.json src/shared/i18n/locales/hi.json
git commit -m "feat(i18n): add image upload chat keys"
```

---

## Task 4: Type updates — `ChatMessageRow`, `SendQueryInput`, `useSendChatMessage`

**Files:**
- Modify: `src/features/chat/chatMessagesRepo.ts`
- Modify: `src/features/chat/useSendQuery.ts`

`ChatMessageRow.imageLocalUri` is a **client-only display field** — never stored in the DB. The SQLite `SELECT` query never returns it; it is only set on optimistic rows so the bubble can render a thumbnail while the mutation is in flight.

- [ ] **Step 1: Add `imageLocalUri` to `ChatMessageRow`**

In `src/features/chat/chatMessagesRepo.ts`, change:

```ts
export type ChatMessageRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  text: string;
  source: "ondevice" | "backend" | null;
  confidence: number | null;
  created_at: number;
};
```

to:

```ts
export type ChatMessageRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  text: string;
  source: "ondevice" | "backend" | null;
  confidence: number | null;
  created_at: number;
  /** Client-only: local image URI shown in optimistic bubble. Never persisted to DB. */
  imageLocalUri?: string;
};
```

- [ ] **Step 2: Add `imageLocalUri` to `SendQueryInput` and update `onMutate`**

In `src/features/chat/useSendQuery.ts`, change `SendQueryInput`:

```ts
export type SendQueryInput = {
  text: string;
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  connectivity: Connectivity;
  imageRef?: string;
  imageLocalUri?: string;
  /** Re-ask on server without writing another user row (e.g. low-confidence CTA). */
  skipUserMessage?: boolean;
  forceBackend?: boolean;
};
```

In the same file, update `onMutate` to forward `imageLocalUri` to the optimistic row:

```ts
onMutate: async (p: SendQueryInput) => {
  if (p.skipUserMessage) return;
  await qc.cancelQueries({ queryKey: CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID) });
  const prev = qc.getQueryData<ChatMessageRow[]>(CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID));
  const optimistic: ChatMessageRow = {
    id: `opt-${randomUUID()}`,
    thread_id: MAIN_THREAD_ID,
    role: "user",
    text: p.text.trim(),
    source: null,
    confidence: null,
    created_at: Date.now(),
    ...(p.imageLocalUri ? { imageLocalUri: p.imageLocalUri } : {}),
  };
  qc.setQueryData<ChatMessageRow[]>(
    CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID),
    (old) => [...(old ?? []), optimistic],
  );
  return { prev };
},
```

- [ ] **Step 3: Run typecheck — verify no errors**

```bash
npm run typecheck 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/chatMessagesRepo.ts src/features/chat/useSendQuery.ts
git commit -m "feat(chat): add imageLocalUri to ChatMessageRow and SendQueryInput"
```

---

## Task 5: Export new symbols from `index.ts`

**Files:**
- Modify: `src/features/chat/index.ts`

- [ ] **Step 1: Add exports**

In `src/features/chat/index.ts`, add these two lines after the existing exports:

```ts
export { guessImagePurpose } from "./guessImagePurpose";
export type { ImagePurpose } from "./guessImagePurpose";
export { useImageAttachment } from "./useImageAttachment";
export type { ImageAttachment } from "./useImageAttachment";
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/index.ts
git commit -m "feat(chat): export guessImagePurpose and useImageAttachment"
```

---

## Task 6: `chat.tsx` — WhatsApp UI + image flow

**Files:**
- Modify: `app/(tabs)/chat.tsx`

This task rewrites `chat.tsx` in full. Copy the complete file below.

- [ ] **Step 1: Replace `app/(tabs)/chat.tsx` with the following**

```tsx
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
```

- [ ] **Step 2: Run typecheck — verify no errors**

```bash
npm run typecheck 2>&1 | head -40
```

Expected: no errors

- [ ] **Step 3: Run lint**

```bash
npm run lint 2>&1 | head -40
```

Fix any reported issues before continuing.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --no-coverage 2>&1 | tail -20
```

Expected: all tests pass (including the new `guessImagePurpose` tests and the existing `guessDeviceIntent` + locale parity tests)

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/chat.tsx
git commit -m "feat(chat): WhatsApp-style UI with image upload flow"
```

---

## Final verification

- [ ] Run `npm run typecheck` — must pass clean
- [ ] Run `npm run lint` — must pass clean  
- [ ] Run `npm test` — must pass clean
- [ ] Manually test on device/simulator:
  - Tap 📎 → gallery opens → pick image → preview strip appears → send → typing indicator → AI reply
  - Tap 📷 → camera opens → take photo → preview strip → type text → send → reply with image thumbnail in bubble
  - Tap ✕ on preview → image cleared, send button disabled again (if no text)
  - Turn off wifi → attach image → "Image analysis requires internet" banner appears
  - Image-only send (no text) → backend receives `analyzeImagePrompt` text + image_ref
