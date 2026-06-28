import { STALE_TIMES } from "@gozaika/mobile-core";
import { financeDataSchema, type FinanceData } from "@gozaika/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "./client";

/** Read-only finance settlements for the selected restaurant (viewFinance). */
export function useFinance(restaurantPk: string | null) {
  return useQuery({
    queryKey: ["portal", "finance", restaurantPk ?? "none"] as const,
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.profile,
    queryFn: async (): Promise<FinanceData> => {
      const res = await apiClient.request("/finance", { dataSchema: financeDataSchema, restaurantPk: restaurantPk ?? undefined });
      return res.data as unknown as FinanceData;
    },
  });
}

const invoiceLinkSchema = z.object({ signedUrl: z.string(), invoiceNumber: z.string().nullable() });

/** Fetch a short-lived signed URL to download a settlement invoice PDF (viewFinance). */
export function useInvoiceDownload(restaurantPk: string | null) {
  return useMutation({
    mutationFn: async (invoicePk: string): Promise<z.infer<typeof invoiceLinkSchema>> => {
      const res = await apiClient.request(`/finance/invoice/${invoicePk}/signed-url`, {
        dataSchema: invoiceLinkSchema,
        restaurantPk: restaurantPk ?? undefined,
      });
      return res.data as unknown as z.infer<typeof invoiceLinkSchema>;
    },
  });
}
