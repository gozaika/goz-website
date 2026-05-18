import { createClient } from "@supabase/supabase-js";
import { readDemoEnvironment } from "./demo-auth-shared";

const { supabaseUrl, serviceRoleKey } = readDemoEnvironment();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: registry, error } = await supabase
    .from("dev_demo_seed_registry")
    .select("dev_demo_seed_registry_pk,entity_table,entity_id")
    .in("slice", ["slice3_drop_publishing", "slice2_restaurant_onboarding", "slice2_admin_auth"]);
  if (error) throw error;

  const idsByTable = new Map<string, string[]>();
  for (const row of registry ?? []) {
    idsByTable.set(row.entity_table, [...(idsByTable.get(row.entity_table) ?? []), row.entity_id]);
  }

  const order = [
    "drop_drop",
    "catalog_bag_template",
    "restaurant_document",
    "restaurant_restaurant",
    "storage_object",
    "iam_platform_membership",
  ];
  let deleted = 0;
  for (const table of order) {
    const ids = idsByTable.get(table);
    if (!ids?.length) continue;
    const { error: deleteError } = await supabase.from(table).delete().in(`${table}_pk`, ids);
    if (deleteError) throw deleteError;
    deleted += ids.length;
  }

  if (registry?.length) {
    await supabase
      .from("dev_demo_seed_registry")
      .delete()
      .in(
        "dev_demo_seed_registry_pk",
        registry.map((row) => row.dev_demo_seed_registry_pk),
      );
  }

  console.log(`Demo SQL-owned data cleanup complete: rowsDeleted=${deleted}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo SQL-owned cleanup failed.");
  process.exitCode = 1;
});
