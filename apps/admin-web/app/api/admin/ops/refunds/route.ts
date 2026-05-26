import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { adminOpsRefundSupportSchema, type AdminOpsActionResult, type ApiResponse } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireRefundSupportActor } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const actor = await requireRefundSupportActor();
  if (actor instanceof NextResponse) return actor;

  const parsed = adminOpsRefundSupportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Review the refund tracking request." } satisfies ApiResponse, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data: order } = await service
    .from("order_order")
    .select("order_order_pk,total_paise,payment_status_code")
    .eq("order_order_pk", parsed.data.orderPk)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." } satisfies ApiResponse, { status: 404 });
  }
  if (parsed.data.amountPaise > Number(order.total_paise)) {
    return NextResponse.json({ ok: false, error: "Refund tracking amount cannot exceed the order total." } satisfies ApiResponse, { status: 400 });
  }

  const now = new Date().toISOString();
  const isUpdate = Boolean(parsed.data.refundPk);
  const values = {
    order_fk: parsed.data.orderPk,
    provider_code: "RAZORPAY",
    refund_status_code: "REQUESTED",
    refund_reason_code: parsed.data.refundReasonCode,
    amount_paise: parsed.data.amountPaise,
    requested_by_profile_fk: actor.profilePk,
    support_ticket_fk: parsed.data.supportTicketPk ?? null,
    incident_fk: parsed.data.incidentPk ?? null,
    tracking_status_code: parsed.data.trackingStatusCode,
    manual_tracking_note_text: parsed.data.noteText,
    provider_refund_disabled: true,
    provider_payload_json: {
      provider_refund_not_called: true,
      source: "admin_ops_support_tracking",
    },
    updated_at: now,
  };

  const { data: refund, error } = isUpdate
    ? await service
        .from("payment_refund")
        .update(values)
        .eq("payment_refund_pk", parsed.data.refundPk)
        .select("payment_refund_pk")
        .maybeSingle()
    : await service
        .from("payment_refund")
        .insert({ ...values, requested_at: now, created_at: now })
        .select("payment_refund_pk")
        .single();

  if (error || !refund) {
    return NextResponse.json({ ok: false, error: isUpdate ? "Refund tracking row not found or could not be updated." : "Refund tracking row could not be created." } satisfies ApiResponse, { status: isUpdate ? 404 : 500 });
  }

  if (parsed.data.supportTicketPk) {
    await service.from("support_ticket_event").insert({
      support_ticket_fk: parsed.data.supportTicketPk,
      event_type_code: "REFUND_LINKED",
      comment_text: parsed.data.noteText,
      is_internal_note: true,
      actor_profile_fk: actor.profilePk,
    });
  }

  await service.from("audit_log").insert({
    actor_profile_fk: actor.profilePk,
    actor_role_code: actor.roleCode,
    action_code: isUpdate ? "REFUND_SUPPORT_UPDATED" : "REFUND_SUPPORT_TRACKED",
    target_entity_type_code: "PAYMENT_REFUND",
    target_entity_pk: refund.payment_refund_pk,
    audit_payload_json: {
      reason: parsed.data.reasonText,
      order_fk: parsed.data.orderPk,
      tracking_status_code: parsed.data.trackingStatusCode,
      amount_paise: parsed.data.amountPaise,
      provider_refund_not_called: true,
      payment_capture_untouched: true,
      settlement_untouched: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      targetPk: refund.payment_refund_pk,
      statusCode: parsed.data.trackingStatusCode,
      message: "Refund support tracking saved. No provider refund, payment capture, settlement, or payout mutation was initiated.",
    },
  } satisfies ApiResponse<AdminOpsActionResult>, { status: isUpdate ? 200 : 201 });
}
