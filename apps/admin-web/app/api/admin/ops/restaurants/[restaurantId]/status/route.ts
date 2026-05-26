import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { adminOpsRestaurantStatusActionSchema, type AdminOpsActionResult, type ApiResponse } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireOpsAdminActor } from "@/lib/admin-auth";

function mapStatusError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("role not allowed")) return { error: "Role is not allowed to change restaurant operational status.", status: 403 };
  if (message.includes("restaurant not found")) return { error: "Restaurant not found.", status: 404 };
  if (message.includes("offboarded")) return { error: "Offboarded restaurants cannot be changed from ops.", status: 409 };
  if (message.includes("reason")) return { error: "Add a human-readable reason.", status: 400 };
  if (message.includes("invalid")) return { error: "Choose an allowed restaurant status.", status: 400 };
  return { error: "Could not update restaurant status.", status: 500 };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly restaurantId: string }> }) {
  const actor = await requireOpsAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { restaurantId } = await params;
  const parsed = adminOpsRestaurantStatusActionSchema.safeParse({
    ...(await request.json().catch(() => ({}))),
    restaurantPk: restaurantId,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Review the status change." } satisfies ApiResponse, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_admin_set_restaurant_operational_status", {
    p_restaurant_pk: restaurantId,
    p_actor_profile_pk: actor.profilePk,
    p_next_status_code: parsed.data.nextStatusCode,
    p_reason_text: parsed.data.reasonText,
    p_public_note_text: parsed.data.publicNoteText ?? null,
  });

  if (error) {
    const mapped = mapStatusError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data) ? data[0] as { restaurant_pk: string; status_code: string; message: string } | undefined : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Restaurant status was not updated." } satisfies ApiResponse, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { targetPk: row.restaurant_pk, statusCode: row.status_code, message: row.message },
  } satisfies ApiResponse<AdminOpsActionResult>);
}
