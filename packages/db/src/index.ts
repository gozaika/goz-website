import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseClient(): SupabaseClient {
  return createClient(
    readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export const CANONICAL_MIGRATION_PATH =
  "supabase/migrations/20260425000000_gozaika_consolidated_schema.sql";

export const INVENTORY_RPC = {
  createHold: "api_create_inventory_hold",
  releaseExpiredHolds: "api_release_expired_inventory_holds",
} as const;

export interface InventoryHoldInput {
  readonly dropPk: string;
  readonly idempotencyKey: string;
  readonly quantity: number;
  readonly holdMinutes?: number;
}

export interface InventoryHoldResult {
  readonly holdPk: string;
  readonly expiresAt?: string;
}

export async function createInventoryHold(
  supabase: SupabaseClient,
  input: InventoryHoldInput,
): Promise<InventoryHoldResult> {
  const { data, error } = await supabase.rpc(INVENTORY_RPC.createHold, {
    p_drop_pk: input.dropPk,
    p_idempotency_key: input.idempotencyKey,
    p_quantity: input.quantity,
    p_hold_minutes: input.holdMinutes ?? 10,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (typeof data !== "string") {
    throw new Error("Inventory hold RPC returned an unexpected payload.");
  }

  return {
    holdPk: data,
  };
}
