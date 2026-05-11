import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { restaurantOnboardingCreateSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortalActor } from "@/lib/portal-auth";

async function loadSummary(profilePk: string) {
  const service = createServiceRoleSupabaseClient();
  const { data: membership } = await service
    .from("restaurant_team_membership")
    .select("restaurant_fk,restaurant_team_role(role_code)")
    .eq("iam_profile_fk", profilePk)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.restaurant_fk) {
    return null;
  }

  const restaurantPk = membership.restaurant_fk;
  const [
    restaurant,
    publicProfile,
    compliance,
    contacts,
    tasks,
    documents,
    documentTypes,
    documentStatuses,
    cities,
    neighborhoods,
  ] = await Promise.all([
    service
      .from("restaurant_restaurant")
      .select(
        "restaurant_restaurant_pk,restaurant_name,restaurant_slug,legal_entity_name,restaurant_status_code,geo_city_fk,geo_neighborhood_fk,primary_contact_email,primary_contact_phone_e164,pickup_instructions,created_at,updated_at",
      )
      .eq("restaurant_restaurant_pk", restaurantPk)
      .single(),
    service
      .from("restaurant_public_profile")
      .select("headline,story_markdown")
      .eq("restaurant_fk", restaurantPk)
      .maybeSingle(),
    service
      .from("restaurant_compliance")
      .select("restaurant_compliance_pk,fssai_license_number,fssai_license_expiry_date,gstin,pan_number,compliance_status_code,last_reviewed_at")
      .eq("restaurant_fk", restaurantPk)
      .maybeSingle(),
    service.from("restaurant_contact").select("*").eq("restaurant_fk", restaurantPk).order("is_primary", { ascending: false }),
    service.from("restaurant_onboarding_task").select("*").eq("restaurant_fk", restaurantPk).order("created_at"),
    service
      .from("restaurant_document")
      .select("*,master_document_type(type_code,type_name,is_required),master_document_status(status_code,status_name)")
      .eq("restaurant_fk", restaurantPk)
      .order("created_at", { ascending: false }),
    service
      .from("master_document_type")
      .select("master_document_type_pk,type_code,type_name,is_required")
      .order("is_required", { ascending: false }),
    service.from("master_document_status").select("master_document_status_pk,status_code,status_name"),
    service.from("geo_city").select("geo_city_pk,city_code,city_name").eq("is_active", true).order("city_name"),
    service.from("geo_neighborhood").select("geo_neighborhood_pk,geo_city_fk,neighborhood_code,neighborhood_name").eq("is_active", true).order("neighborhood_name"),
  ]);

  return {
    restaurant: restaurant.data,
    publicProfile: publicProfile.data,
    compliance: compliance.data,
    contacts: contacts.data ?? [],
    tasks: tasks.data ?? [],
    documents: documents.data ?? [],
    documentTypes: documentTypes.data ?? [],
    documentStatuses: documentStatuses.data ?? [],
    cities: cities.data ?? [],
    neighborhoods: neighborhoods.data ?? [],
  };
}

export async function GET() {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, data: await loadSummary(actor.profilePk) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = restaurantOnboardingCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check restaurant details and try again." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("api_create_or_get_restaurant_onboarding", {
    p_restaurant_name: parsed.data.restaurantName ?? null,
    p_restaurant_slug: parsed.data.restaurantSlug ?? null,
    p_legal_entity_name: parsed.data.legalEntityName ?? null,
    p_primary_contact_email: parsed.data.primaryContactEmail ?? user.email ?? null,
    p_primary_contact_phone_e164: parsed.data.primaryContactPhoneE164 ?? user.phone ?? null,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not start restaurant onboarding." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: Array.isArray(data) ? data[0] : data });
}
