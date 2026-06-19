/**
 * Supabase session storage adapter, dependency-injected so mobile-core stays
 * React-Native-free and node-testable. The app passes a SecureStore-backed
 * implementation (shared spec §3/§5.1: refresh/session secrets live in
 * expo-secure-store, never AsyncStorage). Keys are namespaced per app.
 */
export interface SecureKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The async storage shape Supabase Auth expects. */
export interface SupabaseAuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SessionStorageOptions {
  /** Namespace prefix, e.g. "gozaika-customer". */
  readonly namespace: string;
}

/**
 * Wrap a secure key-value store as Supabase Auth storage. SecureStore disallows
 * some characters in keys, so keys are sanitized and namespaced.
 */
export function createSupabaseAuthStorage(
  store: SecureKeyValueStore,
  options: SessionStorageOptions,
): SupabaseAuthStorage {
  const prefix = `${options.namespace}.`;
  const scopedKey = (key: string): string => (prefix + key).replace(/[^a-zA-Z0-9._-]/g, "_");

  return {
    getItem: (key) => store.getItem(scopedKey(key)),
    setItem: (key, value) => store.setItem(scopedKey(key), value),
    removeItem: (key) => store.removeItem(scopedKey(key)),
  };
}
