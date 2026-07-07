import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type {
  AdminPaymentOrderSummary,
  AdminPaymentWebhookSummary,
  ConsumerOrderSummary,
  NotificationSummary,
  PickupProof,
  RestaurantOrderSummary,
} from "@gozaika/types";
import { createPickupQrPayload } from "@gozaika/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

type ConsumerOrderSummaryRow = {
  readonly order_pk: string;
  readonly order_number: string;
  readonly hold_pk: string | null;
  readonly consumer_profile_fk: string;
  readonly restaurant_fk: string;
  readonly drop_fk: string;
  readonly order_status_code: ConsumerOrderSummary["orderStatusCode"];
  readonly payment_status_code: string;
  readonly restaurant_name: string;
  readonly restaurant_slug: string;
  readonly drop_title: string;
  readonly bag_display_name: string;
  readonly dietary_category_code: ConsumerOrderSummary["dietaryCategoryCode"];
  readonly spice_level_code: ConsumerOrderSummary["spiceLevelCode"];
  readonly allergen_summary_text: string | null;
  readonly allergen_codes: readonly string[] | null;
  readonly serves_text: string | null;
  readonly pickup_instructions: string | null;
  readonly quantity: number | string | null;
  readonly unit_price_paise: number | string | null;
  readonly paid_amount_paise: number | string;
  readonly currency_code: string;
  readonly pickup_window_start_at: string;
  readonly pickup_window_end_at: string;
  readonly payment_intent_status_code: ConsumerOrderSummary["paymentIntentStatusCode"];
  readonly payment_captured_at: string | null;
  readonly collected_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

type NotificationSummaryRow = {
  readonly notification_outbox_pk: string;
  readonly order_pk: string | null;
  readonly order_number: string | null;
  readonly restaurant_fk: string | null;
  readonly restaurant_name: string | null;
  readonly template_code: string;
  readonly audience_code: string;
  readonly channel_code: NotificationSummary["channelCode"];
  readonly send_status_code: NotificationSummary["sendStatusCode"];
  readonly provider_code: string | null;
  readonly delivery_reason_code: string | null;
  readonly scheduled_at: string;
  readonly sent_at: string | null;
  readonly next_attempt_at: string | null;
  readonly retry_count: number | string;
  readonly max_attempts: number | string;
  readonly last_attempt_status_code: NotificationSummary["lastAttemptStatusCode"];
  readonly last_attempt_at: string | null;
  readonly last_error_code: string | null;
  readonly last_error_text: string | null;
  readonly manual_fallback_text: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

type RestaurantOrderSummaryRow = {
  readonly order_pk: string;
  readonly order_number: string;
  readonly restaurant_fk: string;
  readonly drop_fk: string;
  readonly order_status_code: RestaurantOrderSummary["orderStatusCode"];
  readonly payment_status_code: string;
  readonly restaurant_name: string;
  readonly drop_title: string;
  readonly bag_display_name: string;
  readonly dietary_category_code: RestaurantOrderSummary["dietaryCategoryCode"];
  readonly spice_level_code: RestaurantOrderSummary["spiceLevelCode"];
  readonly allergen_summary_text: string | null;
  readonly allergen_codes: readonly string[] | null;
  readonly quantity: number | string | null;
  readonly paid_amount_paise: number | string;
  readonly currency_code: string;
  readonly pickup_window_start_at: string;
  readonly pickup_window_end_at: string;
  readonly payment_intent_status_code: RestaurantOrderSummary["paymentIntentStatusCode"];
  readonly payment_captured_at: string | null;
  readonly collected_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type AdminPaymentOrderSummaryRow = {
  readonly payment_order_intent_pk: string;
  readonly hold_pk: string;
  readonly order_pk: string | null;
  readonly order_number: string | null;
  readonly provider_code: "RAZORPAY";
  readonly provider_order_ref: string | null;
  readonly payment_intent_status_code: AdminPaymentOrderSummary["paymentIntentStatusCode"];
  readonly amount_paise: number | string;
  readonly currency_code: string;
  readonly order_status_code: AdminPaymentOrderSummary["orderStatusCode"];
  readonly payment_status_code: string | null;
  readonly restaurant_name: string | null;
  readonly drop_title: string | null;
  readonly hold_status_code: AdminPaymentOrderSummary["holdStatusCode"];
  readonly hold_expires_at: string;
  readonly payment_captured_at: string | null;
  readonly transaction_count: number | string;
  readonly created_at: string;
  readonly updated_at: string;
};

export type AdminPaymentWebhookSummaryRow = {
  readonly payment_webhook_event_pk: string;
  readonly provider_code: "RAZORPAY";
  readonly provider_event_id: string;
  readonly event_type_code: string;
  readonly signature_verified_flag: boolean;
  readonly processing_status_code: AdminPaymentWebhookSummary["processingStatusCode"];
  readonly processed_at: string | null;
  readonly processing_error_text: string | null;
  readonly received_at: string;
};

function credentialSecret(): string {
  const value = process.env.PICKUP_CREDENTIAL_SECRET;
  if (!value || value.length < 32) {
    throw new Error("Missing required environment variable: PICKUP_CREDENTIAL_SECRET");
  }
  return value;
}

function hashCredential(rawValue: string): string {
  return createHash("sha256").update(`${credentialSecret()}:${rawValue}`).digest("hex");
}

export function mapConsumerOrder(row: ConsumerOrderSummaryRow): ConsumerOrderSummary {
  return {
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    holdPk: row.hold_pk,
    consumerProfilePk: row.consumer_profile_fk,
    restaurantPk: row.restaurant_fk,
    dropPk: row.drop_fk,
    orderStatusCode: row.order_status_code,
    paymentStatusCode: row.payment_status_code,
    restaurantName: row.restaurant_name,
    restaurantSlug: row.restaurant_slug,
    dropTitle: row.drop_title,
    bagDisplayName: row.bag_display_name,
    dietaryCategoryCode: row.dietary_category_code,
    spiceLevelCode: row.spice_level_code,
    allergenSummaryText: row.allergen_summary_text,
    allergenCodes: row.allergen_codes ?? [],
    servesText: row.serves_text,
    pickupInstructions: row.pickup_instructions,
    quantity: Number(row.quantity ?? 1),
    unitPricePaise: Number(row.unit_price_paise ?? row.paid_amount_paise),
    paidAmountPaise: Number(row.paid_amount_paise),
    currencyCode: row.currency_code,
    pickupWindowStartAt: row.pickup_window_start_at,
    pickupWindowEndAt: row.pickup_window_end_at,
    paymentIntentStatusCode: row.payment_intent_status_code,
    paymentCapturedAt: row.payment_captured_at,
    collectedAt: row.collected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRestaurantOrder(row: RestaurantOrderSummaryRow): RestaurantOrderSummary {
  return {
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    restaurantPk: row.restaurant_fk,
    dropPk: row.drop_fk,
    orderStatusCode: row.order_status_code,
    paymentStatusCode: row.payment_status_code,
    restaurantName: row.restaurant_name,
    dropTitle: row.drop_title,
    bagDisplayName: row.bag_display_name,
    dietaryCategoryCode: row.dietary_category_code,
    spiceLevelCode: row.spice_level_code,
    allergenSummaryText: row.allergen_summary_text,
    allergenCodes: row.allergen_codes ?? [],
    quantity: Number(row.quantity ?? 1),
    paidAmountPaise: Number(row.paid_amount_paise),
    currencyCode: row.currency_code,
    pickupWindowStartAt: row.pickup_window_start_at,
    pickupWindowEndAt: row.pickup_window_end_at,
    paymentIntentStatusCode: row.payment_intent_status_code,
    paymentCapturedAt: row.payment_captured_at,
    collectedAt: row.collected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAdminPaymentOrder(row: AdminPaymentOrderSummaryRow): AdminPaymentOrderSummary {
  return {
    paymentOrderIntentPk: row.payment_order_intent_pk,
    holdPk: row.hold_pk,
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    providerCode: row.provider_code,
    providerOrderRef: row.provider_order_ref,
    paymentIntentStatusCode: row.payment_intent_status_code,
    amountPaise: Number(row.amount_paise),
    currencyCode: row.currency_code,
    orderStatusCode: row.order_status_code,
    paymentStatusCode: row.payment_status_code,
    restaurantName: row.restaurant_name,
    dropTitle: row.drop_title,
    holdStatusCode: row.hold_status_code,
    holdExpiresAt: row.hold_expires_at,
    paymentCapturedAt: row.payment_captured_at,
    transactionCount: Number(row.transaction_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAdminWebhook(row: AdminPaymentWebhookSummaryRow): AdminPaymentWebhookSummary {
  return {
    paymentWebhookEventPk: row.payment_webhook_event_pk,
    providerCode: row.provider_code,
    providerEventId: row.provider_event_id,
    eventTypeCode: row.event_type_code,
    signatureVerified: row.signature_verified_flag,
    processingStatusCode: row.processing_status_code,
    processedAt: row.processed_at,
    processingErrorText: row.processing_error_text,
    receivedAt: row.received_at,
  };
}

export function mapNotificationSummary(row: NotificationSummaryRow): NotificationSummary {
  return {
    notificationOutboxPk: row.notification_outbox_pk,
    orderPk: row.order_pk,
    orderNumber: row.order_number,
    restaurantPk: row.restaurant_fk,
    restaurantName: row.restaurant_name,
    templateCode: row.template_code,
    audienceCode: row.audience_code,
    channelCode: row.channel_code,
    sendStatusCode: row.send_status_code,
    providerCode: row.provider_code,
    deliveryReasonCode: row.delivery_reason_code,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    nextAttemptAt: row.next_attempt_at,
    retryCount: Number(row.retry_count),
    maxAttempts: Number(row.max_attempts),
    lastAttemptStatusCode: row.last_attempt_status_code,
    lastAttemptAt: row.last_attempt_at,
    lastErrorCode: row.last_error_code,
    lastErrorText: row.last_error_text,
    manualFallbackText: row.manual_fallback_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadConsumerOrders(): Promise<ConsumerOrderSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_consumer_order_summary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error("Could not load your paid orders.");
  }

  return ((data ?? []) as ConsumerOrderSummaryRow[]).map(mapConsumerOrder);
}

export async function loadConsumerNotifications(orderPk?: string): Promise<NotificationSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("api_consumer_notification_summary")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (orderPk) {
    query = query.eq("order_pk", orderPk);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Could not load notification status.");
  }

  return ((data ?? []) as NotificationSummaryRow[]).map(mapNotificationSummary);
}

export async function loadConsumerOrder(orderPk: string): Promise<ConsumerOrderSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_consumer_order_summary")
    .select("*")
    .eq("order_pk", orderPk)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load this paid order.");
  }

  return data ? mapConsumerOrder(data as ConsumerOrderSummaryRow) : null;
}

export async function issuePickupProof(order: ConsumerOrderSummary): Promise<PickupProof> {
  if (!["PAID", "CONFIRMED", "READY_FOR_PICKUP"].includes(order.orderStatusCode)) {
    throw new Error("Pickup proof is available only after payment is confirmed.");
  }

  const nonce = randomBytes(32).toString("base64url");
  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const issuedAt = new Date().toISOString();
  const qrPayload = createPickupQrPayload({
    orderPk: order.orderPk,
    restaurantPk: order.restaurantPk,
    nonce,
    issuedAt,
  });
  const service = createServiceRoleSupabaseClient();
  const { error } = await service
    .from("order_order")
    .update({
      pickup_qr_nonce_hash: hashCredential(nonce),
      pickup_otp_hash: hashCredential(otp),
      updated_at: new Date().toISOString(),
    })
    .eq("order_order_pk", order.orderPk)
    .eq("consumer_profile_fk", order.consumerProfilePk);

  if (error) {
    throw new Error("Could not prepare pickup proof yet.");
  }

  return { qrPayload, otp, issuedAt };
}

/**
 * Load an order through the caller's own RLS-scoped client (so ownership is
 * enforced by the view) and issue its pickup proof. Shared by the mobile BFF
 * (`/orders/[orderId]/pickup-proof`) so the consumer mobile order detail can show
 * the same in-app QR + OTP the web order detail does (CM-2), instead of depending
 * solely on the SMS channel. Returns null when the order isn't visible to the caller.
 */
export async function issuePickupProofForOrder(authed: SupabaseClient, orderPk: string): Promise<PickupProof | null> {
  const { data, error } = await authed.from("api_consumer_order_summary").select("*").eq("order_pk", orderPk).maybeSingle();
  if (error) {
    throw new Error("Could not load this order.");
  }
  if (!data) {
    return null;
  }
  return issuePickupProof(mapConsumerOrder(data as ConsumerOrderSummaryRow));
}
