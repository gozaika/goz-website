import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadActiveRestaurantsForProfile, loadSelectedRestaurant } from "@/lib/slice3";
import { PortalChrome } from "../portal-nav";
import { toSwitcherRestaurants } from "../switcher-data";
import { PortalProfileClient, type PortalProfileState } from "./profile-client";
import { toPublicMediaAsset } from "@/lib/product-media";

export default async function PortalProfilePage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const [restaurant, memberships] = await Promise.all([
    loadSelectedRestaurant(actor.profilePk),
    loadActiveRestaurantsForProfile(actor.profilePk),
  ]);
  if (!restaurant) redirect("/portal/onboarding");

  const service = createServiceRoleSupabaseClient();
  const [{ data: profile }, { data: restaurantRow }, { data: contact }, { data: publicProfile }] = await Promise.all([
    service
      .from("iam_profile")
      .select("email_address,phone_e164")
      .eq("iam_profile_pk", actor.profilePk)
      .maybeSingle(),
    service
      .from("restaurant_restaurant")
      .select("restaurant_restaurant_pk,restaurant_name,primary_contact_email,primary_contact_phone_e164,geo_address_fk")
      .eq("restaurant_restaurant_pk", restaurant.restaurantPk)
      .single(),
    service
      .from("restaurant_contact")
      .select("email_address,phone_e164")
      .eq("restaurant_fk", restaurant.restaurantPk)
      .in("contact_type_code", ["PICKUP", "MANAGER", "OWNER", "SUPPORT"])
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    service
      .from("restaurant_public_profile")
      .select("hero_storage_object_fk,logo_storage_object_fk")
      .eq("restaurant_fk", restaurant.restaurantPk)
      .maybeSingle(),
  ]);

  const storagePks = [publicProfile?.hero_storage_object_fk, publicProfile?.logo_storage_object_fk].filter(Boolean) as string[];
  const { data: mediaObjects } = storagePks.length
    ? await service
        .from("storage_object")
        .select("storage_object_pk,bucket_name,object_path,width_px,height_px,alt_text,media_status_code")
        .in("storage_object_pk", storagePks)
        .eq("media_status_code", "READY")
    : { data: [] };
  const mediaByPk = new Map((mediaObjects ?? []).map((item) => [item.storage_object_pk, item]));
  const hero = publicProfile?.hero_storage_object_fk ? mediaByPk.get(publicProfile.hero_storage_object_fk) : null;
  const logo = publicProfile?.logo_storage_object_fk ? mediaByPk.get(publicProfile.logo_storage_object_fk) : null;

  // Load existing geo_address if linked
  let addressRow: { line_1: string; landmark: string | null; latitude: number | null; longitude: number | null } | null = null;
  if (restaurantRow?.geo_address_fk) {
    const { data } = await service
      .from("geo_address")
      .select("line_1,landmark,latitude,longitude")
      .eq("geo_address_pk", restaurantRow.geo_address_fk)
      .maybeSingle();
    if (data) {
      addressRow = {
        line_1: data.line_1 as string,
        landmark: data.landmark as string | null,
        latitude: data.latitude != null ? Number(data.latitude) : null,
        longitude: data.longitude != null ? Number(data.longitude) : null,
      };
    }
  }

  const initialProfile: PortalProfileState = {
    restaurantPk: restaurant.restaurantPk,
    restaurantName: restaurantRow?.restaurant_name ?? restaurant.restaurantName,
    staffEmail: profile?.email_address ?? actor.email,
    staffPhone: profile?.phone_e164 ?? actor.phone,
    primaryContactEmail: restaurantRow?.primary_contact_email ?? contact?.email_address ?? null,
    primaryContactPhone: restaurantRow?.primary_contact_phone_e164 ?? contact?.phone_e164 ?? null,
    addressLine1: addressRow?.line_1 ?? null,
    addressLandmark: addressRow?.landmark ?? null,
    latitude: addressRow?.latitude ?? null,
    longitude: addressRow?.longitude ?? null,
    heroMedia: hero
      ? toPublicMediaAsset({ bucketName: hero.bucket_name, objectPath: hero.object_path, width: hero.width_px, height: hero.height_px, altText: hero.alt_text })
      : null,
    logoMedia: logo
      ? toPublicMediaAsset({ bucketName: logo.bucket_name, objectPath: logo.object_path, width: logo.width_px, height: logo.height_px, altText: logo.alt_text })
      : null,
  };

  return (
    <PortalChrome restaurantName={restaurant.restaurantName} statusCode={restaurant.restaurantStatusCode} switcherRestaurants={toSwitcherRestaurants(memberships)} selectedRestaurantPk={restaurant.restaurantPk}>
      <PortalProfileClient initialProfile={initialProfile} />
    </PortalChrome>
  );
}
