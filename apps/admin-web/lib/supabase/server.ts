import { createSsrServerSupabaseClient } from "@gozaika/supabase";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createSsrServerSupabaseClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // Middleware refreshes sessions when a server component cannot set cookies.
      }
    },
  });
}
