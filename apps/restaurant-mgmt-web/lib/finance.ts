import type { FinanceSettlementDetailRow, FinanceSettlementStatusCode, FinanceSettlementSummary } from "@gozaika/types";

type SettlementSummaryRow = {
  readonly settlement_run_pk: string;
  readonly restaurant_fk: string;
  readonly restaurant_name: string;
  readonly period_start_at: string;
  readonly period_end_at: string;
  readonly settlement_status_code: FinanceSettlementStatusCode;
  readonly order_count: number | string;
  readonly excluded_order_count: number | string;
  readonly gross_sales_paise: number | string;
  readonly refund_paise: number | string;
  readonly commission_paise: number | string;
  readonly payment_fee_paise: number | string;
  readonly tax_paise: number | string;
  readonly adjustment_paise: number | string;
  readonly net_payout_paise: number | string;
  readonly locked_at: string | null;
  readonly paid_at: string | null;
  readonly reconciled_at: string | null;
  readonly cancelled_at: string | null;
  readonly status_note_text: string | null;
  readonly payout_provider_reference_text: string | null;
  readonly payout_account_status_code: string | null;
  readonly masked_payout_account: string | null;
  readonly invoice_pk: string | null;
  readonly invoice_number: string | null;
  readonly invoice_status_code: FinanceSettlementSummary["invoice"]["invoiceStatusCode"];
  readonly invoice_amount_paise: number | string | null;
  readonly invoice_issued_at: string | null;
  readonly download_safe_filename: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

type SettlementDetailRow = {
  readonly payout_entry_pk: string;
  readonly settlement_run_pk: string;
  readonly restaurant_fk: string;
  readonly order_fk: string | null;
  readonly order_number: string | null;
  readonly payment_refund_fk: string | null;
  readonly entry_type_code: FinanceSettlementDetailRow["entryTypeCode"];
  readonly amount_paise: number | string;
  readonly description_text: string | null;
  readonly commission_bps: number | string | null;
  readonly commission_plan_code: string | null;
  readonly source_status_code: string | null;
  readonly pickup_window_end_at: string | null;
  readonly bag_display_name: string | null;
  readonly order_total_paise: number | string | null;
  readonly created_at: string;
};

export function mapFinanceSettlementSummary(row: SettlementSummaryRow): FinanceSettlementSummary {
  return {
    settlementRunPk: row.settlement_run_pk,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    periodStartAt: row.period_start_at,
    periodEndAt: row.period_end_at,
    settlementStatusCode: row.settlement_status_code,
    orderCount: Number(row.order_count),
    excludedOrderCount: Number(row.excluded_order_count),
    grossSalesPaise: Number(row.gross_sales_paise),
    refundPaise: Number(row.refund_paise),
    commissionPaise: Number(row.commission_paise),
    paymentFeePaise: Number(row.payment_fee_paise),
    taxPaise: Number(row.tax_paise),
    adjustmentPaise: Number(row.adjustment_paise),
    netPayoutPaise: Number(row.net_payout_paise),
    lockedAt: row.locked_at,
    paidAt: row.paid_at,
    reconciledAt: row.reconciled_at,
    cancelledAt: row.cancelled_at,
    statusNoteText: row.status_note_text,
    payoutProviderReferenceText: row.payout_provider_reference_text,
    payoutAccountStatusCode: row.payout_account_status_code,
    maskedPayoutAccount: row.masked_payout_account,
    invoice: {
      invoicePk: row.invoice_pk,
      invoiceNumber: row.invoice_number,
      invoiceStatusCode: row.invoice_status_code,
      invoiceAmountPaise: row.invoice_amount_paise == null ? null : Number(row.invoice_amount_paise),
      invoiceIssuedAt: row.invoice_issued_at,
      downloadSafeFilename: row.download_safe_filename,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFinanceSettlementDetail(row: SettlementDetailRow): FinanceSettlementDetailRow {
  return {
    payoutEntryPk: row.payout_entry_pk,
    settlementRunPk: row.settlement_run_pk,
    restaurantPk: row.restaurant_fk,
    orderPk: row.order_fk,
    orderNumber: row.order_number,
    paymentRefundPk: row.payment_refund_fk,
    entryTypeCode: row.entry_type_code,
    amountPaise: Number(row.amount_paise),
    descriptionText: row.description_text,
    commissionBps: row.commission_bps == null ? null : Number(row.commission_bps),
    commissionPlanCode: row.commission_plan_code,
    sourceStatusCode: row.source_status_code,
    pickupWindowEndAt: row.pickup_window_end_at,
    bagDisplayName: row.bag_display_name,
    orderTotalPaise: row.order_total_paise == null ? null : Number(row.order_total_paise),
    createdAt: row.created_at,
  };
}
