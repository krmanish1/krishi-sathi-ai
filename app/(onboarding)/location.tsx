import { useEffect, useState } from "react";
import {
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useOnboarding } from "@/features/onboarding/store";
import { detectLocation } from "@/features/onboarding/useLocation";

export default function LocationScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setLocation = useOnboarding((s) => s.setLocation);
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [landSize, setLandSize] = useState("");
  const [irrigation, setIrrigation] = useState(true);
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
        if (!d.state && !d.district && d.failureReason) {
          Alert.alert(
            t("onboarding.locationEnableTitle"),
            t("onboarding.locationEnableBody"),
            [
              { text: t("onboarding.locationNotNow"), style: "cancel" },
              {
                text: t("onboarding.locationOpenSettings"),
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
        }
      })
      .finally(() => setLocating(false));
  }, [t]);

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
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-border">
            <MaterialCommunityIcons name="account" size={22} color="#14532D" />
          </View>
          <Text className="font-display text-3xl text-title-green">Krishi AI Saathi</Text>
        </View>
        <Pressable className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <MaterialCommunityIcons name="translate" size={20} color="#0D631B" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 mt-4">
          <View className="self-start rounded-full bg-coral px-4 py-1.5">
            <Text className="font-body-semibold text-xs uppercase tracking-widest text-earth">
              STEP 1 : IDENTITY
            </Text>
          </View>
          <Text className="mt-4 font-xb text-5xl leading-[50px] text-ink">
            Grow with{"\n"}
            <Text className="italic text-brand">Intelligence.</Text>
          </Text>
          <Text className="mt-3 font-body text-2xl leading-9 text-ink-muted">
            Tell us about your land to get personalized crop insights and market alerts.
          </Text>
        </View>

        <View className="rounded-[32px] bg-white p-7 shadow-cta">
          <View>
            <Text className="mb-2 font-body-semibold text-sm tracking-wide text-ink">
              {t("onboarding.stateLabel")}
            </Text>
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="Maharashtra"
              className="min-h-[56px] rounded-xl bg-muted px-5 text-base text-ink"
              placeholderTextColor="#A8A29E"
              autoCorrect={false}
            />
          </View>
          <View className="mt-4">
            <Text className="mb-2 font-body-semibold text-sm tracking-wide text-ink">
              {t("onboarding.districtLabel")}
            </Text>
            <TextInput
              value={district}
              onChangeText={setDistrict}
              placeholder="Nashik"
              className="min-h-[56px] rounded-xl bg-muted px-5 text-base text-ink"
              placeholderTextColor="#A8A29E"
              autoCorrect={false}
            />
          </View>
          <View className="mt-4">
            <Text className="mb-2 font-body-semibold text-sm tracking-wide text-ink">Land Size (Acres)</Text>
            <View className="relative">
              <TextInput
                value={landSize}
                onChangeText={setLandSize}
                placeholder="5.5"
                keyboardType="decimal-pad"
                className="min-h-[56px] rounded-xl bg-muted px-5 pr-20 text-base text-ink"
                placeholderTextColor="#A8A29E"
              />
              <Text className="absolute right-5 top-[18px] font-body-semibold text-sm uppercase text-ink-muted">
                Acres
              </Text>
            </View>
          </View>
          <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-muted px-4 py-4">
            <View>
              <Text className="font-body-semibold text-sm text-ink">Irrigation Available?</Text>
              <Text className="font-body text-xs text-ink-muted">Pumps, Wells, or Canals</Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: irrigation }}
              onPress={() => setIrrigation((prev) => !prev)}
              className={`h-8 w-14 rounded-full ${irrigation ? "bg-brand" : "bg-stone/40"}`}
            >
              <View
                className={`mt-1 h-6 w-6 rounded-full bg-white ${irrigation ? "ml-7" : "ml-1"}`}
              />
            </Pressable>
          </View>

          <View className="mt-4 overflow-hidden rounded-2xl">
            <Image
              source={{ uri: "https://www.figma.com/api/mcp/asset/61bee173-7140-4b02-b0d4-a69add1e0e07" }}
              style={{ height: 156, width: "100%" }}
              contentFit="cover"
            />
            <View className="absolute bottom-4 left-4">
              <Text className="font-body-semibold text-[10px] uppercase tracking-widest text-white/90">
                LOCAL WEATHER
              </Text>
              <Text className="font-display text-2xl text-white">28°C · Sunny</Text>
            </View>
          </View>
        </View>

        {locating ? (
          <View className="mt-3 flex-row items-center gap-2">
            <ActivityIndicator color="#0B3D2E" />
            <Text className="font-body text-sm text-ink-muted">Detecting your location...</Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="px-6 pb-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          className="min-h-[64px] flex-row items-center justify-center rounded-2xl bg-brand"
        >
          <Text className="font-display text-3xl text-white">Start AI Advisor</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 10 }} />
        </Pressable>
      </View>
    </View>
  );
}
