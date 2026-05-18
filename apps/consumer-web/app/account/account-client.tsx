"use client";

import { Button, GoZaikaLogo } from "@gozaika/ui";
import { consentPurposeCodes, type ClaimIntent, type ConsentPurposeCode } from "@gozaika/types";
import { formatPaise, formatPickupWindow, safeErrorMessage } from "@gozaika/utils";
import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface AccountProfile {
  readonly email: string | null;
  readonly phone: string | null;
  readonly fullName: string | null;
  readonly preferredLanguageCode: string;
  readonly referralCode: string | null;
}

export interface AccountConsent {
  readonly purpose_code: ConsentPurposeCode;
  readonly purpose_name: string;
  readonly is_required_for_service: boolean;
  readonly consent_state_code: "GRANTED" | "REVOKED" | null;
  readonly recorded_at: string | null;
  readonly policy_version: string | null;
}

export function AccountClient({
  initialProfile,
  initialConsents,
  initialClaimIntents,
}: {
  readonly initialProfile: AccountProfile;
  readonly initialConsents: readonly AccountConsent[];
  readonly initialClaimIntents: readonly ClaimIntent[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [consents, setConsents] = useState(initialConsents);
  const [fullName, setFullName] = useState(initialProfile.fullName ?? "");
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [language, setLanguage] = useState(initialProfile.preferredLanguageCode);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName,
          phoneE164: phone || undefined,
          preferredLanguageCode: language,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; data?: AccountProfile; error?: string };

      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "We could not update your profile.");
      }

      setProfile(payload.data);
      setStatus("Profile updated.");
    } catch (caught) {
      setStatus(safeErrorMessage(caught, "We could not update your profile."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleConsent(purposeCode: ConsentPurposeCode, nextGranted: boolean) {
    setStatus("");

    try {
      const response = await fetch("/api/consent/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          events: [
            {
              purposeCode,
              state: nextGranted ? "GRANTED" : "REVOKED",
              source: "ACCOUNT_SETTINGS",
              policyVersion: "2026-04-27",
              proofJson: {
                uiVersion: "consumer-web-slice1",
                sourceRoute: "/account",
                capturedAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
              },
            },
          ],
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!payload.ok) {
        throw new Error(payload.error ?? "We could not update consent.");
      }

      const latestResponse = await fetch("/api/consent/latest");
      const latestPayload = (await latestResponse.json()) as { ok: boolean; data?: AccountConsent[]; error?: string };
      if (latestPayload.ok && latestPayload.data) {
        setConsents(latestPayload.data);
      }
      setStatus("Consent setting recorded.");
    } catch (caught) {
      setStatus(safeErrorMessage(caught, "We could not update consent."));
    }
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <GoZaikaLogo className="h-10" />
          <h1 className="mt-5 text-4xl font-bold text-[#2D2D2D]">Account</h1>
          <p className="mt-2 text-sm text-[#2D2D2D]/70">Your BAM Bag profile, referral code and DPDP consent settings.</p>
        </div>
        <Button type="button" className="bg-[#1A5C38] hover:bg-[#154b2e]" onClick={signOut}>
          <LogOut size={18} aria-hidden="true" />
          <span className="ml-2">Sign out</span>
        </Button>
      </div>

      {status ? (
        <p className="mt-6 rounded-lg border border-[#D4A017]/40 bg-white px-3 py-2 text-sm text-[#2D2D2D]">{status}</p>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-[#2D2D2D]">Profile</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Name
              <input
                className="min-h-11 rounded-lg border border-black/20 px-3"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Phone
              <input
                className="min-h-11 rounded-lg border border-black/20 px-3"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Language
              <select
                className="min-h-11 rounded-lg border border-black/20 px-3"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="te">Telugu</option>
              </select>
            </label>
            <div className="rounded-lg bg-[#FFF8F0] p-3 text-sm">
              <p className="font-semibold text-[#2D2D2D]">Email</p>
              <p className="mt-1 text-[#2D2D2D]/70">{profile.email ?? "Not added"}</p>
            </div>
            <div className="rounded-lg bg-[#FFF8F0] p-3 text-sm">
              <p className="font-semibold text-[#2D2D2D]">Referral code</p>
              <p className="mt-1 text-[#2D2D2D]/70">{profile.referralCode ?? "Generating after first login"}</p>
            </div>
            <Button type="button" onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#1A5C38]" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#2D2D2D]">Consent settings</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {consents.map((consent) => {
              const checked = consent.consent_state_code === "GRANTED" || consent.is_required_for_service;

              return (
                <label
                  key={consent.purpose_code}
                  className="flex min-h-20 items-start justify-between gap-4 rounded-lg border border-black/10 p-4"
                >
                  <span>
                    <span className="block font-semibold text-[#2D2D2D]">
                      {consent.purpose_name}
                      {consent.is_required_for_service ? " (required)" : ""}
                    </span>
                    <span className="mt-1 block text-xs text-[#2D2D2D]/60">
                      {consent.recorded_at
                        ? `Latest ${consent.consent_state_code?.toLowerCase()} on ${new Date(
                            consent.recorded_at,
                          ).toLocaleString("en-IN")}`
                        : "No consent event recorded yet"}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="mt-1 h-6 w-6 accent-[#1A5C38]"
                    checked={checked}
                    disabled={consent.is_required_for_service}
                    onChange={(event) => toggleConsent(consent.purpose_code, event.target.checked)}
                  />
                </label>
              );
            })}
            {consents.length === 0
              ? consentPurposeCodes.map((purpose) => (
                  <div key={purpose} className="rounded-lg border border-black/10 p-4 text-sm text-[#2D2D2D]/70">
                    {purpose.replaceAll("_", " ")} is not configured yet.
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-[#2D2D2D]">Current holds</h2>
        <p className="mt-1 text-sm text-[#2D2D2D]/65">Temporary BAM Bag holds awaiting the Slice 4B payment flow.</p>
        <div className="mt-4 grid gap-3">
          {initialClaimIntents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-[#2D2D2D]/60">
              You do not have active or recent claim holds yet.
            </p>
          ) : (
            initialClaimIntents.map((claim) => (
              <article key={claim.holdPk} className="rounded-lg border border-black/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1A5C38]">{claim.restaurantName}</p>
                    <h3 className="mt-1 font-bold text-[#2D2D2D]">{claim.bagDisplayName}</h3>
                    <p className="mt-1 text-xs text-[#2D2D2D]/60">
                      {claim.statusCode === "ACTIVE" ? "Payment pending hold" : claim.statusCode.toLowerCase()} -{" "}
                      {formatPickupWindow(claim.pickupStartAt, claim.pickupEndAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#1A5C38]/25 px-3 py-1 text-xs font-semibold text-[#1A5C38]">
                    {claim.quantityHeld} held
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#2D2D2D]/70">
                  <span>{formatPaise(claim.pricePaise)}</span>
                  <span>Expires {new Date(claim.expiresAt).toLocaleString("en-IN")}</span>
                  <Link className="font-semibold text-[#1A5C38]" href={`/checkout/${claim.holdPk}`}>
                    View hold
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
