import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { settlementStatusUpdateRequestSchema, type ApiResponse, type FinanceSettlementActionResult } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireFinanceAdminActor } from "@/lib/admin-auth";

function mapStatusError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("finance admin")) return { error: "Finance admin access is required.", status: 403 };
  if (message.includes("settlement not found")) return { error: "Settlement not found.", status: 404 };
  if (message.includes("note")) return { error: "Add a finance note for this status change.", status: 400 };
  if (message.includes("transition")) return { error: "That settlement status transition is not allowed.", status: 409 };
  return { error: "Could not update settlement status.", status: 500 };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly runId: string }> }) {
  const actor = await requireFinanceAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { runId } = await params;
  const parsed = settlementStatusUpdateRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Review the status update." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_mark_settlement_status", {
    p_settlement_run_pk: runId,
    p_actor_profile_pk: actor.profilePk,
    p_next_status_code: parsed.data.statusCode,
    p_note_text: parsed.data.noteText,
    p_provider_reference_text: parsed.data.providerReferenceText ?? null,
  });

  if (error) {
    const mapped = mapStatusError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data)
    ? (data[0] as { readonly settlement_run_pk: string; readonly settlement_status_code: FinanceSettlementActionResult["settlementStatusCode"]; readonly message: string } | undefined)
    : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Settlement status was not updated." } satisfies ApiResponse, { status: 500 });
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
