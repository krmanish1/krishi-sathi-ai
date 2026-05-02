import { signInWithOAuthProvider } from "./socialAuth";

/** Web: browser OAuth flow (same as before). */
export async function signInWithGoogle(): Promise<void> {
  await signInWithOAuthProvider("google");
}

export async function signOutGoogleNative(): Promise<void> {
  /* no-op on web */
}
