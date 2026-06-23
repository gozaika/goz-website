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
  mediaIngest: "media-ingest",
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

// ---- Mobile bearer authentication (server-only; shared spec §5.2) ----

/** Actor identity resolved from a Supabase bearer token; structurally a MobileActorDto. */
export interface ResolvedMobileActor {
  readonly authUserId: string;
  readonly profilePk: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly displayName: string | null;
  readonly isConsumer: boolean;
  readonly isRestaurantUser: boolean;
  readonly isPlatformUser: boolean;
}

export type MobileBearerResult =
  | { readonly ok: true; readonly actor: ResolvedMobileActor }
  | { readonly ok: false; readonly reason: "missing_token" | "invalid_token" | "no_profile" };

/** Extract the token from an `Authorization: Bearer <token>` header. */
export function parseBearerToken(authorization: string | null | undefined): string | null {
  if (!authorization) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() ?? null;
}

/**
 * Validate a Supabase access token and resolve its `iam_profile`. Never trusts
 * client-supplied identity beyond the token; the JWT is verified by Supabase Auth
 * and the profile is read with the service role. Returns a typed failure (never
 * throws for auth problems) so callers can map to envelope error codes.
 */
export async function resolveMobileBearerActor(authorization: string | null | undefined): Promise<MobileBearerResult> {
  assertServerOnly("resolveMobileBearerActor");

  const token = parseBearerToken(authorization);
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const authed = createServerSupabaseClient(token);
  const {
    data: { user },
    error,
  } = await authed.auth.getUser(token);
  if (error || !user) {
    return { ok: false, reason: "invalid_token" };
  }

  const service = createServiceRoleSupabaseClient();
  const { data: profile } = await service
    .from("iam_profile")
    .select("iam_profile_pk,email_address,phone_e164,display_name,is_consumer,is_restaurant_user,is_platform_user")
    .eq("auth_user_fk", user.id)
    .maybeSingle();

  if (!profile) {
    return { ok: false, reason: "no_profile" };
  }

  return {
    ok: true,
    actor: {
      authUserId: user.id,
      profilePk: profile.iam_profile_pk,
      email: profile.email_address ?? user.email ?? null,
      phone: profile.phone_e164 ?? user.phone ?? null,
      displayName: profile.display_name ?? null,
      isConsumer: Boolean(profile.is_consumer),
      isRestaurantUser: Boolean(profile.is_restaurant_user),
      isPlatformUser: Boolean(profile.is_platform_user),
    },
  };
}

/** A resolved restaurant_team_membership row (incl. inactive, for correct denial codes). */
export interface ResolvedMembership {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly roleCode: string;
  readonly restaurantStatusCode: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

/**
 * Resolve every restaurant_team_membership for a profile (active and inactive),
 * with role code and restaurant status. The caller's capability policy decides
 * access; this only reads. Service-role; never exposes other tenants' data.
 */
export async function resolveRestaurantMemberships(profilePk: string): Promise<ResolvedMembership[]> {
  assertServerOnly("resolveRestaurantMemberships");

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service
    .from("restaurant_team_membership")
    .select(
      "is_active,is_default,restaurant_team_role(role_code)," +
        "restaurant_restaurant(restaurant_restaurant_pk,restaurant_name,restaurant_status_code)",
    )
    .eq("iam_profile_fk", profilePk);

  if (error) {
    throw error;
  }

  type MembershipRow = {
    readonly is_active: boolean | null;
    readonly is_default: boolean | null;
    readonly restaurant_team_role: { role_code: string } | { role_code: string }[] | null;
    readonly restaurant_restaurant:
      | { restaurant_restaurant_pk: string; restaurant_name: string; restaurant_status_code: string }
      | { restaurant_restaurant_pk: string; restaurant_name: string; restaurant_status_code: string }[]
      | null;
  };

  const memberships: ResolvedMembership[] = [];
  for (const row of (data ?? []) as unknown as MembershipRow[]) {
    const role = firstRelation(row.restaurant_team_role);
    const restaurant = firstRelation(row.restaurant_restaurant);

    if (!role?.role_code || !restaurant?.restaurant_restaurant_pk) {
      continue;
    }

    memberships.push({
      restaurantPk: restaurant.restaurant_restaurant_pk,
      restaurantName: restaurant.restaurant_name,
      roleCode: role.role_code,
      restaurantStatusCode: restaurant.restaurant_status_code,
      isDefault: Boolean(row.is_default),
      isActive: Boolean(row.is_active),
    });
  }

  return memberships;
}

/**
 * Resolve the global role -> scope-code map from `restaurant_team_role_scope`
 * (the data-driven capability source). Cached process-wide with a short TTL since
 * the mapping is global and changes rarely (only via migration). Service-role read.
 */
let roleScopeCache: { readonly at: number; readonly map: Map<string, Set<string>> } | null = null;
const ROLE_SCOPE_TTL_MS = 5 * 60_000;

export async function resolveRestaurantRoleScopes(): Promise<Map<string, Set<string>>> {
  assertServerOnly("resolveRestaurantRoleScopes");

  if (roleScopeCache && Date.now() - roleScopeCache.at < ROLE_SCOPE_TTL_MS) {
    return roleScopeCache.map;
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service
    .from("restaurant_team_role_scope")
    .select("restaurant_team_role(role_code),master_scope(scope_code)");
  if (error) {
    throw error;
  }

  type RoleScopeRow = {
    readonly restaurant_team_role: { role_code: string } | { role_code: string }[] | null;
    readonly master_scope: { scope_code: string } | { scope_code: string }[] | null;
  };

  const map = new Map<string, Set<string>>();
  for (const row of (data ?? []) as unknown as RoleScopeRow[]) {
    const role = firstRelation(row.restaurant_team_role)?.role_code;
    const scope = firstRelation(row.master_scope)?.scope_code;
    if (!role || !scope) {
      continue;
    }
    const set = map.get(role) ?? new Set<string>();
    set.add(scope);
    map.set(role, set);
  }

  roleScopeCache = { at: Date.now(), map };
  return map;
}
