import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { settlementCreateRequestSchema, type ApiResponse, type FinanceSettlementActionResult } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireFinanceAdminActor } from "@/lib/admin-auth";

function mapSettlementError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("finance admin")) return { error: "Finance admin access is required.", status: 403 };
  if (message.includes("restaurant not found")) return { error: "Restaurant not found.", status: 404 };
  if (message.includes("invalid period")) return { error: "Choose a valid settlement period.", status: 400 };
  if (message.includes("period must end")) return { error: "Settlement period must end before now.", status: 400 };
  if (message.includes("no eligible orders")) return { error: "No eligible closed paid pickup orders were found for this period.", status: 409 };
  if (message.includes("recalculation not allowed")) return { error: "Locked settlements cannot be recalculated.", status: 409 };
  return { error: "Could not create or recalculate the settlement.", status: 500 };
}

export async function POST(request: Request) {
  const actor = await requireFinanceAdminActor();
  if (actor instanceof NextResponse) return actor;

  const parsed = settlementCreateRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Choose a valid restaurant and period." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_create_or_recalculate_settlement_run", {
    p_restaurant_pk: parsed.data.restaurantPk,
    p_period_start_at: parsed.data.periodStartAt,
    p_period_end_at: parsed.data.periodEndAt,
    p_actor_profile_pk: actor.profilePk,
    p_note_text: parsed.data.noteText ?? null,
  });

  if (error) {
    console.error("finance_settlement_create_rpc_failed", {
      code: error.code,
      message: error.message,
    });
    const mapped = mapSettlementError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data)
    ? (data[0] as
        | {
            readonly settlement_run_pk: string;
            readonly settlement_status_code: FinanceSettlementActionResult["settlementStatusCode"];
            readonly order_count: number | string;
            readonly gross_sales_paise: number | string;
            readonly refund_paise: number | string;
            readonly commission_paise: number | string;
            readonly payment_fee_paise: number | string;
            readonly tax_paise: number | string;
            readonly adjustment_paise: number | string;
            readonly net_payout_paise: number | string;
            readonly message: string;
          }
        | undefined)
    : undefined;

  if (!row) {
    return NextResponse.json({ ok: false, error: "Settlement calculation returned no result." } satisfies ApiResponse, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      settlementRunPk: row.settlement_run_pk,
      settlementStatusCode: row.settlement_status_code,
      orderCount: Number(row.order_count),
      grossSalesPaise: Number(row.gross_sales_paise),
      refundPaise: Number(row.refund_paise),
      commissionPaise: Number(row.commission_paise),
      paymentFeePaise: Number(row.payment_fee_paise),
      taxPaise: Number(row.tax_paise),
      adjustmentPaise: Number(row.adjustment_paise),
      netPayoutPaise: Number(row.net_payout_paise),
      message: row.message,
    },
  } satisfies ApiResponse<FinanceSettlementActionResult>);
}
