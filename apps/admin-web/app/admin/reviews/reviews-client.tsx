"use client";

import { useState } from "react";
import { Check, EyeOff, X } from "lucide-react";

type AdminReview = {
  readonly reviewPk: string;
  readonly restaurantName: string;
  readonly restaurantPk: string;
  readonly reviewerDisplayName: string;
  readonly ratingValue: number;
  readonly reviewText: string | null;
  readonly moderationStatusCode: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  readonly isPublic: boolean;
  readonly bagDisplayName: string | null;
  readonly createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border border-green-200",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
  HIDDEN:   "bg-slate-100 text-slate-600 border border-slate-200",
};

function StarRow({ value }: { readonly value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`text-sm ${n <= value ? "text-[#D4A017]" : "text-black/20"}`} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

export function AdminReviewsClient({
  initialReviews,
}: {
  readonly initialReviews: readonly AdminReview[];
}) {
  const [reviews, setReviews] = useState<AdminReview[]>([...initialReviews]);
  const [busyPk, setBusyPk] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN">("PENDING");

  const visible = filterStatus === "ALL" ? reviews : reviews.filter((r) => r.moderationStatusCode === filterStatus);
  const pendingCount = reviews.filter((r) => r.moderationStatusCode === "PENDING").length;

  async function moderate(reviewPk: string, action: "APPROVED" | "REJECTED" | "HIDDEN") {
    setBusyPk(reviewPk);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewPk}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moderationStatusCode: action }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedback({ kind: "error", text: json.error ?? "Could not update review." });
        return;
      }
      setReviews((prev) =>
        prev.map((r) =>
          r.reviewPk === reviewPk
            ? { ...r, moderationStatusCode: action, isPublic: action === "APPROVED" }
            : r,
        ),
      );
      setFeedback({ kind: "success", text: `Review marked ${action.toLowerCase()}.` });
    } finally {
      setBusyPk(null);
    }
  }

  return (
    <div>
      {feedback && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm font-semibold ${
            feedback.kind === "success"
              ? "border border-[#1A5C38]/25 bg-[#EAF3DE] text-[#1A5C38]"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {(["PENDING", "ALL", "APPROVED", "REJECTED", "HIDDEN"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition ${
              filterStatus === status
                ? "border-[#1A5C38] bg-[#1A5C38] text-white"
                : "border-black/15 text-[#2D2D2D]/70 hover:border-[#1A5C38]/40"
            }`}
          >
            {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            {status === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-white px-6 py-12 text-center">
          <p className="text-sm text-[#2D2D2D]/50">
            No {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} reviews.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((review) => {
            const statusStyle = STATUS_STYLE[review.moderationStatusCode] ?? STATUS_STYLE.PENDING;
            const busy = busyPk === review.reviewPk;
            return (
              <article key={review.reviewPk} className="rounded-xl border border-black/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#2D2D2D]">{review.reviewerDisplayName}</p>
                    <p className="text-xs text-[#2D2D2D]/55">
                      {review.restaurantName}
                      {review.bagDisplayName ? ` · ${review.bagDisplayName}` : ""}
                    </p>
                    <p className="text-xs text-[#2D2D2D]/40">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRow value={review.ratingValue} />
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle}`}>
                      {review.moderationStatusCode}
                    </span>
                  </div>
                </div>

                {review.reviewText && (
                  <p className="mt-3 text-sm leading-relaxed text-[#2D2D2D]/80">{review.reviewText}</p>
                )}

                {/* Moderation actions */}
                {review.moderationStatusCode !== "APPROVED" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => moderate(review.reviewPk, "APPROVED")}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#1A5C38]/30 px-3 text-xs font-semibold text-[#1A5C38] disabled:opacity-50 hover:bg-[#EAF3DE]"
                    >
                      <Check size={13} aria-hidden="true" />
                      Approve
                    </button>
                    {review.moderationStatusCode !== "REJECTED" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => moderate(review.reviewPk, "REJECTED")}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-50 hover:bg-red-50"
                      >
                        <X size={13} aria-hidden="true" />
                        Reject
                      </button>
                    )}
                    {review.moderationStatusCode !== "HIDDEN" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => moderate(review.reviewPk, "HIDDEN")}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                      >
                        <EyeOff size={13} aria-hidden="true" />
                        Hide
                      </button>
                    )}
                  </div>
                )}
                {review.moderationStatusCode === "APPROVED" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => moderate(review.reviewPk, "HIDDEN")}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                    >
                      <EyeOff size={13} aria-hidden="true" />
                      Hide
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => moderate(review.reviewPk, "REJECTED")}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-50 hover:bg-red-50"
                    >
                      <X size={13} aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
