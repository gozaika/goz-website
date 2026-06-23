import { z } from "zod";

/**
 * Restaurant ROI report contract (Slice 15). Read-only weekly partner report for
 * the selected restaurant — metric cards, drop performance, exceptions, and a
 * partner-safe share copy. Gated by `viewReports` (OWNER/ADMIN/MANAGER). The
 * precise TS DTO (`RoiReportPayload`) lives in the package root; this is the
 * permissive **wire** Zod the BFF validates and the mobile client decodes. Code
 * fields (tone/status/insight/severity) stay `z.string()` so unknown future codes
 * are normalized, not hard-failed. No payment/settlement state is ever mutated.
 */

const roiMetricCardWireSchema = z.object({
  code: z.string(),
  label: z.string(),
  valueText: z.string(),
  helperText: z.string(),
  tone: z.string(),
});

const roiReportSummaryWireSchema = z.object({
  restaurantPk: z.string(),
  restaurantName: z.string(),
  periodStartAt: z.string(),
  periodEndAt: z.string(),
  dropsListedCount: z.number(),
  bagsListedCount: z.number(),
  bagsSoldCount: z.number(),
  sellThroughBps: z.number().nullable(),
  gmvPaise: z.number(),
  estimatedNetRecoveryPaise: z.number(),
  netRecoveryBasisCode: z.string(),
  settlementRunPk: z.string().nullable(),
  settlementStatusCode: z.string().nullable(),
  settlementLockedAt: z.string().nullable(),
  pickupCompletedCount: z.number(),
  noShowCount: z.number(),
  pickupCompletionBps: z.number().nullable(),
  openPickupOrderCount: z.number(),
  refundDebitPaise: z.number(),
  paymentFeePaise: z.number(),
  paymentTaxPaise: z.number(),
  incidentCount: z.number(),
  firstTimeBuyerCount: z.number(),
  repeatBuyerCount: z.number(),
  repeatBuyerDataAvailable: z.boolean(),
  dataFreshnessAt: z.string(),
  insightCodes: z.array(z.string()),
  metricCards: z.array(roiMetricCardWireSchema),
  assumptions: z.array(z.string()),
  nextActions: z.array(z.string()),
});

const roiDropDetailRowWireSchema = z.object({
  restaurantPk: z.string(),
  restaurantName: z.string(),
  dropPk: z.string(),
  dropTitle: z.string(),
  bagDisplayName: z.string(),
  dropStatusCode: z.string(),
  pickupStartAt: z.string(),
  pickupEndAt: z.string(),
  quantityListed: z.number(),
  quantitySold: z.number(),
  quantityCollected: z.number(),
  noShowCount: z.number(),
  openPickupOrderCount: z.number(),
  sellThroughBps: z.number().nullable(),
  gmvPaise: z.number(),
  estimatedNetRecoveryPaise: z.number(),
  refundDebitPaise: z.number(),
  paymentFeePaise: z.number(),
  paymentTaxPaise: z.number(),
  incidentCount: z.number(),
  firstTimeBuyerCount: z.number(),
  repeatBuyerCount: z.number(),
  settlementRunPk: z.string().nullable(),
  settlementStatusCode: z.string().nullable(),
  latestOrderCreatedAt: z.string().nullable(),
  updatedAt: z.string(),
});

const roiNoteRowWireSchema = z.object({
  rowPk: z.string(),
  restaurantPk: z.string(),
  restaurantName: z.string(),
  orderPk: z.string().nullable(),
  orderNumber: z.string().nullable(),
  dropPk: z.string().nullable(),
  noteTypeCode: z.string(),
  severityCode: z.string().nullable().optional(),
  statusCode: z.string().nullable(),
  amountPaise: z.number().nullable(),
  titleText: z.string(),
  descriptionText: z.string().nullable(),
  occurredAt: z.string(),
});

const roiPartnerCopyWireSchema = z.object({
  title: z.string(),
  periodLabel: z.string(),
  restaurantName: z.string(),
  summaryLines: z.array(z.string()),
  assumptionLines: z.array(z.string()),
  nextActionLines: z.array(z.string()),
  generatedAt: z.string(),
});

export const roiReportPayloadSchema = z.object({
  summary: roiReportSummaryWireSchema,
  dropRows: z.array(roiDropDetailRowWireSchema),
  noteRows: z.array(roiNoteRowWireSchema),
  partnerCopy: roiPartnerCopyWireSchema,
});
