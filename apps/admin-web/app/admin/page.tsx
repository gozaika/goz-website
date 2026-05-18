import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-auth";

export default async function AdminPage() {
  const actor = await getAdminActor();
  if (!actor) redirect("/auth/login");
  redirect("/admin/restaurants/onboarding");
}
