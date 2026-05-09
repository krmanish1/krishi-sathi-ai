import { ExpoConfig, ConfigContext } from "expo/config";

const googleSignInPlugin: [string, { iosUrlScheme: string }] | null =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
    ? [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME,
        },
      ]
    : null;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KrishiSaathi AI",
  slug: "krishi-sathi-ai",
  owner: "krmanishs-organization",
  scheme: "krishisaathi",
  version: "0.1.0",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    // Avoid startup crashes when remote OTA download fails.
    checkAutomatically: "ON_ERROR_RECOVERY",
    fallbackToCacheTimeout: 0,
    useEmbeddedUpdate: true,
  },
  orientation: "portrait",
  userInterfaceStyle: "dark",
  icon: "./assets/images/icon.png",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#121212",
  },
  android: {
    package: "ai.krishisaathi.app",
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#121212",
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
  ios: {
    bundleIdentifier: "ai.krishisaathi.app",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    "expo-router",
    "expo-image",
    "expo-web-browser",
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
    ...(googleSignInPlugin ? [googleSignInPlugin] : []),
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: {
      projectId: "3efbd78c-90d8-49f9-8dfe-4cf9a9009f76",
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8000",
    useNativeGemma: process.env.EXPO_PUBLIC_USE_NATIVE_GEMMA ?? "0",
    nativeGemmaModelPath: process.env.EXPO_PUBLIC_NATIVE_GEMMA_MODEL_PATH ?? "",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  },
});
