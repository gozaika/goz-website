"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Order Again (§20) — post-taste full-price reorder entry. One click creates a private
 * full-price reorder of the same bag (server-side) and routes into the existing checkout
 * flow. Full price (no discount) is the point — §24 anti-cannibalization.
 */
export function ReorderCard({
  orderPk,
  bagDisplayName,
  restaurantName,
}: {
  readonly orderPk: string;
  readonly bagDisplayName: string;
  readonly restaurantName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReorder() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceOrderPk: orderPk, idempotencyKey: `reorder_${crypto.randomUUID()}` }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; data?: { holdPk?: string } };
      if (!res.ok || !json.data?.holdPk) {
        setError(json.error ?? "Could not start your reorder. Please try again.");
        return;
      }
      router.push(`/checkout/${json.data.holdPk}`);
    } catch {
      setError("Could not start your reorder. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-saffron/30 bg-cream p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-saffron-text">Get it again</p>
      <h2 className="mt-1 text-base font-bold text-charcoal">Order the {bagDisplayName} again</h2>
      <p className="mt-1 text-xs text-muted">
        Loved it? Reorder at full menu price for {restaurantName}&apos;s next pickup window.
      </p>
      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={handleReorder}
        className="mt-4 min-h-10 w-full rounded-lg bg-saffron px-4 text-sm font-bold text-charcoal transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Starting…" : "Order again"}
      </button>
    </section>
  );
}
