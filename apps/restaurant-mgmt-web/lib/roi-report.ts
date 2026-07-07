import type {
  FinanceSettlementStatusCode,
  RoiPartnerReportCopyPayload,
  RoiReportDropDetailRow,
  RoiReportEstimateBasisCode,
  RoiReportIncidentRefundNoteRow,
  RoiReportInsightCode,
  RoiReportMetricCard,
  RoiReportPayload,
  RoiReportSummary,
} from "@gozaika/types";
import {
  financeSettlementStatusLabel,
  formatBasisPoints,
  formatPaise,
  IST_TIME_ZONE,
  rateLabel,
  rateToBasisPoints,
  rateTone,
} from "@gozaika/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapFinanceSettlementSummary } from "./finance";

export type RoiDropDetailDbRow = {
  readonly restaurant_fk: string;
  readonly restaurant_name: string;
  readonly drop_pk: string;
  readonly drop_title: string;
  readonly bag_display_name: string;
  readonly drop_status_code: string;
  readonly pickup_start_at: string;
  readonly pickup_end_at: string;
  readonly quantity_listed: number | string;
  readonly quantity_sold: number | string;
  readonly quantity_collected: number | string;
  readonly no_show_count: number | string;
  readonly open_pickup_order_count: number | string;
  readonly sell_through_bps: number | string | null;
  readonly gmv_paise: number | string;
  readonly estimated_net_recovery_paise: number | string;
  readonly refund_debit_paise: number | string;
  readonly payment_fee_paise: number | string;
  readonly payment_tax_paise: number | string;
  readonly incident_count: number | string;
  readonly first_time_buyer_count: number | string;
  readonly repeat_buyer_count: number | string;
  readonly settlement_run_pk: string | null;
  readonly settlement_status_code: FinanceSettlementStatusCode | null;
  readonly latest_order_created_at: string | null;
  readonly updated_at: string;
};

export type RoiNoteDbRow = {
  readonly row_pk: string;
  readonly restaurant_fk: string;
  readonly restaurant_name: string;
  readonly order_pk: string | null;
  readonly order_number: string | null;
  readonly drop_pk: string | null;
  readonly note_type_code: "INCIDENT" | "REFUND" | "DEBIT";
  readonly severity_code: RoiReportIncidentRefundNoteRow["severityCode"];
  readonly status_code: string | null;
  readonly amount_paise: number | string | null;
  readonly title_text: string;
  readonly description_text: string | null;
  readonly occurred_at: string;
};

export type RoiSettlementLike = {
  readonly settlementRunPk: string;
  readonly restaurantPk: string;
  readonly periodStartAt: string;
  readonly periodEndAt: string;
  readonly settlementStatusCode: FinanceSettlementStatusCode;
  readonly netPayoutPaise: number;
  readonly lockedAt: string | null;
};

export function defaultRoiPeriod(now = new Date()): { periodStartAt: string; periodEndAt: string } {
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  start.setUTCHours(0, 0, 0, 0);
  return { periodStartAt: start.toISOString(), periodEndAt: end.toISOString() };
}

export function parseRoiPeriod(params: { readonly start?: string; readonly end?: string }) {
  const fallback = defaultRoiPeriod();
  const start = params.start ? new Date(`${params.start}T00:00:00.000Z`) : new Date(fallback.periodStartAt);
  const end = params.end ? new Date(`${params.end}T23:59:59.999Z`) : new Date(fallback.periodEndAt);

  if (!Number.isFinite(start.valueOf()) || !Number.isFinite(end.valueOf()) || end <= start) {
    return fallback;
  }

  return { periodStartAt: start.toISOString(), periodEndAt: end.toISOString() };
}

export function dateInputValue(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function periodLabel(startAt: string, endAt: string): string {
  return `${new Date(startAt).toLocaleDateString("en-IN", { timeZone: IST_TIME_ZONE })} - ${new Date(endAt).toLocaleDateString("en-IN", { timeZone: IST_TIME_ZONE })}`;
}

export function mapRoiDrop(row: RoiDropDetailDbRow): RoiReportDropDetailRow {
  return {
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    dropPk: row.drop_pk,
    dropTitle: row.drop_title,
    bagDisplayName: row.bag_display_name,
    dropStatusCode: row.drop_status_code,
    pickupStartAt: row.pickup_start_at,
    pickupEndAt: row.pickup_end_at,
    quantityListed: Number(row.quantity_listed),
    quantitySold: Number(row.quantity_sold),
    quantityCollected: Number(row.quantity_collected),
    noShowCount: Number(row.no_show_count),
    openPickupOrderCount: Number(row.open_pickup_order_count),
    sellThroughBps: row.sell_through_bps == null ? null : Number(row.sell_through_bps),
    gmvPaise: Number(row.gmv_paise),
    estimatedNetRecoveryPaise: Number(row.estimated_net_recovery_paise),
    refundDebitPaise: Number(row.refund_debit_paise),
    paymentFeePaise: Number(row.payment_fee_paise),
    paymentTaxPaise: Number(row.payment_tax_paise),
    incidentCount: Number(row.incident_count),
    firstTimeBuyerCount: Number(row.first_time_buyer_count),
    repeatBuyerCount: Number(row.repeat_buyer_count),
    settlementRunPk: row.settlement_run_pk,
    settlementStatusCode: row.settlement_status_code,
    latestOrderCreatedAt: row.latest_order_created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRoiNote(row: RoiNoteDbRow): RoiReportIncidentRefundNoteRow {
  return {
    rowPk: row.row_pk,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    dropPk: row.drop_pk,
    noteTypeCode: row.note_type_code,
    severityCode: row.severity_code,
    statusCode: row.status_code,
    amountPaise: row.amount_paise == null ? null : Number(row.amount_paise),
    titleText: row.title_text,
    descriptionText: row.description_text,
    occurredAt: row.occurred_at,
  };
}

function matchingLockedSettlement(
  settlements: readonly RoiSettlementLike[],
  restaurantPk: string,
  periodStartAt: string,
  periodEndAt: string,
): RoiSettlementLike | null {
  const startMs = Date.parse(periodStartAt);
  const endMs = Date.parse(periodEndAt);
  return (
    settlements.find(
      (settlement) =>
        settlement.restaurantPk === restaurantPk &&
        settlement.settlementStatusCode !== "CANCELLED" &&
        Date.parse(settlement.periodStartAt) === startMs &&
        Date.parse(settlement.periodEndAt) === endMs &&
        Boolean(settlement.lockedAt),
    ) ?? null
  );
}

function metricCards(summary: Omit<RoiReportSummary, "metricCards">): RoiReportMetricCard[] {
  return [
    {
      code: "bags",
      label: "Bags sold",
      valueText: `${summary.bagsSoldCount} / ${summary.bagsListedCount}`,
      helperText: `${summary.dropsListedCount} Limited Drops listed`,
      tone: summary.bagsSoldCount > 0 ? "success" : "neutral",
    },
    {
      code: "sell_through",
      label: "Sell-through",
      valueText: formatBasisPoints(summary.sellThroughBps),
      helperText: `${rateLabel(summary.sellThroughBps)} based on sold/listed bags`,
      tone: rateTone(summary.sellThroughBps),
    },
    {
      code: "gmv",
      label: "GMV",
      valueText: formatPaise(summary.gmvPaise),
      helperText: "Webhook-confirmed captured order value",
      tone: summary.gmvPaise > 0 ? "success" : "neutral",
    },
    {
      code: "net",
      label: "Net recovery",
      valueText: formatPaise(summary.estimatedNetRecoveryPaise),
      helperText: summary.netRecoveryBasisCode === "SETTLEMENT_LOCKED" ? "Backed by locked settlement" : "Estimated for pilot reporting",
      tone: summary.estimatedNetRecoveryPaise > 0 ? "success" : "neutral",
    },
    {
      code: "pickup",
      label: "Pickup completion",
      valueText: formatBasisPoints(summary.pickupCompletionBps),
      helperText: `${summary.pickupCompletedCount} collected, ${summary.noShowCount} no-show`,
      tone: rateTone(summary.pickupCompletionBps, { strongBps: 8500, watchBps: 6500 }),
    },
    {
      code: "exceptions",
      label: "Incidents/refunds",
      valueText: `${summary.incidentCount} / ${formatPaise(summary.refundDebitPaise)}`,
      helperText: "Incident count and refund/debit value",
      tone: summary.incidentCount || summary.refundDebitPaise ? "warning" : "success",
    },
  ];
}

function buildPartnerCopy(summary: Omit<RoiReportSummary, "metricCards">): RoiPartnerReportCopyPayload {
  return {
    title: "goZaika weekly partner report",
    periodLabel: periodLabel(summary.periodStartAt, summary.periodEndAt),
    restaurantName: summary.restaurantName,
    generatedAt: summary.dataFreshnessAt,
    summaryLines: [
      `${summary.bagsSoldCount} of ${summary.bagsListedCount} BAM Bags sold across ${summary.dropsListedCount} Limited Drops.`,
      `Sell-through: ${formatBasisPoints(summary.sellThroughBps)}. GMV: ${formatPaise(summary.gmvPaise)}.`,
      `Net recovery: ${formatPaise(summary.estimatedNetRecoveryPaise)} (${summary.netRecoveryBasisCode === "SETTLEMENT_LOCKED" ? "locked settlement" : "pilot estimate"}).`,
      `Pickup: ${summary.pickupCompletedCount} collected, ${summary.noShowCount} no-show, ${summary.openPickupOrderCount} still open.`,
      `Exceptions: ${summary.incidentCount} incidents and ${formatPaise(summary.refundDebitPaise)} refunds/debits.`,
      summary.repeatBuyerDataAvailable
        ? `Buyer signal: ${summary.firstTimeBuyerCount} first-time and ${summary.repeatBuyerCount} repeat buyer signals.`
        : "Buyer signal: repeat-buyer data is still too thin for a strong read.",
    ],
    assumptionLines: summary.assumptions,
    nextActionLines: summary.nextActions,
  };
}

export function buildRoiReport(input: {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly periodStartAt: string;
  readonly periodEndAt: string;
  readonly dropRows: readonly RoiReportDropDetailRow[];
  readonly noteRows: readonly RoiReportIncidentRefundNoteRow[];
  readonly settlements?: readonly RoiSettlementLike[];
}): RoiReportPayload {
  const dropsListedCount = input.dropRows.length;
  const bagsListedCount = input.dropRows.reduce((sum, row) => sum + row.quantityListed, 0);
  const bagsSoldCount = input.dropRows.reduce((sum, row) => sum + row.quantitySold, 0);
  const gmvPaise = input.dropRows.reduce((sum, row) => sum + row.gmvPaise, 0);
  const estimatedNetFromDrops = input.dropRows.reduce((sum, row) => sum + row.estimatedNetRecoveryPaise, 0);
  const pickupCompletedCount = input.dropRows.reduce((sum, row) => sum + row.quantityCollected, 0);
  const noShowCount = input.dropRows.reduce((sum, row) => sum + row.noShowCount, 0);
  const openPickupOrderCount = input.dropRows.reduce((sum, row) => sum + row.openPickupOrderCount, 0);
  const refundDebitPaise = input.dropRows.reduce((sum, row) => sum + row.refundDebitPaise, 0);
  const paymentFeePaise = input.dropRows.reduce((sum, row) => sum + row.paymentFeePaise, 0);
  const paymentTaxPaise = input.dropRows.reduce((sum, row) => sum + row.paymentTaxPaise, 0);
  const incidentCount = input.dropRows.reduce((sum, row) => sum + row.incidentCount, 0);
  const firstTimeBuyerCount = input.dropRows.reduce((sum, row) => sum + row.firstTimeBuyerCount, 0);
  const repeatBuyerCount = input.dropRows.reduce((sum, row) => sum + row.repeatBuyerCount, 0);
  const sellThroughBps = rateToBasisPoints(bagsSoldCount, bagsListedCount);
  const pickupCompletionBps = rateToBasisPoints(pickupCompletedCount, pickupCompletedCount + noShowCount);
  const lockedSettlement = matchingLockedSettlement(
    input.settlements ?? [],
    input.restaurantPk,
    input.periodStartAt,
    input.periodEndAt,
  );
  const netRecoveryBasisCode: RoiReportEstimateBasisCode = lockedSettlement
    ? "SETTLEMENT_LOCKED"
    : dropsListedCount || bagsSoldCount
      ? "ESTIMATED"
      : "INSUFFICIENT_DATA";

  const insightCodes = new Set<RoiReportInsightCode>();
  if (dropsListedCount === 0) insightCodes.add("NO_DROPS_LISTED");
  if (bagsSoldCount === 0) insightCodes.add("NO_PAID_ORDERS");
  if (openPickupOrderCount > 0) insightCodes.add("PICKUP_WINDOW_OPEN");
  if (lockedSettlement) insightCodes.add("SETTLEMENT_LOCKED");
  if (!lockedSettlement) insightCodes.add("SETTLEMENT_NOT_LOCKED");
  if (refundDebitPaise > 0) insightCodes.add("REFUNDS_OR_DEBITS_PRESENT");
  if (incidentCount > 0) insightCodes.add("INCIDENTS_PRESENT");
  if (firstTimeBuyerCount + repeatBuyerCount < 3) insightCodes.add("REPEAT_BUYER_DATA_THIN");
  if ((sellThroughBps ?? 0) >= 7000) insightCodes.add("SELL_THROUGH_STRONG");
  if (sellThroughBps != null && sellThroughBps < 4000) insightCodes.add("SELL_THROUGH_NEEDS_ATTENTION");

  const assumptions = [
    lockedSettlement
      ? "Net recovery is taken from a locked settlement for the exact selected period."
      : "Net recovery is reporting guidance: GMV minus visible refunds/debits and captured provider fee/tax. It is not a payout instruction.",
    "The 30-day zero-commission pilot is treated as commission-free unless a locked settlement says otherwise.",
    "Repeat-buyer signals are counts only. Consumer names, phone numbers, emails, and pickup credentials are not included.",
  ];
  const nextActions =
    dropsListedCount === 0
      ? ["Publish a Limited Drop in the selected week before reviewing ROI.", "Use pickup windows that restaurant staff can reliably honor."]
      : bagsSoldCount === 0
        ? ["Share the next active Limited Drop with partner-approved copy.", "Review pricing, pickup timing, and listed quantity before the next drop."]
        : [
            sellThroughBps != null && sellThroughBps < 4000
              ? "Test a smaller listed quantity or a tighter pickup window on the next Limited Drop."
              : "Repeat the best-performing pickup window and BAM Bag mix next week.",
            openPickupOrderCount > 0
              ? "Wait for open pickup windows to close before treating pickup completion as final."
              : "Review no-shows and incidents before the weekly partner call.",
          ];

  const baseSummary = {
    restaurantPk: input.restaurantPk,
    restaurantName: input.restaurantName,
    periodStartAt: input.periodStartAt,
    periodEndAt: input.periodEndAt,
    dropsListedCount,
    bagsListedCount,
    bagsSoldCount,
    sellThroughBps,
    gmvPaise,
    estimatedNetRecoveryPaise: lockedSettlement?.netPayoutPaise ?? estimatedNetFromDrops,
    netRecoveryBasisCode,
    settlementRunPk: lockedSettlement?.settlementRunPk ?? null,
    settlementStatusCode: lockedSettlement?.settlementStatusCode ?? null,
    settlementLockedAt: lockedSettlement?.lockedAt ?? null,
    pickupCompletedCount,
    noShowCount,
    pickupCompletionBps,
    openPickupOrderCount,
    refundDebitPaise,
    paymentFeePaise,
    paymentTaxPaise,
    incidentCount,
    firstTimeBuyerCount,
    repeatBuyerCount,
    repeatBuyerDataAvailable: firstTimeBuyerCount + repeatBuyerCount >= 3,
    dataFreshnessAt: new Date().toISOString(),
    insightCodes: [...insightCodes],
    assumptions,
    nextActions,
  } satisfies Omit<RoiReportSummary, "metricCards">;

  const summary: RoiReportSummary = {
    ...baseSummary,
    metricCards: metricCards(baseSummary),
  };

  return {
    summary,
    dropRows: input.dropRows,
    noteRows: input.noteRows,
    partnerCopy: buildPartnerCopy(baseSummary),
  };
}

/**
 * Load + build the weekly ROI report for one restaurant over a period. Runs the
 * three canonical reporting views (drop detail / report notes / settlement
 * summary), maps them, and assembles via `buildRoiReport`. Shared by the web
 * portal reports page (cookie client) and the mobile BFF (service-role client,
 * already tenant-gated by `withMobileRestaurantRole`) so the two surfaces cannot
 * drift. Read-only: no payment/settlement state is mutated.
 */
export async function loadRoiReport(
  supabase: SupabaseClient,
  input: {
    readonly restaurantPk: string;
    readonly restaurantName: string;
    readonly periodStartAt: string;
    readonly periodEndAt: string;
  },
): Promise<RoiReportPayload> {
  const [
    { data: dropData, error: dropError },
    { data: noteData, error: noteError },
    { data: settlementData, error: settlementError },
  ] = await Promise.all([
    supabase
      .from("api_restaurant_roi_drop_detail")
      .select("*")
      .eq("restaurant_fk", input.restaurantPk)
      .gte("pickup_start_at", input.periodStartAt)
      .lt("pickup_start_at", input.periodEndAt)
      .order("pickup_start_at", { ascending: false }),
    supabase
      .from("api_restaurant_roi_report_note")
      .select("*")
      .eq("restaurant_fk", input.restaurantPk)
      .gte("occurred_at", input.periodStartAt)
      .lt("occurred_at", input.periodEndAt)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("api_restaurant_finance_settlement_summary")
      .select("*")
      .eq("restaurant_fk", input.restaurantPk)
      .gte("period_end_at", input.periodStartAt)
      .lte("period_start_at", input.periodEndAt)
      .limit(20),
  ]);

  if (dropError) throw new Error("Could not load ROI report drop metrics.");
  if (noteError) throw new Error("Could not load ROI report notes.");
  if (settlementError) throw new Error("Could not load settlement context for ROI report.");

  const settlements = (settlementData ?? []).map(mapFinanceSettlementSummary).map((settlement) => ({
    settlementRunPk: settlement.settlementRunPk,
    restaurantPk: settlement.restaurantPk,
    periodStartAt: settlement.periodStartAt,
    periodEndAt: settlement.periodEndAt,
    settlementStatusCode: settlement.settlementStatusCode,
    netPayoutPaise: settlement.netPayoutPaise,
    lockedAt: settlement.lockedAt,
  }));

  return buildRoiReport({
    restaurantPk: input.restaurantPk,
    restaurantName: input.restaurantName,
    periodStartAt: input.periodStartAt,
    periodEndAt: input.periodEndAt,
    dropRows: ((dropData ?? []) as RoiDropDetailDbRow[]).map(mapRoiDrop),
    noteRows: ((noteData ?? []) as RoiNoteDbRow[]).map(mapRoiNote),
    settlements,
  });
}

export function settlementBasisLabel(summary: RoiReportSummary): string {
  if (summary.netRecoveryBasisCode === "SETTLEMENT_LOCKED" && summary.settlementStatusCode) {
    return `${financeSettlementStatusLabel(summary.settlementStatusCode)} settlement`;
  }
  if (summary.netRecoveryBasisCode === "INSUFFICIENT_DATA") return "No reportable activity";
  return "Estimated pilot reporting";
}
