import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KrishiSaathi AI",
  slug: "krishi-sathi-ai",
  owner: "krmanishs-organization",
  scheme: "krishisaathi",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/images/icon.png",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0B3D2E",
  },
  android: {
    package: "ai.krishisaathi.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#0B3D2E",
    },
    permissions: [
      "CAMERA",
      "RECORD_AUDIO",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "INTERNET",
    ],
    blockedPermissions: [],
  },
  plugins: [
    "expo-router",
    "expo-localization",
    "expo-secure-store",
    ["expo-image-picker", { photosPermission: "We use photos to diagnose crop issues." }],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "We use location only to fetch district-specific data.",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: {
      projectId: "3efbd78c-90d8-49f9-8dfe-4cf9a9009f76",
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8000",
    useNativeGemma: process.env.EXPO_PUBLIC_USE_NATIVE_GEMMA ?? "0",
    nativeGemmaModelPath: process.env.EXPO_PUBLIC_NATIVE_GEMMA_MODEL_PATH ?? "",
  },
});
