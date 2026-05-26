import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { adminOpsIncidentTriageSchema, type AdminOpsActionResult, type ApiResponse } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireSupportAdminActor } from "@/lib/admin-auth";

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly incidentId: string }> }) {
  const actor = await requireSupportAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { incidentId } = await params;
  const parsed = adminOpsIncidentTriageSchema.safeParse({
    ...(await request.json().catch(() => ({}))),
    incidentPk: incidentId,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Review the incident update." } satisfies ApiResponse, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data: incident } = await service
    .from("incident_incident")
    .select("incident_incident_pk,master_incident_status_fk")
    .eq("incident_incident_pk", incidentId)
    .maybeSingle();
  if (!incident) {
    return NextResponse.json({ ok: false, error: "Incident not found." } satisfies ApiResponse, { status: 404 });
  }

  const { data: status } = await service
    .from("master_incident_status")
    .select("master_incident_status_pk")
    .eq("status_code", parsed.data.statusCode)
    .maybeSingle();
  if (!status) {
    return NextResponse.json({ ok: false, error: "Choose a valid incident status." } satisfies ApiResponse, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await service
    .from("incident_incident")
    .update({
      master_incident_status_fk: status.master_incident_status_pk,
      assigned_to_profile_fk: parsed.data.assignedToProfilePk ?? null,
      support_ticket_fk: parsed.data.supportTicketPk ?? null,
      resolved_at: ["RESOLVED", "CLOSED"].includes(parsed.data.statusCode) ? now : null,
      updated_at: now,
    })
    .eq("incident_incident_pk", incidentId);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not update incident." } satisfies ApiResponse, { status: 500 });
  }

  await service.from("incident_event").insert({
    incident_fk: incidentId,
    event_type_code: "STATUS_CHANGED",
    from_status_fk: incident.master_incident_status_fk,
    to_status_fk: status.master_incident_status_pk,
    comment_text: parsed.data.noteText ?? parsed.data.reasonText,
    actor_profile_fk: actor.profilePk,
  });

  await service.from("audit_log").insert({
    actor_profile_fk: actor.profilePk,
    actor_role_code: actor.roleCode,
    action_code: "INCIDENT_TRIAGED",
    target_entity_type_code: "INCIDENT",
    target_entity_pk: incidentId,
    audit_payload_json: {
      reason: parsed.data.reasonText,
      status_code: parsed.data.statusCode,
      support_ticket_fk: parsed.data.supportTicketPk ?? null,
    },
  });

  return NextResponse.json({
    ok: true,
    data: { targetPk: incidentId, statusCode: parsed.data.statusCode, message: "Incident triage updated." },
  } satisfies ApiResponse<AdminOpsActionResult>);
}
