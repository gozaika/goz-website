import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { requiredEnv, supabaseUrl } from "./env.ts";

export function createServiceClient() {
  return createClient(supabaseUrl(), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

