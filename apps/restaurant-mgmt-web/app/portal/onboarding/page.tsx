import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
        <a className="text-sm font-semibold text-[#1A5C38]" href="/portal/onboarding">
          Onboarding
        </a>
      </ShellHeader>
      <OnboardingClient />
    </main>
  );
}
