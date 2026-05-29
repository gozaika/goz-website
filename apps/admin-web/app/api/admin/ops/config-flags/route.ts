import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { adminOpsConfigFlagUpdateSchema, type AdminOpsActionResult, type ApiResponse } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireOpsAdminActor } from "@/lib/admin-auth";

const flagMeta = {
  CLAIMS_ENABLED: {
    name: "Claims enabled",
    description: "Allow consumers to discover and claim BAM Bags.",
    consumedBy: "consumer discovery and claim hold RPC",
  },
  PUBLISHING_ENABLED: {
    name: "Publishing enabled",
    description: "Allow active restaurants to publish Limited Drops.",
    consumedBy: "restaurant portal drop publishing",
  },
  MAX_BAGS_PER_DROP: {
    name: "Max bags per drop",
    description: "Pilot guidance cap enforced by drop publishing.",
    consumedBy: "restaurant portal drop publishing",
  },
  BLIND_ADVENTURE_ENABLED: {
    name: "Blind Adventure drops",
    description: "Allow opted-in restaurants to publish mystery-cuisine Blind Adventure drops.",
    consumedBy: "restaurant portal drop type selector",
  },
} as const;

export async function POST(request: Request) {
  const actor = await requireOpsAdminActor();
  if (actor instanceof NextResponse) return actor;

  const parsed = adminOpsConfigFlagUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Review the config flag update." } satisfies ApiResponse, { status: 400 });
  }

  if (parsed.data.scopeCode === "RESTAURANT" && !parsed.data.scopeEntityPk) {
    return NextResponse.json({ ok: false, error: "Choose a restaurant for a restaurant-scoped config flag." } satisfies ApiResponse, { status: 400 });
  }
  if (parsed.data.flagCode === "MAX_BAGS_PER_DROP" && !parsed.data.numericValue) {
    return NextResponse.json({ ok: false, error: "Enter the max bags per drop value." } satisfies ApiResponse, { status: 400 });
  }

  const meta = flagMeta[parsed.data.flagCode];
  const service = createServiceRoleSupabaseClient();
  let existingQuery = service
    .from("config_feature_flag")
    .select("config_feature_flag_pk,is_enabled,config_json")
    .eq("flag_code", parsed.data.flagCode)
    .eq("scope_code", parsed.data.scopeCode);
  existingQuery = parsed.data.scopeEntityPk
    ? existingQuery.eq("scope_entity_pk", parsed.data.scopeEntityPk)
    : existingQuery.is("scope_entity_pk", null);
  const { data: existing } = await existingQuery.order("updated_at", { ascending: false }).limit(1).maybeSingle();

  const configJson = {
    consumed_by: meta.consumedBy,
    ...(parsed.data.flagCode === "MAX_BAGS_PER_DROP" ? { max_bags_per_drop: parsed.data.numericValue } : {}),
  };
  const isEnabled = parsed.data.flagCode === "MAX_BAGS_PER_DROP" ? true : (parsed.data.isEnabled ?? true);
  const values = {
    flag_code: parsed.data.flagCode,
    flag_name: meta.name,
    description: meta.description,
    is_enabled: isEnabled,
    scope_code: parsed.data.scopeCode,
    scope_entity_pk: parsed.data.scopeEntityPk ?? null,
    config_json: configJson,
    updated_at: new Date().toISOString(),
  };

  const { data: flag, error } = existing
    ? await service
        .from("config_feature_flag")
        .update(values)
        .eq("config_feature_flag_pk", existing.config_feature_flag_pk)
        .select("config_feature_flag_pk")
        .single()
    : await service
        .from("config_feature_flag")
        .insert(values)
        .select("config_feature_flag_pk")
        .single();

  if (error || !flag) {
    return NextResponse.json({ ok: false, error: "Could not update this allowlisted config flag." } satisfies ApiResponse, { status: 500 });
  }

  await service.from("audit_log").insert({
    actor_profile_fk: actor.profilePk,
    actor_role_code: actor.roleCode,
    action_code: "CONFIG_FLAG_UPDATED",
    target_entity_type_code: "CONFIG_FEATURE_FLAG",
    target_entity_pk: flag.config_feature_flag_pk,
    audit_payload_json: {
      reason: parsed.data.reasonText,
      before: existing ? { is_enabled: existing.is_enabled, config_json: existing.config_json } : null,
      after: { is_enabled: isEnabled, config_json: configJson },
      allowlisted: true,
      consumed_by: meta.consumedBy,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      targetPk: flag.config_feature_flag_pk,
      statusCode: parsed.data.flagCode,
      message: "Allowlisted config flag updated.",
    },
  } satisfies ApiResponse<AdminOpsActionResult>);
}
