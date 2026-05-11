import { createClient } from "@supabase/supabase-js";
import { demoPassword, readDemoEnvironment } from "./demo-auth-shared";

const slice = "slice2_admin_auth";
const adminEmail = "admin.ops@gozaika.example";
const adminPhone = "+919200300001";
const { supabaseUrl, serviceRoleKey } = readDemoEnvironment();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email: string) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
    page += 1;
  }
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

async function ensureAdminDomainRows(authUserId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("iam_profile")
    .upsert(
      {
        auth_user_fk: authUserId,
        phone_e164: adminPhone,
        email_address: adminEmail,
        display_name: "goZaika Ops Admin",
        is_consumer: false,
        is_restaurant_user: false,
        is_platform_user: true,
        last_seen_at: "2026-05-02T00:00:00.000Z",
      },
      { onConflict: "auth_user_fk" },
    )
    .select("iam_profile_pk")
    .single();

  if (profileError || !profile) {
    throw profileError ?? new Error("Could not upsert admin iam_profile.");
  }

  await register("slice2-admin:iam_profile", "iam_profile", profile.iam_profile_pk);

  const { data: role, error: roleError } = await supabase
    .from("iam_platform_role")
    .select("iam_platform_role_pk")
    .eq("role_code", "OPS_ADMIN")
    .single();

  if (roleError || !role) {
    throw roleError ?? new Error("OPS_ADMIN role is missing.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("iam_platform_membership")
    .upsert(
      {
        iam_profile_fk: profile.iam_profile_pk,
        iam_platform_role_fk: role.iam_platform_role_pk,
        is_active: true,
      },
      { onConflict: "iam_profile_fk,iam_platform_role_fk" },
    )
    .select("iam_platform_membership_pk")
    .single();

  if (membershipError || !membership) {
    throw membershipError ?? new Error("Could not upsert admin platform membership.");
  }

  await register("slice2-admin:iam_platform_membership", "iam_platform_membership", membership.iam_platform_membership_pk);
}

async function main() {
  const existing = await findUserByEmail(adminEmail);
  let created = 0;
  let updated = 0;
  const appMetadata = { app: "gozaika", demo: true, role: "platform_admin" };
  const userMetadata = { full_name: "goZaika Ops Admin" };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email: adminEmail,
      phone: adminPhone,
      password: demoPassword,
      email_confirm: true,
      phone_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
    if (error) throw error;
    await ensureAdminDomainRows(data.user.id);
    updated = 1;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      phone: adminPhone,
      password: demoPassword,
      email_confirm: true,
      phone_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
    if (error) throw error;
    await ensureAdminDomainRows(data.user.id);
    created = 1;
  }

  console.log(`Demo admin user complete: created=${created} updated=${updated} skipped=0`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo admin creation failed.");
  process.exitCode = 1;
});
