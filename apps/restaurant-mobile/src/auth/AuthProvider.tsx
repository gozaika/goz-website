import { initialLoginState, loginReducer, validateIndianMobile, type LoginState } from "@gozaika/mobile-core";
import type { MobileMembershipDto } from "@gozaika/types";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useEffect, useReducer, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { fetchRestaurantBootstrap } from "./bootstrap";
import { supabase } from "./supabase";

export interface AuthContextValue {
  readonly session: Session | null;
  readonly isReady: boolean;
  readonly loginState: LoginState;
  readonly memberships: readonly MobileMembershipDto[];
  readonly selectedRestaurantPk: string | null;
  selectRestaurant(restaurantPk: string): void;
  requestOtp(phoneInput: string): Promise<void>;
  resendOtp(): Promise<void>;
  verifyOtp(code: string): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loginState, dispatch] = useReducer(loginReducer, initialLoginState);
  const [memberships, setMemberships] = useState<readonly MobileMembershipDto[]>([]);
  const [selectedRestaurantPk, setSelectedRestaurantPk] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setIsReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
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

  // Resolve restaurant memberships after sign-in (Slice 4 bootstrap).
  useEffect(() => {
    if (!session) {
      setMemberships([]);
      setSelectedRestaurantPk(null);
      return;
    }
    let active = true;
    fetchRestaurantBootstrap(session.access_token).then((result) => {
      if (active && result) {
        setMemberships(result.memberships);
        setSelectedRestaurantPk((prev) => prev ?? result.selectedRestaurantPk);
      }
    });
    return () => {
      active = false;
    };
  }, [session]);

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

  const selectRestaurant = useCallback((restaurantPk: string) => setSelectedRestaurantPk(restaurantPk), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMemberships([]);
    setSelectedRestaurantPk(null);
    queryClient.clear();
    // Reset the login flow so a fresh sign-in starts at the phone step, not an
    // old OTP/done step carried from the previous session.
    dispatch({ type: "EDIT_PHONE" });
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isReady,
        loginState,
        memberships,
        selectedRestaurantPk,
        selectRestaurant,
        requestOtp,
        resendOtp,
        verifyOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
