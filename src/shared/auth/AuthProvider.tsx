import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Linking from "expo-linking";
import type { Provider, Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/shared/supabase/client";
import { createSessionFromAuthUrl, signInWithOAuthProvider, signOutSocial } from "@/shared/supabase/socialAuth";
import { signOutGoogleNative } from "@/shared/supabase/googleSignIn";

type AuthState = {
  /** Supabase user UUID when signed in, null otherwise. */
  farmerId: string | null;
  /** True once the auth check against Supabase has resolved. */
  ready: boolean;
  supabaseSession: Session | null;
  supabaseConfigured: boolean;
  signInWithOAuth: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOutSocial: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  farmerId: null,
  ready: false,
  supabaseSession: null,
  supabaseConfigured: false,
  signInWithOAuth: async () => undefined,
  signInWithEmail: async () => undefined,
  signUpWithEmail: async () => undefined,
  signOutSocial: async () => undefined,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // Initialise Supabase session listener
  useEffect(() => {
    const supabase = getSupabase();
    let subscription: { unsubscribe: () => void } | undefined;

    void (async () => {
      if (supabase) {
        const {
          data: { session: initial },
        } = await supabase.auth.getSession();
        setSession(initial);

        const { data } = supabase.auth.onAuthStateChange((_event, next) => {
          setSession(next);
        });
        subscription = data.subscription;
      }
      setReady(true);
    })();

    return () => subscription?.unsubscribe();
  }, []);

  // Handle OAuth deep-link callbacks (native)
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return undefined;

    const handleUrl = (url: string | null) => {
      if (!url || !url.includes("auth-callback")) return;
      void createSessionFromAuthUrl(url).catch(() => undefined);
    };

    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    void Linking.getInitialURL().then(handleUrl);
    return () => sub.remove();
  }, []);

  const signInWithOAuth = useCallback(async (provider: Provider) => {
    await signInWithOAuthProvider(provider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    // If the auto-confirm trigger ran, session is immediately available.
    // If for some reason session is null (e.g. dashboard still has confirm-email on),
    // try signing in with the password right away.
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    try {
      await signOutGoogleNative();
    } catch {
      /* ignore */
    }
    try {
      await signOutSocial();
    } catch {
      /* ignore */
    }
    // Force local session clear even if remote signout fails
    try {
      await supabase?.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
  }, []);

  const farmerId = session?.user?.id ?? null;

  const value = useMemo(
    () =>
      ({
        farmerId,
        ready,
        supabaseSession: session,
        supabaseConfigured: isSupabaseConfigured(),
        signInWithOAuth,
        signInWithEmail,
        signUpWithEmail,
        signOutSocial: signOut,
      }) satisfies AuthState,
    [farmerId, ready, session, signInWithOAuth, signInWithEmail, signUpWithEmail, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useFarmerId = (): string | null => useContext(Ctx).farmerId;
export const useAuthReady = (): boolean => useContext(Ctx).ready;
export const useSupabaseSession = (): Session | null => useContext(Ctx).supabaseSession;
export const useSupabaseConfigured = (): boolean => useContext(Ctx).supabaseConfigured;

/** Profile / account: email + OAuth sign-in/out. */
export const useSupabaseAuth = (): Pick<
  AuthState,
  "supabaseSession" | "supabaseConfigured" | "signInWithOAuth" | "signInWithEmail" | "signUpWithEmail" | "signOutSocial"
> => {
  const c = useContext(Ctx);
  return useMemo(
    () => ({
      supabaseSession: c.supabaseSession,
      supabaseConfigured: c.supabaseConfigured,
      signInWithOAuth: c.signInWithOAuth,
      signInWithEmail: c.signInWithEmail,
      signUpWithEmail: c.signUpWithEmail,
      signOutSocial: c.signOutSocial,
    }),
    [c.signInWithOAuth, c.signInWithEmail, c.signUpWithEmail, c.signOutSocial, c.supabaseConfigured, c.supabaseSession],
  );
};
