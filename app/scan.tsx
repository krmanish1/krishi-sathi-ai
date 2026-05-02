import { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { postQueryImage } from "@/shared/api/endpoints";
import { appendMessage, useSendChatMessage } from "@/features/chat";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useOnboarding } from "@/features/onboarding/store";
import { useConnectivity } from "@/shared/network/useConnectivity";
import { ApiError } from "@/shared/api/errors";
import type { Language } from "@/shared/config/constants";

export default function ScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const farmerId = useFarmerId();
  const language = (useOnboarding((s) => s.language) ?? "en") as Language;
  const state = useOnboarding((s) => s.state) ?? "—";
  const district = useOnboarding((s) => s.district) ?? "—";
  const latRaw = useOnboarding((s) => s.lat);
  const lngRaw = useOnboarding((s) => s.lng);
  const lat = latRaw != null && Number.isFinite(latRaw) ? latRaw : undefined;
  const lng = lngRaw != null && Number.isFinite(lngRaw) ? lngRaw : undefined;
  const connectivity = useConnectivity();
  const send = useSendChatMessage();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const busy = uploading || send.isPending;

  const pick = async (src: "camera" | "library") => {
    setErr(null);
    const perm =
      src === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr(t("scan.permission"));
      return;
    }
    const res =
      src === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] });
    if (res.canceled || !res.assets[0]) return;
    setLocalUri(res.assets[0].uri);
  };

  const upload = async () => {
    if (!localUri || !farmerId || busy) return;
    setErr(null);
    setUploading(true);
    try {
      const m = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const r = await postQueryImage({ uri: m.uri, farmerId, purpose: "crop_disease" });
      // User row includes image so chat shows crop preview with the diagnosis prompt
      await appendMessage({
        role: "user",
        text: t("scan.diagnosisRequest"),
        imageLocalUri: m.uri,
      });
      await send.mutateAsync({
        text: t("scan.diagnosisRequest"),
        imageRef: r.image_ref,
        farmerId,
        language,
        state,
        district,
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
        connectivity,
        skipUserMessage: true,
        forceBackend: true,
      });
      router.replace("/(tabs)/chat");
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("errors.generic");
      setErr(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View
      className="flex-1 bg-page"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center border-b border-border/60 bg-card px-4 py-3">
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          className="mr-2 rounded-full p-1"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1ed760" />
        </Pressable>
        <Text className="font-display text-lg text-title-green">{t("scan.title")}</Text>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className="mb-4 font-body text-ink-muted">{t("scan.body")}</Text>
        {localUri ? (
          <Image
            source={{ uri: localUri }}
            className="mb-4 aspect-[4/3] w-full rounded-2xl bg-muted"
            resizeMode="cover"
            accessibilityLabel={t("scan.preview")}
          />
        ) : null}
        {err ? <Text className="mb-2 text-sm text-danger">{err}</Text> : null}
        <View className="gap-2">
          <Pressable
            className="min-h-[48px] items-center justify-center rounded-full border border-border-light bg-transparent px-4"
            disabled={busy}
            onPress={() => { void pick("camera"); }}
          >
            <Text className="font-body-semibold uppercase tracking-button text-ink">{t("scan.camera")}</Text>
          </Pressable>
          <Pressable
            className="min-h-[48px] items-center justify-center rounded-full border border-border-light bg-transparent px-4"
            disabled={busy}
            onPress={() => { void pick("library"); }}
          >
            <Text className="font-body-semibold uppercase tracking-button text-ink">{t("scan.library")}</Text>
          </Pressable>
          <Pressable
            className="mt-2 min-h-[48px] items-center justify-center rounded-full bg-brand px-6 shadow-dialog"
            disabled={!localUri || !farmerId || busy}
            onPress={() => { void upload(); }}
          >
            {busy ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text className="font-body-semibold uppercase tracking-button text-on-brand">{t("scan.upload")}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
