import { createServiceRoleSupabaseClient, STORAGE_BUCKETS } from "@gozaika/supabase";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface PortalActor {
  readonly authUserId: string;
  readonly profilePk: string;
  readonly email: string | null;
  readonly phone: string | null;
}

export async function getPortalActor(): Promise<PortalActor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const service = createServiceRoleSupabaseClient();
  const { data: profile } = await service
    .from("iam_profile")
    .select("iam_profile_pk,email_address,phone_e164")
    .eq("auth_user_fk", user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    authUserId: user.id,
    profilePk: profile.iam_profile_pk,
    email: profile.email_address ?? user.email ?? null,
    phone: profile.phone_e164 ?? user.phone ?? null,
  };
}

export async function requirePortalActor(): Promise<PortalActor | NextResponse> {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }
  return actor;
}

export async function assertRestaurantAccess(restaurantPk: string, profilePk: string): Promise<boolean> {
  const service = createServiceRoleSupabaseClient();
  const { data } = await service
    .from("restaurant_team_membership")
    .select("restaurant_team_membership_pk")
    .eq("restaurant_fk", restaurantPk)
    .eq("iam_profile_fk", profilePk)
    .eq("is_active", true)
    .maybeSingle();

  return Boolean(data);
}

export function createPrivateDocumentPath(restaurantPk: string, documentTypeCode: string, fileName: string): string {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "bin";
  const safeExtension = extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : "bin";
  return `restaurants/${restaurantPk}/compliance/${documentTypeCode}/${randomUUID()}.${safeExtension}`;
}

export const privateDocumentBucket = STORAGE_BUCKETS.privateDocuments;
