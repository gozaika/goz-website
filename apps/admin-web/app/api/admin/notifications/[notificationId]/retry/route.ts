import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import {
  notificationRetryRequestSchema,
  type ApiResponse,
  type NotificationActionResult,
} from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";

function mapRetryError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("admin access")) return { error: "Admin access required.", status: 403 };
  if (message.includes("notification not found")) return { error: "Notification not found.", status: 404 };
  if (message.includes("already sent")) return { error: "Already sent notifications cannot be retried.", status: 409 };
  if (message.includes("retry not allowed")) return { error: "Retry is not allowed for consent, preference, or missing destination suppression.", status: 409 };
  if (message.includes("reason")) return { error: "Add a retry reason.", status: 400 };
  return { error: "Could not retry notification.", status: 500 };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly notificationId: string }> }) {
  const actor = await requireAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { notificationId } = await params;
  const parsed = notificationRetryRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Add a retry reason." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_retry_notification", {
    p_notification_outbox_pk: notificationId,
    p_actor_profile_pk: actor.profilePk,
    p_reason_text: parsed.data.reasonText,
  });

  if (error) {
    const mapped = mapRetryError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data) ? data[0] as { notification_outbox_pk: string; send_status_code: NotificationActionResult["sendStatusCode"]; message: string } | undefined : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Notification was not retried." } satisfies ApiResponse, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      notificationOutboxPk: row.notification_outbox_pk,
      sendStatusCode: row.send_status_code,
      message: row.message,
    },
  } satisfies ApiResponse<NotificationActionResult>);
}
