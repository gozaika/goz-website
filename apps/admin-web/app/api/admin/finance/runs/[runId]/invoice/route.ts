import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { settlementInvoiceIssueRequestSchema, type ApiResponse, type FinanceInvoiceSummary } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireFinanceAdminActor } from "@/lib/admin-auth";

function mapInvoiceError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("finance admin")) return { error: "Finance admin access is required.", status: 403 };
  if (message.includes("settlement not found")) return { error: "Settlement not found.", status: 404 };
  if (message.includes("invoice number")) return { error: "Enter an invoice number/reference.", status: 400 };
  if (message.includes("not available")) return { error: "Invoice metadata can be issued only after settlement lock.", status: 409 };
  return { error: "Could not issue invoice metadata.", status: 500 };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly runId: string }> }) {
  const actor = await requireFinanceAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { runId } = await params;
  const parsed = settlementInvoiceIssueRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Review the invoice details." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service.rpc("api_issue_settlement_invoice", {
    p_settlement_run_pk: runId,
    p_actor_profile_pk: actor.profilePk,
    p_invoice_number: parsed.data.invoiceNumber,
    p_metadata_json: parsed.data.metadata,
    p_external_document_ref: parsed.data.externalDocumentRef ?? null,
  });

  if (error) {
    const mapped = mapInvoiceError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data)
    ? (data[0] as
        | {
            readonly invoice_pk: string;
            readonly invoice_number: string;
            readonly invoice_status_code: FinanceInvoiceSummary["invoiceStatusCode"];
            readonly invoice_amount_paise: number | string;
          }
        | undefined)
    : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Invoice metadata was not issued." } satisfies ApiResponse, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      invoicePk: row.invoice_pk,
      invoiceNumber: row.invoice_number,
      invoiceStatusCode: row.invoice_status_code,
      invoiceAmountPaise: Number(row.invoice_amount_paise),
      invoiceIssuedAt: new Date().toISOString(),
      downloadSafeFilename: null,
    },
  } satisfies ApiResponse<FinanceInvoiceSummary>);
}
