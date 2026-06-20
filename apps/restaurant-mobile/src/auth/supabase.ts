import { createSupabaseAuthStorage } from "@gozaika/mobile-core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { secureKeyValueStore } from "./secureStore";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Set them in the EAS env / .env.");
}

/** Supabase client with the session persisted in SecureStore (shared spec §3/§5.1). */
export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    storage: createSupabaseAuthStorage(secureKeyValueStore, { namespace: "gozaika-restaurant" }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
