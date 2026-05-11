import { jsonResponse, safeLog } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (!["POST", "GET"].includes(request.method)) {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("api_release_expired_inventory_holds", {
    p_limit: 500,
  });

  if (error) {
    safeLog("release_expired_holds_failed");
    return jsonResponse({ ok: false, error: "Could not release expired holds." }, 500);
  }

  safeLog("release_expired_holds_completed", { released: Number(data ?? 0) });
  return jsonResponse({ ok: true, released: Number(data ?? 0) });
});

