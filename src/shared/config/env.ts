import Constants from "expo-constants";

type Extra = { apiBaseUrl: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const getApiBaseUrl = (): string => {
  const url = extra.apiBaseUrl;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not set in app config extra.apiBaseUrl");
  }
  return url;
};
