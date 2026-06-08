import { fetch as expoFetch } from "expo/fetch";

/**
 * Native Android/iOS use Expo's fetch (Cronet/NSURL) instead of the RN XHR polyfill,
 * which often fails with `TypeError: Network request failed` on HTTPS to public hosts.
 */
export const platformFetch: typeof fetch = expoFetch as typeof fetch;
