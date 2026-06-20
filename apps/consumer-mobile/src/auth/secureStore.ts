import type { SecureKeyValueStore } from "@gozaika/mobile-core";
import * as SecureStore from "expo-secure-store";

/** expo-secure-store adapter for the Supabase session (never AsyncStorage). */
export const secureKeyValueStore: SecureKeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
