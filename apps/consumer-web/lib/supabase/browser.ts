"use client";

import { createBrowserSupabaseClient } from "@gozaika/supabase";

export function createClient() {
  return createBrowserSupabaseClient();
}
