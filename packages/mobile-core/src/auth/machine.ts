import { resendAvailableAtMs } from "./phone";

/**
 * Pure login-flow state machine (shared spec §5.1 / Slice 6). The app store
 * dispatches events; this keeps the UI states deterministic and testable without
 * Supabase or navigation.
 */
export type LoginState =
  | { readonly step: "phone"; readonly error?: string }
  | { readonly step: "otp"; readonly phoneE164: string; readonly resendAvailableAtMs: number; readonly error?: string }
  | { readonly step: "verifying"; readonly phoneE164: string }
  | { readonly step: "done" };

export type LoginEvent =
  | { readonly type: "OTP_REQUESTED"; readonly phoneE164: string; readonly nowMs: number }
  | { readonly type: "OTP_REQUEST_FAILED"; readonly message: string }
  | { readonly type: "OTP_RESENT"; readonly nowMs: number }
  | { readonly type: "OTP_SUBMITTED" }
  | { readonly type: "VERIFY_FAILED"; readonly message: string; readonly nowMs: number }
  | { readonly type: "VERIFIED" }
  | { readonly type: "EDIT_PHONE" };

export const initialLoginState: LoginState = { step: "phone" };

export function loginReducer(state: LoginState, event: LoginEvent): LoginState {
  switch (event.type) {
    case "OTP_REQUESTED":
      return { step: "otp", phoneE164: event.phoneE164, resendAvailableAtMs: resendAvailableAtMs(event.nowMs) };
    case "OTP_REQUEST_FAILED":
      return { step: "phone", error: event.message };
    case "OTP_RESENT":
      return state.step === "otp" ? { ...state, resendAvailableAtMs: resendAvailableAtMs(event.nowMs), error: undefined } : state;
    case "OTP_SUBMITTED":
      return state.step === "otp" ? { step: "verifying", phoneE164: state.phoneE164 } : state;
    case "VERIFY_FAILED":
      return state.step === "verifying"
        ? { step: "otp", phoneE164: state.phoneE164, resendAvailableAtMs: resendAvailableAtMs(event.nowMs), error: event.message }
        : state;
    case "VERIFIED":
      return { step: "done" };
    case "EDIT_PHONE":
      return { step: "phone" };
  }
}
