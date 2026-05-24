import { pickupQrPayloadSchema, type PickupVerificationMethodCode } from "@gozaika/types";
import { createHash, randomUUID } from "node:crypto";

function credentialSecret(): string {
  const value = process.env.PICKUP_CREDENTIAL_SECRET;
  if (!value || value.length < 32) {
    throw new Error("Missing required environment variable: PICKUP_CREDENTIAL_SECRET");
  }
  return value;
}

export function hashPickupCredential(rawValue: string): string {
  return createHash("sha256").update(`${credentialSecret()}:${rawValue}`).digest("hex");
}

export function createPickupActionIdempotencyKey(prefix: string, orderPk: string, provided?: string): string {
  return provided ?? `${prefix}:${orderPk}:${randomUUID()}`;
}

export function resolvePickupCredential(input: {
  readonly orderPk: string;
  readonly restaurantPk: string;
  readonly otp?: string;
  readonly qrPayload?: string;
}): { readonly method: PickupVerificationMethodCode; readonly hash: string } {
  if (input.otp) {
    return { method: "OTP_ENTRY", hash: hashPickupCredential(input.otp) };
  }

  if (!input.qrPayload) {
    throw new Error("Enter the pickup OTP or paste the QR payload.");
  }

  const parsedJson = JSON.parse(input.qrPayload) as unknown;
  const parsed = pickupQrPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Paste a valid goZaika pickup QR payload.");
  }
  if (parsed.data.orderPk !== input.orderPk || parsed.data.restaurantPk !== input.restaurantPk) {
    throw new Error("This QR payload is for another order or restaurant.");
  }

  return { method: "QR_SCAN", hash: hashPickupCredential(parsed.data.nonce) };
}

export function pickupRpcErrorMessage(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("order not found")) {
    return { error: "Order not found for this restaurant.", status: 404 };
  }
  if (message.includes("wrong restaurant")) {
    return { error: "This order belongs to another restaurant.", status: 403 };
  }
  if (message.includes("already collected")) {
    return { error: "This order was already collected.", status: 409 };
  }
  if (message.includes("no-show not allowed yet")) {
    return { error: "No-show can be marked only after the pickup window closes.", status: 409 };
  }
  if (message.includes("incident type invalid")) {
    return { error: "Choose a valid incident type.", status: 400 };
  }
  if (message.includes("description")) {
    return { error: "Add a short incident description.", status: 400 };
  }

  return { error: "We could not complete this pickup action. Please try again.", status: 500 };
}
