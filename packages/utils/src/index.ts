import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Shared design-system primitive logic (countdown tone, progress) — used by both
// @gozaika/mobile-ui and @gozaika/ui so the two surfaces never drift.
export * from "./primitives-model";

// Restaurant economics calculator model (business-model-audit §11.2) — shared by
// the gozaika.in fill-the-gap tool and the restaurant web app decision-support tab.
export * from "./economics";

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

export function formatSignedPaise(amountPaise: number | bigint, locale = "en-IN"): string {
  const paise = typeof amountPaise === "bigint" ? amountPaise : BigInt(amountPaise);
  if (paise < 0n) {
    return `-\u00A0${formatPaise(-paise, locale)}`;
  }
  if (paise > 0n) {
    return `+\u00A0${formatPaise(paise, locale)}`;
  }
  return formatPaise(0, locale);
}

export function rateToBasisPoints(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return Math.max(0, Math.round((numerator * 10_000) / denominator));
}

export function formatBasisPoints(basisPoints: number | null | undefined, options: { readonly emptyText?: string } = {}): string {
  if (basisPoints == null || !Number.isFinite(basisPoints)) {
    return options.emptyText ?? "Not enough data";
  }

  const clamped = Math.max(0, basisPoints);
  const whole = Math.floor(clamped / 100);
  const fraction = clamped % 100;
  return fraction === 0 ? `${whole}%` : `${whole}.${fraction.toString().padStart(2, "0").replace(/0+$/, "")}%`;
}

export function rateTone(
  basisPoints: number | null | undefined,
  thresholds: { readonly strongBps: number; readonly watchBps: number } = { strongBps: 7000, watchBps: 4000 },
): "success" | "warning" | "danger" | "neutral" {
  if (basisPoints == null || !Number.isFinite(basisPoints)) return "neutral";
  if (basisPoints >= thresholds.strongBps) return "success";
  if (basisPoints >= thresholds.watchBps) return "warning";
  return "danger";
}

export function rateLabel(basisPoints: number | null | undefined): string {
  const tone = rateTone(basisPoints);
  if (tone === "success") return "Strong";
  if (tone === "warning") return "Watch";
  if (tone === "danger") return "Needs attention";
  return "Not enough data";
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

function formatDropAlertPickupWindow(
  pickupStartAt: string | Date,
  pickupEndAt: string | Date,
  locale = "en-IN",
  timeZone = "Asia/Kolkata",
): string {
  const start = new Date(pickupStartAt);
  const end = new Date(pickupEndAt);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone,
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  const startDate = dateFormatter.format(start);
  const endDate = dateFormatter.format(end);
  const startTime = timeFormatter.format(start);
  const endTime = timeFormatter.format(end);

  return startDate === endDate ? `${startDate}, ${startTime} - ${endTime}` : `${startDate}, ${startTime} - ${endDate}, ${endTime}`;
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

/**
 * Cuisine cover-art keys shared by mobile and web. Each maps to an original
 * flat-illustration cover (see `scripts/demo-art/build-art.mjs`). `cuisineCoverKey`
 * picks one from generic cuisine keywords in a restaurant name (and optional
 * cuisine tags), so the same restaurant shows the same appetizing cover on every
 * surface. Returns `null` when nothing matches, so callers can fall back (e.g. to
 * a stable hash) instead of guessing. The vocabulary is generic, not demo-specific.
 */
export const COVER_KEYS = ["biryani", "thali", "grill", "coastal", "bakery"] as const;
export type CoverKey = (typeof COVER_KEYS)[number];

const COVER_KEYWORDS: readonly (readonly [RegExp, CoverKey])[] = [
  [/biryani|hyderabad|dum\b|pulao|mughlai|nawab|handi/i, "biryani"],
  [/grill|smoky|tandoor|kebab|bbq|barbe|charcoal|north.?indian|continental/i, "grill"],
  [/andhra|coastal|seafood|\bfish\b|chettinad|malabar|spice trail/i, "coastal"],
  [/bakery|baker|sweet|cake|dessert|patisser|choco|bread|bake\b/i, "bakery"],
  [/sattvi|thali|south.?indian|\bveg\b|jain|pure.?veg|multi.?cuisine|tiffin/i, "thali"],
];

export function cuisineCoverKey(name: string | null | undefined, cuisineTags: readonly string[] = []): CoverKey | null {
  const haystack = [name ?? "", ...cuisineTags].join(" ").trim();
  if (!haystack) return null;
  for (const [pattern, key] of COVER_KEYWORDS) {
    if (pattern.test(haystack)) return key;
  }
  return null;
}

/** The four drop presentation types the catalog DTO exposes. */
export type DropTypeCode = "STANDARD" | "SPOTLIGHT" | "CHEF_SPECIAL" | "BLIND_ADVENTURE";

/**
 * Cover-art key for a *drop* (vs. a restaurant). Blind-bag drops must not reveal
 * their cuisine, so `BLIND_ADVENTURE` returns the cuisine-agnostic `"mystery"`
 * cover; every other drop type uses the cuisine cover. Returns `null` when the
 * cuisine can't be inferred, so callers fall back the same way as `cuisineCoverKey`.
 */
export function dropCoverKey(
  drop: {
    readonly restaurantName?: string | null;
    readonly dropTypeCode?: string | null;
    readonly cuisineTags?: readonly string[];
  },
): CoverKey | "mystery" | null {
  if (drop.dropTypeCode === "BLIND_ADVENTURE") return "mystery";
  return cuisineCoverKey(drop.restaurantName, drop.cuisineTags ?? []);
}

/**
 * Short premium-ribbon label layered on a drop's cover banner, or `null` for
 * drop types that get no ribbon. `BLIND_ADVENTURE` is intentionally excluded —
 * it has its own mystery cover + "Mystery Cuisine" treatment instead of a ribbon.
 */
export function dropTypeRibbon(dropTypeCode?: string | null): string | null {
  if (dropTypeCode === "CHEF_SPECIAL") return "Chef's Special";
  if (dropTypeCode === "SPOTLIGHT") return "Spotlight";
  return null;
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

export type DropClaimUnavailableCode =
  | "SOLD_OUT"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED"
  | "PICKUP_WINDOW_CLOSED"
  | "UNAVAILABLE";

export interface DropClaimAvailability {
  readonly canClaim: boolean;
  readonly reason: string;
  readonly code?: DropClaimUnavailableCode;
}

export function getDropClaimAvailability(
  drop: {
    readonly statusCode: string;
    readonly quantityAvailable: number;
    readonly pickupEndAt: string;
  },
  now: Date = new Date(),
): DropClaimAvailability {
  if (drop.statusCode === "SOLD_OUT" || drop.quantityAvailable <= 0) {
    return { canClaim: false, code: "SOLD_OUT", reason: "Sold out" };
  }

  const pickupEnd = Date.parse(drop.pickupEndAt);
  if (Number.isFinite(pickupEnd) && pickupEnd <= now.valueOf()) {
    return { canClaim: false, code: "PICKUP_WINDOW_CLOSED", reason: "Pickup window closed" };
  }

  if (drop.statusCode === "PAUSED") {
    return { canClaim: false, code: "PAUSED", reason: "Paused by restaurant" };
  }

  if (drop.statusCode === "PICKUP_CLOSED" || drop.statusCode === "EMERGENCY_CLOSED") {
    return { canClaim: false, code: "CLOSED", reason: "Drop closed" };
  }

  if (drop.statusCode === "CANCELLED") {
    return { canClaim: false, code: "CANCELLED", reason: "Drop cancelled" };
  }

  if (!["ACTIVE", "SCHEDULED"].includes(drop.statusCode)) {
    return { canClaim: false, code: "UNAVAILABLE", reason: "Not available to claim" };
  }

  return { canClaim: true, reason: "Hold this BAM Bag" };
}

export const DEFAULT_CUSTOMER_WEB_ORIGIN = "https://customer.gozaika.in";

export interface ManualDropAlertInput {
  readonly dropPk: string;
  readonly dropTitle: string;
  readonly restaurantName: string;
  readonly neighborhoodName?: string | null;
  readonly bagDisplayName?: string | null;
  readonly dietaryCategoryCode: string;
  readonly allergenSummaryText?: string | null;
  readonly allergenCodes?: readonly string[] | null;
  readonly pricePaise: number;
  readonly pickupStartAt: string;
  readonly pickupEndAt: string;
  readonly quantityTotal: number;
  readonly quantityAvailable: number;
  readonly statusCode: string;
}

export function createPublicDropUrl(dropPk: string, origin = DEFAULT_CUSTOMER_WEB_ORIGIN): string {
  return `${origin.replace(/\/+$/, "")}/drops/${encodeURIComponent(dropPk)}`;
}

function readableDropStatus(drop: ManualDropAlertInput): string {
  if (drop.statusCode === "ACTIVE" && drop.quantityAvailable > 0) {
    return "Active now";
  }

  if (drop.statusCode === "SCHEDULED" && drop.quantityAvailable > 0) {
    return "Scheduled";
  }

  if (drop.quantityAvailable <= 0 || drop.statusCode === "SOLD_OUT") {
    return "Sold out";
  }

  return drop.statusCode.replaceAll("_", " ").toLowerCase();
}

export function generateManualDropAlertText(drop: ManualDropAlertInput, publicDropUrl = createPublicDropUrl(drop.dropPk)): string {
  const allergenCodes = drop.allergenCodes?.filter(Boolean) ?? [];
  const allergenText = [
    allergenCodes.length ? allergenCodes.map((code) => code.replaceAll("_", " ")).join(", ") : null,
    drop.allergenSummaryText,
  ]
    .filter(Boolean)
    .join(". ");
  const hasAllergenData = Boolean(allergenText);
  const availableToPromote = ["ACTIVE", "SCHEDULED"].includes(drop.statusCode) && drop.quantityAvailable > 0;
  const availability = availableToPromote
    ? `${drop.quantityAvailable} of ${drop.quantityTotal} bags shown as available`
    : "Not available to claim right now";
  const title = drop.dropTitle || drop.bagDisplayName || "BAM Bag";
  const pickupContext = drop.neighborhoodName ? `${drop.neighborhoodName} pickup` : "Pickup only";
  const lines = [
    "goZaika BAM Bag alert",
    `Restaurant: ${drop.restaurantName}`,
    `Drop: ${title}`,
    `Pickup window: ${formatDropAlertPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}`,
    `Price: ${formatPaise(drop.pricePaise)}`,
    `Availability: ${availability}`,
    `Status: ${readableDropStatus(drop)}`,
    `Dietary: ${dietaryBadgeLabel(drop.dietaryCategoryCode)}`,
    `Allergens: ${allergenText || "No specific allergen flags listed in this drop data"}`,
    `Pickup: ${pickupContext}`,
    `View details: ${publicDropUrl}`,
  ];

  if (hasAllergenData) {
    lines.push("Check allergens before claiming.");
  }
  lines.push("Availability can change. Please check the drop page before heading to pickup.");

  return lines.join("\n");
}

export function notificationStatusLabel(statusCode: string, reasonCode?: string | null): string {
  if (statusCode === "SENT") return "Sent";
  if (statusCode === "QUEUED") return "Queued";
  if (statusCode === "SENDING") return "Sending";
  if (statusCode === "FAILED") {
    if (reasonCode === "PROVIDER_NOT_CONFIGURED") return "Delivery unavailable";
    return "Delivery failed";
  }
  if (statusCode === "SUPPRESSED") {
    if (reasonCode === "CONSENT_NOT_GRANTED") return "Unavailable by consent";
    if (reasonCode === "PREFERENCE_DISABLED") return "Turned off in preferences";
    if (reasonCode === "DESTINATION_MISSING") return "Destination missing";
    return "Not sent";
  }
  if (statusCode === "CANCELLED") return "Cancelled";
  return statusCode.replaceAll("_", " ").toLowerCase();
}

export function notificationStatusTone(statusCode: string): "success" | "warning" | "danger" | "neutral" {
  if (statusCode === "SENT") return "success";
  if (statusCode === "QUEUED" || statusCode === "SENDING") return "warning";
  if (statusCode === "FAILED") return "danger";
  return "neutral";
}

export function financeSettlementStatusLabel(statusCode: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    OPEN: "Open review",
    LOCKED: "Locked",
    SENT: "Payout sent",
    PAID: "Paid",
    RECONCILED: "Reconciled",
    CANCELLED: "Cancelled",
  };
  return labels[statusCode] ?? statusCode.replaceAll("_", " ").toLowerCase();
}

export function financeSettlementStatusTone(statusCode: string): "success" | "warning" | "danger" | "neutral" {
  if (statusCode === "PAID" || statusCode === "RECONCILED") return "success";
  if (statusCode === "DRAFT" || statusCode === "OPEN" || statusCode === "LOCKED" || statusCode === "SENT") return "warning";
  if (statusCode === "CANCELLED") return "danger";
  return "neutral";
}

export function adminOpsStatusLabel(statusCode: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    SCHEDULED: "Scheduled",
    PAUSED: "Paused",
    SUSPENDED: "Suspended",
    OPEN: "Open",
    IN_PROGRESS: "In progress",
    TRIAGED: "Triaged",
    INVESTIGATING: "Investigating",
    MERCHANT_ACTION_REQUIRED: "Partner action required",
    OPS_REVIEW: "Ops review",
    FINANCE_REVIEW: "Finance review",
    APPROVED_MANUAL: "Approved for manual handling",
    TRACKED_EXTERNALLY: "Tracked externally",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
  };
  return labels[statusCode] ?? statusCode.replaceAll("_", " ").toLowerCase();
}

export function adminOpsStatusTone(statusCode: string): "success" | "warning" | "danger" | "neutral" {
  if (["ACTIVE", "RESOLVED", "CLOSED", "TRACKED_EXTERNALLY"].includes(statusCode)) return "success";
  if (["OPEN", "IN_PROGRESS", "TRIAGED", "INVESTIGATING", "OPS_REVIEW", "FINANCE_REVIEW", "SCHEDULED"].includes(statusCode)) return "warning";
  if (["PAUSED", "SUSPENDED", "REJECTED", "CANCELLED", "MERCHANT_ACTION_REQUIRED"].includes(statusCode)) return "danger";
  return "neutral";
}

export function slaFreshnessLabel(slaDueAt: string | null | undefined, now: Date = new Date()): string {
  if (!slaDueAt) return "No SLA";
  const dueMs = Date.parse(slaDueAt);
  if (!Number.isFinite(dueMs)) return "No SLA";
  const deltaMinutes = Math.round((dueMs - now.valueOf()) / 60_000);
  if (deltaMinutes < 0) return `Overdue ${Math.abs(deltaMinutes)}m`;
  if (deltaMinutes < 60) return `Due in ${deltaMinutes}m`;
  return `Due in ${Math.round(deltaMinutes / 60)}h`;
}

export function maskSupportSafe(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return "";
  if (text.includes("@")) {
    const [local = "", domain = ""] = text.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    return `${text.slice(0, 3)}***${text.slice(-3)}`;
  }
  return text.length > 12 ? `${text.slice(0, 6)}...${text.slice(-3)}` : text;
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value).replace(/\r?\n/g, " ").trim();
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function generateSupportSafeCsv(rows: readonly Record<string, unknown>[], columns: readonly string[]): string {
  const bounded = rows.slice(0, 200);
  return [columns.join(","), ...bounded.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
}

export function generateSupportSafeText(title: string, rows: readonly Record<string, unknown>[], columns: readonly string[]): string {
  const lines = [title, `Rows: ${Math.min(rows.length, 200)}`, ""];
  for (const [index, row] of rows.slice(0, 200).entries()) {
    lines.push(`#${index + 1}`);
    for (const column of columns) {
      lines.push(`${column}: ${row[column] ?? ""}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
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

// ─── Slice 9 utilities ────────────────────────────────────────────────────────

export function formatCountdown(endAt: string | Date, now: Date = new Date()): string {
  const endMs = typeof endAt === "string" ? Date.parse(endAt) : endAt.getTime();
  const remainingMs = Math.max(0, endMs - now.getTime());
  if (remainingMs === 0) return "00:00:00";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const TIER_THRESHOLDS = { BRONZE: 0, SILVER: 10, GOLD: 30, PLATINUM: 75 } as const;

export function tierFromBagCount(n: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" {
  if (n >= TIER_THRESHOLDS.PLATINUM) return "PLATINUM";
  if (n >= TIER_THRESHOLDS.GOLD) return "GOLD";
  if (n >= TIER_THRESHOLDS.SILVER) return "SILVER";
  return "BRONZE";
}

export function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    BRONZE: "Foodie Explorer",
    SILVER: "Flavor Nomad",
    GOLD: "Taste Connoisseur",
    PLATINUM: "Culinary Ambassador",
  };
  return labels[tier] ?? tier;
}

export function bagsToNextTier(n: number): number | null {
  if (n < TIER_THRESHOLDS.SILVER) return TIER_THRESHOLDS.SILVER - n;
  if (n < TIER_THRESHOLDS.GOLD) return TIER_THRESHOLDS.GOLD - n;
  if (n < TIER_THRESHOLDS.PLATINUM) return TIER_THRESHOLDS.PLATINUM - n;
  return null;
}

export function tierProgressPercent(n: number): number {
  if (n >= TIER_THRESHOLDS.PLATINUM) return 100;
  if (n >= TIER_THRESHOLDS.GOLD) {
    return Math.round(((n - TIER_THRESHOLDS.GOLD) / (TIER_THRESHOLDS.PLATINUM - TIER_THRESHOLDS.GOLD)) * 100);
  }
  if (n >= TIER_THRESHOLDS.SILVER) {
    return Math.round(((n - TIER_THRESHOLDS.SILVER) / (TIER_THRESHOLDS.GOLD - TIER_THRESHOLDS.SILVER)) * 100);
  }
  return Math.round((n / TIER_THRESHOLDS.SILVER) * 100);
}

export function flavourPersonalityLabel(score: number): string {
  if (score >= 81) return "Culinary Ambassador";
  if (score >= 61) return "Flavour Nomad";
  if (score >= 41) return "Spice Voyager";
  if (score >= 21) return "Local Explorer";
  return "Home Comfort";
}

export function ratingLabel(avg: number): string {
  if (avg >= 4.0) return "Excellent";
  if (avg >= 3.5) return "Very Good";
  if (avg >= 3.0) return "Good";
  if (avg >= 2.0) return "Fair";
  return "Poor";
}

export function maskReviewerName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "Anonymous";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const lastInitial = parts.length > 1 ? ` ${(parts[parts.length - 1]?.[0] ?? "").toUpperCase()}.` : "";
  return `${first}${lastInitial}`;
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
