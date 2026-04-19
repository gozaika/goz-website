/**
 * @file packages/db/src/index.ts
 * @description Shared Supabase clients for goZaika web and future apps.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Singleton public client for browser and server components using anon key + RLS.
 */
export function getSupabaseClient(): SupabaseClient {
  return createClient(
    readRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    readRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  );
}
