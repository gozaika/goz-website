import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function assertServerOnly(context: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`${context} must never be called from browser or mobile client code.`);
  }
}

export function createBrowserSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required public Supabase environment variables.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function createExpoSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required Expo public Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function createServerSupabaseClient(accessToken?: string): SupabaseClient {
  assertServerOnly("createServerSupabaseClient");

  return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export interface SupabaseCookieAdapter {
  readonly getAll: () => { name: string; value: string }[];
  readonly setAll?: (
    cookies: {
      name: string;
      value: string;
      options: CookieOptions;
    }[],
  ) => void;
}

export function createSsrServerSupabaseClient(cookies: SupabaseCookieAdapter): SupabaseClient {
  assertServerOnly("createSsrServerSupabaseClient");

  return createServerClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies,
  });
}

export function createServiceRoleSupabaseClient(): SupabaseClient {
  assertServerOnly("createServiceRoleSupabaseClient");

  // TODO/HUMAN_REVIEW: Restrict imports to route handlers, Edge Functions, and internal jobs.
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export const STORAGE_BUCKETS = {
  publicMedia: "public-media",
  privateDocuments: "private-documents",
  exports: "exports",
} as const;

export function publicStorageUrl(supabaseUrl: string, bucket: string, path: string): string {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}
