"use client";

import { Button } from "@gozaika/ui";
import { safeErrorMessage } from "@gozaika/utils";
import { Mail, Phone, Store, UserRound } from "lucide-react";
import { useState } from "react";

export interface PortalProfileState {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly staffEmail: string | null;
  readonly staffPhone: string | null;
  readonly primaryContactEmail: string | null;
  readonly primaryContactPhone: string | null;
}

export function PortalProfileClient({ initialProfile }: { readonly initialProfile: PortalProfileState }) {
  const [staffEmail, setStaffEmail] = useState(initialProfile.staffEmail ?? "");
  const [staffPhone, setStaffPhone] = useState(initialProfile.staffPhone ?? "");
  const [primaryContactEmail, setPrimaryContactEmail] = useState(initialProfile.primaryContactEmail ?? "");
  const [primaryContactPhone, setPrimaryContactPhone] = useState(initialProfile.primaryContactPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function saveProfile() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          restaurantPk: initialProfile.restaurantPk,
          staffEmailAddress: staffEmail || undefined,
          staffPhoneE164: staffPhone || undefined,
          primaryContactEmail: primaryContactEmail || undefined,
          primaryContactPhoneE164: primaryContactPhone || undefined,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        throw new Error(payload.error ?? "Could not save profile.");
      }
      setStatus("Profile contact details saved.");
    } catch (caught) {
      setStatus(safeErrorMessage(caught, "Could not save profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1A5C38]">Profile</p>
        <h1 className="mt-2 text-3xl font-bold text-[#2D2D2D]">{initialProfile.restaurantName}</h1>
        <p className="mt-2 text-sm text-[#2D2D2D]/65">
          Keep account and operational contact details current for email and WhatsApp order alerts.
        </p>
      </div>

      {status ? (
        <p className="rounded-lg border border-[#D4A017]/40 bg-white px-3 py-2 text-sm text-[#2D2D2D]">{status}</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-center gap-2">
            <UserRound className="text-[#1A5C38]" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#2D2D2D]">Your account contact</h2>
          </div>
          <div className="mt-5 grid gap-4">
            <ContactField icon="mail" label="Account email" value={staffEmail} onChange={setStaffEmail} type="email" />
            <ContactField icon="phone" label="Account phone" value={staffPhone} onChange={setStaffPhone} />
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-center gap-2">
            <Store className="text-[#1A5C38]" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#2D2D2D]">Operational alerts</h2>
          </div>
          <p className="mt-2 text-sm text-[#2D2D2D]/65">
            New paid order and pickup alert notifications use this restaurant contact.
          </p>
          <div className="mt-5 grid gap-4">
            <ContactField icon="mail" label="Alert email" value={primaryContactEmail} onChange={setPrimaryContactEmail} type="email" />
            <ContactField icon="phone" label="Alert phone" value={primaryContactPhone} onChange={setPrimaryContactPhone} />
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </section>
  );
}

function ContactField({
  icon,
  label,
  value,
  onChange,
  type = "text",
}: {
  readonly icon: "mail" | "phone";
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
}) {
  const Icon = icon === "mail" ? Mail : Phone;

  return (
    <label className="grid gap-2 text-sm font-semibold text-[#2D2D2D]">
      {label}
      <span className="flex min-h-11 items-center gap-2 rounded-lg border border-black/20 px-3">
        <Icon size={18} className="text-[#1A5C38]" aria-hidden="true" />
        <input
          className="min-h-10 flex-1 bg-transparent text-sm outline-none"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={type === "email" ? "name@example.com" : "+919000100001"}
        />
      </span>
    </label>
  );
}
