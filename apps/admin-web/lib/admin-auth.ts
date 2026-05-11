import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AdminActor {
  readonly authUserId: string;
  readonly profilePk: string;
  readonly roleCode: string;
}

export async function getAdminActor(): Promise<AdminActor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceRoleSupabaseClient();
  const { data: profile } = await service
    .from("iam_profile")
    .select("iam_profile_pk")
    .eq("auth_user_fk", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: membership } = await service
    .from("iam_platform_membership")
    .select("iam_platform_role(role_code)")
    .eq("iam_profile_fk", profile.iam_profile_pk)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const role = Array.isArray(membership?.iam_platform_role)
    ? membership?.iam_platform_role[0]
    : membership?.iam_platform_role;

  if (!role?.role_code) return null;
  return { authUserId: user.id, profilePk: profile.iam_profile_pk, roleCode: role.role_code };
}

export async function requireAdminActor(): Promise<AdminActor | NextResponse> {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Platform admin access is required." }, { status: 403 });
  }
  return actor;
}
