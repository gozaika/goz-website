import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant } from "@/lib/slice3";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "Only approved active restaurants can publish BAM Bag templates." }, { status: 403 });
  }

  const { id } = await context.params;
  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (json.action !== "publish_latest_revision") {
    return NextResponse.json({ ok: false, error: "Unsupported template action." }, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data: template, error: templateError } = await service
    .from("catalog_bag_template")
    .select("catalog_bag_template_pk,restaurant_fk")
    .eq("catalog_bag_template_pk", id)
    .maybeSingle();

  if (templateError || !template || template.restaurant_fk !== restaurant.restaurantPk) {
    return NextResponse.json({ ok: false, error: "Template not found for this restaurant." }, { status: 404 });
  }

  const { data: revision, error: revisionError } = await service
    .from("catalog_bag_template_revision")
    .select("catalog_bag_template_revision_pk")
    .eq("catalog_bag_template_fk", id)
    .eq("revision_status_code", "PUBLISHED")
    .order("revision_number", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (revisionError || !revision) {
    return NextResponse.json(
      { ok: false, error: "This template has no published revision. Create a new template with disclosure details." },
      { status: 409 },
    );
  }

  const { error: updateError } = await service
    .from("catalog_bag_template")
    .update({
      active_revision_fk: revision.catalog_bag_template_revision_pk,
      template_status_code: "ACTIVE",
      updated_at: new Date().toISOString(),
    })
    .eq("catalog_bag_template_pk", id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: "Could not publish this template." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { templatePk: id, templateRevisionPk: revision.catalog_bag_template_revision_pk },
  });
}
