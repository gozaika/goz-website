import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { restaurantBasicsUpdateSchema } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadRestaurantProfile } from "@/lib/mobile/profile";

/**
 * Edit restaurant basics (Slice 12). Role-gated by `manageProfile` (OWNER/ADMIN),
 * scoped to the selected restaurant. Validates with the canonical
 * `restaurantBasicsUpdateSchema` (restaurantPk injected from the authorized
 * context, never trusted from the body). Returns the refreshed profile.
 */
export async function PATCH(req: Request) {
  return withMobileRestaurantRole("manageProfile", async ({ restaurantPk, membership, requestId }) => {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = restaurantBasicsUpdateSchema.safeParse({ ...body, restaurantPk });
    if (!parsed.success) {
      return mobileResponseErr("VALIDATION", parsed.error.issues[0]?.message ?? "Check the restaurant basics.", requestId, {
        fieldErrors: parsed.error.issues.map((issue) => ({ field: String(issue.path[0] ?? "restaurantName"), message: issue.message })),
      });
    }

    const service = createServiceRoleSupabaseClient();
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      restaurant_name: parsed.data.restaurantName,
      restaurant_slug: parsed.data.restaurantSlug,
      legal_entity_name: parsed.data.legalEntityName ?? null,
      primary_contact_email: parsed.data.primaryContactEmail,
      primary_contact_phone_e164: parsed.data.primaryContactPhoneE164 ?? null,
      pickup_instructions: parsed.data.pickupInstructions ?? null,
      updated_at: now,
    };
    // geo_city_fk / geo_neighborhood_fk are NOT NULL — only update them when a
    // location is supplied; a partial PATCH that omits them leaves it intact.
    if (parsed.data.cityPk) update.geo_city_fk = parsed.data.cityPk;
    if (parsed.data.neighborhoodPk) update.geo_neighborhood_fk = parsed.data.neighborhoodPk;

    const { error } = await service.from("restaurant_restaurant").update(update).eq("restaurant_restaurant_pk", restaurantPk);

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        return mobileResponseErr("CONFLICT", "That restaurant URL is already taken. Choose another.", requestId);
      }
      console.error("mobile_restaurant_basics_update_failed", { requestId, message: error.message });
      return mobileResponseErr("SERVER_ERROR", "Could not save the restaurant basics.", requestId);
    }

    // Public story/headline live on restaurant_public_profile (one row per restaurant).
    if (parsed.data.headline !== undefined || parsed.data.storyMarkdown !== undefined) {
      const { error: publicError } = await service.from("restaurant_public_profile").upsert(
        {
          restaurant_fk: restaurantPk,
          headline: parsed.data.headline ?? null,
          story_markdown: parsed.data.storyMarkdown ?? null,
          updated_at: now,
        },
        { onConflict: "restaurant_fk" },
      );
      if (publicError) {
        console.error("mobile_restaurant_public_profile_update_failed", { requestId, message: publicError.message });
        return mobileResponseErr("SERVER_ERROR", "Saved basics, but could not save the public story.", requestId);
      }
    }

    const profile = await loadRestaurantProfile(service, restaurantPk, true);
    if (!profile) {
      return mobileResponseErr("NOT_FOUND", "Restaurant profile is unavailable.", requestId);
    }
    return mobileResponseOk(profile, requestId);
  })(req);
}
