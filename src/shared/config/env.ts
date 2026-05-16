import Constants from "expo-constants";

type Extra = { apiBaseUrl: string };

export const getApiBaseUrl = (): string => {
  const url =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    ((Constants.expoConfig?.extra ?? {}) as Partial<Extra>).apiBaseUrl;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured");
  }
  return url;
};

export const getDataGovApiKey = (): string | null => {
  const key = process.env.EXPO_PUBLIC_DATA_GOV_API_KEY;
  if (typeof key !== "string" || key.length === 0) {
    if (__DEV__) console.warn("[env] EXPO_PUBLIC_DATA_GOV_API_KEY is not configured — mandi live prices disabled");
    return null;
  }
  return key;
};
