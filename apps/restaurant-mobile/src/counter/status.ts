import type { OrderStatusCode, PickupVerificationResultCode } from "@gozaika/types";
import type { StatusTone } from "@gozaika/mobile-ui";

/** Badge tone for an order status (counter queue). */
export function orderStatusTone(code: OrderStatusCode | string): StatusTone {
  switch (code) {
    case "COLLECTED":
      return "success";
    case "READY_FOR_PICKUP":
    case "PAID":
    case "CONFIRMED":
      return "info";
    case "NO_SHOW":
    case "PICKUP_EXPIRED":
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

/** Human label for an order status. */
export function orderStatusLabel(code: OrderStatusCode | string): string {
  return String(code).replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Tone for a pickup verification result. */
export function pickupResultTone(code: PickupVerificationResultCode | string): StatusTone {
  switch (code) {
    case "SUCCESS":
      return "success";
    case "ALREADY_COLLECTED":
      return "info";
    default:
      return "danger";
  }
}
