import { createServerSupabaseClient, parseBearerToken } from "@gozaika/supabase";
import type { FinanceData } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { mapFinanceSettlementSummary } from "@/lib/finance";

/**
 * Read-only finance settlements for the selected restaurant (Slice 15). Gated by
 * `viewFinance` (OWNER/ADMIN/FINANCE). Reuses the canonical settlement-summary view
 * + mapper; exposes the payout account only masked. No payment state is mutated.
 *
 * Uses a caller-scoped (bearer) client, NOT the service role: the summary view
 * self-filters on `rls_has_restaurant_access(auth.uid())`, so a service-role client
 * (no `auth.uid()`) reads back zero settlements — the same class of bug as the ROI
 * report (RM-1). The bearer token is already validated + `viewFinance`-gated for this
 * restaurant by the wrapper, so the predicate resolves as it does on web.
 */
export const GET = withMobileRestaurantRole("viewFinance", async ({ req, restaurantPk, requestId }) => {
  const supabase = createServerSupabaseClient(parseBearerToken(req.headers.get("authorization")) ?? undefined);
  try {
    const { data, error } = await supabase
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
