import { profileBootstrapSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = profileBootstrapSchema.safeParse({
    fullName: json.fullName ?? user.user_metadata.full_name ?? user.user_metadata.name,
    phoneE164: json.phoneE164 ?? user.phone,
    emailAddress: json.emailAddress ?? user.email,
    preferredLanguageCode: json.preferredLanguageCode ?? "en",
    defaultCityCode: json.defaultCityCode ?? "HYD",
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check your profile details and try again." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("api_bootstrap_consumer_profile", {
    p_full_name: parsed.data.fullName ?? null,
    p_phone_e164: parsed.data.phoneE164 ?? null,
    p_email_address: parsed.data.emailAddress ?? null,
    p_default_city_code: parsed.data.defaultCityCode,
    p_preferred_language_code: parsed.data.preferredLanguageCode,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "We could not prepare your profile yet." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: Array.isArray(data) ? data[0] : data });
}
