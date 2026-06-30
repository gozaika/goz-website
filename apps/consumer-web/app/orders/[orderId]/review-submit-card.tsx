"use client";

import { useState } from "react";

const CATEGORY_LABELS: { key: string; label: string }[] = [
  { key: "food_quality",      label: "Food quality" },
  { key: "value_for_price",   label: "Value for price" },
  { key: "pickup_experience", label: "Pickup experience" },
  { key: "packaging",         label: "Packaging" },
];

export function ReviewSubmitCard({
  orderPk,
  restaurantName,
}: {
  readonly orderPk: string;
  readonly restaurantName: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (skipped) return null;

  if (submitted) {
    return (
      <section className="rounded-xl border border-forest/25 bg-[#F0F9F4] p-5">
        <p className="text-sm font-bold text-forest">Review submitted</p>
        <p className="mt-1 text-xs text-charcoal/60">
          Thank you! Your review is awaiting moderation and will appear publicly once approved.
        </p>
        <a href="/account/discovery" className="mt-3 inline-block text-xs font-semibold text-forest hover:underline">
          Add to your Passport →
        </a>
      </section>
    );
  }

  async function handleSubmit() {
    if (rating === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderPk,
          ratingValue: rating,
          reviewText: text.trim() || undefined,
          categories: Object.keys(categories).length > 0 ? categories : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not submit your review.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not submit your review. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-gold/30 bg-[#FFFDF5] p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gold-text">How was it?</p>
      <h2 className="mt-1 text-base font-bold text-charcoal">Rate your BAM Bag from {restaurantName}</h2>
      <p className="mt-1 text-xs text-charcoal/60">
        Only verified BAM Bag orders can leave reviews. Your name will be masked (e.g. &ldquo;Priya K.&rdquo;).
      </p>

      {/* Star selector */}
      <div className="mt-4 flex items-center gap-1" role="group" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n !== 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="text-3xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <span className={(hover || rating) >= n ? "text-gold-text" : "text-black/20"}>★</span>
          </button>
        ))}
      </div>

      {rating > 0 && (
        <>
          {/* Text field */}
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-charcoal/70">Your review (optional)</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Tell others what you enjoyed — the flavours, portion, freshness, pickup speed…"
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-black/15 p-3 text-sm outline-none focus:border-forest resize-none"
            />
            <span className="mt-0.5 block text-right text-[10px] text-charcoal/40">{text.length}/500</span>
          </label>

          {/* Category sliders */}
          <div className="mt-4 grid gap-3">
            {CATEGORY_LABELS.map(({ key, label }) => (
              <label key={key} className="grid gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-charcoal/70">{label}</span>
                  <span className="font-bold text-charcoal">{categories[key] != null ? `${categories[key]}/5` : "—"}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={categories[key] ?? 0}
                  onChange={(e) =>
                    setCategories((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                  className="w-full accent-forest"
                />
              </label>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={rating === 0 || pending}
          onClick={handleSubmit}
          className="min-h-10 flex-1 rounded-lg bg-saffron px-4 text-sm font-bold text-charcoal disabled:opacity-50 transition hover:bg-[#e85f2f]"
        >
          {pending ? "Submitting…" : "Submit review"}
        </button>
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="min-h-10 rounded-lg border border-black/15 px-4 text-sm font-semibold text-charcoal/60 hover:border-black/30"
        >
          Skip
        </button>
      </div>
    </section>
  );
}
