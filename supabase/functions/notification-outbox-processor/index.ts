import { jsonResponse, safeLog } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (!["POST", "GET"].includes(request.method)) {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("notification_outbox")
    .select("notification_outbox_pk, channel_code, resolved_destination_text, payload_json")
    .eq("send_status_code", "QUEUED")
    .lte("scheduled_at", new Date().toISOString())
    .limit(25);

  if (error) {
    return jsonResponse({ ok: false, error: "Could not load notification outbox." }, 500);
  }

  for (const row of rows ?? []) {
    // TODO/HUMAN_REVIEW: Implement WATI, Resend, and push adapters with consent checks
    // before production sends are enabled. Until then, mark as SUPPRESSED instead of SENT.
    await supabase
      .from("notification_outbox")
      .update({ send_status_code: "SUPPRESSED", updated_at: new Date().toISOString() })
      .eq("notification_outbox_pk", row.notification_outbox_pk);

    await supabase.from("notification_delivery_attempt").insert({
      notification_outbox_fk: row.notification_outbox_pk,
      provider_code: "HUMAN_REVIEW_REQUIRED",
      attempt_status_code: "DROPPED",
      attempt_number: 1,
      error_text: "Notification adapter not configured.",
    });
  }

  safeLog("notification_outbox_processed", { count: rows?.length ?? 0 });
  return jsonResponse({ ok: true, processed: rows?.length ?? 0 });
});

