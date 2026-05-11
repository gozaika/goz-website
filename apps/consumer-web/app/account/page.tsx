import { ShellHeader } from "@gozaika/ui";
import { redirect } from "next/navigation";
import { AccountClient, type AccountConsent, type AccountProfile } from "./account-client";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase.rpc("api_bootstrap_consumer_profile", {
    p_full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    p_phone_e164: user.phone ?? null,
    p_email_address: user.email ?? null,
    p_default_city_code: "HYD",
    p_preferred_language_code: "en",
  });

  const { data: iamProfile } = await supabase
    .from("iam_profile")
    .select("iam_profile_pk,phone_e164,email_address,display_name")
    .eq("auth_user_fk", user.id)
    .single();

  const { data: consumerProfile } = iamProfile
    ? await supabase
        .from("consumer_profile")
        .select("consumer_profile_pk,preferred_language_code")
        .eq("iam_profile_fk", iamProfile.iam_profile_pk)
        .maybeSingle()
    : { data: null };

  const { data: referral } = consumerProfile
    ? await supabase
        .from("consumer_referral_code")
        .select("referral_code")
        .eq("consumer_profile_fk", consumerProfile.consumer_profile_pk)
        .maybeSingle()
    : { data: null };

  const { data: consents } = await supabase.rpc("api_latest_consents");

  const profile: AccountProfile = {
    email: iamProfile?.email_address ?? user.email ?? null,
    phone: iamProfile?.phone_e164 ?? user.phone ?? null,
    fullName: iamProfile?.display_name ?? null,
    preferredLanguageCode: consumerProfile?.preferred_language_code ?? "en",
    referralCode: referral?.referral_code ?? null,
  };

  return (
    <main>
      <ShellHeader />
      <AccountClient initialProfile={profile} initialConsents={(consents ?? []) as AccountConsent[]} />
    </main>
  );
}
