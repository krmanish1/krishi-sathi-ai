/**
 * Web: `expo-secure-store` has no Keychain-backed storage. Use localStorage
 * with a namespaced key (not hardware-backed; OK for PWA / dev; avoid storing secrets).
 */
const PREFIX = "ks.secure.";

export const secureGet = async (key: string): Promise<string | null> => {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
};

export const secureSet = async (key: string, value: string): Promise<void> => {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // quota / private mode
  }
};

export const secureDelete = async (key: string): Promise<void> => {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
};
