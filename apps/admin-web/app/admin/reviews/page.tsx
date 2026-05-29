import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";
import { AdminNavHeader } from "../admin-nav";
import { AdminReviewsClient } from "./reviews-client";

type ReviewRow = {
  readonly review_review_pk: string;
  readonly restaurant_fk: string;
  readonly rating_value: number;
  readonly review_text: string | null;
  readonly moderation_status_code: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  readonly is_public: boolean;
  readonly created_at: string;
  readonly reviewer_display_name: string;
  readonly bag_display_name: string | null;
  readonly restaurant_name: string | null;
};

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const service = createServiceRoleSupabaseClient();

  // Join api_restaurant_own_reviews with restaurant name via restaurant_restaurant
  const { data, error } = await service
    .from("api_restaurant_own_reviews")
    .select("review_review_pk,restaurant_fk,rating_value,review_text,moderation_status_code,is_public,created_at,reviewer_display_name,bag_display_name")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("admin_reviews_load_failed", { code: error.code, message: error.message });
  }

  // Load restaurant names separately
  const rows = (data ?? []) as Omit<ReviewRow, "restaurant_name">[];
  const restaurantPks = [...new Set(rows.map((r) => r.restaurant_fk))];
  const { data: restaurantData } = restaurantPks.length > 0
    ? await service
        .from("restaurant_restaurant")
        .select("restaurant_restaurant_pk,restaurant_name")
        .in("restaurant_restaurant_pk", restaurantPks)
    : { data: [] };

  const restaurantNames = new Map(
    ((restaurantData ?? []) as { restaurant_restaurant_pk: string; restaurant_name: string }[]).map(
      (r) => [r.restaurant_restaurant_pk, r.restaurant_name],
    ),
  );

  const reviews = rows.map((row) => ({
    reviewPk: row.review_review_pk,
    restaurantName: restaurantNames.get(row.restaurant_fk) ?? "Unknown restaurant",
    restaurantPk: row.restaurant_fk,
    reviewerDisplayName: row.reviewer_display_name,
    ratingValue: row.rating_value,
    reviewText: row.review_text,
    moderationStatusCode: row.moderation_status_code,
    isPublic: row.is_public,
    bagDisplayName: row.bag_display_name,
    createdAt: row.created_at,
  }));

  const pendingCount = reviews.filter((r) => r.moderationStatusCode === "PENDING").length;

  return (
    <main id="main-content">
      <AdminNavHeader />
      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Content moderation</p>
            <h1 className="mt-2 text-3xl font-bold text-[#2D2D2D]">Reviews queue</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#2D2D2D]/60">
              Approve verified BAM Bag reviews before they appear publicly on restaurant profiles. Reject or hide reviews that violate community guidelines.
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">
              {pendingCount} awaiting moderation
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load reviews. Ensure the Slice 9 migration has been applied.
          </div>
        )}

        <AdminReviewsClient initialReviews={reviews} />
      </section>
    </main>
  );
}
