import * as Crypto from "expo-crypto";

/** v4 UUID — uses Expo’s crypto on native + web (Metro resolves this; the `uuid` npm package does not). */
export function randomUUID(): string {
  return Crypto.randomUUID();
}
