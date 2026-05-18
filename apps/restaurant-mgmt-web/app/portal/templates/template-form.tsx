"use client";

import type { PortalBagTemplate } from "@gozaika/types";
import { formatPaise } from "@gozaika/utils";
import { CheckCircle2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const allergenCodes = [
  "DAIRY",
  "WHEAT_GLUTEN",
  "NUTS",
  "PEANUTS",
  "SOY",
  "SESAME",
  "MUSTARD",
  "EGGS",
  "FISH",
  "SHELLFISH",
  "CELERY",
  "LUPIN",
  "MOLLUSCS",
  "SULPHITES",
] as const;

export function TemplateForm({ templates }: { readonly templates: readonly PortalBagTemplate[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [publishingTemplatePk, setPublishingTemplatePk] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      templateName: String(form.get("templateName") ?? ""),
      displayName: String(form.get("displayName") ?? ""),
      shortDescription: String(form.get("shortDescription") ?? ""),
      dietaryCategoryCode: String(form.get("dietaryCategoryCode") ?? "VEG"),
      spiceLevelCode: String(form.get("spiceLevelCode") ?? ""),
      servesMin: Number(form.get("servesMin") ?? 1),
      servesMax: Number(form.get("servesMax") ?? 1),
      maxHoldingMinutes: Number(form.get("maxHoldingMinutes") ?? 120),
      holdingGuidanceText: String(form.get("holdingGuidanceText") ?? ""),
      minMenuValuePaise: Math.round(Number(form.get("minMenuValueRupees") ?? 0) * 100),
      suggestedPricePaise: Math.round(Number(form.get("suggestedPriceRupees") ?? 0) * 100),
      defaultDropQuantity: Number(form.get("defaultDropQuantity") ?? 10),
      defaultPickupStartOffsetMinutes: Number(form.get("defaultPickupStartOffsetMinutes") ?? 15),
      defaultPickupDurationMinutes: Number(form.get("defaultPickupDurationMinutes") ?? 90),
      allergenCodes: form.getAll("allergenCodes").map(String),
      allergenSummaryText: String(form.get("allergenSummaryText") ?? ""),
      includedItemHintText: String(form.get("includedItemHintText") ?? ""),
    };

    const response = await fetch("/api/portal/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => ({}))) as { readonly error?: string };
    setPending(false);

    if (!response.ok) {
      setMessage(result.error ?? "Could not save this template.");
      return;
    }

    event.currentTarget.reset();
    setMessage("Template published. You can now create a drop from it.");
    router.refresh();
  }

  async function publishLatestRevision(templatePk: string) {
    setPublishingTemplatePk(templatePk);
    setMessage(null);

    const response = await fetch(`/api/portal/templates/${templatePk}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "publish_latest_revision" }),
    });
    const result = (await response.json().catch(() => ({}))) as { readonly error?: string };
    setPublishingTemplatePk(null);

    if (!response.ok) {
      setMessage(result.error ?? "Could not publish this template.");
      return;
    }

    setMessage("Template is active and ready for drops.");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold">New BAM Bag template</h2>
          <p className="mt-1 text-sm text-slate-600">Publish reusable disclosure data before creating a public drop.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Internal name
            <input name="templateName" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Public bag name
            <input name="displayName" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Card description
          <textarea name="shortDescription" rows={3} className="rounded-md border border-black/10 px-3 py-2" />
        </label>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium">
            Dietary
            <select name="dietaryCategoryCode" className="min-h-11 rounded-md border border-black/10 px-3">
              <option value="VEG">Veg</option>
              <option value="NON_VEG">Non-veg</option>
              <option value="JAIN">Jain</option>
              <option value="EGG_ONLY">Egg only</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Spice
            <select name="spiceLevelCode" className="min-h-11 rounded-md border border-black/10 px-3">
              <option value="MILD">Mild</option>
              <option value="MEDIUM">Medium</option>
              <option value="HOT">Hot</option>
              <option value="EXTRA_HOT">Extra hot</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Serves min
            <input name="servesMin" type="number" min="1" max="12" defaultValue="1" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Serves max
            <input name="servesMax" type="number" min="1" max="12" defaultValue="1" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            Menu value INR
            <input name="minMenuValueRupees" type="number" min="1" defaultValue="599" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Suggested price INR
            <input name="suggestedPriceRupees" type="number" min="1" defaultValue="349" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Holding minutes
            <input name="maxHoldingMinutes" type="number" min="30" max="480" defaultValue="120" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Holding guidance
          <input name="holdingGuidanceText" defaultValue="Consume within 2 hours of pickup." className="min-h-11 rounded-md border border-black/10 px-3" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            Default bags
            <input name="defaultDropQuantity" type="number" min="1" max="500" defaultValue="10" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Start after minutes
            <input name="defaultPickupStartOffsetMinutes" type="number" min="0" max="1440" defaultValue="15" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Pickup duration
            <input name="defaultPickupDurationMinutes" type="number" min="15" max="480" defaultValue="90" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium">Allergen disclosure</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {allergenCodes.map((code) => (
              <label key={code} className="flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm">
                <input name="allergenCodes" type="checkbox" value={code} />
                {code.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Allergen summary
          <input name="allergenSummaryText" required className="min-h-11 rounded-md border border-black/10 px-3" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Surprise-safe item hint
          <input name="includedItemHintText" className="min-h-11 rounded-md border border-black/10 px-3" />
        </label>
        {message ? <p className="text-sm font-semibold text-[#1A5C38]">{message}</p> : null}
        <button disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF6B35] px-4 font-semibold text-white disabled:opacity-60">
          <Save size={18} aria-hidden="true" />
          {pending ? "Saving" : "Publish template"}
        </button>
      </form>

      <section className="h-fit rounded-lg border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Template library</h2>
        <div className="mt-4 grid gap-3">
          {templates.length === 0 ? (
            <p className="text-sm text-slate-600">No templates yet.</p>
          ) : (
            templates.map((template) => (
              <article key={template.templatePk} className="rounded-md border border-black/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{template.displayName ?? template.templateName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {template.activeRevisionPk ? "Ready for drops" : "Needs published revision"} - {template.templateStatusCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{template.dietaryCategoryCode ?? "Draft"} · {template.allergenCodes.join(", ")}</p>
                  </div>
                  {template.suggestedPricePaise ? <p className="font-semibold">{formatPaise(template.suggestedPricePaise)}</p> : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Defaults: {template.defaultDropQuantity} bags, starts after {template.defaultPickupStartOffsetMinutes} min, {template.defaultPickupDurationMinutes} min window
                </p>
                {!template.activeRevisionPk ? (
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-[#1A5C38]/30 px-3 text-sm font-semibold text-[#1A5C38] transition hover:border-[#1A5C38] hover:bg-[#EAF3DE] disabled:opacity-60"
                    disabled={publishingTemplatePk === template.templatePk}
                    onClick={() => publishLatestRevision(template.templatePk)}
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {publishingTemplatePk === template.templatePk ? "Publishing..." : "Publish existing revision"}
                  </button>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
