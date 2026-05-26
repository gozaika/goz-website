import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { adminOpsDropStatusActionSchema, type AdminOpsActionResult, type ApiResponse } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireOpsAdminActor } from "@/lib/admin-auth";

function mapStatusError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("role not allowed")) return { error: "Role is not allowed to change drop status.", status: 403 };
  if (message.includes("drop not found")) return { error: "Drop not found.", status: 404 };
  if (message.includes("closed drop")) return { error: "Closed, sold-out, cancelled, or emergency-closed drops cannot be resumed from ops.", status: 409 };
  if (message.includes("reason")) return { error: "Add a human-readable reason.", status: 400 };
  if (message.includes("invalid")) return { error: "Choose an allowed drop status.", status: 400 };
  return { error: "Could not update drop status.", status: 500 };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly dropId: string }> }) {
  const actor = await requireOpsAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { dropId } = await params;
  const parsed = adminOpsDropStatusActionSchema.safeParse({
    ...(await request.json().catch(() => ({}))),
    dropPk: dropId,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Review the drop status change." } satisfies ApiResponse, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_admin_set_drop_operational_status", {
    p_drop_pk: dropId,
    p_actor_profile_pk: actor.profilePk,
    p_next_status_code: parsed.data.nextStatusCode,
    p_reason_text: parsed.data.reasonText,
  });

  if (error) {
    const mapped = mapStatusError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data) ? data[0] as { drop_pk: string; status_code: string; message: string } | undefined : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Drop status was not updated." } satisfies ApiResponse, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { targetPk: row.drop_pk, statusCode: row.status_code, message: row.message },
  } satisfies ApiResponse<AdminOpsActionResult>);
}
