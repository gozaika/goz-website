import { createClient } from "@supabase/supabase-js";

type CliArgs = {
  readonly cleanupLiveDrops: boolean;
  readonly createLiveDrops: boolean;
};

function parseArgs(argv: readonly string[]): CliArgs {
  return {
    cleanupLiveDrops: !argv.includes("--no-cleanup-live-drops"),
    createLiveDrops: !argv.includes("--no-create-live-drops"),
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(
    process.env.SUPABASE_URL || requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("demo_prepare_for_demo", {
    p_cleanup_live_drops: args.cleanupLiveDrops,
    p_create_live_drops: args.createLiveDrops,
  });
  if (error) throw error;

  const now = new Date().toISOString();
  const { data: drops, error: dropsError } = await supabase
    .from("drop_drop")
    .select("drop_drop_pk,drop_title,drop_status_code,quantity_total,computed_quantity_available,pickup_start_at,pickup_end_at")
    .in("drop_status_code", ["ACTIVE", "SCHEDULED"])
    .gt("pickup_end_at", now)
    .order("pickup_end_at", { ascending: true })
    .limit(8);

  if (dropsError) throw dropsError;

  console.log(
    JSON.stringify(
      {
        ok: true,
        rpcResult: data,
        futureDropCount: drops?.length ?? 0,
        drops,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
