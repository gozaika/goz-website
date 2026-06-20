import { normalizeIndianPhone } from "@gozaika/utils";

export interface PhoneValidationResult {
  readonly ok: boolean;
  readonly e164?: string;
  readonly message?: string;
}

/** Validate + normalize an Indian mobile number to E.164 (+91XXXXXXXXXX). */
export function validateIndianMobile(input: string): PhoneValidationResult {
  try {
    return { ok: true, e164: normalizeIndianPhone(input) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Enter a valid Indian mobile number." };
  }
}

export const OTP_LENGTH = 6 as const;

/** True once exactly six digits have been entered. */
export function isCompleteOtp(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

/** Resend cooldown so users cannot spam OTP requests (auth rate limits). */
export const RESEND_COOLDOWN_SECONDS = 30 as const;

export function resendAvailableAtMs(nowMs: number): number {
  return nowMs + RESEND_COOLDOWN_SECONDS * 1000;
}

export function resendSecondsRemaining(nowMs: number, availableAtMs: number): number {
  return Math.max(0, Math.ceil((availableAtMs - nowMs) / 1000));
}

export function canResend(nowMs: number, availableAtMs: number): boolean {
  return nowMs >= availableAtMs;
}
