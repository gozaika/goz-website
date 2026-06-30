"use client";

import { Button } from "@gozaika/ui";
import { safeErrorMessage } from "@gozaika/utils";
import { Mail, MapPin, Phone, Store, UserRound } from "lucide-react";
import { useState } from "react";
import type { PublicMediaAsset } from "@gozaika/types";
import { ProductMediaUploader } from "../_components/product-media-uploader";

export interface PortalProfileState {
  readonly restaurantPk: string;
  readonly restaurantName: string;
  readonly staffEmail: string | null;
  readonly staffPhone: string | null;
  readonly primaryContactEmail: string | null;
  readonly primaryContactPhone: string | null;
  readonly addressLine1: string | null;
  readonly addressLandmark: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly heroMedia: PublicMediaAsset | null;
  readonly logoMedia: PublicMediaAsset | null;
}

export function PortalProfileClient({ initialProfile }: { readonly initialProfile: PortalProfileState }) {
  const [staffEmail, setStaffEmail] = useState(initialProfile.staffEmail ?? "");
  const [staffPhone, setStaffPhone] = useState(initialProfile.staffPhone ?? "");
  const [primaryContactEmail, setPrimaryContactEmail] = useState(initialProfile.primaryContactEmail ?? "");
  const [primaryContactPhone, setPrimaryContactPhone] = useState(initialProfile.primaryContactPhone ?? "");
  const [addressLine1, setAddressLine1] = useState(initialProfile.addressLine1 ?? "");
  const [addressLandmark, setAddressLandmark] = useState(initialProfile.addressLandmark ?? "");
  const [latitude, setLatitude] = useState(initialProfile.latitude != null ? String(initialProfile.latitude) : "");
  const [longitude, setLongitude] = useState(initialProfile.longitude != null ? String(initialProfile.longitude) : "");
  const [saving, setSaving] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function saveLocation() {
    if (!addressLine1.trim()) {
      setStatus("Street address is required to save location.");
      return;
    }
    setLocationSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/portal/restaurant/location", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          restaurantPk: initialProfile.restaurantPk,
          line1: addressLine1.trim(),
          landmark: addressLandmark.trim() || undefined,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
        }),
      });
      const payload = (await res.json()) as { ok: boolean; error?: string };
      if (!payload.ok) throw new Error(payload.error ?? "Could not save location.");
      setStatus("Location saved. The map pin will update on your public profile.");
    } catch (caught) {
      setStatus(safeErrorMessage(caught, "Could not save location."));
    } finally {
      setLocationSaving(false);
    }
  }

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
      <div className="rounded-lg border border-hairline bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-forest">Profile</p>
        <h1 className="mt-2 text-3xl font-bold text-charcoal">{initialProfile.restaurantName}</h1>
        <p className="mt-2 text-sm text-charcoal/65">
          Keep account and operational contact details current for email and WhatsApp order alerts.
        </p>
      </div>

      {status ? (
        <p className="rounded-lg border border-gold/40 bg-white px-3 py-2 text-sm text-charcoal">{status}</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-hairline bg-white p-5">
          <div className="flex items-center gap-2">
            <UserRound className="text-forest" aria-hidden="true" />
            <h2 className="text-xl font-bold text-charcoal">Your account contact</h2>
          </div>
          <div className="mt-5 grid gap-4">
            <ContactField icon="mail" label="Account email" value={staffEmail} onChange={setStaffEmail} type="email" />
            <ContactField icon="phone" label="Account phone" value={staffPhone} onChange={setStaffPhone} />
          </div>
        </section>

        <section className="rounded-lg border border-hairline bg-white p-5">
          <div className="flex items-center gap-2">
            <Store className="text-forest" aria-hidden="true" />
            <h2 className="text-xl font-bold text-charcoal">Operational alerts</h2>
          </div>
          <p className="mt-2 text-sm text-charcoal/65">
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

      <section className="grid gap-5 lg:grid-cols-2">
        <ProductMediaUploader
          restaurantPk={initialProfile.restaurantPk}
          targetCode="RESTAURANT_HERO"
          label="Restaurant cover image"
          guidance="Shown on restaurant discovery and profile surfaces. Landscape images work best; the verified rendition is cropped to 16:9."
          initialMedia={initialProfile.heroMedia}
        />
        <ProductMediaUploader
          restaurantPk={initialProfile.restaurantPk}
          targetCode="RESTAURANT_LOGO"
          label="Restaurant logo"
          guidance="Use the authentic restaurant mark on a transparent or simple background. It is fitted inside a square without cropping."
          initialMedia={initialProfile.logoMedia}
        />
      </section>

      {/* Address & Location */}
      <section className="rounded-lg border border-hairline bg-white p-5">
        <div className="flex items-center gap-2">
          <MapPin className="text-forest" aria-hidden="true" />
          <h2 className="text-xl font-bold text-charcoal">Address &amp; Location</h2>
        </div>
        <p className="mt-2 text-sm text-charcoal/65">
          Set your pickup address and coordinates so customers can find you on the map. Latitude and
          longitude enable the map pin — enter them as decimal degrees (e.g. 17.385000, 78.486700).
        </p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
            Street address *
            <input
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Plot 12, Road 4, Banjara Hills"
              className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-normal outline-none focus:border-forest"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
            Landmark (optional)
            <input
              value={addressLandmark}
              onChange={(e) => setAddressLandmark(e.target.value)}
              placeholder="Near Inorbit Mall gate 2"
              className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-normal outline-none focus:border-forest"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
              Latitude
              <input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="17.385000"
                type="number"
                step="0.000001"
                className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-normal outline-none focus:border-forest"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
              Longitude
              <input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="78.486700"
                type="number"
                step="0.000001"
                className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-normal outline-none focus:border-forest"
              />
            </label>
          </div>

          {/* Map preview when coordinates set */}
          {latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude)) && (
            <div className="overflow-hidden rounded-lg border border-hairline" style={{ height: 220 }}>
              <iframe
                key={`${latitude},${longitude}`}
                title="Map pin preview"
                width="100%"
                height="220"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`}
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={saveLocation} disabled={locationSaving}>
            {locationSaving ? "Saving…" : "Save location"}
          </Button>
        </div>
      </section>
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
    <label className="grid gap-2 text-sm font-semibold text-charcoal">
      {label}
      <span className="flex min-h-11 items-center gap-2 rounded-lg border border-hairline px-3">
        <Icon size={18} className="text-forest" aria-hidden="true" />
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
