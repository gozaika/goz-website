"use client";

import type { PortalBagTemplate, PortalDrop } from "@gozaika/types";
import { formatPaise, formatPickupWindow } from "@gozaika/utils";
import { Pause, Play, Save, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function toIsoDateTime(value: FormDataEntryValue | null): string {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.valueOf()) ? "" : parsed.toISOString();
}

export function DropPublishingForm({
  templates,
  drops,
}: {
  readonly templates: readonly PortalBagTemplate[];
  readonly drops: readonly PortalDrop[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const activeTemplates = templates.filter((template) => template.activeRevisionPk);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      templateRevisionPk: String(form.get("templateRevisionPk") ?? ""),
      dropTitle: String(form.get("dropTitle") ?? ""),
      quantityTotal: Number(form.get("quantityTotal") ?? 1),
      pricePaise: Math.round(Number(form.get("priceRupees") ?? 0) * 100),
      pickupStartAt: toIsoDateTime(form.get("pickupStartAt")),
      pickupEndAt: toIsoDateTime(form.get("pickupEndAt")),
      dropTypeCode: String(form.get("dropTypeCode") ?? "STANDARD"),
      statusCode: String(form.get("statusCode") ?? "SCHEDULED"),
    };

    const response = await fetch("/api/portal/drops", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => ({}))) as { readonly error?: string };
    setPending(false);

    if (!response.ok) {
      setMessage(result.error ?? "Could not publish this drop.");
      return;
    }

    event.currentTarget.reset();
    setMessage("Drop saved. It is now available to consumer discovery according to its status.");
    router.refresh();
  }

  async function updateStatus(dropPk: string, statusCode: string) {
    setMessage(null);
    const response = await fetch(`/api/portal/drops/${dropPk}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statusCode }),
    });
    const result = (await response.json().catch(() => ({}))) as { readonly error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Could not update this drop.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold">Publish a drop</h2>
          <p className="mt-1 text-sm text-slate-600">Choose a published template, set quantity, price, pickup window, and lifecycle status.</p>
        </div>
        {activeTemplates.length === 0 ? (
          <p className="rounded-md border border-[#D4A017]/40 bg-[#FFF8E6] p-3 text-sm font-medium text-[#7A5A00]">
            Create a BAM Bag template before publishing a drop.
          </p>
        ) : null}
        <label className="grid gap-1 text-sm font-medium">
          Template
          <select name="templateRevisionPk" required className="min-h-11 rounded-md border border-black/10 px-3">
            <option value="">Choose template</option>
            {activeTemplates.map((template) => (
              <option key={template.templatePk} value={template.activeRevisionPk ?? ""}>
                {template.displayName ?? template.templateName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Drop title
          <input name="dropTitle" placeholder="Defaults to the template display name" className="min-h-11 rounded-md border border-black/10 px-3" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            Quantity
            <input name="quantityTotal" type="number" min="1" max="500" defaultValue="10" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Price INR
            <input name="priceRupees" type="number" min="1" defaultValue="349" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Type
            <select name="dropTypeCode" className="min-h-11 rounded-md border border-black/10 px-3">
              <option value="STANDARD">Standard</option>
              <option value="SPOTLIGHT">Spotlight</option>
              <option value="CHEF_SPECIAL">Chef special</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Pickup starts
            <input name="pickupStartAt" type="datetime-local" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Pickup ends
            <input name="pickupEndAt" type="datetime-local" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Lifecycle
          <select name="statusCode" className="min-h-11 rounded-md border border-black/10 px-3">
            <option value="SCHEDULED">Scheduled</option>
            <option value="ACTIVE">Active now</option>
            <option value="DRAFT">Draft</option>
          </select>
        </label>
        {message ? <p className="text-sm font-semibold text-[#1A5C38]">{message}</p> : null}
        <button disabled={pending || activeTemplates.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF6B35] px-4 font-semibold text-white disabled:opacity-60">
          <Save size={18} aria-hidden="true" />
          {pending ? "Saving" : "Save drop"}
        </button>
      </form>

      <section className="h-fit rounded-lg border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Recent drops</h2>
        <div className="mt-4 grid gap-3">
          {drops.length === 0 ? (
            <p className="text-sm text-slate-600">No drops published yet.</p>
          ) : (
            drops.map((drop) => (
              <article key={drop.dropPk} className="rounded-md border border-black/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{drop.dropTitle}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {drop.statusCode} · {formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {drop.quantityAvailable} / {drop.quantityTotal} available · {formatPaise(drop.pricePaise)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => updateStatus(drop.dropPk, "ACTIVE")} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#1A5C38]/30 px-2 text-xs font-semibold text-[#1A5C38]">
                    <Play size={14} aria-hidden="true" />
                    Active
                  </button>
                  <button onClick={() => updateStatus(drop.dropPk, "PAUSED")} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#D4A017]/40 px-2 text-xs font-semibold text-[#7A5A00]">
                    <Pause size={14} aria-hidden="true" />
                    Pause
                  </button>
                  <button onClick={() => updateStatus(drop.dropPk, "PICKUP_CLOSED")} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-red-200 px-2 text-xs font-semibold text-red-700">
                    <XCircle size={14} aria-hidden="true" />
                    Close
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
