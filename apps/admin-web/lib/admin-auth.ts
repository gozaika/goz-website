import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AdminActor {
  readonly authUserId: string;
  readonly profilePk: string;
  readonly roleCode: string;
  readonly roleCodes: readonly string[];
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

  const { data: memberships } = await service
    .from("iam_platform_membership")
    .select("iam_platform_role(role_code)")
    .eq("iam_profile_fk", profile.iam_profile_pk)
    .eq("is_active", true);

  const roleCodes =
    memberships
      ?.flatMap((membership) => {
        const roles = Array.isArray(membership.iam_platform_role)
          ? membership.iam_platform_role
          : [membership.iam_platform_role];
        return roles.map((role) => role?.role_code).filter((roleCode): roleCode is string => Boolean(roleCode));
      })
      .sort((a, b) => {
        const priority = ["SUPER_ADMIN", "FINANCE_ADMIN", "OPS_ADMIN", "SUPPORT_ADMIN"];
        const aPriority = priority.indexOf(a);
        const bPriority = priority.indexOf(b);
        return (aPriority === -1 ? priority.length : aPriority) - (bPriority === -1 ? priority.length : bPriority);
      }) ?? [];

  const primaryRoleCode = roleCodes[0];
  if (!primaryRoleCode) return null;
  return { authUserId: user.id, profilePk: profile.iam_profile_pk, roleCode: primaryRoleCode, roleCodes };
}

export async function requireAdminActor(): Promise<AdminActor | NextResponse> {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Platform admin access is required." }, { status: 403 });
  }
  return actor;
}

export async function requireFinanceAdminActor(): Promise<AdminActor | NextResponse> {
  const actor = await requireAdminActor();
  if (actor instanceof NextResponse) return actor;

  if (!actor.roleCodes.some((roleCode) => ["SUPER_ADMIN", "FINANCE_ADMIN"].includes(roleCode))) {
    return NextResponse.json({ ok: false, error: "Finance admin access is required." }, { status: 403 });
  }

  return actor;
}

export async function requireAdminActorWithRoles(allowedRoleCodes: readonly string[]): Promise<AdminActor | NextResponse> {
  const actor = await requireAdminActor();
  if (actor instanceof NextResponse) return actor;

  if (!actor.roleCodes.some((roleCode) => allowedRoleCodes.includes(roleCode))) {
    return NextResponse.json({ ok: false, error: "Role is not allowed for this admin action." }, { status: 403 });
  }

  return actor;
}

export async function requireOpsAdminActor(): Promise<AdminActor | NextResponse> {
  return requireAdminActorWithRoles(["SUPER_ADMIN", "OPS_ADMIN"]);
}

export async function requireSupportAdminActor(): Promise<AdminActor | NextResponse> {
  return requireAdminActorWithRoles(["SUPER_ADMIN", "OPS_ADMIN", "SUPPORT_ADMIN"]);
}

export async function requireRefundSupportActor(): Promise<AdminActor | NextResponse> {
  return requireAdminActorWithRoles(["SUPER_ADMIN", "OPS_ADMIN", "SUPPORT_ADMIN", "FINANCE_ADMIN"]);
}
