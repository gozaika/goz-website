import { z } from "zod";
import type { ClaimIntentStatusCode, OrderStatusCode, PaymentIntentStatusCode } from "../index";

/**
 * Customer checkout contracts (Slice 9): claim a drop → checkout → (real Razorpay
 * OR gated simulator) → server-authoritative order. The mobile client never marks
 * itself paid; it polls `checkout/status`. The provider `mode` tells the client
 * which checkout surface to show. No secrets cross this boundary — only the public
 * Razorpay `keyId` in the real flow.
 */

// ---- Claim (hold a bag) ----

export const claimResultSchema = z.object({
  holdPk: z.string(),
  dropPk: z.string(),
  quantity: z.number(),
  amountPaise: z.number(),
  currencyCode: z.string(),
  expiresAt: z.string(),
});

export interface ClaimResultDto {
  readonly holdPk: string;
  readonly dropPk: string;
  readonly quantity: number;
  readonly amountPaise: number;
  readonly currencyCode: string;
  readonly expiresAt: string;
}

export interface ClaimRequest {
  readonly dropPk: string;
  readonly quantity: number;
  readonly idempotencyKey: string;
}

// ---- Order Again (§20) — full-price reorder on the existing hold→pay→pickup rails ----

export const reorderResultSchema = z.object({
  holdPk: z.string(),
  dropPk: z.string(),
  amountPaise: z.number(),
  currencyCode: z.string(),
  bagDisplayName: z.string(),
  restaurantName: z.string(),
  pickupStartAt: z.string(),
  pickupEndAt: z.string(),
  alreadyHeld: z.boolean(),
});

export interface ReorderResultDto {
  readonly holdPk: string;
  readonly dropPk: string;
  readonly amountPaise: number;
  readonly currencyCode: string;
  readonly bagDisplayName: string;
  readonly restaurantName: string;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  /** True when an earlier tap already reserved this reorder (idempotent replay). */
  readonly alreadyHeld: boolean;
}

export interface ReorderRequest {
  readonly sourceOrderPk: string;
  readonly idempotencyKey: string;
}

// ---- Checkout order (provider order creation) ----

export const checkoutProviderModes = ["razorpay", "simulated"] as const;
export type CheckoutProviderMode = (typeof checkoutProviderModes)[number];

export const checkoutRazorpaySchema = z.object({
  keyId: z.string(),
  providerOrderRef: z.string(),
  prefill: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    contact: z.string().nullable(),
  }),
});

export const checkoutOrderDataSchema = z.object({
  mode: z.string(),
  holdPk: z.string(),
  intentPk: z.string(),
  amountPaise: z.number(),
  currencyCode: z.string(),
  restaurantName: z.string(),
  bagDisplayName: z.string(),
  description: z.string(),
  /** Present only when mode === "razorpay". */
  razorpay: checkoutRazorpaySchema.nullable(),
});

export interface CheckoutRazorpay {
  readonly keyId: string;
  readonly providerOrderRef: string;
  readonly prefill: { readonly name: string | null; readonly email: string | null; readonly contact: string | null };
}

export interface CheckoutOrderData {
  readonly mode: CheckoutProviderMode;
  readonly holdPk: string;
  readonly intentPk: string;
  readonly amountPaise: number;
  readonly currencyCode: string;
  readonly restaurantName: string;
  readonly bagDisplayName: string;
  readonly description: string;
  readonly razorpay: CheckoutRazorpay | null;
}

export interface CheckoutOrderRequest {
  readonly holdPk: string;
  readonly idempotencyKey: string;
}

// ---- Status (poll) ----

export const checkoutStatusDataSchema = z.object({
  holdPk: z.string(),
  holdStatusCode: z.string(),
  paymentIntentStatusCode: z.string().nullable(),
  orderPk: z.string().nullable(),
  orderStatusCode: z.string().nullable(),
});

export interface CheckoutStatusData {
  readonly holdPk: string;
  readonly holdStatusCode: ClaimIntentStatusCode | string;
  readonly paymentIntentStatusCode: PaymentIntentStatusCode | null;
  readonly orderPk: string | null;
  readonly orderStatusCode: OrderStatusCode | null;
}

// ---- Simulator (dev/demo only; server gates by PAYMENTS_SIMULATOR_ENABLED) ----

export const simulateOutcomes = ["SUCCESS", "FAILURE"] as const;
export type SimulateOutcome = (typeof simulateOutcomes)[number];

export const simulateResultSchema = z.object({
  orderPk: z.string().nullable(),
  paymentIntentStatusCode: z.string().nullable(),
  message: z.string(),
});

export interface SimulateResultDto {
  readonly orderPk: string | null;
  readonly paymentIntentStatusCode: PaymentIntentStatusCode | null;
  readonly message: string;
}

export interface SimulateRequest {
  readonly holdPk: string;
  readonly outcome: SimulateOutcome;
}
