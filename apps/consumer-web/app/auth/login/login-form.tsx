"use client";

import { Button, BrandIllustration, GoZaikaLogo } from "@gozaika/ui";
import { normalizeIndianPhone, safeErrorMessage } from "@gozaika/utils";
import { Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type LoginStep = "phone" | "otp";

export function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<LoginStep>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [otp, setOtp] = useState("");
  const [demoEmail, setDemoEmail] = useState("aarav.reddy@gozaika.example");
  const [demoPassword, setDemoPassword] = useState("GozaikaDemo@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const demoEnabled = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

  async function finishAuth() {
    const response = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultCityCode: "HYD", preferredLanguageCode: "en" }),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      data?: { needs_operational_consent?: boolean };
      error?: string;
    };

    if (!payload.ok) {
      throw new Error(payload.error ?? "We could not prepare your profile yet.");
    }

    router.replace(payload.data?.needs_operational_consent ? "/onboarding/consent" : "/account");
    router.refresh();
  }

  async function sendOtp() {
    setError("");
    setLoading(true);

    try {
      const normalized = normalizeIndianPhone(phoneInput);
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized });

      if (otpError) {
        throw otpError;
      }

      setPhoneE164(normalized);
      setStep("otp");
    } catch (caught) {
      setError(safeErrorMessage(caught, "We could not send the OTP. Check the number and try again."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: phoneE164,
        token: otp,
        type: "sms",
      });

      if (verifyError) {
        throw verifyError;
      }

      await finishAuth();
    } catch (caught) {
      setError(safeErrorMessage(caught, "That OTP did not work. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
    setError("");
    setLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (caught) {
      setError(safeErrorMessage(caught, "Google sign-in is not available yet."));
      setLoading(false);
    }
  }

  async function demoLogin() {
    setError("");
    setLoading(true);

    try {
      const { error: demoError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (demoError) {
        throw demoError;
      }

      await finishAuth();
    } catch (caught) {
      setError(safeErrorMessage(caught, "Demo login is unavailable. Seed demo users and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-72px)] w-full max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-[1fr_0.9fr]">
      <div className="order-2 md:order-1">
        <GoZaikaLogo className="h-12" />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#1A5C38]">Hyderabad first</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-[#2D2D2D] md:text-5xl">
          Great food. No menu. No algorithm.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#2D2D2D]/75">
          Sign in to claim chef-curated BAM Bags with allergen-disclosed, pickup-only trust.
        </p>
        <BrandIllustration src="/brand/hero-bam-bag.svg" className="mt-8 max-w-md" alt="" />
      </div>

      <div className="order-1 rounded-lg border border-black/10 bg-white p-5 shadow-sm md:order-2 md:p-6">
        <div className="flex items-center gap-3">
          <Phone className="text-[#FF6B35]" aria-hidden="true" />
          <div>
            <h2 className="text-2xl font-bold text-[#2D2D2D]">Login with phone OTP</h2>
            <p className="text-sm text-[#2D2D2D]/65">Primary access for BAM Bag claims.</p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-6 grid gap-4">
          {step === "phone" ? (
            <>
              <label className="grid gap-2 text-sm font-semibold text-[#2D2D2D]">
                Mobile number
                <input
                  className="min-h-11 rounded-lg border border-black/20 px-3 text-base outline-none focus:border-[#1A5C38]"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(event.target.value)}
                />
              </label>
              <Button type="button" onClick={sendOtp} disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-semibold text-[#2D2D2D]">
                6-digit OTP
                <input
                  className="min-h-11 rounded-lg border border-black/20 px-3 text-base tracking-[0.25em] outline-none focus:border-[#1A5C38]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                />
              </label>
              <Button type="button" onClick={verifyOtp} disabled={loading || otp.length !== 6}>
                {loading ? "Verifying..." : "Verify and continue"}
              </Button>
              <button
                type="button"
                className="min-h-11 text-sm font-semibold text-[#1A5C38]"
                onClick={() => setStep("phone")}
              >
                Use another number
              </button>
            </>
          )}
        </div>

        <div className="my-6 h-px bg-black/10" />

        <Button type="button" className="w-full bg-[#1A5C38] hover:bg-[#154b2e]" onClick={googleLogin} disabled={loading}>
          <Mail size={18} aria-hidden="true" />
          <span className="ml-2">Continue with Google</span>
        </Button>

        {demoEnabled ? (
          <div className="mt-6 rounded-lg border border-dashed border-[#D4A017]/60 bg-[#FFF8F0] p-4">
            <p className="text-sm font-bold text-[#2D2D2D]">Local demo login</p>
            <div className="mt-3 grid gap-3">
              <input
                className="min-h-11 rounded-lg border border-black/20 px-3 text-sm"
                value={demoEmail}
                onChange={(event) => setDemoEmail(event.target.value)}
                aria-label="Demo email"
              />
              <input
                className="min-h-11 rounded-lg border border-black/20 px-3 text-sm"
                value={demoPassword}
                onChange={(event) => setDemoPassword(event.target.value)}
                aria-label="Demo password"
                type="password"
              />
              <Button type="button" onClick={demoLogin} disabled={loading}>
                {loading ? "Signing in..." : "Use demo account"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
