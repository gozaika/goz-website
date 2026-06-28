import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { FinanceData } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { mapFinanceSettlementSummary } from "@/lib/finance";

/**
 * Read-only finance settlements for the selected restaurant (Slice 15). Gated by
 * `viewFinance` (OWNER/ADMIN/FINANCE). Reuses the canonical settlement-summary view
 * + mapper; exposes the payout account only masked. No payment state is mutated.
 */
export const GET = withMobileRestaurantRole("viewFinance", async ({ restaurantPk, requestId }) => {
  const service = createServiceRoleSupabaseClient();
  try {
    const { data, error } = await service
      .from("api_restaurant_finance_settlement_summary")
      .select("*")
      .eq("restaurant_fk", restaurantPk)
      .order("period_end_at", { ascending: false })
      .limit(40);
    if (error) {
      throw error;
    }
    const settlements = (data ?? []).map((row) => {
      const s = mapFinanceSettlementSummary(row as Parameters<typeof mapFinanceSettlementSummary>[0]);
      return {
        settlementRunPk: s.settlementRunPk,
        periodStartAt: s.periodStartAt,
        periodEndAt: s.periodEndAt,
        statusCode: s.settlementStatusCode,
        orderCount: s.orderCount,
        grossSalesPaise: s.grossSalesPaise,
        refundPaise: s.refundPaise,
        commissionPaise: s.commissionPaise,
        paymentFeePaise: s.paymentFeePaise,
        taxPaise: s.taxPaise,
        netPayoutPaise: s.netPayoutPaise,
        paidAt: s.paidAt,
        maskedPayoutAccount: s.maskedPayoutAccount,
        invoicePk: s.invoice.invoicePk,
        invoiceNumber: s.invoice.invoiceNumber,
        invoiceStatusCode: s.invoice.invoiceStatusCode,
        invoiceAmountPaise: s.invoice.invoiceAmountPaise,
      };
    });
    return mobileResponseOk({ settlements } satisfies FinanceData, requestId);
  } catch (caught) {
    console.error("mobile_finance_load_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Could not load finance settlements.", requestId);
  }
});
