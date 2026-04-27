import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View, Text, ScrollView, Pressable, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useOnboarding } from "@/features/onboarding/store";
import { useConnectivity } from "@/shared/network/useConnectivity";

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const district = useOnboarding((s) => s.district);
  const state = useOnboarding((s) => s.state);
  const connectivity = useConnectivity();
  const isOffline = connectivity === "offline" || connectivity === "degraded";
  const timeLabel = format(new Date(), "hh:mm a");
  const placeLabel =
    district && state ? `${district}, ${state}` : t("home.weatherSample", { place: "—" });

  return (
    <View className="flex-1 bg-page">
      <BlurView
        intensity={Platform.OS === "ios" ? 48 : 32}
        tint="light"
        className="border-b border-border/60"
        style={{ paddingTop: insets.top, paddingBottom: 12, paddingHorizontal: 20 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="size-10 overflow-hidden rounded-full bg-border">
              <View className="flex-1 items-center justify-center bg-brand/10">
                <MaterialCommunityIcons name="account" size={22} color="#14532D" />
              </View>
            </View>
            <Text className="font-display text-2xl tracking-tight text-title-green">
              {t("home.headerTitle")}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            className="rounded-full p-2"
            onPress={() => undefined}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color="#14532D" />
          </Pressable>
        </View>
      </BlurView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 180,
          maxWidth: 1024,
          width: width,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {isOffline ? (
          <View className="mb-6 items-center">
            <View className="flex-row items-center gap-2 rounded-full border border-earth/20 bg-earth/10 px-4 py-2">
              <MaterialCommunityIcons name="cloud-off-outline" size={14} color="#7A5649" />
              <Text className="font-body-semibold text-sm tracking-wide text-earth">
                {t("home.offlinePill")}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="mb-6">
          <Text className="font-xb text-3xl leading-9 tracking-tight text-ink">
            {t("home.greetingName", { name: "Rajesh" })}
          </Text>
          <Text className="mt-2 font-body-medium text-base leading-6 text-ink-muted">
            {t("home.cacheLine", { time: timeLabel })}
          </Text>
          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => router.push("/(tabs)/chat")}
              className="border-primary min-h-[44px] flex-1 items-center justify-center rounded-xl border bg-card"
              accessibilityRole="button"
              accessibilityLabel={t("tabs.assistant")}
            >
              <Text className="font-body-semibold text-title-green">{t("tabs.assistant")}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/scan")}
              className="border-primary min-h-[44px] flex-1 items-center justify-center rounded-xl border bg-card"
              accessibilityRole="button"
              accessibilityLabel={t("scan.title")}
            >
              <Text className="font-body-semibold text-title-green">{t("scan.title")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Weather card */}
        <View className="mb-6 overflow-hidden rounded-bento border border-border bg-card p-6 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <View className="self-start rounded bg-amber/10 px-2 py-0.5">
                <Text className="font-body-semibold text-xs uppercase tracking-wider text-amber">
                  {t("home.cachedWeather")}
                </Text>
              </View>
              <Text className="mt-2 font-display text-4xl text-ink">{t("home.tempSample")}</Text>
              <Text className="mt-1 font-body-medium text-ink-muted">
                {t("home.weatherSample", { place: placeLabel })}
              </Text>
            </View>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={42} color="#6D5100" />
          </View>
          <View className="mt-6 flex-row gap-4">
            <View className="flex-1 rounded-lg bg-muted p-3">
              <Text className="font-body-semibold text-[10px] uppercase tracking-tight text-ink-muted">
                {t("home.humidity")}
              </Text>
              <Text className="mt-0.5 font-body-semibold text-lg text-ink">45%</Text>
            </View>
            <View className="flex-1 rounded-lg bg-muted p-3">
              <Text className="font-body-semibold text-[10px] uppercase tracking-tight text-ink-muted">
                {t("home.rainChance")}
              </Text>
              <Text className="mt-0.5 font-body-semibold text-lg text-ink">10%</Text>
            </View>
          </View>
        </View>

        {/* Sync pending */}
        <View className="mb-6 rounded-bento border-2 border-dashed border-border bg-card p-[26px]">
          <View className="size-10 items-center justify-center rounded-full bg-coral">
            <MaterialCommunityIcons name="sync-alert" size={18} color="#1A1C1C" />
          </View>
          <Text className="mt-3 font-display text-xl text-ink">{t("home.syncTitle")}</Text>
          <Text className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
            {t("home.syncBody")}
          </Text>
          <Pressable
            className="mt-4 flex-row items-center gap-1 self-start"
            onPress={() => undefined}
          >
            <Text className="font-body-semibold text-sm text-brand">{t("home.retrySync")}</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#0D631B" />
          </Pressable>
        </View>

        {/* Market prices */}
        <View className="mb-6 rounded-bento bg-card p-6">
          <View className="flex-row items-start justify-between">
            <Text className="font-display text-lg text-ink">{t("home.marketTitle")}</Text>
            <View className="flex-row items-center gap-1">
              <View className="size-2 rounded-full bg-amber" />
              <Text className="font-body-semibold text-[10px] uppercase text-amber">
                {t("home.pending")}
              </Text>
            </View>
          </View>
          <View className="mt-4 gap-4 opacity-90">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <MaterialCommunityIcons name="barley" size={22} color="#1A1C1C" />
                <View>
                  <Text className="font-body-semibold text-sm text-ink">Wheat</Text>
                  <Text className="font-body-medium text-[10px] uppercase tracking-tight text-ink">
                    {t("home.mandiLabel", { place: "KARNAL" })}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="font-body-semibold text-sm text-ink">₹2,125</Text>
                <Text className="font-body-semibold text-[10px] text-danger">-2.1%</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <MaterialCommunityIcons name="leaf" size={20} color="#1A1C1C" />
                <View>
                  <Text className="font-body-semibold text-sm text-ink">Mustard</Text>
                  <Text className="font-body-medium text-[10px] uppercase tracking-tight text-ink">
                    {t("home.mandiLabel", { place: "REWARI" })}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="font-body-semibold text-sm text-ink">₹5,450</Text>
                <Text className="font-body-semibold text-[10px] text-success">+1.4%</Text>
              </View>
            </View>
          </View>
          <View className="mt-4 border-t border-muted pt-4">
            <Text className="font-body text-[11px] italic leading-snug text-ink-muted">
              {t("home.priceFootnote")}
            </Text>
          </View>
        </View>

        {/* Sowing CTA */}
        <LinearGradient
          colors={["#0D631B", "#2E7D32"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 16, marginBottom: 24, padding: 32 }}
        >
          <View className="absolute -bottom-10 -right-10 size-64 rounded-full bg-white/5" />
          <Text className="text-center font-display text-2xl leading-8 text-white">
            {t("home.sowingTitle")}
          </Text>
          <Text className="mt-3 text-center font-body text-lg leading-7 text-mint-subtle opacity-95">
            {t("home.sowingSub")}
          </Text>
          <Pressable className="mt-6 items-center self-center rounded-xl bg-white px-8 py-3 shadow">
            <Text className="font-body-semibold text-base text-brand">{t("home.viewGuide")}</Text>
          </Pressable>
        </LinearGradient>

        {/* Offline docs */}
        <View className="mb-8 rounded-bento bg-muted p-6">
          <Text className="font-display text-lg text-ink">{t("home.docsTitle")}</Text>
          <View className="mt-4 gap-3">
            {[t("home.doc1"), t("home.doc2"), t("home.doc3")].map((label) => (
              <View key={label} className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="file-document-outline" size={15} color="#40493D" />
                <Text className="font-body-medium text-sm text-ink-muted">{label}</Text>
              </View>
            ))}
          </View>
          <View className="mt-4 border-t border-border pt-4">
            <Text className="font-body-semibold text-[10px] uppercase tracking-wider text-ink-muted">
              {t("home.storage")}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FAB — match Figma: assistant / voice */}
      <View
        className="absolute z-10"
        style={{ bottom: insets.bottom + 100, right: 20 }}
        pointerEvents="box-none"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.fabLabel")}
          onPress={() => router.push("/(tabs)/chat")}
        >
          <LinearGradient
            colors={["#0D631B", "#2E7D32"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 25,
              shadowOffset: { width: 0, height: 12 },
              elevation: 12,
            }}
          >
            <MaterialCommunityIcons name="microphone" size={24} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
