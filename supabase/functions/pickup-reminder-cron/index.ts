import { jsonResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async () => {
  const supabase = createServiceClient();
  const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // TODO/HUMAN_REVIEW: Replace this scaffold with the exact DDL-backed idempotency
  // query for READY_FOR_PICKUP orders once Slice 4 creates the order conversion service.
  const { error } = await supabase.from("notification_outbox").insert({
    channel_code: "WHATSAPP",
    resolved_destination_text: "HUMAN_REVIEW_REQUIRED",
    business_context_type_code: "ORDER",
    payload_json: { reminderWindowAt: thirtyMinutesFromNow },
    send_status_code: "SUPPRESSED",
    scheduled_at: new Date().toISOString(),
  });

  if (error) {
    return jsonResponse({ ok: false, error: "Could not enqueue pickup reminder scaffold." }, 500);
  }

  return jsonResponse({ ok: true });
});

