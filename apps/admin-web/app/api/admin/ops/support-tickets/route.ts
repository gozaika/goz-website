import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { adminOpsSupportTicketActionSchema, type AdminOpsActionResult, type ApiResponse } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireSupportAdminActor } from "@/lib/admin-auth";

async function referencePk(service: ReturnType<typeof createServiceRoleSupabaseClient>, table: string, codeColumn: string, pkColumn: string, code: string) {
  const { data } = await service.from(table).select(pkColumn).eq(codeColumn, code).maybeSingle();
  const row = data as Record<string, string> | null;
  return row?.[pkColumn];
}

export async function POST(request: Request) {
  const actor = await requireSupportAdminActor();
  if (actor instanceof NextResponse) return actor;

  const parsed = adminOpsSupportTicketActionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Review the support ticket." } satisfies ApiResponse, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const [typePk, statusPk, priorityPk] = await Promise.all([
    referencePk(service, "master_support_ticket_type", "type_code", "master_support_ticket_type_pk", parsed.data.typeCode),
    referencePk(service, "master_support_ticket_status", "status_code", "master_support_ticket_status_pk", parsed.data.statusCode),
    referencePk(service, "master_support_ticket_priority", "priority_code", "master_support_ticket_priority_pk", parsed.data.priorityCode),
  ]);

  if (!typePk || !statusPk || !priorityPk) {
    return NextResponse.json({ ok: false, error: "Choose valid ticket type, priority, and status values." } satisfies ApiResponse, { status: 400 });
  }

  const now = new Date().toISOString();
  const isUpdate = Boolean(parsed.data.supportTicketPk);
  const base = {
    restaurant_fk: parsed.data.restaurantPk ?? null,
    order_fk: parsed.data.orderPk ?? null,
    incident_fk: parsed.data.incidentPk ?? null,
    payment_refund_fk: parsed.data.refundPk ?? null,
    master_support_ticket_type_fk: typePk,
    master_support_ticket_status_fk: statusPk,
    master_support_ticket_priority_fk: priorityPk,
    subject_text: parsed.data.subjectText,
    description_text: parsed.data.descriptionText ?? null,
    assigned_to_profile_fk: parsed.data.assignedToProfilePk ?? null,
    resolved_at: ["RESOLVED", "CLOSED"].includes(parsed.data.statusCode) ? now : null,
    updated_at: now,
  };

  const { data: ticket, error } = isUpdate
    ? await service
        .from("support_ticket")
        .update(base)
        .eq("support_ticket_pk", parsed.data.supportTicketPk)
        .select("support_ticket_pk")
        .maybeSingle()
    : await service
        .from("support_ticket")
        .insert({ ...base, created_at: now })
        .select("support_ticket_pk")
        .single();

  if (error || !ticket) {
    return NextResponse.json({ ok: false, error: isUpdate ? "Support ticket not found or could not be updated." : "Support ticket could not be created." } satisfies ApiResponse, { status: isUpdate ? 404 : 500 });
  }

  await service.from("support_ticket_event").insert({
    support_ticket_fk: ticket.support_ticket_pk,
    event_type_code: isUpdate ? "STATUS_CHANGED" : "CREATED",
    to_status_fk: statusPk,
    comment_text: parsed.data.noteText ?? parsed.data.reasonText,
    is_internal_note: parsed.data.internalNoteFlag,
    actor_profile_fk: actor.profilePk,
  });

  await service.from("audit_log").insert({
    actor_profile_fk: actor.profilePk,
    actor_role_code: actor.roleCode,
    action_code: isUpdate ? "SUPPORT_TICKET_UPDATED" : "SUPPORT_TICKET_CREATED",
    target_entity_type_code: "SUPPORT_TICKET",
    target_entity_pk: ticket.support_ticket_pk,
    audit_payload_json: {
      reason: parsed.data.reasonText,
      status_code: parsed.data.statusCode,
      type_code: parsed.data.typeCode,
      priority_code: parsed.data.priorityCode,
      internal_note_present: Boolean(parsed.data.noteText && parsed.data.internalNoteFlag),
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      targetPk: ticket.support_ticket_pk,
      statusCode: parsed.data.statusCode,
      message: isUpdate ? "Support ticket updated." : "Support ticket created.",
    },
  } satisfies ApiResponse<AdminOpsActionResult>, { status: isUpdate ? 200 : 201 });
}
