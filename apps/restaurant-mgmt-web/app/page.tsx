import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadDefaultRestaurant } from "@/lib/slice3";

export default async function PortalEntryPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (restaurant?.restaurantStatusCode === "ACTIVE") {
    redirect("/portal/dashboard");
  }

  redirect("/portal/onboarding");
}
