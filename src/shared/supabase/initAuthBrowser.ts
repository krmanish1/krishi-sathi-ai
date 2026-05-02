import * as WebBrowser from "expo-web-browser";

/**
 * Required for OAuth on web; safe no-op pattern on native.
 * Import once from the root layout.
 */
export function initAuthBrowser(): void {
  WebBrowser.maybeCompleteAuthSession();
}
