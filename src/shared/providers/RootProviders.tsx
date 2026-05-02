import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { useEffect, useState, type ReactNode } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import i18n from "@/shared/i18n";
import { AuthProvider } from "@/shared/auth/AuthProvider";
import { ApiStatusProvider } from "@/shared/api";
import { SyncPushScheduler } from "@/shared/providers/SyncPushScheduler";
import Constants from "expo-constants";
import { initDb } from "@/shared/storage/db";
import { setGemmaBackend } from "@/shared/ondevice/gemma";
import { mockGemmaBackend } from "@/shared/ondevice/mock";
import { createNativeBackend } from "@/shared/ondevice/native-backend";
import { isNativeGemmaModuleLinked } from "@/modules/gemma-llm/src";
import { theme } from "@/shared/ui/theme/tokens";
import { initAuthBrowser } from "@/shared/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

export const RootProviders = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAuthBrowser();
  }, []);
  const [fonts] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDb();
        const useNative = Constants.expoConfig?.extra?.useNativeGemma === "1";
        const modelPath = String(
          Constants.expoConfig?.extra?.nativeGemmaModelPath ??
            "/data/local/tmp/gemma-4-e4b-it.task",
        );
        if (useNative && isNativeGemmaModuleLinked()) {
          setGemmaBackend(createNativeBackend(modelPath));
        } else {
          setGemmaBackend(mockGemmaBackend);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!fonts || !ready) {
    return (
      <View style={styles.splash} accessibilityLabel="Loading">
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SyncPushScheduler />
              <ApiStatusProvider>
                <StatusBar style="light" />
                {children}
              </ApiStatusProvider>
            </AuthProvider>
          </QueryClientProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },
});
