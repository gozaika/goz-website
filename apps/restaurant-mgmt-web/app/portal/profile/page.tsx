import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant } from "@/lib/slice3";
import { PortalNav } from "../portal-nav";
import { PortalProfileClient, type PortalProfileState } from "./profile-client";

export default async function PortalProfilePage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant) redirect("/portal/onboarding");

  const service = createServiceRoleSupabaseClient();
  const [{ data: profile }, { data: restaurantRow }, { data: contact }] = await Promise.all([
    service
      .from("iam_profile")
      .select("email_address,phone_e164")
      .eq("iam_profile_pk", actor.profilePk)
      .maybeSingle(),
    service
      .from("restaurant_restaurant")
      .select("restaurant_restaurant_pk,restaurant_name,primary_contact_email,primary_contact_phone_e164")
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
  ]);

  const initialProfile: PortalProfileState = {
    restaurantPk: restaurant.restaurantPk,
    restaurantName: restaurantRow?.restaurant_name ?? restaurant.restaurantName,
    staffEmail: profile?.email_address ?? actor.email,
    staffPhone: profile?.phone_e164 ?? actor.phone,
    primaryContactEmail: restaurantRow?.primary_contact_email ?? contact?.email_address ?? null,
    primaryContactPhone: restaurantRow?.primary_contact_phone_e164 ?? contact?.phone_e164 ?? null,
  };

  return (
    <main>
      <ShellHeader>
        <PortalNav />
      </ShellHeader>
      <PortalProfileClient initialProfile={initialProfile} />
    </main>
  );
}
