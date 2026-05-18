import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalNav } from "../portal-nav";
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
    <main>
      <ShellHeader>
        <PortalNav />
      </ShellHeader>
      <OnboardingClient />
    </main>
  );
}
