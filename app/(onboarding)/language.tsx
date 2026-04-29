import { useState } from "react";
import { Text, View, Pressable, Switch } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import type { Language } from "@/shared/config/constants";
import { useOnboarding } from "@/features/onboarding/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CHOICES: { key: Language; title: string; subtitle: string; icon: string; iconBg: string }[] = [
  { key: "hi", title: "हिंदी", subtitle: "Hindi", icon: "translate-variant", iconBg: "#FFF7ED" },
  { key: "en", title: "English", subtitle: "English", icon: "alphabetical-variant", iconBg: "#EFF6FF" },
];

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const setLanguage = useOnboarding((s) => s.setLanguage);
  const selectedLanguage = (useOnboarding((s) => s.language) ?? "hi") as Language;
  const [voiceAssistant, setVoiceAssistant] = useState(false);

  const onNext = () => {
    router.push("/(onboarding)/location");
  };

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="flex-1 px-6">
        <View className="items-center pb-8 pt-8">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand">
            <MaterialCommunityIcons name="tractor" size={32} color="#CBFFC2" />
          </View>
          <Text className="mt-4 text-center font-xb text-4xl text-brand">Krishi AI Saathi</Text>
          <Text className="mt-2 text-center font-body-medium text-lg text-ink-muted">
            {t("onboarding.pickLanguage")}
          </Text>
        </View>

        <View className="gap-4">
          {CHOICES.map((item) => {
            const selected = selectedLanguage === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.subtitle}
                onPress={() => {
                  setLanguage(item.key);
                  void i18n.changeLanguage(item.key);
                }}
                className={`min-h-[104px] flex-row items-center justify-between rounded-2xl px-6 ${
                  selected ? "border-2 border-brand bg-white" : "bg-muted"
                }`}
              >
                <View className="flex-row items-center gap-4">
                  <View
                    className="h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: item.iconBg }}
                  >
                    <MaterialCommunityIcons name={item.icon as never} size={22} color="#0D631B" />
                  </View>
                  <View>
                    <Text className="font-xb text-[32px] leading-8 text-ink">{item.title}</Text>
                    <Text className="mt-1 font-body-medium text-base text-ink-muted">{item.subtitle}</Text>
                  </View>
                </View>
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full ${
                    selected ? "bg-brand" : "border-2 border-[#BFD0BA] bg-transparent"
                  }`}
                >
                  {selected ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 rounded-2xl bg-muted px-5 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand/20">
                <MaterialCommunityIcons name="microphone" size={18} color="#0D631B" />
              </View>
              <Text className="font-body-semibold text-ink">Voice Assistant</Text>
            </View>
            <Switch
              value={voiceAssistant}
              onValueChange={setVoiceAssistant}
              trackColor={{ true: "#0D631B", false: "#CBD5E1" }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text className="mt-2 font-body text-sm leading-6 text-ink-muted">
            Enable voice commands for hands-free assistance in your language.
          </Text>
        </View>

        <View className="mt-4 overflow-hidden rounded-2xl">
          <Image
            source={{ uri: "https://www.figma.com/api/mcp/asset/ac09505f-ceba-4ce2-9e53-06ffffa2e7d1" }}
            style={{ height: 150, width: "100%" }}
            contentFit="cover"
          />
        </View>
      </View>

      <View
        className="border-t border-black/5 bg-page/90 px-6 pb-6 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onNext}
          className="min-h-[64px] flex-row items-center justify-center rounded-2xl bg-brand"
        >
          <Text className="font-display text-2xl text-white">{t("onboarding.continue")}</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 10 }} />
        </Pressable>
      </View>
    </View>
  );
}
