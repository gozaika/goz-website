import { newIdempotencyKey, queryKeys, STALE_TIMES } from "@gozaika/mobile-core";
import {
  checkoutOrderDataSchema,
  checkoutStatusDataSchema,
  claimResultSchema,
  reorderResultSchema,
  simulateResultSchema,
  type CheckoutOrderData,
  type CheckoutStatusData,
  type ClaimResultDto,
  type ReorderResultDto,
  type SimulateOutcome,
  type SimulateResultDto,
} from "@gozaika/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Claim a drop (create a hold). One idempotency key per attempt. */
export function useClaim() {
  return useMutation({
    mutationFn: async (input: { dropPk: string; quantity?: number }): Promise<ClaimResultDto> => {
      const res = await apiClient.request("/claims", {
        method: "POST",
        body: { dropPk: input.dropPk, quantity: input.quantity ?? 1, idempotencyKey: newIdempotencyKey() },
        dataSchema: claimResultSchema,
      });
      return res.data as unknown as ClaimResultDto;
    },
  });
}

/**
 * Order Again (§20) — reorder a past order's bag at full price. The server creates a
 * private full-price REORDER drop for the same template + reserves a hold; we then reuse
 * the normal checkout rails by routing to `/checkout/[holdPk]`. One idempotency key per
 * attempt so a double-tap replays the same hold instead of stacking reorders.
 */
export function useReorder() {
  return useMutation({
    mutationFn: async (input: { sourceOrderPk: string }): Promise<ReorderResultDto> => {
      const res = await apiClient.request("/reorder", {
        method: "POST",
        body: { sourceOrderPk: input.sourceOrderPk, idempotencyKey: newIdempotencyKey() },
        dataSchema: reorderResultSchema,
      });
      return res.data as unknown as ReorderResultDto;
    },
  });
}

/**
 * Create / resolve the checkout order for a hold. POST is server-idempotent (reuses
 * the in-flight intent), so a stable key per hold keeps re-renders from creating
 * duplicate intents. Drives the screen's "razorpay" vs "simulated" branch.
 */
export function useCheckoutOrder(holdPk: string | null) {
  return useQuery({
    queryKey: ["checkout", "order", holdPk ?? "none"] as const,
    enabled: Boolean(holdPk),
    staleTime: STALE_TIMES.active,
    retry: false,
    queryFn: async (): Promise<CheckoutOrderData> => {
      const res = await apiClient.request("/checkout/order", {
        method: "POST",
        body: { holdPk, idempotencyKey: `intent:${holdPk}` },
        idempotencyKey: `intent:${holdPk}`,
        dataSchema: checkoutOrderDataSchema,
      });
      return res.data as unknown as CheckoutOrderData;
    },
  });
}

/** Poll hold/intent/order status. Caller enables polling until the order exists. */
export function useCheckoutStatus(holdPk: string | null, options: { enabled: boolean; poll: boolean }) {
  return useQuery({
    queryKey: queryKeys.claims.checkoutStatus(holdPk ?? "none"),
    enabled: options.enabled && Boolean(holdPk),
    refetchInterval: options.poll ? 2000 : false,
    queryFn: async (): Promise<CheckoutStatusData> => {
      const res = await apiClient.request(`/checkout/status?holdPk=${holdPk}`, { dataSchema: checkoutStatusDataSchema });
      return res.data as unknown as CheckoutStatusData;
    },
  });
}

/** DEV/DEMO: drive the gated simulator (server returns 404 when disabled). */
export function useSimulatePayment(holdPk: string | null) {
  return useMutation({
    mutationFn: async (outcome: SimulateOutcome): Promise<SimulateResultDto> => {
      const res = await apiClient.request("/checkout/simulate", {
        method: "POST",
        body: { holdPk, outcome },
        dataSchema: simulateResultSchema,
      });
      return res.data as unknown as SimulateResultDto;
    },
  });
}
