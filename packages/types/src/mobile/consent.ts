import { z } from "zod";

// Literals inlined (not imported from ../index) to avoid a runtime circular
// import: index re-exports ./mobile → ./consent, so the canonical arrays are not
// yet initialized when this module's z.enum() runs. These must stay in sync with
// `consentPurposeCodes` / `consentStateCodes` in ../index (a contract test guards it).
const PURPOSE_CODES = [
  "OPERATIONAL",
  "MARKETING",
  "ANALYTICS",
  "REFERRAL_COMMS",
  "WHATSAPP_TRANSACTIONAL",
  "WHATSAPP_MARKETING",
] as const;
const STATE_CODES = ["GRANTED", "REVOKED"] as const;

/**
 * Customer DPDP consent-settings contract (Slice 10). Purpose-scoped, append-only
 * consent (never a single boolean): each purpose carries its latest state plus the
 * policy version it was recorded under. The GET payload is the **permissive wire**
 * schema (code fields stay `z.string()` so an unknown future purpose/state is
 * normalized, not hard-failed). The capture request is **strict** (the client
 * controls it) — the server stamps the policy version + source.
 */

export const consentSettingWireSchema = z.object({
  purposeCode: z.string(),
  purposeName: z.string(),
  description: z.string().nullable(),
  isRequiredForService: z.boolean(),
  displayOrder: z.number(),
  /** GRANTED | REVOKED | null (no event recorded yet). */
  stateCode: z.string().nullable(),
  recordedAt: z.string().nullable(),
  policyVersion: z.string().nullable(),
});

export const consentSettingsDataSchema = z.object({
  settings: z.array(consentSettingWireSchema),
  currentPolicyVersion: z.string(),
});

/** Client → server: toggle one purpose. The server stamps policyVersion + source. */
export const consentUpdateRequestSchema = z.object({
  purposeCode: z.enum(PURPOSE_CODES),
  state: z.enum(STATE_CODES),
});

export interface ConsentSettingDto {
  readonly purposeCode: string;
  readonly purposeName: string;
  readonly description: string | null;
  readonly isRequiredForService: boolean;
  readonly displayOrder: number;
  readonly stateCode: "GRANTED" | "REVOKED" | null;
  readonly recordedAt: string | null;
  readonly policyVersion: string | null;
}

export interface ConsentSettingsData {
  readonly settings: readonly ConsentSettingDto[];
  readonly currentPolicyVersion: string;
}
