import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { PublicDropCard } from "@gozaika/types";
import { LaunchCommsPanel, ShellHeader } from "@gozaika/ui";
import { createPublicDropUrl, formatPaise, formatPickupWindow, generateManualDropAlertText } from "@gozaika/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type PublicDropRow = {
  readonly drop_drop_pk: string;
  readonly drop_title: string;
  readonly drop_status_code: PublicDropCard["statusCode"];
  readonly drop_type_code: string;
  readonly quantity_total: number;
  readonly computed_quantity_available: number;
  readonly price_paise: number | string;
  readonly pickup_start_at: string;
  readonly pickup_end_at: string;
  readonly restaurant_slug: string;
  readonly restaurant_name: string;
  readonly neighborhood_name: string | null;
  readonly bag_display_name: string;
  readonly bag_short_description: string | null;
  readonly dietary_category_code: PublicDropCard["dietaryCategoryCode"];
  readonly spice_level_code: PublicDropCard["spiceLevelCode"];
  readonly serves_min: number | string | null;
  readonly serves_max: number | string | null;
  readonly max_holding_minutes: number | string | null;
  readonly holding_guidance_text: string | null;
  readonly min_menu_value_paise: number | string | null;
  readonly allergen_summary_text: string | null;
  readonly allergen_codes: readonly string[] | null;
};

function mapPublicDrop(row: PublicDropRow): PublicDropCard {
  return {
    dropPk: row.drop_drop_pk,
    dropTitle: row.drop_title,
    dropTypeCode: row.drop_type_code,
    restaurantName: row.restaurant_name,
    restaurantSlug: row.restaurant_slug,
    neighborhoodName: row.neighborhood_name,
    bagDisplayName: row.bag_display_name,
    bagShortDescription: row.bag_short_description,
    dietaryCategoryCode: row.dietary_category_code,
    spiceLevelCode: row.spice_level_code,
    servesMin: row.serves_min == null ? null : Number(row.serves_min),
    servesMax: row.serves_max == null ? null : Number(row.serves_max),
    maxHoldingMinutes: row.max_holding_minutes == null ? null : Number(row.max_holding_minutes),
    holdingGuidanceText: row.holding_guidance_text,
    minMenuValuePaise: row.min_menu_value_paise == null ? null : Number(row.min_menu_value_paise),
    allergenSummaryText: row.allergen_summary_text,
    allergenCodes: row.allergen_codes ?? [],
    pricePaise: Number(row.price_paise),
    pickupStartAt: row.pickup_start_at,
    pickupEndAt: row.pickup_end_at,
    quantityTotal: row.quantity_total,
    quantityAvailable: row.computed_quantity_available,
    statusCode: row.drop_status_code,
  };
}

export default async function AdminDropsPage() {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");

  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service
    .from("api_public_drop_card")
    .select("*")
    .in("drop_status_code", ["ACTIVE", "SCHEDULED"])
    .order("pickup_start_at", { ascending: true });

  if (error) {
    throw new Error("Could not load public drops for launch comms.");
  }

  const drops = ((data ?? []) as PublicDropRow[]).map(mapPublicDrop);

  return (
    <main>
      <ShellHeader>
        <nav className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="text-[#1A5C38]" href="/admin/restaurants/onboarding">
            Onboarding
          </Link>
          <Link className="text-[#1A5C38]" href="/admin/drops">
            Drops
          </Link>
        </nav>
      </ShellHeader>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A5C38]">Launch ops</p>
            <h1 className="mt-2 text-3xl font-bold">Manual drop comms</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65">
              Copy the public consumer link and the same WhatsApp-safe alert text restaurants see for active or scheduled public drops.
            </p>
          </div>
          <Link className="min-h-11 rounded-lg border border-[#1A5C38]/25 px-4 py-3 text-sm font-semibold text-[#1A5C38]" href="/admin">
            Admin home
          </Link>
        </div>

        <div className="mt-6 grid gap-4">
          {drops.length === 0 ? (
            <section className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
              No active or scheduled public drops are ready for manual launch comms.
            </section>
          ) : (
            drops.map((drop) => {
              const publicUrl = createPublicDropUrl(drop.dropPk);
              const alertText = generateManualDropAlertText(drop, publicUrl);
              return (
                <article key={drop.dropPk} className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <p className="text-sm font-semibold text-[#1A5C38]">{drop.restaurantName}</p>
                    <h2 className="mt-1 text-xl font-bold">{drop.dropTitle || drop.bagDisplayName}</h2>
                    <dl className="mt-4 grid gap-2 text-sm text-black/70 sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-black">Pickup</dt>
                        <dd>{formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-black">Price</dt>
                        <dd>{formatPaise(drop.pricePaise)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-black">Quantity</dt>
                        <dd>
                          {drop.quantityAvailable} / {drop.quantityTotal} available
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-black">Status</dt>
                        <dd>{drop.statusCode}</dd>
                      </div>
                    </dl>
                  </div>
                  <LaunchCommsPanel publicUrl={publicUrl} alertText={alertText} title="Copy for WhatsApp" />
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
