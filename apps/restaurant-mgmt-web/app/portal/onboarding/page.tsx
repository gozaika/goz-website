import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalChrome } from "../portal-nav";
import { OnboardingClient } from "./onboarding-client";

export default async function PortalOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <PortalChrome>
      <OnboardingClient />
    </PortalChrome>
  );
}
