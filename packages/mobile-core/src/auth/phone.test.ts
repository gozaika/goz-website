import { describe, expect, it } from "vitest";
import {
  canResend,
  isCompleteOtp,
  resendAvailableAtMs,
  resendSecondsRemaining,
  validateIndianMobile,
} from "./phone";

describe("validateIndianMobile", () => {
  it("normalizes valid numbers to E.164", () => {
    expect(validateIndianMobile("9876510001")).toEqual({ ok: true, e164: "+919876510001" });
    expect(validateIndianMobile("+91 98765 10001")).toEqual({ ok: true, e164: "+919876510001" });
  });

  it("rejects invalid numbers with a safe message", () => {
    const r = validateIndianMobile("12345");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/valid Indian mobile/i);
  });
});

describe("otp + resend helpers", () => {
  it("validates a complete 6-digit code", () => {
    expect(isCompleteOtp("100001")).toBe(true);
    expect(isCompleteOtp("1000")).toBe(false);
    expect(isCompleteOtp("abcdef")).toBe(false);
  });

  it("computes resend cooldown", () => {
    const at = resendAvailableAtMs(1000);
    expect(at).toBe(31000);
    expect(resendSecondsRemaining(1000, at)).toBe(30);
    expect(resendSecondsRemaining(31000, at)).toBe(0);
    expect(canResend(1000, at)).toBe(false);
    expect(canResend(31000, at)).toBe(true);
  });
});
