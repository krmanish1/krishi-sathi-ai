import Constants from "expo-constants";

type Environment = "development" | "staging" | "production";

function getEnvironment(): Environment {
  return __DEV__ ? "development" : "production";
}

function resolveApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof fromExtra === "string" && fromExtra) return fromExtra;
  if (getEnvironment() === "development") {
    return "http://localhost:8080";
  }
  return "https://api.krishisaathi.ai";
}

export const config = {
  env: getEnvironment(),
  apiBaseUrl: resolveApiBaseUrl(),
  isDev: getEnvironment() === "development",
  isStaging: getEnvironment() === "staging",
  isProd: getEnvironment() === "production",
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl as string | undefined,
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined,
  useNativeGemma: Constants.expoConfig?.extra?.useNativeGemma === "1",
} as const;
