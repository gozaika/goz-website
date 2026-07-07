import { queryKeys, STALE_TIMES } from "@gozaika/mobile-core";
import {
  consumerOrdersDataSchema,
  consumerOrderWireSchema,
  resendPickupResultSchema,
  type ConsumerOrderDto,
  type ConsumerOrdersData,
  type ResendPickupResult,
} from "@gozaika/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "./client";

const pickupProofSchema = z.object({
  qrPayload: z.string(),
  otp: z.string(),
  issuedAt: z.string(),
});
export type PickupProofDto = z.infer<typeof pickupProofSchema>;

/** The customer's paid orders. */
export function useOrders(options: { readonly enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.orders.list(),
    enabled: options.enabled ?? true,
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<ConsumerOrdersData> => {
      const res = await apiClient.request("/orders", { dataSchema: consumerOrdersDataSchema });
      return res.data as unknown as ConsumerOrdersData;
    },
  });
}

/** A single order. */
export function useOrder(orderPk: string | null) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderPk ?? "none"),
    enabled: Boolean(orderPk),
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<ConsumerOrderDto> => {
      const res = await apiClient.request(`/orders/${orderPk}`, { dataSchema: consumerOrderWireSchema });
      return res.data as unknown as ConsumerOrderDto;
    },
  });
}

/**
 * Issue the in-app pickup proof (QR nonce + 6-digit OTP) for a paid order (CM-2).
 * Parity with web: the customer completes pickup from the app, not just SMS. Each
 * fetch derives a fresh credential server-side (only hashes are stored), so it is
 * not cached — refetch when the customer opens the proof.
 */
export function usePickupProof(orderPk: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.orders.detail(orderPk ?? "none"), "pickup-proof"],
    enabled: Boolean(orderPk) && enabled,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<PickupProofDto> => {
      const res = await apiClient.request(`/orders/${orderPk}/pickup-proof`, { dataSchema: pickupProofSchema });
      return res.data as unknown as PickupProofDto;
    },
  });
}

/** Re-send the pickup code by SMS (secondary channel; the in-app proof is primary). */
export function useResendPickup(orderPk: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ResendPickupResult> => {
      const res = await apiClient.request(`/orders/${orderPk}/resend-pickup`, { method: "POST", body: {}, dataSchema: resendPickupResultSchema });
      return res.data as unknown as ResendPickupResult;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderPk ?? "none") }),
  });
}
