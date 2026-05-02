import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";

type Extra = { supabaseUrl?: string; supabaseAnonKey?: string };

function readConfig(): { url: string; anonKey: string } | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? extra.supabaseAnonKey;
  if (typeof url !== "string" || url.length === 0) return null;
  if (typeof anonKey !== "string" || anonKey.length === 0) return null;
  return { url, anonKey };
}

let client: SupabaseClient | null | undefined;

/** Lazily create client so tests / Storybook can run without env. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = readConfig();
  if (!config) {
    client = null;
    return null;
  }
  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
      flowType: "pkce",
    },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return readConfig() !== null;
}

/** @internal tests */
export function __resetSupabaseClientForTests(): void {
  client = undefined;
}
