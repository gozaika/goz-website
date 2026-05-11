import { createClient } from "@supabase/supabase-js";
import { readDemoEnvironment } from "./demo-auth-shared";

const { supabaseUrl, serviceRoleKey } = readDemoEnvironment();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listDemoAuthUsers() {
  const users: { id: string; email?: string }[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      throw error;
    }

    for (const user of data.users) {
      if (user.app_metadata?.app === "gozaika" && user.app_metadata?.demo === true) {
        users.push({ id: user.id, email: user.email });
      }
    }

    if (data.users.length < 1000) {
      break;
    }

    page += 1;
  }

  return users;
}

async function deleteRegisteredRows() {
  const { data: registry, error } = await supabase
    .from("dev_demo_seed_registry")
    .select("dev_demo_seed_registry_pk,entity_table,entity_id,slice")
    .in("slice", ["slice2_restaurant_onboarding", "slice2_admin_auth", "slice1_auth_profile"]);

  if (error) {
    throw error;
  }

  const idsByTable = new Map<string, string[]>();
  for (const row of registry ?? []) {
    const ids = idsByTable.get(row.entity_table) ?? [];
    ids.push(row.entity_id);
    idsByTable.set(row.entity_table, ids);
  }

  const deleteOrder = [
    "restaurant_document",
    "restaurant_restaurant",
    "storage_object",
    "iam_platform_membership",
    "privacy_consent_event",
    "consumer_referral_code",
    "consumer_profile",
    "iam_profile",
  ];
  let deletedRows = 0;

  for (const table of deleteOrder) {
    const ids = idsByTable.get(table);
    if (!ids?.length) {
      continue;
    }

    const pk = `${table}_pk`;
    const { error: deleteError } = await supabase.from(table).delete().in(pk, ids);
    if (deleteError) {
      throw deleteError;
    }
    deletedRows += ids.length;
  }

  if (registry?.length) {
    const { error: registryDeleteError } = await supabase
      .from("dev_demo_seed_registry")
      .delete()
      .in(
        "dev_demo_seed_registry_pk",
        registry.map((row) => row.dev_demo_seed_registry_pk),
      );

    if (registryDeleteError) {
      throw registryDeleteError;
    }
  }

  return deletedRows;
}

async function main() {
  const deletedRows = await deleteRegisteredRows();
  const demoUsers = await listDemoAuthUsers();
  let deleted = 0;

  for (const user of demoUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      throw error;
    }
    deleted += 1;
  }

  console.log(`Demo cleanup complete: sqlRowsDeleted=${deletedRows} authUsersDeleted=${deleted} skipped=0`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo auth deletion failed.");
  process.exitCode = 1;
});
