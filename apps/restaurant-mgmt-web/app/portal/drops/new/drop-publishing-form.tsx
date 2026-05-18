"use client";

import type { PortalBagTemplate, PortalDrop } from "@gozaika/types";
import { formatPaise, formatPickupWindow } from "@gozaika/utils";
import { Clock3, Pause, Play, Save, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type Feedback = {
  readonly kind: "success" | "error";
  readonly text: string;
  readonly details?: readonly string[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function nextRoundedStart(offsetMinutes: number): string {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  const roundedMinutes = Math.ceil(date.getMinutes() / 5) * 5;
  date.setMinutes(roundedMinutes, 0, 0);
  return toLocalInputValue(date);
}

function addMinutes(inputValue: string, minutes: number): string {
  const start = fromLocalInputValue(inputValue) ?? new Date();
  return toLocalInputValue(new Date(start.valueOf() + minutes * 60_000));
}

function toIsoDateTime(value: string): string {
  const parsed = fromLocalInputValue(value);
  return parsed ? parsed.toISOString() : "";
}

export function DropPublishingForm({
  templates,
  drops,
}: {
  readonly templates: readonly PortalBagTemplate[];
  readonly drops: readonly PortalDrop[];
}) {
  const router = useRouter();
  const activeTemplates = useMemo(
    () => templates.filter((template) => template.activeRevisionPk && template.templateStatusCode === "ACTIVE"),
    [templates],
  );
  const initialTemplate = activeTemplates[0] ?? null;
  const initialStart = initialTemplate ? nextRoundedStart(initialTemplate.defaultPickupStartOffsetMinutes) : "";
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const [busyDropAction, setBusyDropAction] = useState<string | null>(null);
  const [templateRevisionPk, setTemplateRevisionPk] = useState(initialTemplate?.activeRevisionPk ?? "");
  const [dropTitle, setDropTitle] = useState(initialTemplate?.displayName ?? initialTemplate?.templateName ?? "");
  const [quantityTotal, setQuantityTotal] = useState(initialTemplate?.defaultDropQuantity ?? 10);
  const [priceRupees, setPriceRupees] = useState(Math.round((initialTemplate?.suggestedPricePaise ?? 34900) / 100));
  const [dropTypeCode, setDropTypeCode] = useState("STANDARD");
  const [statusCode, setStatusCode] = useState("ACTIVE");
  const [durationMinutes, setDurationMinutes] = useState(initialTemplate?.defaultPickupDurationMinutes ?? 90);
  const [pickupStartAt, setPickupStartAt] = useState(initialStart);
  const [pickupEndAt, setPickupEndAt] = useState(
    initialTemplate ? addMinutes(initialStart, initialTemplate.defaultPickupDurationMinutes) : "",
  );

  function applyTemplateDefaults(template: PortalBagTemplate) {
    const start = nextRoundedStart(template.defaultPickupStartOffsetMinutes);
    setTemplateRevisionPk(template.activeRevisionPk ?? "");
    setDropTitle(template.displayName ?? template.templateName);
    setQuantityTotal(template.defaultDropQuantity);
    setPriceRupees(Math.round((template.suggestedPricePaise ?? 34900) / 100));
    setDurationMinutes(template.defaultPickupDurationMinutes);
    setPickupStartAt(start);
    setPickupEndAt(addMinutes(start, template.defaultPickupDurationMinutes));
  }

  function selectedTemplate() {
    return activeTemplates.find((template) => template.activeRevisionPk === templateRevisionPk) ?? null;
  }

  function changeTemplate(nextRevisionPk: string) {
    const template = activeTemplates.find((item) => item.activeRevisionPk === nextRevisionPk);
    if (template) {
      applyTemplateDefaults(template);
      return;
    }
    setTemplateRevisionPk(nextRevisionPk);
  }

  function changeStart(nextStart: string) {
    setPickupStartAt(nextStart);
    setPickupEndAt(addMinutes(nextStart, durationMinutes));
  }

  function changeDuration(nextDuration: number) {
    setDurationMinutes(nextDuration);
    setPickupEndAt(addMinutes(pickupStartAt || nextRoundedStart(0), nextDuration));
  }

  function changeEnd(nextEnd: string) {
    setPickupEndAt(nextEnd);
    const start = fromLocalInputValue(pickupStartAt);
    const end = fromLocalInputValue(nextEnd);
    if (start && end && end > start) {
      setDurationMinutes(Math.max(15, Math.round((end.valueOf() - start.valueOf()) / 60_000)));
    }
  }

  function clientErrors() {
    const errors: string[] = [];
    if (!templateRevisionPk) errors.push("Choose a template.");
    if (!Number.isFinite(quantityTotal) || quantityTotal < 1) errors.push("Quantity must be at least 1.");
    if (!Number.isFinite(priceRupees) || priceRupees < 1) errors.push("Price must be at least INR 1.");
    const start = fromLocalInputValue(pickupStartAt);
    const end = fromLocalInputValue(pickupEndAt);
    if (!start) errors.push("Pickup start time is required.");
    if (!end) errors.push("Pickup end time is required.");
    if (start && end && end <= start) errors.push("Pickup end time must be after pickup start time.");
    return errors;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = clientErrors();
    if (errors.length) {
      setFeedback({ kind: "error", text: "Fix the highlighted drop details.", details: errors });
      return;
    }

    setPending(true);
    setFeedback(null);

    const payload = {
      templateRevisionPk,
      dropTitle,
      quantityTotal,
      pricePaise: Math.round(priceRupees * 100),
      pickupStartAt: toIsoDateTime(pickupStartAt),
      pickupEndAt: toIsoDateTime(pickupEndAt),
      dropTypeCode,
      statusCode,
    };

    try {
      const response = await fetch("/api/portal/drops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        readonly error?: string;
        readonly errors?: readonly string[];
      };

      if (!response.ok) {
        setFeedback({
          kind: "error",
          text: result.error ?? "Could not publish this drop.",
          details: result.errors,
        });
        return;
      }

      const template = selectedTemplate();
      if (template) applyTemplateDefaults(template);
      setFeedback({ kind: "success", text: "Drop saved. Consumer discovery will show it according to its status." });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function updateStatus(dropPk: string, nextStatusCode: string) {
    const actionKey = `${dropPk}:${nextStatusCode}`;
    setBusyDropAction(actionKey);
    setFeedback(null);

    try {
      const response = await fetch(`/api/portal/drops/${dropPk}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statusCode: nextStatusCode }),
      });
      const result = (await response.json().catch(() => ({}))) as { readonly error?: string };
      if (!response.ok) {
        setFeedback({ kind: "error", text: result.error ?? "Could not update this drop." });
        return;
      }
      setFeedback({ kind: "success", text: `Drop marked ${nextStatusCode.toLowerCase().replaceAll("_", " ")}.` });
      router.refresh();
    } finally {
      setBusyDropAction(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold">Quick publish drop</h2>
          <p className="mt-1 text-sm text-slate-600">Defaults come from the template. Confirm the count and pickup window, then publish.</p>
        </div>

        {activeTemplates.length === 0 ? (
          <p className="rounded-md border border-[#D4A017]/40 bg-[#FFF8E6] p-3 text-sm font-medium text-[#7A5A00]">
            Create a BAM Bag template before publishing a drop.
          </p>
        ) : null}

        {feedback ? (
          <div
            className={
              feedback.kind === "error"
                ? "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                : "rounded-md border border-[#1A5C38]/25 bg-[#EAF3DE] p-3 text-sm text-[#1A5C38]"
            }
          >
            <p className="font-semibold">{feedback.text}</p>
            {feedback.details?.length ? (
              <ul className="mt-2 list-disc pl-5">
                {feedback.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <label className="grid gap-1 text-sm font-medium">
          Template
          <select value={templateRevisionPk} onChange={(event) => changeTemplate(event.target.value)} required className="min-h-11 rounded-md border border-black/10 px-3">
            <option value="">Choose template</option>
            {activeTemplates.map((template) => (
              <option key={template.templatePk} value={template.activeRevisionPk ?? ""}>
                {template.displayName ?? template.templateName}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px]">
          <label className="grid gap-1 text-sm font-medium">
            Drop title
            <input value={dropTitle} onChange={(event) => setDropTitle(event.target.value)} className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Bags
            <input value={quantityTotal} onChange={(event) => setQuantityTotal(Number(event.target.value))} type="number" min="1" max="500" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Price INR
            <input value={priceRupees} onChange={(event) => setPriceRupees(Number(event.target.value))} type="number" min="1" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_150px_1fr]">
          <label className="grid gap-1 text-sm font-medium">
            Pickup starts
            <input value={pickupStartAt} onChange={(event) => changeStart(event.target.value)} type="datetime-local" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Duration
            <input value={durationMinutes} onChange={(event) => changeDuration(Number(event.target.value))} type="number" min="15" max="480" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Pickup ends
            <input value={pickupEndAt} onChange={(event) => changeEnd(event.target.value)} type="datetime-local" required className="min-h-11 rounded-md border border-black/10 px-3" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Quick time controls">
          {[15, 30, 60].map((offset) => (
            <button key={offset} type="button" onClick={() => changeStart(nextRoundedStart(offset))} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-black/10 px-2 text-xs font-semibold">
              <Clock3 size={14} aria-hidden="true" />
              Start +{offset}m
            </button>
          ))}
          {[60, 90, 120, 180].map((duration) => (
            <button key={duration} type="button" onClick={() => changeDuration(duration)} className="inline-flex min-h-9 items-center rounded-md border border-black/10 px-2 text-xs font-semibold">
              {duration}m window
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Type
            <select value={dropTypeCode} onChange={(event) => setDropTypeCode(event.target.value)} className="min-h-11 rounded-md border border-black/10 px-3">
              <option value="STANDARD">Standard</option>
              <option value="SPOTLIGHT">Spotlight</option>
              <option value="CHEF_SPECIAL">Chef special</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Lifecycle
            <select value={statusCode} onChange={(event) => setStatusCode(event.target.value)} className="min-h-11 rounded-md border border-black/10 px-3">
              <option value="ACTIVE">Active now</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="DRAFT">Draft</option>
            </select>
          </label>
        </div>

        <button disabled={pending || activeTemplates.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF6B35] px-4 font-semibold text-white disabled:opacity-60">
          <Save size={18} aria-hidden="true" />
          {pending ? "Publishing..." : "Publish drop"}
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
                      {drop.statusCode} - {formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {drop.quantityAvailable} / {drop.quantityTotal} available - {formatPaise(drop.pricePaise)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={drop.statusCode === "ACTIVE" || busyDropAction !== null} onClick={() => updateStatus(drop.dropPk, "ACTIVE")} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#1A5C38]/30 px-2 text-xs font-semibold text-[#1A5C38] disabled:opacity-45">
                    <Play size={14} aria-hidden="true" />
                    Active
                  </button>
                  <button type="button" disabled={drop.statusCode === "PAUSED" || busyDropAction !== null} onClick={() => updateStatus(drop.dropPk, "PAUSED")} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#D4A017]/40 px-2 text-xs font-semibold text-[#7A5A00] disabled:opacity-45">
                    <Pause size={14} aria-hidden="true" />
                    Pause
                  </button>
                  <button type="button" disabled={drop.statusCode === "PICKUP_CLOSED" || busyDropAction !== null} onClick={() => updateStatus(drop.dropPk, "PICKUP_CLOSED")} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-red-200 px-2 text-xs font-semibold text-red-700 disabled:opacity-45">
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
