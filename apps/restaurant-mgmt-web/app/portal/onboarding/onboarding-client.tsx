"use client";

import { Button, EmptyState } from "@gozaika/ui";
import { slugifyRestaurantName } from "@gozaika/utils";
import { CheckCircle2, FileUp, ShieldCheck, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type ApiPayload<T = unknown> = { ok: boolean; data?: T; error?: string };
type Summary = {
  restaurant: {
    restaurant_restaurant_pk: string;
    restaurant_name: string;
    restaurant_slug: string;
    legal_entity_name: string | null;
    restaurant_status_code: string;
    geo_city_fk: string | null;
    geo_neighborhood_fk: string | null;
    primary_contact_email: string | null;
    primary_contact_phone_e164: string | null;
    pickup_instructions: string | null;
  } | null;
  publicProfile: { headline: string | null; story_markdown: string | null } | null;
  compliance: {
    fssai_license_number: string | null;
    fssai_license_expiry_date: string | null;
    gstin: string | null;
    pan_number: string | null;
    compliance_status_code: string;
  } | null;
  tasks: { restaurant_onboarding_task_pk: string; task_code: string; task_name: string; task_status_code: string }[];
  documents: {
    restaurant_document_pk: string;
    rejection_reason: string | null;
    master_document_type: { type_code: string; type_name: string; is_required: boolean } | null;
    master_document_status: { status_code: string; status_name: string } | null;
  }[];
  documentTypes: { master_document_type_pk: string; type_code: string; type_name: string; is_required: boolean }[];
  cities: { geo_city_pk: string; city_name: string }[];
  neighborhoods: { geo_neighborhood_pk: string; geo_city_fk: string; neighborhood_name: string }[];
};

const initialSummary: Summary = {
  restaurant: null,
  publicProfile: null,
  compliance: null,
  tasks: [],
  documents: [],
  documentTypes: [],
  cities: [],
  neighborhoods: [],
};

export function OnboardingClient() {
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const restaurantPk = summary.restaurant?.restaurant_restaurant_pk;
  const [basics, setBasics] = useState({
    restaurantName: "",
    restaurantSlug: "",
    legalEntityName: "",
    primaryContactEmail: "",
    primaryContactPhoneE164: "",
    cityPk: "",
    neighborhoodPk: "",
    pickupInstructions: "",
    headline: "",
    storyMarkdown: "",
  });
  const [compliance, setCompliance] = useState({
    fssaiLicenseNumber: "",
    fssaiLicenseExpiryDate: "",
    gstin: "",
    panNumber: "",
    accountHolderName: "",
    bankName: "",
    maskedAccountNumber: "",
    ifscCode: "",
  });

  async function load() {
    setLoading(true);
    const response = await fetch("/api/portal/onboarding", { cache: "no-store" });
    const payload = (await response.json()) as ApiPayload<Summary | null>;
    if (payload.ok && payload.data) {
      const next = payload.data;
      setSummary(next);
      setBasics({
        restaurantName: next.restaurant?.restaurant_name ?? "",
        restaurantSlug: next.restaurant?.restaurant_slug ?? "",
        legalEntityName: next.restaurant?.legal_entity_name ?? "",
        primaryContactEmail: next.restaurant?.primary_contact_email ?? "",
        primaryContactPhoneE164: next.restaurant?.primary_contact_phone_e164 ?? "",
        cityPk: next.restaurant?.geo_city_fk ?? next.cities[0]?.geo_city_pk ?? "",
        neighborhoodPk: next.restaurant?.geo_neighborhood_fk ?? "",
        pickupInstructions: next.restaurant?.pickup_instructions ?? "",
        headline: next.publicProfile?.headline ?? "",
        storyMarkdown: next.publicProfile?.story_markdown ?? "",
      });
      setCompliance({
        fssaiLicenseNumber: next.compliance?.fssai_license_number ?? "",
        fssaiLicenseExpiryDate: next.compliance?.fssai_license_expiry_date ?? "",
        gstin: next.compliance?.gstin ?? "",
        panNumber: next.compliance?.pan_number ?? "",
        accountHolderName: "",
        bankName: "",
        maskedAccountNumber: "",
        ifscCode: "",
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    // Initial client-side load keeps this portal page dynamic after auth redirect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function createRestaurant() {
    setSaving("create");
    setError("");
    const response = await fetch("/api/portal/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ restaurantName: "New goZaika Restaurant" }),
    });
    const payload = (await response.json()) as ApiPayload;
    if (!payload.ok) setError(payload.error ?? "Could not start onboarding.");
    await load();
    setSaving("");
  }

  async function saveBasics() {
    if (!restaurantPk) return;
    setSaving("basics");
    setError("");
    const response = await fetch("/api/portal/restaurant/basics", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...basics, restaurantPk, cityPk: basics.cityPk || null, neighborhoodPk: basics.neighborhoodPk || null }),
    });
    const payload = (await response.json()) as ApiPayload;
    if (!payload.ok) setError(payload.error ?? "Could not save basics.");
    await load();
    setSaving("");
  }

  async function saveCompliance() {
    if (!restaurantPk) return;
    setSaving("compliance");
    setError("");
    const response = await fetch("/api/portal/restaurant/compliance", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...compliance, restaurantPk }),
    });
    const payload = (await response.json()) as ApiPayload;
    if (!payload.ok) setError(payload.error ?? "Could not save compliance.");
    await load();
    setSaving("");
  }

  async function uploadDocument(documentTypeCode: string, file: File | null) {
    if (!restaurantPk || !file) return;
    setSaving(documentTypeCode);
    setError("");
    const response = await fetch("/api/portal/documents/sign-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        restaurantPk,
        documentTypeCode,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    });
    const payload = (await response.json()) as ApiPayload<{ bucket: string; path: string; token: string }>;
    if (!payload.ok || !payload.data) {
      setError(payload.error ?? "Could not prepare document upload.");
      setSaving("");
      return;
    }
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(payload.data.bucket)
      .uploadToSignedUrl(payload.data.path, payload.data.token, file);
    if (uploadError) {
      setError("Private upload failed. Check local Storage buckets and try again.");
    }
    await load();
    setSaving("");
  }

  if (loading) {
    return <section className="mx-auto max-w-6xl px-4 py-8"><div className="h-40 animate-pulse rounded-lg bg-white" /></section>;
  }

  if (!summary.restaurant) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10">
        <EmptyState
          title="Create your restaurant onboarding"
          body="Start with a private Zayka Pro profile. Drops and templates come later, after compliance review."
          action={<Button onClick={createRestaurant} disabled={saving === "create"}>{saving === "create" ? "Starting..." : "Start onboarding"}</Button>}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border border-black/10 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Onboarding</p>
        <h1 className="mt-2 text-2xl font-bold text-[#2D2D2D]">{summary.restaurant.restaurant_name}</h1>
        <p className="mt-2 text-sm text-[#2D2D2D]/65">Status: {summary.restaurant.restaurant_status_code}</p>
        <p className="text-sm text-[#2D2D2D]/65">Compliance: {summary.compliance?.compliance_status_code ?? "PENDING"}</p>
        <div className="mt-5 grid gap-2">
          {summary.tasks.map((task) => (
            <div key={task.restaurant_onboarding_task_pk} className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className={task.task_status_code === "COMPLETED" ? "text-[#1A5C38]" : "text-black/25"} />
              <span>{task.task_name}</span>
            </div>
          ))}
        </div>
      </aside>

      <div className="grid gap-6">
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <section className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-center gap-2"><Store className="text-[#1A5C38]" /><h2 className="text-xl font-bold">Restaurant basics</h2></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Restaurant name" value={basics.restaurantName} onChange={(value) => setBasics({ ...basics, restaurantName: value, restaurantSlug: basics.restaurantSlug || slugifyRestaurantName(value) })} />
            <Field label="Slug" value={basics.restaurantSlug} onChange={(value) => setBasics({ ...basics, restaurantSlug: slugifyRestaurantName(value) })} />
            <Field label="Legal entity name" value={basics.legalEntityName} onChange={(value) => setBasics({ ...basics, legalEntityName: value })} />
            <Field label="Primary email" value={basics.primaryContactEmail} onChange={(value) => setBasics({ ...basics, primaryContactEmail: value })} />
            <Field label="Primary phone" value={basics.primaryContactPhoneE164} onChange={(value) => setBasics({ ...basics, primaryContactPhoneE164: value })} />
            <label className="grid gap-2 text-sm font-semibold">
              City
              <select className="min-h-11 rounded-lg border border-black/20 px-3" value={basics.cityPk} onChange={(event) => setBasics({ ...basics, cityPk: event.target.value })}>
                {summary.cities.map((city) => <option key={city.geo_city_pk} value={city.geo_city_pk}>{city.city_name}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Neighborhood
              <select className="min-h-11 rounded-lg border border-black/20 px-3" value={basics.neighborhoodPk} onChange={(event) => setBasics({ ...basics, neighborhoodPk: event.target.value })}>
                <option value="">Select area</option>
                {summary.neighborhoods.filter((item) => !basics.cityPk || item.geo_city_fk === basics.cityPk).map((item) => <option key={item.geo_neighborhood_pk} value={item.geo_neighborhood_pk}>{item.neighborhood_name}</option>)}
              </select>
            </label>
            <Field label="Public headline" value={basics.headline} onChange={(value) => setBasics({ ...basics, headline: value })} />
            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              Pickup instructions
              <textarea className="min-h-28 rounded-lg border border-black/20 px-3 py-2" value={basics.pickupInstructions} onChange={(event) => setBasics({ ...basics, pickupInstructions: event.target.value })} />
            </label>
          </div>
          <Button className="mt-5" onClick={saveBasics} disabled={saving === "basics"}>{saving === "basics" ? "Saving..." : "Save basics"}</Button>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="text-[#1A5C38]" /><h2 className="text-xl font-bold">Compliance details</h2></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="FSSAI license number" value={compliance.fssaiLicenseNumber} onChange={(value) => setCompliance({ ...compliance, fssaiLicenseNumber: value })} />
            <Field label="FSSAI expiry date" type="date" value={compliance.fssaiLicenseExpiryDate} onChange={(value) => setCompliance({ ...compliance, fssaiLicenseExpiryDate: value })} />
            <Field label="GSTIN" value={compliance.gstin} onChange={(value) => setCompliance({ ...compliance, gstin: value.toUpperCase() })} />
            <Field label="PAN" value={compliance.panNumber} onChange={(value) => setCompliance({ ...compliance, panNumber: value.toUpperCase() })} />
            <Field label="Account holder" value={compliance.accountHolderName} onChange={(value) => setCompliance({ ...compliance, accountHolderName: value })} />
            <Field label="Bank name" value={compliance.bankName} onChange={(value) => setCompliance({ ...compliance, bankName: value })} />
            <Field label="Masked account number" value={compliance.maskedAccountNumber} onChange={(value) => setCompliance({ ...compliance, maskedAccountNumber: value })} placeholder="XXXXXX1234" />
            <Field label="IFSC" value={compliance.ifscCode} onChange={(value) => setCompliance({ ...compliance, ifscCode: value.toUpperCase() })} />
          </div>
          <Button className="mt-5" onClick={saveCompliance} disabled={saving === "compliance"}>{saving === "compliance" ? "Saving..." : "Save compliance"}</Button>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-center gap-2"><FileUp className="text-[#1A5C38]" /><h2 className="text-xl font-bold">Private documents</h2></div>
          <div className="mt-5 grid gap-3">
            {summary.documentTypes.filter((type) => type.is_required).map((type) => {
              const latest = summary.documents.find((doc) => doc.master_document_type?.type_code === type.type_code);
              return (
                <div key={type.type_code} className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{type.type_name}</p>
                    <p className="text-sm text-[#2D2D2D]/65">{latest?.master_document_status?.status_name ?? "Missing"}{latest?.rejection_reason ? ` - ${latest.rejection_reason}` : ""}</p>
                  </div>
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-[#1A5C38] px-4 text-sm font-semibold text-white">
                    {saving === type.type_code ? "Uploading..." : "Upload"}
                    <input className="sr-only" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => void uploadDocument(type.type_code, event.target.files?.[0] ?? null)} />
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
  readonly placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        className="min-h-11 rounded-lg border border-black/20 px-3"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
