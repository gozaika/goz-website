import { describe, expect, it } from "vitest";
import { createSupabaseAuthStorage, type SecureKeyValueStore } from "./session";

function fakeStore(): SecureKeyValueStore & { dump: Map<string, string> } {
  const dump = new Map<string, string>();
  return {
    dump,
    getItem: async (k) => dump.get(k) ?? null,
    setItem: async (k, v) => {
      dump.set(k, v);
    },
    removeItem: async (k) => {
      dump.delete(k);
    },
  };
}

describe("createSupabaseAuthStorage", () => {
  it("namespaces and sanitizes keys", async () => {
    const store = fakeStore();
    const auth = createSupabaseAuthStorage(store, { namespace: "gozaika-customer" });

    await auth.setItem("sb:token", "value");
    // Key is namespaced and ':' sanitized to '_'.
    expect([...store.dump.keys()][0]).toBe("gozaika-customer.sb_token");
    expect(await auth.getItem("sb:token")).toBe("value");

    await auth.removeItem("sb:token");
    expect(await auth.getItem("sb:token")).toBeNull();
  });
});
