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
import { apiClient } from "./client";

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

/** Re-send the pickup code by SMS (no OTP is shown in-app; it stays forwardable). */
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
