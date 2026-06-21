import { queryKeys, STALE_TIMES } from "@gozaika/mobile-core";
import {
  counterOrdersDataSchema,
  incidentCreatedSchema,
  noShowResultSchema,
  pickupVerifyResultSchema,
  type CounterIncidentRequest,
  type CounterNoShowRequest,
  type CounterOrder,
  type CounterOrdersData,
  type CounterPickupVerifyRequest,
  type IncidentCreatedDto,
  type NoShowResultDto,
  type PickupVerifyResultDto,
} from "@gozaika/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Pickup queue for the selected restaurant (Slice 7). */
export function useCounterOrders(restaurantPk: string | null) {
  return useQuery({
    queryKey: queryKeys.restaurantPortal.orders(restaurantPk ?? "none"),
    enabled: Boolean(restaurantPk),
    staleTime: STALE_TIMES.active,
    queryFn: async (): Promise<CounterOrdersData> => {
      const res = await apiClient.request("/orders", {
        dataSchema: counterOrdersDataSchema,
        restaurantPk: restaurantPk ?? undefined,
      });
      // Wire schema keeps codes as strings; narrow to the precise DTO at this boundary.
      return res.data as unknown as CounterOrdersData;
    },
  });
}

/** Find one order in the cached queue (no single-order GET in v1). */
export function useCounterOrder(restaurantPk: string | null, orderId: string): CounterOrder | undefined {
  const { data } = useCounterOrders(restaurantPk);
  return data?.orders.find((order) => order.orderPk === orderId);
}

function useInvalidateOrders(restaurantPk: string | null) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.restaurantPortal.orders(restaurantPk ?? "none") });
}

/** Server-authoritative pickup verification. */
export function useVerifyPickup(restaurantPk: string | null, orderId: string) {
  const invalidate = useInvalidateOrders(restaurantPk);
  return useMutation({
    mutationFn: async (body: CounterPickupVerifyRequest): Promise<PickupVerifyResultDto> => {
      const res = await apiClient.request(`/orders/${orderId}/pickup/verify`, {
        method: "POST",
        body,
        idempotencyKey: body.idempotencyKey,
        restaurantPk: restaurantPk ?? undefined,
        dataSchema: pickupVerifyResultSchema,
      });
      return res.data as unknown as PickupVerifyResultDto;
    },
    onSuccess: () => invalidate(),
  });
}

/** Mark a true no-show after the pickup window. */
export function useNoShow(restaurantPk: string | null, orderId: string) {
  const invalidate = useInvalidateOrders(restaurantPk);
  return useMutation({
    mutationFn: async (body: CounterNoShowRequest): Promise<NoShowResultDto> => {
      const res = await apiClient.request(`/orders/${orderId}/no-show`, {
        method: "POST",
        body,
        idempotencyKey: body.idempotencyKey,
        restaurantPk: restaurantPk ?? undefined,
        dataSchema: noShowResultSchema,
      });
      return res.data as unknown as NoShowResultDto;
    },
    onSuccess: () => invalidate(),
  });
}

/** Log an order-linked incident. */
export function useCreateIncident(restaurantPk: string | null, orderId: string) {
  const invalidate = useInvalidateOrders(restaurantPk);
  return useMutation({
    mutationFn: async (body: CounterIncidentRequest): Promise<IncidentCreatedDto> => {
      const res = await apiClient.request(`/orders/${orderId}/incidents`, {
        method: "POST",
        body,
        restaurantPk: restaurantPk ?? undefined,
        dataSchema: incidentCreatedSchema,
      });
      return res.data as unknown as IncidentCreatedDto;
    },
    onSuccess: () => invalidate(),
  });
}
