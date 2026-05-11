import { jsonResponse } from "../_shared/http.ts";

Deno.serve(async () => {
  // TODO/HUMAN_REVIEW: Implement after recurring schedule state machine is validated
  // against drop_recurring_schedule comments and restaurant publish permissions.
  return jsonResponse({ ok: true, scheduledDropsCreated: 0 });
});

