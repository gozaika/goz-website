import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { settlementPreviewRequestSchema, type ApiResponse, type FinanceEligibleOrderPreview } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { mapEligiblePreview } from "@/lib/finance";

export async function POST(request: Request) {
  const actor = await requireAdminActor();
  if (actor instanceof NextResponse) return actor;

  const parsed = settlementPreviewRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Choose a valid restaurant and period." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_preview_restaurant_settlement", {
    p_restaurant_pk: parsed.data.restaurantPk,
    p_period_start_at: parsed.data.periodStartAt,
    p_period_end_at: parsed.data.periodEndAt,
    p_actor_profile_pk: actor.profilePk,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not preview this settlement period." } satisfies ApiResponse, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: (data ?? []).map(mapEligiblePreview),
  } satisfies ApiResponse<FinanceEligibleOrderPreview[]>);
}
