import { jsonResponse } from "../_shared/http.ts";

Deno.serve(async () => {
  // TODO/HUMAN_REVIEW: Finance must approve calculations before this worker writes
  // payout entries or invoice metadata. It must never trigger irreversible payouts.
  return jsonResponse({ ok: true, settlementRunsProcessed: 0 });
});

