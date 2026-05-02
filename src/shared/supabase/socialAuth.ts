import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import type { Provider } from "@supabase/supabase-js";
import { getSupabase } from "./client";

/**
 * Must match `scheme` in app.config + Supabase Dashboard → Auth → URL Configuration → redirect URLs.
 *
 * **Expo Go:** This resolves to `exp://<host>:<port>/--/auth-callback` (not `krishisaathi://`), and the
 * host/port change with your machine and network. Add each variant you use to Supabase, or use a dev build.
 */
export function getOAuthRedirectUri(): string {
  return makeRedirectUri({ scheme: "krishisaathi", path: "auth-callback" });
}

/**
 * Completes OAuth return: PKCE `code` exchange (web/native) or implicit `access_token` / hash tokens.
 */
export async function createSessionFromAuthUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  const oauthError = typeof params.error === "string" ? params.error : undefined;
  if (oauthError) {
    const desc =
      typeof params.error_description === "string" ? params.error_description : oauthError;
    throw new Error(desc);
  }

  if (errorCode) {
    throw new Error(String(errorCode));
  }

  const supabase = getSupabase();
  if (!supabase) return;

  /** Supabase PKCE — redirect is `...?code=...` (e.g. Expo web `http://localhost:8081/auth-callback?code=`) */
  const authCode =
    (typeof params.code === "string" ? params.code : undefined) ??
    new URL(url).searchParams.get("code") ??
    undefined;
  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) throw error;
    return;
  }

  let accessToken = params.access_token as string | undefined;
  let refreshToken = params.refresh_token as string | undefined;

  if (!accessToken && url.includes("#")) {
    const hash = url.split("#")[1] ?? "";
    const q = new URLSearchParams(hash);
    accessToken = q.get("access_token") ?? undefined;
    refreshToken = q.get("refresh_token") ?? undefined;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  const expectedRedirect = getOAuthRedirectUri();
  throw new Error(
    `OAuth redirect did not include a code or tokens. In Supabase Dashboard → Auth → URL Configuration, add this exact redirect URL: ${expectedRedirect}`,
  );
}

export async function signInWithOAuthProvider(provider: Provider): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured (missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY).");
  }

  const redirectTo = getOAuthRedirectUri();
  if (__DEV__) {
    // Expo Go uses exp://…/--/auth-callback — that exact string must be allowed in Supabase (not only krishisaathi://).
    console.info("[OAuth] redirectTo — allow this URL in Supabase Auth → URL Configuration:", redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("Could not start OAuth (no authorize URL).");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success" || !("url" in result) || !result.url) {
    return;
  }

  await createSessionFromAuthUrl(result.url);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error(
      `Sign-in did not finish (no session). Confirm Supabase redirect URLs include: ${redirectTo}`,
    );
  }
}

export async function signOutSocial(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}
