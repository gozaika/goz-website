import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPaise(amountPaise: number | bigint, locale = "en-IN"): string {
  const paise = typeof amountPaise === "bigint" ? amountPaise : BigInt(amountPaise);
  if (paise < 0n) {
    throw new Error("Money amounts must not be negative.");
  }

  const rupees = paise / 100n;
  const remainder = paise % 100n;
  const rupeeText = new Intl.NumberFormat(locale).format(Number(rupees));

  if (remainder === 0n) {
    return `\u20B9${rupeeText}`;
  }

  return `\u20B9${rupeeText}.${remainder.toString().padStart(2, "0")}`;
}

export function formatPickupWindow(
  pickupStartAt: string | Date,
  pickupEndAt: string | Date,
  locale = "en-IN",
  timeZone = "Asia/Kolkata",
): string {
  const start = new Date(pickupStartAt);
  const end = new Date(pickupEndAt);
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const withoutCountry = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;

  if (!/^[6-9]\d{9}$/.test(withoutCountry)) {
    throw new Error("Enter a valid Indian mobile number.");
  }

  return `+91${withoutCountry}`;
}

export function slugifyRestaurantName(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "gozaika-restaurant";
}

export function createIdempotencyKey(prefix: string, actorPk: string, entropy: string): string {
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return `${safePrefix}:${actorPk}:${entropy}`.slice(0, 128);
}

export function createPickupQrPayload(payload: {
  readonly orderPk: string;
  readonly restaurantPk: string;
  readonly nonce: string;
  readonly issuedAt?: string;
}): string {
  return JSON.stringify({
    version: 1,
    orderPk: payload.orderPk,
    restaurantPk: payload.restaurantPk,
    nonce: payload.nonce,
    issuedAt: payload.issuedAt ?? new Date().toISOString(),
  });
}

export function safeErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export function dietaryBadgeLabel(code: string): string {
  const labels: Record<string, string> = {
    VEG: "Veg",
    NON_VEG: "Non-Veg",
    JAIN: "Jain",
    EGG_ONLY: "Egg",
  };

  return labels[code] ?? code;
}

export interface ConsentEventLike {
  readonly purposeCode: string;
  readonly state?: "GRANTED" | "REVOKED";
  readonly granted?: boolean;
  readonly createdAt?: string;
  readonly recordedAt?: string;
}

export function resolveLatestConsent(events: readonly ConsentEventLike[]): Map<string, boolean> {
  const sorted = [...events].sort(
    (left, right) =>
      new Date(left.recordedAt ?? left.createdAt ?? 0).getTime() -
      new Date(right.recordedAt ?? right.createdAt ?? 0).getTime(),
  );
  const latest = new Map<string, boolean>();

  for (const event of sorted) {
    latest.set(event.purposeCode, event.state ? event.state === "GRANTED" : event.granted === true);
  }

  return latest;
}

export function isAllowedDemoSupabaseUrl(url: string, allowRemote = false): boolean {
  if (allowRemote) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}
