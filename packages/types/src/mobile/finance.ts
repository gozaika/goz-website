import { z } from "zod";
import type { FinanceSettlementStatusCode } from "../index";

/**
 * Restaurant finance contracts (Slice 15). Read-only settlement summaries for the
 * selected restaurant — no payment/settlement state is ever mutated from mobile.
 * The payout account is exposed only **masked** (never the raw account number).
 * Gated by `viewFinance` (OWNER/ADMIN/FINANCE).
 */

export const financeSettlementWireSchema = z.object({
  settlementRunPk: z.string(),
  periodStartAt: z.string(),
  periodEndAt: z.string(),
  statusCode: z.string(),
  orderCount: z.number(),
  grossSalesPaise: z.number(),
  refundPaise: z.number(),
  commissionPaise: z.number(),
  paymentFeePaise: z.number(),
  taxPaise: z.number(),
  netPayoutPaise: z.number(),
  paidAt: z.string().nullable(),
  maskedPayoutAccount: z.string().nullable(),
  invoicePk: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable(),
  invoiceStatusCode: z.string().nullable(),
  invoiceAmountPaise: z.number().nullable(),
});

export const financeDataSchema = z.object({ settlements: z.array(financeSettlementWireSchema) });

export interface FinanceSettlement {
  readonly settlementRunPk: string;
  readonly periodStartAt: string;
  readonly periodEndAt: string;
  readonly statusCode: FinanceSettlementStatusCode;
  readonly orderCount: number;
  readonly grossSalesPaise: number;
  readonly refundPaise: number;
  readonly commissionPaise: number;
  readonly paymentFeePaise: number;
  readonly taxPaise: number;
  readonly netPayoutPaise: number;
  readonly paidAt: string | null;
  readonly maskedPayoutAccount: string | null;
  readonly invoicePk?: string | null;
  readonly invoiceNumber: string | null;
  readonly invoiceStatusCode: string | null;
  readonly invoiceAmountPaise: number | null;
}
export interface FinanceData {
  readonly settlements: readonly FinanceSettlement[];
}
