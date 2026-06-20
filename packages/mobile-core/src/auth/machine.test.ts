import { describe, expect, it } from "vitest";
import { initialLoginState, loginReducer, type LoginState } from "./machine";

describe("loginReducer", () => {
  it("phone -> otp on request, with a resend cooldown set", () => {
    const s = loginReducer(initialLoginState, { type: "OTP_REQUESTED", phoneE164: "+919876510001", nowMs: 1000 });
    expect(s).toMatchObject({ step: "otp", phoneE164: "+919876510001", resendAvailableAtMs: 31000 });
  });

  it("surfaces a request failure back on the phone step", () => {
    const s = loginReducer(initialLoginState, { type: "OTP_REQUEST_FAILED", message: "Too many requests" });
    expect(s).toEqual({ step: "phone", error: "Too many requests" });
  });

  it("otp -> verifying -> done on success", () => {
    const otp: LoginState = { step: "otp", phoneE164: "+919876510001", resendAvailableAtMs: 31000 };
    const verifying = loginReducer(otp, { type: "OTP_SUBMITTED" });
    expect(verifying).toEqual({ step: "verifying", phoneE164: "+919876510001" });
    expect(loginReducer(verifying, { type: "VERIFIED" })).toEqual({ step: "done" });
  });

  it("verify failure returns to otp with a fresh cooldown and error", () => {
    const verifying: LoginState = { step: "verifying", phoneE164: "+919876510001" };
    const s = loginReducer(verifying, { type: "VERIFY_FAILED", message: "Wrong code", nowMs: 5000 });
    expect(s).toMatchObject({ step: "otp", error: "Wrong code", resendAvailableAtMs: 35000 });
  });

  it("resend refreshes the cooldown", () => {
    const otp: LoginState = { step: "otp", phoneE164: "+919876510001", resendAvailableAtMs: 31000, error: "x" };
    expect(loginReducer(otp, { type: "OTP_RESENT", nowMs: 40000 })).toMatchObject({
      step: "otp",
      resendAvailableAtMs: 70000,
      error: undefined,
    });
  });

  it("edit phone returns to the phone step", () => {
    const otp: LoginState = { step: "otp", phoneE164: "+919876510001", resendAvailableAtMs: 31000 };
    expect(loginReducer(otp, { type: "EDIT_PHONE" })).toEqual({ step: "phone" });
  });
});
