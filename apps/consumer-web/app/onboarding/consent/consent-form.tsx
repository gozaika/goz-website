"use client";

import { Button, GoZaikaLogo } from "@gozaika/ui";
import { consentPurposeCodes, type ConsentPurposeCode } from "@gozaika/types";
import { safeErrorMessage } from "@gozaika/utils";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Purpose = {
  purpose_code: ConsentPurposeCode;
  purpose_name: string;
  description: string | null;
  is_required_for_service: boolean;
};

type LatestConsent = {
  purpose_code: ConsentPurposeCode;
  consent_state_code: "GRANTED" | "REVOKED" | null;
  recorded_at: string | null;
};

export function ConsentForm() {
  const router = useRouter();
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [latest, setLatest] = useState<LatestConsent[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({ OPERATIONAL: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const policyVersion = "2026-04-27";

  const latestMap = useMemo(() => {
    return new Map(latest.map((event) => [event.purpose_code, event]));
  }, [latest]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [purposesResponse, latestResponse] = await Promise.all([
          fetch("/api/consent/purposes"),
          fetch("/api/consent/latest"),
        ]);
        const purposesPayload = (await purposesResponse.json()) as { ok: boolean; data?: Purpose[]; error?: string };
        const latestPayload = (await latestResponse.json()) as { ok: boolean; data?: LatestConsent[]; error?: string };

        if (!purposesPayload.ok || !latestPayload.ok) {
          throw new Error(purposesPayload.error ?? latestPayload.error ?? "Consent settings are unavailable.");
        }

        if (!mounted) {
          return;
        }

        setPurposes(purposesPayload.data ?? []);
        setLatest(latestPayload.data ?? []);
        setSelected(() => {
          const next: Record<string, boolean> = { OPERATIONAL: true };
          for (const purpose of purposesPayload.data ?? []) {
            const state = latestPayload.data?.find((event) => event.purpose_code === purpose.purpose_code);
            next[purpose.purpose_code] = purpose.is_required_for_service
              ? true
              : state?.consent_state_code === "GRANTED";
          }
          return next;
        });
      } catch (caught) {
        if (mounted) {
          setError(safeErrorMessage(caught, "Consent settings are unavailable."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function submit() {
    setSaving(true);
    setError("");

    try {
      const timestamp = new Date().toISOString();
      const response = await fetch("/api/consent/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          events: consentPurposeCodes.map((purposeCode) => ({
            purposeCode,
            state: selected[purposeCode] ? "GRANTED" : "REVOKED",
            source: "SIGNUP_FLOW",
            policyVersion,
            proofJson: {
              uiVersion: "consumer-web-slice1",
              sourceRoute: "/onboarding/consent",
              capturedAt: timestamp,
              userAgent: navigator.userAgent,
            },
          })),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!payload.ok) {
        throw new Error(payload.error ?? "We could not save consent settings.");
      }

      router.replace("/account");
      router.refresh();
    } catch (caught) {
      setError(safeErrorMessage(caught, "We could not save consent settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm md:p-8">
        <GoZaikaLogo className="h-11" />
        <div className="mt-6 flex items-start gap-3">
          <ShieldCheck className="mt-1 text-[#1A5C38]" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-bold text-[#2D2D2D]">Your DPDP consent</h1>
            <p className="mt-2 text-sm leading-6 text-[#2D2D2D]/70">
              goZaika records consent purpose-by-purpose. Operational consent is required for pickup-only BAM Bag claims.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {loading ? (
          <div className="mt-8 grid gap-3" aria-label="Loading consent settings">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-lg bg-black/5" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-3">
            {purposes.map((purpose) => {
              const checked = selected[purpose.purpose_code] ?? false;
              const latestEvent = latestMap.get(purpose.purpose_code);

              return (
                <label
                  key={purpose.purpose_code}
                  className="flex min-h-20 items-start justify-between gap-4 rounded-lg border border-black/10 p-4"
                >
                  <span>
                    <span className="block font-semibold text-[#2D2D2D]">
                      {purpose.purpose_name}
                      {purpose.is_required_for_service ? " (required)" : ""}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[#2D2D2D]/70">{purpose.description}</span>
                    {latestEvent?.recorded_at ? (
                      <span className="mt-2 block text-xs text-[#2D2D2D]/55">
                        Latest: {latestEvent.consent_state_code?.toLowerCase()} on{" "}
                        {new Date(latestEvent.recorded_at).toLocaleString("en-IN")}
                      </span>
                    ) : null}
                  </span>
                  <input
                    type="checkbox"
                    className="mt-1 h-6 w-6 accent-[#1A5C38]"
                    checked={checked}
                    disabled={purpose.is_required_for_service}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [purpose.purpose_code]: event.target.checked,
                      }))
                    }
                  />
                </label>
              );
            })}
          </div>
        )}

        <Button type="button" className="mt-8 w-full" disabled={loading || saving || !selected.OPERATIONAL} onClick={submit}>
          {saving ? "Saving consent..." : "Agree and continue"}
        </Button>
      </div>
    </section>
  );
}
