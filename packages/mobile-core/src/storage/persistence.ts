/**
 * Bounded, non-sensitive cache interface (shared spec §6): persist only bounded
 * caches; never full profiles, contact details, documents, payment tokens or raw
 * credentials. Concrete SQLite-backed impl is added in a later slice; mobile-core
 * defines the contract plus an in-memory implementation for tests/dev.
 */
export interface BoundedCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** Drop all entries (e.g. on sign-out). */
  clear(): Promise<void>;
}

/** In-memory BoundedCache for tests and as a no-persistence fallback. */
export function createMemoryCache(): BoundedCache {
  const map = new Map<string, string>();
  return {
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => {
      map.set(key, value);
    },
    remove: async (key) => {
      map.delete(key);
    },
    clear: async () => {
      map.clear();
    },
  };
}
