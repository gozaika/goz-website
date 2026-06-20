import { initialLoginState, loginReducer, validateIndianMobile, type LoginState } from "@gozaika/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useEffect, useReducer, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";

export interface AuthContextValue {
  readonly session: Session | null;
  readonly isReady: boolean;
  readonly loginState: LoginState;
  readonly consentAcknowledged: boolean;
  requestOtp(phoneInput: string): Promise<void>;
  resendOtp(): Promise<void>;
  verifyOtp(code: string): Promise<void>;
  acknowledgeConsent(): void;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loginState, dispatch] = useReducer(loginReducer, initialLoginState);
  // Slice 6 scaffold: real DPDP consent capture lands in Slice 10.
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setIsReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    const appStateSub = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    supabase.auth.startAutoRefresh();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      appStateSub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const requestOtp = useCallback(async (phoneInput: string) => {
    const phone = validateIndianMobile(phoneInput);
    if (!phone.ok || !phone.e164) {
      dispatch({ type: "OTP_REQUEST_FAILED", message: phone.message ?? "Enter a valid Indian mobile number." });
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.e164 });
    if (error) {
      dispatch({ type: "OTP_REQUEST_FAILED", message: error.message });
      return;
    }
    dispatch({ type: "OTP_REQUESTED", phoneE164: phone.e164, nowMs: Date.now() });
  }, []);

  const resendOtp = useCallback(async () => {
    if (loginState.step !== "otp") {
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ phone: loginState.phoneE164 });
    if (error) {
      dispatch({ type: "VERIFY_FAILED", message: error.message, nowMs: Date.now() });
      return;
    }
    dispatch({ type: "OTP_RESENT", nowMs: Date.now() });
  }, [loginState]);

  const verifyOtp = useCallback(
    async (code: string) => {
      if (loginState.step !== "otp") {
        return;
      }
      const phoneE164 = loginState.phoneE164;
      dispatch({ type: "OTP_SUBMITTED" });
      const { error } = await supabase.auth.verifyOtp({ phone: phoneE164, token: code, type: "sms" });
      if (error) {
        dispatch({ type: "VERIFY_FAILED", message: error.message, nowMs: Date.now() });
        return;
      }
      dispatch({ type: "VERIFIED" });
    },
    [loginState],
  );

  const acknowledgeConsent = useCallback(() => setConsentAcknowledged(true), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setConsentAcknowledged(false);
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isReady,
        loginState,
        consentAcknowledged,
        requestOtp,
        resendOtp,
        verifyOtp,
        acknowledgeConsent,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
