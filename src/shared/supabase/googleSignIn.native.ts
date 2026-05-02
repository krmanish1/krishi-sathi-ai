/**
 * Native Google Sign-In aligned with Supabase Auth + Expo:
 * https://supabase.com/docs/guides/auth/social-login/auth-google?queryGroups=platform&platform=react-native
 *
 * Uses `@react-native-google-signin/google-signin` → `signInWithIdToken` when the native module exists
 * (development / production builds). In **Expo Go** that module is absent — we fall back to browser OAuth
 * (same as web). Expo setup: https://react-native-google-signin.github.io/docs/setting-up/expo
 */
import Constants, { AppOwnership } from "expo-constants";
import { getSupabase } from "./client";
import { signInWithOAuthProvider } from "./socialAuth";

type GoogleSigninModule = typeof import("@react-native-google-signin/google-signin");

function isExpoGo(): boolean {
  return Constants.appOwnership === AppOwnership.Expo;
}

function loadGoogleSigninModule(): GoogleSigninModule {
  // Lazy load so Metro never evaluates the package when running in Expo Go (no native binary).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@react-native-google-signin/google-signin") as GoogleSigninModule;
}

let configured = false;

function ensureConfigured(GoogleSignin: GoogleSigninModule["GoogleSignin"]): void {
  if (configured) return;
  /** Must be the OAuth 2.0 *Web* client ID from Google Cloud (also listed first if you add multiple IDs in Supabase Dashboard → Auth → Google). */
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error(
      "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (Google Cloud → Web application OAuth client ID) in .env",
    );
  }
  GoogleSignin.configure({
    webClientId,
    ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      ? { iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }
      : {}),
    offlineAccess: false,
  });
  configured = true;
}

/**
 * Native Google Sign-In → Supabase session via ID token when `@react-native-google-signin` is linked.
 * In Expo Go or if the native module is missing, uses OAuth in the system browser (same as web).
 */
export async function signInWithGoogle(): Promise<void> {
  if (isExpoGo()) {
    await signInWithOAuthProvider("google");
    return;
  }

  let mod: GoogleSigninModule;
  try {
    mod = loadGoogleSigninModule();
  } catch {
    await signInWithOAuthProvider("google");
    return;
  }

  const { GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse } = mod;
  ensureConfigured(GoogleSignin);
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY).");
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return;
    }

    /**
     * Prefer `getTokens()` after a successful sign-in so ID token + access token stay in sync.
     * Pass `access_token` when present — Supabase uses it if the ID token includes `at_hash`.
     * @see https://supabase.com/docs/reference/javascript/auth-signinwithidtoken
     */
    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;
    const accessToken = tokens.accessToken;

    if (!idToken) {
      throw new Error(
        "No Google ID token. Use the Web OAuth client ID for webClientId and register Android/iOS clients + SHA-1 in Google Cloud.",
      );
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      ...(accessToken ? { access_token: accessToken } : {}),
    });
    if (error) throw error;
  } catch (err: unknown) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (err.code === statusCodes.IN_PROGRESS) {
        return;
      }
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("Google Play Services missing or outdated. Update Play Store / Play Services.");
      }
    }
    throw err;
  }
}

/** Call before Supabase sign-out so the Google account picker resets on next login (native module only). */
export async function signOutGoogleNative(): Promise<void> {
  if (isExpoGo()) return;
  try {
    const { GoogleSignin } = loadGoogleSigninModule();
    await GoogleSignin.signOut();
  } catch {
    /* ignore — module missing or not signed in with Google */
  }
}
