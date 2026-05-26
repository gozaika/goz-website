import { jsonResponse, safeLog } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type SettlementWorkerRequest = {
  readonly restaurantPk?: string;
  readonly periodStartAt?: string;
  readonly periodEndAt?: string;
  readonly createDraft?: boolean;
};

function envValue(name: string): string | null {
  try {
    return Deno.env.get(name) ?? null;
  } catch {
    return null;
  }
}

function validPeriod(startAt?: string, endAt?: string): { readonly startAt: string; readonly endAt: string } | null {
  if (!startAt || !endAt) return null;
  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs || endMs > Date.now()) {
    return null;
  }
  return { startAt: new Date(startMs).toISOString(), endAt: new Date(endMs).toISOString() };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const body = (await request.json().catch(() => ({}))) as SettlementWorkerRequest;
  const period = validPeriod(body.periodStartAt, body.periodEndAt);
  if (!body.restaurantPk || !period) {
    return jsonResponse({
      ok: false,
      error: "restaurantPk, periodStartAt, and periodEndAt are required. Period end must be before now.",
    }, 400);
  }

  const actorProfilePk = envValue("SETTLEMENT_WORKER_ACTOR_PROFILE_PK");
  const createDraft = body.createDraft === true;
  const supabase = createServiceClient();

  if (!createDraft) {
    const { data, error } = await supabase.rpc("api_preview_restaurant_settlement", {
      p_restaurant_pk: body.restaurantPk,
      p_period_start_at: period.startAt,
      p_period_end_at: period.endAt,
      p_actor_profile_pk: actorProfilePk,
    });

    if (error) {
      safeLog("settlement_worker_preview_failed", { code: error.code, message: error.message });
      return jsonResponse({ ok: false, error: "Settlement preview failed." }, 500);
    }

    const rows = Array.isArray(data) ? data : [];
    const eligibleCount = rows.filter((row) => row.eligibility_status_code === "ELIGIBLE").length;
    return jsonResponse({
      ok: true,
      mode: "preview",
      eligibleCount,
      excludedCount: rows.length - eligibleCount,
      livePayoutsEnabled: false,
    });
  }

  if (!actorProfilePk) {
    return jsonResponse({
      ok: false,
      error: "SETTLEMENT_WORKER_ACTOR_PROFILE_PK is required to create or refresh draft settlements.",
      livePayoutsEnabled: false,
    }, 503);
  }

  const { data, error } = await supabase.rpc("api_create_or_recalculate_settlement_run", {
    p_restaurant_pk: body.restaurantPk,
    p_period_start_at: period.startAt,
    p_period_end_at: period.endAt,
    p_actor_profile_pk: actorProfilePk,
    p_note_text: "Draft refreshed by settlement-run-worker. Manual finance review is still required.",
  });

  if (error) {
    safeLog("settlement_worker_draft_failed", { code: error.code, message: error.message });
    return jsonResponse({ ok: false, error: "Settlement draft refresh failed.", livePayoutsEnabled: false }, 500);
  }

  const row = Array.isArray(data) ? data[0] : null;
  return jsonResponse({
    ok: true,
    mode: "draft",
    settlementRunPk: row?.settlement_run_pk ?? null,
    settlementStatusCode: row?.settlement_status_code ?? null,
    orderCount: row?.order_count ?? 0,
    livePayoutsEnabled: false,
    message: "Draft refreshed. No Razorpay transfer, payout, refund, order, payment, pickup, or notification mutation was initiated.",
  });
});
