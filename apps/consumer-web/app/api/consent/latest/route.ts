import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  await supabase.rpc("api_bootstrap_consumer_profile", {
    p_full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    p_phone_e164: user.phone ?? null,
    p_email_address: user.email ?? null,
    p_default_city_code: "HYD",
    p_preferred_language_code: "en",
  });

  const { data, error } = await supabase.rpc("api_latest_consents");

  if (error) {
    return NextResponse.json({ ok: false, error: "Consent settings are unavailable." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
