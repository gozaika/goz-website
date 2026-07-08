"use client";

import { Button, GoZaikaLogo } from "@gozaika/ui";
import { consentPurposeCodes, type ClaimIntent, type ConsentPurposeCode, type ConsumerOrderSummary, type NotificationSummary } from "@gozaika/types";
import { formatPaise, formatPickupWindow, IST_TIME_ZONE, notificationStatusLabel, safeErrorMessage } from "@gozaika/utils";
import { Crown, LogOut, ShieldCheck } from "lucide-react";
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
  initialOrders,
  initialNotifications,
  generatedAt,
}: {
  readonly initialProfile: AccountProfile;
  readonly initialConsents: readonly AccountConsent[];
  readonly initialClaimIntents: readonly ClaimIntent[];
  readonly initialOrders: readonly ConsumerOrderSummary[];
  readonly initialNotifications: readonly NotificationSummary[];
  readonly generatedAt: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [consents, setConsents] = useState(initialConsents);
  const [fullName, setFullName] = useState(initialProfile.fullName ?? "");
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [email, setEmail] = useState(initialProfile.email ?? "");
  const [language, setLanguage] = useState(initialProfile.preferredLanguageCode);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const generatedAtMs = Date.parse(generatedAt);
  const activeClaims = initialClaimIntents.filter((claim) => claim.statusCode === "ACTIVE" && new Date(claim.expiresAt).getTime() > generatedAtMs);
  const holdHistory = initialClaimIntents.filter((claim) => !activeClaims.some((active) => active.holdPk === claim.holdPk));
  const notificationsByOrder = new Map<string, NotificationSummary[]>();
  for (const notification of initialNotifications) {
    if (!notification.orderPk) continue;
    notificationsByOrder.set(notification.orderPk, [...(notificationsByOrder.get(notification.orderPk) ?? []), notification]);
  }

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
          emailAddress: email || undefined,
          preferredLanguageCode: language,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; data?: AccountProfile; error?: string };

      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "We could not update your profile.");
      }

      setProfile(payload.data);
      setEmail(payload.data.email ?? "");
      setPhone(payload.data.phone ?? "");
      setFullName(payload.data.fullName ?? "");
      setLanguage(payload.data.preferredLanguageCode);
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
          <h1 className="mt-5 text-4xl font-bold text-charcoal">Account</h1>
          <p className="mt-2 text-sm text-muted">Your BAM Bag profile, referral code and DPDP consent settings.</p>
        </div>
        <Button type="button" className="bg-forest hover:bg-[#154b2e]" onClick={signOut}>
          <LogOut size={18} aria-hidden="true" />
          <span className="ml-2">Sign out</span>
        </Button>
      </div>

      {status ? (
        <p className="mt-6 rounded-lg border border-gold/40 bg-white px-3 py-2 text-sm text-charcoal">{status}</p>
      ) : null}

      {/* Active holds are time-limited (they expire and release the bags), so they
          surface first as the page's primary CTA — ahead of paid history/profile. */}
      {activeClaims.length > 0 ? (
        <section className="mt-6 rounded-lg border-2 border-saffron/40 bg-cream p-5 shadow-sm">
          <h2 className="text-xl font-bold text-charcoal">
            Finish paying — {activeClaims.length} active hold{activeClaims.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-muted">Holds reserve your bags but expire soon. Complete payment before the timer runs out.</p>
          <div className="mt-4 grid gap-3">
            {activeClaims.map((claim) => (
              <article key={claim.holdPk} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-forest/25 bg-white p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-forest">{claim.restaurantName}</p>
                  <h3 className="mt-0.5 font-bold text-charcoal">{claim.bagDisplayName}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {claim.quantityHeld} held · {formatPaise(claim.pricePaise)} · Expires {new Date(claim.expiresAt).toLocaleString("en-IN", { timeZone: IST_TIME_ZONE })}
                  </p>
                </div>
                <Link
                  href={`/checkout/${claim.holdPk}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-saffron px-5 text-sm font-bold text-charcoal shadow-sm transition hover:opacity-90"
                >
                  Complete payment
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-gold/35 bg-cream p-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-gold-text" aria-hidden="true" />
            <h2 className="font-bold text-charcoal">Swaad Club</h2>
          </div>
          <p className="mt-2 text-sm text-muted">Subscription billing is not active yet. Join the launch list for priority-access updates.</p>
          <Link className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-forest/25 px-3 text-sm font-semibold text-forest" href="/swaad-club">
            View benefits
          </Link>
        </article>
        <article className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-sm font-semibold text-muted">Profile completeness</p>
          <p className="mt-2 text-3xl font-bold text-charcoal">
            {[profile.fullName, profile.phone, profile.email].filter(Boolean).length}/3
          </p>
          <p className="mt-1 text-sm text-muted">Name, phone, and email help support identify your account safely.</p>
        </article>
        <article className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-sm font-semibold text-muted">Order affordance</p>
          <p className="mt-2 text-3xl font-bold text-charcoal">{initialOrders.length}</p>
          <p className="mt-1 text-sm text-muted">Paid orders stay below with pickup proof and notification status.</p>
        </article>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-charcoal">Profile</h2>
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
              Email
              <input
                className="min-h-11 rounded-lg border border-black/20 px-3"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
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
            <div className="rounded-lg bg-cream p-3 text-sm">
              <p className="font-semibold text-charcoal">Referral code</p>
              <p className="mt-1 text-muted">{profile.referralCode ?? "Generating after first login"}</p>
            </div>
            <Button type="button" onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-forest" aria-hidden="true" />
            <h2 className="text-xl font-bold text-charcoal">Consent settings</h2>
          </div>
          <p className="mt-2 text-sm text-muted">
            Operational service messages cover orders and pickup. Marketing purposes stay separate and are not used for this pickup loop.
          </p>
          <div className="mt-5 grid gap-3">
            {consents.map((consent) => {
              const checked = consent.consent_state_code === "GRANTED" || consent.is_required_for_service;

              return (
                <label
                  key={consent.purpose_code}
                  className="flex min-h-20 items-start justify-between gap-4 rounded-lg border border-black/10 p-4"
                >
                  <span>
                    <span className="block font-semibold text-charcoal">
                      {consent.purpose_name}
                      {consent.is_required_for_service ? " (required)" : ""}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {consent.recorded_at
                        ? `Latest ${consent.consent_state_code?.toLowerCase()} on ${new Date(
                            consent.recorded_at,
                          ).toLocaleString("en-IN", { timeZone: IST_TIME_ZONE })}`
                        : "No consent event recorded yet"}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="mt-1 h-6 w-6 accent-forest"
                    checked={checked}
                    disabled={consent.is_required_for_service}
                    onChange={(event) => toggleConsent(consent.purpose_code, event.target.checked)}
                  />
                </label>
              );
            })}
            {consents.length === 0
              ? consentPurposeCodes.map((purpose) => (
                  <div key={purpose} className="rounded-lg border border-black/10 p-4 text-sm text-muted">
                    {purpose.replaceAll("_", " ")} is not configured yet.
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-charcoal">Paid orders</h2>
        <p className="mt-1 text-sm text-muted">Confirmed BAM Bag pickups paid through Razorpay.</p>
        <div className="mt-4 grid gap-3">
          {initialOrders.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-muted">
              You do not have paid orders yet.
            </p>
          ) : (
            initialOrders.map((order) => (
              <article key={order.orderPk} className="rounded-lg border border-black/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-forest">{order.restaurantName}</p>
                    <h3 className="mt-1 font-bold text-charcoal">{order.bagDisplayName}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {order.orderNumber} - {formatPickupWindow(order.pickupWindowStartAt, order.pickupWindowEndAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-forest/25 px-3 py-1 text-xs font-semibold text-forest">
                    {order.orderStatusCode.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                  <span>{formatPaise(order.paidAmountPaise)}</span>
                  <span>{order.quantity} bag</span>
                  {order.collectedAt ? <span>Collected {new Date(order.collectedAt).toLocaleString("en-IN", { timeZone: IST_TIME_ZONE })}</span> : null}
                  <Link className="font-semibold text-forest" href={`/orders/${order.orderPk}`}>
                    View order
                  </Link>
                </div>
                {notificationsByOrder.get(order.orderPk)?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {notificationsByOrder.get(order.orderPk)!.slice(0, 3).map((notification) => (
                      <span key={notification.notificationOutboxPk} className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-muted">
                        {notification.templateCode.replaceAll("_", " ").toLowerCase()}:{" "}
                        {notificationStatusLabel(notification.sendStatusCode, notification.deliveryReasonCode)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-charcoal">Hold history</h2>
        <p className="mt-1 text-sm text-muted">Expired, released, or converted holds are kept here so active holds stay easy to find.</p>
        <div className="mt-4 grid gap-3">
          {holdHistory.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-muted">
              No older holds yet.
            </p>
          ) : (
            holdHistory.map((claim) => (
              <article key={claim.holdPk} className="rounded-lg border border-black/10 bg-black/[0.02] p-4 opacity-85">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-muted">{claim.restaurantName}</p>
                    <h3 className="mt-1 font-bold text-charcoal">{claim.bagDisplayName}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {claim.statusCode.toLowerCase()} - {formatPickupWindow(claim.pickupStartAt, claim.pickupEndAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold text-muted">
                    {claim.statusCode}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                  <span>{formatPaise(claim.pricePaise)}</span>
                  <span>Expired {new Date(claim.expiresAt).toLocaleString("en-IN", { timeZone: IST_TIME_ZONE })}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
