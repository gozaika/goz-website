import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { ConsentForm } from "./consent-form";
import { createClient } from "@/lib/supabase/server";

export default async function ConsentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main>
      <ShellHeader />
      <ConsentForm />
    </main>
  );
}
