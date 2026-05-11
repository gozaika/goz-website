import { createClient } from "@supabase/supabase-js";
import { allDemoUsers, demoPassword, readDemoEnvironment, type DemoUser } from "./demo-auth-shared";

const slice = "slice1_auth_profile";
const { supabaseUrl, serviceRoleKey } = readDemoEnvironment();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listUsersByEmail() {
  const usersByEmail = new Map<string, { id: string; email?: string; app_metadata?: Record<string, unknown> }>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      throw error;
    }

    for (const user of data.users) {
      if (user.email) {
        usersByEmail.set(user.email.toLowerCase(), {
          id: user.id,
          email: user.email,
          app_metadata: user.app_metadata,
        });
      }
    }

    if (data.users.length < 1000) {
      break;
    }

    page += 1;
  }

  return usersByEmail;
}

async function register(seedKey: string, entityTable: string, entityId: string) {
  await supabase.from("dev_demo_seed_registry").upsert(
    {
      seed_key: seedKey,
      entity_table: entityTable,
      entity_id: entityId,
      slice,
    },
    { onConflict: "seed_key" },
  );
}

async function ensureDomainRows(user: DemoUser, authUserId: string) {
  const { data: city } = await supabase.from("geo_city").select("geo_city_pk").eq("city_code", "HYD").maybeSingle();
  const [firstName, ...rest] = user.fullName.split(" ");

  const { data: profile, error: profileError } = await supabase
    .from("iam_profile")
    .upsert(
      {
        auth_user_fk: authUserId,
        phone_e164: user.phone,
        email_address: user.email,
        display_name: user.fullName,
        default_city_fk: city?.geo_city_pk ?? null,
        is_consumer: user.role === "consumer",
        is_restaurant_user: user.role === "restaurant",
        is_platform_user: false,
        last_seen_at: "2026-04-27T00:00:00.000Z",
      },
      { onConflict: "auth_user_fk" },
    )
    .select("iam_profile_pk")
    .single();

  if (profileError || !profile) {
    throw profileError ?? new Error(`Could not upsert iam_profile for ${user.email}`);
  }

  await register(`slice1-auth:${user.email}:iam_profile`, "iam_profile", profile.iam_profile_pk);

  if (user.role !== "consumer") {
    return;
  }

  const { data: consumerProfile, error: consumerError } = await supabase
    .from("consumer_profile")
    .upsert(
      {
        iam_profile_fk: profile.iam_profile_pk,
        first_name: firstName,
        last_name: rest.join(" ") || null,
        preferred_language_code: "en",
      },
      { onConflict: "iam_profile_fk" },
    )
    .select("consumer_profile_pk")
    .single();

  if (consumerError || !consumerProfile) {
    throw consumerError ?? new Error(`Could not upsert consumer_profile for ${user.email}`);
  }

  await register(`slice1-auth:${user.email}:consumer_profile`, "consumer_profile", consumerProfile.consumer_profile_pk);

  const { data: referral } = await supabase
    .from("consumer_referral_code")
    .upsert(
      {
        consumer_profile_fk: consumerProfile.consumer_profile_pk,
        referral_code: `GZ-${user.phone.slice(-6)}`,
        is_active: true,
      },
      { onConflict: "consumer_profile_fk" },
    )
    .select("consumer_referral_code_pk")
    .single();

  if (referral) {
    await register(
      `slice1-auth:${user.email}:consumer_referral_code`,
      "consumer_referral_code",
      referral.consumer_referral_code_pk,
    );
  }

  const { data: purposes, error: purposeError } = await supabase
    .from("privacy_consent_purpose")
    .select("privacy_consent_purpose_pk,purpose_code")
    .in("purpose_code", [
      "OPERATIONAL",
      "MARKETING",
      "ANALYTICS",
      "REFERRAL_COMMS",
      "WHATSAPP_TRANSACTIONAL",
      "WHATSAPP_MARKETING",
    ]);

  if (purposeError) {
    throw purposeError;
  }

  for (const purpose of purposes ?? []) {
    const seedKey = `slice1-auth:${user.email}:consent:${purpose.purpose_code}`;
    const { data: existing } = await supabase
      .from("dev_demo_seed_registry")
      .select("dev_demo_seed_registry_pk")
      .eq("seed_key", seedKey)
      .maybeSingle();

    if (existing) {
      continue;
    }

    const { data: consent, error: consentError } = await supabase
      .from("privacy_consent_event")
      .insert({
        iam_profile_fk: profile.iam_profile_pk,
        privacy_consent_purpose_fk: purpose.privacy_consent_purpose_pk,
        consent_state_code: purpose.purpose_code === "OPERATIONAL" ? "GRANTED" : "REVOKED",
        policy_version: "2026-04-27",
        capture_source_code: "SYSTEM_GRANT",
        proof_json: {
          uiVersion: "demo-seed-slice1",
          sourceRoute: "scripts/demo/create-demo-auth-users.ts",
          seededAt: "2026-04-27T00:00:00.000Z",
        },
        recorded_by_profile_fk: profile.iam_profile_pk,
      })
      .select("privacy_consent_event_pk")
      .single();

    if (consentError || !consent) {
      throw consentError ?? new Error(`Could not insert demo consent for ${user.email}`);
    }

    await register(seedKey, "privacy_consent_event", consent.privacy_consent_event_pk);
  }
}

async function main() {
  const usersByEmail = await listUsersByEmail();
  let created = 0;
  let updated = 0;

  for (const demoUser of allDemoUsers) {
    const existing = usersByEmail.get(demoUser.email.toLowerCase());
    const appMetadata = {
      app: "gozaika",
      demo: true,
      role: demoUser.role,
    };
    const userMetadata = {
      full_name: demoUser.fullName,
      area: demoUser.area,
      cuisine: demoUser.cuisine ?? [],
    };

    if (existing) {
      const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
        email: demoUser.email,
        phone: demoUser.phone,
        password: demoPassword,
        email_confirm: true,
        phone_confirm: true,
        app_metadata: appMetadata,
        user_metadata: userMetadata,
      });
      if (error) {
        throw error;
      }
      await ensureDomainRows(demoUser, data.user.id);
      updated += 1;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: demoUser.email,
        phone: demoUser.phone,
        password: demoPassword,
        email_confirm: true,
        phone_confirm: true,
        app_metadata: appMetadata,
        user_metadata: userMetadata,
      });
      if (error) {
        throw error;
      }
      await ensureDomainRows(demoUser, data.user.id);
      created += 1;
    }
  }

  console.log(`Demo auth users complete: created=${created} updated=${updated} skipped=0`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo auth creation failed.");
  process.exitCode = 1;
});
