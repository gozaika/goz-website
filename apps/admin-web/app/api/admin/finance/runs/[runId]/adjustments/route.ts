import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { settlementAdjustmentRequestSchema, type ApiResponse, type FinanceAdjustmentResult } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireFinanceAdminActor } from "@/lib/admin-auth";

function mapAdjustmentError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("finance admin")) return { error: "Finance admin access is required.", status: 403 };
  if (message.includes("settlement not found")) return { error: "Settlement not found.", status: 404 };
  if (message.includes("amount")) return { error: "Enter a non-zero adjustment amount in paise.", status: 400 };
  if (message.includes("note")) return { error: "Add an adjustment note.", status: 400 };
  if (message.includes("after lock")) return { error: "Adjustments are only allowed before lock. Use a later settlement for corrections.", status: 409 };
  return { error: "Could not add adjustment.", status: 500 };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly runId: string }> }) {
  const actor = await requireFinanceAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { runId } = await params;
  const parsed = settlementAdjustmentRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Review the adjustment." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_create_settlement_adjustment", {
    p_settlement_run_pk: runId,
    p_actor_profile_pk: actor.profilePk,
    p_amount_paise: parsed.data.amountPaise,
    p_description_text: parsed.data.descriptionText,
  });

  if (error) {
    const mapped = mapAdjustmentError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data)
    ? (data[0] as { readonly payout_entry_pk: string; readonly settlement_run_pk: string; readonly amount_paise: number | string; readonly message: string } | undefined)
    : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Adjustment was not created." } satisfies ApiResponse, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      payoutEntryPk: row.payout_entry_pk,
      settlementRunPk: row.settlement_run_pk,
      amountPaise: Number(row.amount_paise),
      message: row.message,
    },
  } satisfies ApiResponse<FinanceAdjustmentResult>);
}
