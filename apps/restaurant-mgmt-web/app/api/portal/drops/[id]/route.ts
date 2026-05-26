import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant, loadRestaurantOpsGuardrails } from "@/lib/slice3";

const dropStatusActionSchema = z.object({
  statusCode: z.enum(["ACTIVE", "PAUSED", "PICKUP_CLOSED", "EMERGENCY_CLOSED", "CANCELLED"]),
});

export async function PATCH(request: Request, { params }: { readonly params: Promise<{ readonly id: string }> }) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant) {
    return NextResponse.json({ ok: false, error: "No restaurant access found." }, { status: 403 });
  }

  const { id } = await params;
  const parsed = dropStatusActionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Choose a valid drop status." }, { status: 400 });
  }

  if (["ACTIVE", "SCHEDULED"].includes(parsed.data.statusCode)) {
    if (restaurant.restaurantStatusCode !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "goZaika ops must reactivate this restaurant before drops can be resumed." }, { status: 403 });
    }
    const guardrails = await loadRestaurantOpsGuardrails(restaurant.restaurantPk);
    if (!guardrails.publishingEnabled) {
      return NextResponse.json({ ok: false, error: "Publishing is paused by goZaika ops for this restaurant or pilot." }, { status: 403 });
    }
  }

  const now = new Date().toISOString();
  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service
    .from("drop_drop")
    .update({
      drop_status_code: parsed.data.statusCode,
      published_by_profile_fk: parsed.data.statusCode === "ACTIVE" ? actor.profilePk : undefined,
      published_at: parsed.data.statusCode === "ACTIVE" ? now : undefined,
      updated_at: now,
    })
    .eq("drop_drop_pk", id)
    .eq("restaurant_fk", restaurant.restaurantPk)
    .select("drop_drop_pk,drop_status_code")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Could not update this drop." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { dropPk: data.drop_drop_pk, statusCode: data.drop_status_code } });
}
