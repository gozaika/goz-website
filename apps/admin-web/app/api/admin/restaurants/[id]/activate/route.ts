import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-auth";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Platform admin access is required." }, { status: 403 });
  }

  const { id } = await context.params;
  const service = createServiceRoleSupabaseClient();
  const [compliance, tasks] = await Promise.all([
    service.from("restaurant_compliance").select("compliance_status_code").eq("restaurant_fk", id).maybeSingle(),
    service.from("restaurant_onboarding_task").select("task_status_code").eq("restaurant_fk", id),
  ]);

  if (compliance.data?.compliance_status_code !== "APPROVED") {
    return NextResponse.json({ ok: false, error: "Compliance must be approved before activation." }, { status: 409 });
  }

  const blockingTask = (tasks.data ?? []).find((task) => !["COMPLETED", "WAIVED"].includes(task.task_status_code));
  if (blockingTask) {
    return NextResponse.json({ ok: false, error: "Complete or waive onboarding tasks before activation." }, { status: 409 });
  }

  const { error } = await service
    .from("restaurant_restaurant")
    .update({ restaurant_status_code: "ACTIVE", updated_at: new Date().toISOString() })
    .eq("restaurant_restaurant_pk", id);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not activate restaurant." }, { status: 500 });
  }

  await service.from("audit_log").insert({
    actor_profile_fk: actor.profilePk,
    actor_role_code: actor.roleCode,
    action_code: "RESTAURANT_ACTIVATED",
    target_entity_type_code: "restaurant_restaurant",
    target_entity_pk: id,
    audit_payload_json: { after: { restaurant_status_code: "ACTIVE" } },
  });

  return NextResponse.json({ ok: true });
}
