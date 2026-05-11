import { consumerProfileUpdateSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function ensureProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null };
  }

  await supabase.rpc("api_bootstrap_consumer_profile", {
    p_full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    p_phone_e164: user.phone ?? null,
    p_email_address: user.email ?? null,
    p_default_city_code: "HYD",
    p_preferred_language_code: "en",
  });

  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await ensureProfile();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("iam_profile")
    .select("iam_profile_pk,phone_e164,email_address,display_name,default_city_fk")
    .eq("auth_user_fk", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ ok: false, error: "Profile is unavailable." }, { status: 500 });
  }

  const { data: consumerProfile } = await supabase
    .from("consumer_profile")
    .select("consumer_profile_pk,first_name,last_name,preferred_language_code")
    .eq("iam_profile_fk", profile.iam_profile_pk)
    .maybeSingle();

  const { data: referral } = consumerProfile
    ? await supabase
        .from("consumer_referral_code")
        .select("referral_code")
        .eq("consumer_profile_fk", consumerProfile.consumer_profile_pk)
        .maybeSingle()
    : { data: null };

  return NextResponse.json({
    ok: true,
    data: {
      userId: user.id,
      email: profile.email_address ?? user.email,
      phone: profile.phone_e164 ?? user.phone,
      fullName: profile.display_name,
      preferredLanguageCode: consumerProfile?.preferred_language_code ?? "en",
      referralCode: referral?.referral_code ?? null,
    },
  });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await ensureProfile();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const json = (await request.json().catch(() => ({}))) as unknown;
  const parsed = consumerProfileUpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check your profile details and try again." }, { status: 400 });
  }

  const { error } = await supabase.rpc("api_update_consumer_profile", {
    p_full_name: parsed.data.fullName ?? null,
    p_phone_e164: parsed.data.phoneE164 ?? null,
    p_preferred_language_code: parsed.data.preferredLanguageCode ?? null,
    p_default_city_code: parsed.data.defaultCityCode ?? null,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "We could not update your profile." }, { status: 500 });
  }

  return GET();
}
