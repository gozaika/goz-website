import { jsonResponse, safeLog } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (!["POST", "GET"].includes(request.method)) {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabase = createServiceClient();
  const url = new URL(request.url);
  const windowMinutes = Math.min(Math.max(Number(url.searchParams.get("windowMinutes") ?? 30), 1), 180);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200), 1), 500);

  const { data, error } = await supabase.rpc("api_enqueue_pickup_reminders", {
    p_window_minutes: windowMinutes,
    p_limit: limit,
  });

  if (error) {
    safeLog("pickup_reminder_enqueue_failed");
    return jsonResponse({ ok: false, error: "Could not enqueue pickup reminders." }, 500);
  }

  safeLog("pickup_reminder_enqueue_completed", { enqueued: data?.length ?? 0, windowMinutes });
  return jsonResponse({ ok: true, enqueued: data?.length ?? 0, windowMinutes });
});
