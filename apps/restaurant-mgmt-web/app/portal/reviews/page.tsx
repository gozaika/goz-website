import { redirect } from "next/navigation";
import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { ratingLabel } from "@gozaika/utils";
import { getPortalActor } from "@/lib/portal-auth";
import { loadActiveRestaurantsForProfile } from "@/lib/slice3";
import { PortalChrome } from "../portal-nav";

type ReviewRow = {
  readonly review_review_pk: string;
  readonly restaurant_fk: string;
  readonly rating_value: number;
  readonly review_text: string | null;
  readonly categories: Record<string, number> | null;
  readonly moderation_status_code: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  readonly is_public: boolean;
  readonly created_at: string;
  readonly reviewer_display_name: string;
  readonly bag_display_name: string | null;
  readonly order_dietary_code: string | null;
};

const STATUS_LABELS = {
  PENDING:  { label: "Awaiting moderation", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED: { label: "Approved",            className: "bg-green-50 text-green-700 border border-green-200" },
  REJECTED: { label: "Not published",       className: "bg-red-50 text-red-700 border border-red-200" },
  HIDDEN:   { label: "Hidden",              className: "bg-slate-100 text-slate-600 border border-slate-200" },
} as const satisfies Record<string, { label: string; className: string }>;

function StarDisplay({ value }: { readonly value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`text-base ${n <= value ? "text-[#D4A017]" : "text-black/15"}`} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

function CategoryBar({ label, value }: { readonly label: string; readonly value: number }) {
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs text-[#2D2D2D]/60 capitalize">{label.replace(/_/g, " ")}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-[#1A5C38]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs font-semibold text-[#2D2D2D]">{value.toFixed(1)}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function PortalReviewsPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurants = await loadActiveRestaurantsForProfile(actor.profilePk);
  if (restaurants.length === 0) redirect("/portal/onboarding");

  const restaurantPks = restaurants.map((r) => r.restaurantPk);
  const service = createServiceRoleSupabaseClient();

  const { data, error } = await service
    .from("api_restaurant_own_reviews")
    .select("*")
    .in("restaurant_fk", restaurantPks)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("portal_reviews_load_failed", { code: error.code, message: error.message });
  }

  const reviews = (data ?? []) as ReviewRow[];

  // Aggregate stats
  const approved = reviews.filter((r) => r.moderation_status_code === "APPROVED");
  const pending  = reviews.filter((r) => r.moderation_status_code === "PENDING");

  const averageRating =
    approved.length > 0
      ? approved.reduce((sum, r) => sum + r.rating_value, 0) / approved.length
      : null;

  // Category averages across approved reviews
  const categoryTotals: Record<string, { sum: number; count: number }> = {};
  for (const review of approved) {
    if (!review.categories) continue;
    for (const [key, val] of Object.entries(review.categories)) {
      if (typeof val !== "number") continue;
      categoryTotals[key] ??= { sum: 0, count: 0 };
      categoryTotals[key].sum += val;
      categoryTotals[key].count += 1;
    }
  }
  const categoryAverages = Object.entries(categoryTotals)
    .map(([key, { sum, count }]) => ({ key, avg: sum / count }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <PortalChrome restaurantName={restaurants[0]?.restaurantName} statusCode="ACTIVE">
      <section className="px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#2D2D2D]">Reviews</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#2D2D2D]/60">
            Customer reviews are moderated before appearing publicly. You cannot respond or edit reviews from this portal — contact partner support if you believe a review violates our guidelines.
          </p>
        </div>

        {/* Aggregate panel */}
        <div className="mb-8 grid gap-4 lg:grid-cols-[auto_1fr]">
          {/* Score */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1A5C38]/20 bg-[#F0F9F4] px-8 py-6 text-center">
            {averageRating != null ? (
              <>
                <p className="text-5xl font-black text-[#1A5C38]">{averageRating.toFixed(1)}</p>
                <StarDisplay value={Math.round(averageRating)} />
                <p className="mt-1.5 text-xs font-semibold text-[#D4A017]">{ratingLabel(averageRating)}</p>
                <p className="mt-1 text-xs text-[#2D2D2D]/55">{approved.length} approved review{approved.length !== 1 ? "s" : ""}</p>
              </>
            ) : (
              <>
                <p className="text-4xl font-black text-[#2D2D2D]/25">—</p>
                <p className="mt-2 text-xs text-[#2D2D2D]/50">No approved reviews yet</p>
              </>
            )}
          </div>

          {/* Category breakdown */}
          <div className="rounded-xl border border-black/10 bg-white p-5">
            {categoryAverages.length > 0 ? (
              <div className="grid gap-2.5">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#2D2D2D]/50">Category breakdown</p>
                {categoryAverages.map(({ key, avg }) => (
                  <CategoryBar key={key} label={key} value={avg} />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center">
                <p className="text-sm text-[#2D2D2D]/50">Category breakdown will appear once reviews include ratings.</p>
              </div>
            )}
          </div>
        </div>

        {/* Status counts */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm">
            <span className="font-semibold text-[#2D2D2D]">{reviews.length}</span>
            <span className="ml-1 text-[#2D2D2D]/55">total</span>
          </div>
          {pending.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
              <span className="font-semibold text-amber-700">{pending.length}</span>
              <span className="ml-1 text-amber-600">pending moderation</span>
            </div>
          )}
          <div className="rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm">
            <span className="font-semibold text-[#2D2D2D]">{approved.length}</span>
            <span className="ml-1 text-[#2D2D2D]/55">approved &amp; public</span>
          </div>
        </div>

        {/* Review list */}
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-black/10 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[#2D2D2D]/50">No reviews yet</p>
            <p className="mt-1 text-xs text-[#2D2D2D]/40">Reviews from verified BAM Bag pickups will appear here after moderation.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {reviews.map((review) => {
              const status = STATUS_LABELS[review.moderation_status_code as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.PENDING;
              return (
                <article
                  key={review.review_review_pk}
                  className="rounded-xl border border-black/10 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#2D2D2D]">{review.reviewer_display_name}</p>
                      {review.bag_display_name && (
                        <p className="text-xs text-[#2D2D2D]/50">{review.bag_display_name}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StarDisplay value={review.rating_value} />
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {review.review_text && (
                    <p className="mt-3 text-sm text-[#2D2D2D]/80 leading-relaxed">{review.review_text}</p>
                  )}

                  {review.categories && Object.keys(review.categories).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(review.categories).map(([key, val]) => (
                        typeof val === "number" ? (
                          <span key={key} className="rounded-full border border-black/10 bg-[#FAFAF8] px-2.5 py-0.5 text-xs text-[#2D2D2D]/60">
                            {key.replace(/_/g, " ")}: {val}/5
                          </span>
                        ) : null
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-[#2D2D2D]/40">
                    {new Date(review.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PortalChrome>
  );
}
