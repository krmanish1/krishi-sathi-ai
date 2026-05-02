import { useEffect, useMemo } from "react";
import { ActivityIndicator, Alert, Platform, Text, View } from "react-native";
import { getInitialURL, useLinkingURL } from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { getSupabase } from "@/shared/supabase/client";
import { createSessionFromAuthUrl } from "@/shared/supabase/socialAuth";

function syntheticOAuthUrl(params: {
  code?: string;
  error?: string;
  error_description?: string;
}): string {
  if (typeof params.code === "string" && params.code.length > 0) {
    return `https://oauth.local/callback?code=${encodeURIComponent(params.code)}`;
  }
  if (typeof params.error === "string") {
    const q = new URLSearchParams({ error: params.error });
    if (typeof params.error_description === "string") {
      q.set("error_description", params.error_description);
    }
    return `https://oauth.local/callback?${q.toString()}`;
  }
  return "";
}

function pickOAuthReturnUrl(
  linkingUrl: string | null,
  initialUrl: string | null,
  params: { code?: string; error?: string; error_description?: string },
): string {
  for (const u of [linkingUrl, initialUrl]) {
    if (u && (u.includes("code=") || u.includes("error="))) {
      return u;
    }
  }
  return syntheticOAuthUrl(params);
}

/**
 * OAuth return for PKCE (`?code=…`). Web uses `window.location`; native (Expo Go) uses `exp://…/--/auth-callback`
 * via linking / route params.
 */
export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const linkingUrl = useLinkingURL();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();

  const paramsKey = useMemo(
    () =>
      `${String(params.code ?? "")}:${String(params.error ?? "")}:${String(params.error_description ?? "")}`,
    [params.code, params.error, params.error_description],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        router.replace("/(auth)/login");
        return;
      }

      const {
        data: { session: existing },
      } = await supabase.auth.getSession();
      if (existing) {
        router.replace("/");
        return;
      }

      let url = "";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        url = window.location.href;
      } else {
        const initialUrl = await getInitialURL().catch(() => null);
        url = pickOAuthReturnUrl(linkingUrl, initialUrl, params);
      }

      if (!url) {
        if (Platform.OS !== "web") {
          return;
        }
        router.replace("/");
        return;
      }

      try {
        await createSessionFromAuthUrl(url);
        if (cancelled) return;
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.history.replaceState({}, "", `${window.location.origin}/`);
        }
        router.replace("/");
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        Alert.alert(t("errors.generic"), message);
        router.replace("/(auth)/login");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [linkingUrl, paramsKey, params, t]);

  return (
    <View className="flex-1 items-center justify-center bg-page px-6">
      <ActivityIndicator size="large" color="#1ed760" />
      <Text className="mt-4 text-center text-ink-muted">{t("auth.callbackWorking")}</Text>
    </View>
  );
}
