import { useEffect, useState } from "react";
import { Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboarding } from "@/features/onboarding/store";
import { detectLocation } from "@/features/onboarding/useLocation";

export default function LocationScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setLocation = useOnboarding((s) => s.setLocation);
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    void detectLocation()
      .then((d) => {
        if (d.state) {
          setState(d.state);
        }
        if (d.district) {
          setDistrict(d.district);
        }
      })
      .finally(() => setLocating(false));
  }, []);

  const onContinue = () => {
    const s = state.trim();
    const di = district.trim();
    if (s.length < 2 || di.length < 2) {
      return;
    }
    setLocation(s, di);
    router.push("/(onboarding)/model-download");
  };

  return (
    <View
      className="bg-paper flex-1"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="border-b border-black/5 bg-white px-4 py-4">
        <Text className="text-xl font-bold text-brand">{t("onboarding.pickLocation")}</Text>
        {locating ? <ActivityIndicator className="mt-2" color="#0B3D2E" /> : null}
      </View>
      <View className="flex-1 gap-3 px-4 py-4">
        <View>
          <Text className="mb-1 text-sm text-text-muted">{t("onboarding.stateLabel")}</Text>
          <TextInput
            value={state}
            onChangeText={setState}
            placeholder="Punjab"
            className="min-h-[52px] rounded-xl border border-black/10 bg-white px-3 text-text"
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
          />
        </View>
        <View>
          <Text className="mb-1 text-sm text-text-muted">{t("onboarding.districtLabel")}</Text>
          <TextInput
            value={district}
            onChangeText={setDistrict}
            placeholder="Ludhiana"
            className="min-h-[52px] rounded-xl border border-black/10 bg-white px-3 text-text"
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          className="mt-4 min-h-[52px] items-center justify-center rounded-2xl bg-brand active:opacity-90"
        >
          <Text className="text-base font-semibold text-white">{t("onboarding.continue")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
