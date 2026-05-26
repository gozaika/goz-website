import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { settlementLockRequestSchema, type ApiResponse, type FinanceSettlementActionResult } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireFinanceAdminActor } from "@/lib/admin-auth";

function mapLockError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("finance admin")) return { error: "Finance admin access is required.", status: 403 };
  if (message.includes("settlement not found")) return { error: "Settlement not found.", status: 404 };
  if (message.includes("reason")) return { error: "Add a lock reason.", status: 400 };
  if (message.includes("no eligible orders")) return { error: "A settlement needs at least one eligible order before lock.", status: 409 };
  if (message.includes("totals changed")) return { error: "Settlement totals changed. Recalculate before locking.", status: 409 };
  if (message.includes("lock not allowed")) return { error: "Only draft/open settlements can be locked.", status: 409 };
  return { error: "Could not lock settlement.", status: 500 };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly runId: string }> }) {
  const actor = await requireFinanceAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { runId } = await params;
  const parsed = settlementLockRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Add a lock reason." } satisfies ApiResponse, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_lock_settlement_run", {
    p_settlement_run_pk: runId,
    p_actor_profile_pk: actor.profilePk,
    p_reason_text: parsed.data.reasonText,
  });

  if (error) {
    const mapped = mapLockError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data)
    ? (data[0] as { readonly settlement_run_pk: string; readonly settlement_status_code: FinanceSettlementActionResult["settlementStatusCode"]; readonly message: string } | undefined)
    : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Settlement was not locked." } satisfies ApiResponse, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      settlementRunPk: row.settlement_run_pk,
      settlementStatusCode: row.settlement_status_code,
      message: row.message,
    },
  } satisfies ApiResponse<FinanceSettlementActionResult>);
}
