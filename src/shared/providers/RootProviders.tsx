import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "inversify-react";
import { container } from "@/config/ioc";
import { I18nextProvider } from "react-i18next";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
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
import {
  checkLocalGemmaModelOnDisk,
  createNativeBackend,
  getModelPath,
  mockGemmaBackend,
  setGemmaBackend,
  setModelReady,
} from "@/shared/ondevice";
import { isNativeGemmaModuleLinked } from "@/modules/gemma-llm/src";
import { theme } from "@/shared/ui/theme/tokens";
import { initAuthBrowser } from "@/shared/supabase";
import { ConnectivityProvider, useSyncOnResume } from "@/shared/network";
import { UserStoreSyncer } from "@/features/user";
import { runChatLocalCacheMigrationIfNeeded } from "@/features/chat";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useOnboarding } from "@/features/onboarding";
import { VoiceFAB, VoiceSessionSheet, useVoiceSession } from "@/features/voice";
import type { Language } from "@/shared/config/constants";

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerGlobals } = require("@livekit/react-native") as {
    registerGlobals: () => void;
  };
  registerGlobals();
}

function SyncOnResumeEffect(): null {
  useSyncOnResume();
  return null;
}

function VoiceFABConnector() {
  const farmerId = useFarmerId() ?? "";
  const { state, district, language } = useOnboarding();
  const { phase, start, stop } = useVoiceSession({
    farmerId,
    language: (language ?? "hi") as Language,
    state: state ?? "",
    district: district ?? "",
  });

  return (
    <>
      <VoiceFAB phase={phase} onStart={start} onStop={stop} />
      <VoiceSessionSheet onStop={stop} />
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

export const RootProviders = ({ children }: { children: ReactNode }) => {
  // Freeze container reference on first render — Fast Refresh re-evaluates the ioc module
  // and creates a new container object, which inversify-react rejects as a prop swap.
  const containerRef = useRef(container);
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
        await runChatLocalCacheMigrationIfNeeded(queryClient);
        await checkLocalGemmaModelOnDisk().catch(() => undefined);
        const useNative = Constants.expoConfig?.extra?.useNativeGemma === "1";
        const modelPath = getModelPath() || String(
          Constants.expoConfig?.extra?.nativeGemmaModelPath ??
            "/data/local/tmp/gemma-4-e4b-it.task",
        );
        if (useNative && isNativeGemmaModuleLinked()) {
          setGemmaBackend(createNativeBackend(modelPath));
          try {
            if (modelPath.trim()) setModelReady(modelPath);
          } catch {
            /* setModelReady rejects empty path */
          }
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

  // Keep GestureHandlerRootView + inversify Provider mounted from the first ready frame so
  // `container` is never swapped when leaving the splash branch (avoids inversify-react runtime errors).
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <Provider container={containerRef.current}>
              {!fonts || !ready ? (
                <View style={styles.splash} accessibilityLabel="Loading">
                  <ActivityIndicator size="large" color={theme.brand} />
                </View>
              ) : (
                <ConnectivityProvider>
                  <AuthProvider>
                    <UserStoreSyncer />
                    <SyncOnResumeEffect />
                    <SyncPushScheduler />
                    <ApiStatusProvider>
                      <StatusBar style="light" />
                      {children}
                      <VoiceFABConnector />
                    </ApiStatusProvider>
                  </AuthProvider>
                </ConnectivityProvider>
              )}
            </Provider>
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
