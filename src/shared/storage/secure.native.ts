import * as SecureStore from "expo-secure-store";

export const secureGet = (key: string): Promise<string | null> => SecureStore.getItemAsync(key);

export const secureSet = (key: string, value: string): Promise<void> =>
  SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });

export const secureDelete = (key: string): Promise<void> => SecureStore.deleteItemAsync(key);
