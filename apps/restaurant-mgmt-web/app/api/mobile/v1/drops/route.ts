import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { createDropDraftSchema, type DropsData, type PublishDropResult } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadPortalDrops, loadRestaurantOpsGuardrails } from "@/lib/slice3";

/** The restaurant's own Limited Drops (Slice 13). Role-gated by `manageDrops`. */
export const GET = withMobileRestaurantRole("manageDrops", async ({ restaurantPk, requestId }) => {
  try {
    const drops = await loadPortalDrops(restaurantPk);
    const data: DropsData = {
      drops: drops.map((d) => ({
        dropPk: d.dropPk,
        dropTitle: d.dropTitle,
        statusCode: d.statusCode,
        quantityTotal: d.quantityTotal,
        quantityHeld: d.quantityHeld,
        quantityAvailable: d.quantityAvailable,
        pricePaise: d.pricePaise,
        pickupStartAt: d.pickupStartAt,
        pickupEndAt: d.pickupEndAt,
      })),
    };
    return mobileResponseOk(data, requestId);
  } catch (caught) {
    console.error("mobile_drops_load_failed", { requestId, message: caught instanceof Error ? caught.message : "unknown" });
    return mobileResponseErr("SERVER_ERROR", "Could not load drops.", requestId);
  }
});

/**
 * Publish a Limited Drop from an active template revision (Slice 13). Role-gated by
 * `manageDrops`. Mirrors the canonical web handler
 * (`app/api/portal/drops/route.ts`): requires an ACTIVE restaurant + ops publishing
 * enabled, validates the template's active revision, the pickup window and the
 * ops bag cap, then inserts the drop server-side.
 */
export async function POST(req: Request) {
  return withMobileRestaurantRole("manageDrops", async ({ actor, restaurantPk, membership, requestId }) => {
    if (membership.restaurantStatusCode !== "ACTIVE") {
      return mobileResponseErr("FORBIDDEN", "Only approved active restaurants can publish drops.", requestId);
    }

    const guardrails = await loadRestaurantOpsGuardrails(restaurantPk);
    if (!guardrails.publishingEnabled) {
      return mobileResponseErr("FORBIDDEN", "Publishing is paused by goZaika ops for this restaurant or pilot.", requestId);
    }

    const parsed = createDropDraftSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return mobileResponseErr("VALIDATION", parsed.error.issues[0]?.message ?? "Review the drop details.", requestId, {
        fieldErrors: parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? "templateRevisionPk"), message: i.message })),
      });
    }

    const service = createServiceRoleSupabaseClient();

    const { data: template } = await service
      .from("catalog_bag_template")
      .select("catalog_bag_template_pk,active_revision_fk")
      .eq("restaurant_fk", restaurantPk)
      .eq("template_status_code", "ACTIVE")
      .eq("active_revision_fk", parsed.data.templateRevisionPk)
      .maybeSingle();
    if (!template) {
      return mobileResponseErr("VALIDATION", "Choose an active template for this restaurant.", requestId);
    }

    const { data: revision } = await service
      .from("catalog_bag_template_revision")
      .select("catalog_bag_template_revision_pk,display_name")
      .eq("catalog_bag_template_revision_pk", parsed.data.templateRevisionPk)
      .maybeSingle<{ catalog_bag_template_revision_pk: string; display_name: string }>();
    if (!revision) {
      return mobileResponseErr("VALIDATION", "Choose an active template for this restaurant.", requestId);
    }

    if (!(new Date(parsed.data.pickupEndAt) > new Date(parsed.data.pickupStartAt))) {
      return mobileResponseErr("VALIDATION", "Pickup end time must be after pickup start time.", requestId);
    }
    if (parsed.data.quantityTotal > guardrails.maxBagsPerDrop) {
      return mobileResponseErr("VALIDATION", `Quantity cannot exceed the ops cap of ${guardrails.maxBagsPerDrop} bags.`, requestId);
    }

    const { data: restaurant } = await service
      .from("restaurant_restaurant")
      .select("geo_city_fk,geo_neighborhood_fk")
      .eq("restaurant_restaurant_pk", restaurantPk)
      .maybeSingle<{ geo_city_fk: string | null; geo_neighborhood_fk: string | null }>();

    const now = new Date().toISOString();
    const publishedAt = parsed.data.statusCode === "ACTIVE" ? now : null;
    const { data: drop, error: dropError } = await service
      .from("drop_drop")
      .insert({
        restaurant_fk: restaurantPk,
        catalog_bag_template_revision_fk: parsed.data.templateRevisionPk,
        drop_title: parsed.data.dropTitle ?? revision.display_name,
        drop_status_code: parsed.data.statusCode,
        drop_type_code: parsed.data.dropTypeCode,
        geo_city_fk: restaurant?.geo_city_fk ?? null,
        geo_neighborhood_fk: restaurant?.geo_neighborhood_fk ?? null,
        quantity_total: parsed.data.quantityTotal,
        price_paise: parsed.data.pricePaise,
        publish_at: publishedAt,
        pickup_start_at: parsed.data.pickupStartAt,
        pickup_end_at: parsed.data.pickupEndAt,
        visibility_code: "PUBLIC",
        created_by_profile_fk: actor.profilePk,
        published_by_profile_fk: publishedAt ? actor.profilePk : null,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      })
      .select("drop_drop_pk,drop_status_code")
      .single<{ drop_drop_pk: string; drop_status_code: string }>();

    if (dropError || !drop) {
      console.error("mobile_drop_publish_failed", { requestId, message: dropError?.message });
      return mobileResponseErr("SERVER_ERROR", "Could not publish this drop.", requestId);
    }

    const result: PublishDropResult = {
      dropPk: drop.drop_drop_pk,
      statusCode: drop.drop_status_code as PublishDropResult["statusCode"],
    };
    return mobileResponseOk(result, requestId);
  })(req);
}
