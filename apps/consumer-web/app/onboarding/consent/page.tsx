import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { ConsentForm } from "./consent-form";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/account";
  }

  return next;
}

export default async function ConsentPage({
  searchParams,
}: {
  readonly searchParams?: Promise<{ readonly next?: string | string[] }>;
}) {
  const query = await searchParams;
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
      <ConsentForm nextPath={safeNextPath(query?.next)} />
    </main>
  );
}
