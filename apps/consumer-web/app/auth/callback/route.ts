import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding/consent";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase.rpc("api_bootstrap_consumer_profile", {
        p_full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
        p_phone_e164: user.phone ?? null,
        p_email_address: user.email ?? null,
        p_default_city_code: "HYD",
        p_preferred_language_code: "en",
      });
      const bootstrap = Array.isArray(data) ? data[0] : data;
      if (bootstrap?.needs_operational_consent) {
        return NextResponse.redirect(
          new URL(`/onboarding/consent?next=${encodeURIComponent(next)}`, requestUrl.origin),
        );
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
