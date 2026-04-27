import { FlatList, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type Language } from "@/shared/config/constants";
import { useOnboarding } from "@/features/onboarding/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LABEL: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ",
  te: "తెలుగు",
  mr: "मराठी",
  bn: "বাংলা",
};

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const setLanguage = useOnboarding((s) => s.setLanguage);
  return (
    <View
      className="bg-paper flex-1"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="border-b border-black/5 bg-white px-4 py-4">
        <Text className="text-xl font-bold text-brand">{t("onboarding.pickLanguage")}</Text>
      </View>
      <FlatList
        data={SUPPORTED_LANGUAGES as unknown as Language[]}
        keyExtractor={(item) => item}
        contentContainerClassName="px-2 py-2"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={LABEL[item]}
            onPress={() => {
              setLanguage(item);
              void i18n.changeLanguage(item);
              router.push("/(onboarding)/location");
            }}
            className="mb-1 min-h-[56px] flex-row items-center justify-between rounded-xl bg-white px-4 active:bg-surface-muted"
          >
            <Text className="text-base font-medium text-text">{LABEL[item]}</Text>
            <Text className="text-text-muted">→</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
