import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { dropStatusActionRequestSchema, type DropStatusActionResult } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadRestaurantOpsGuardrails } from "@/lib/slice3";

const TERMINAL_DROP_STATUSES = ["SOLD_OUT", "PICKUP_CLOSED", "EMERGENCY_CLOSED", "CANCELLED"] as const;

type DropStatusRow = {
  readonly drop_drop_pk: string;
  readonly restaurant_fk: string;
  readonly drop_title: string;
  readonly drop_status_code: string;
  readonly published_at: string | null;
};

function statusMessage(nextStatusCode: DropStatusActionResult["statusCode"]): string {
  switch (nextStatusCode) {
    case "ACTIVE":
      return "Drop activated. Claims follow the current publishing guardrails.";
    case "SCHEDULED":
      return "Drop moved back to scheduled.";
    case "PAUSED":
      return "Drop paused. Paid orders were not changed.";
    case "CANCELLED":
      return "Drop cancelled. Paid orders were not changed.";
    default:
      return "Drop status updated.";
  }
}

export async function POST(req: Request, { params }: { readonly params: Promise<{ readonly dropId: string }> }) {
  const { dropId } = await params;

  return withMobileRestaurantRole("manageDrops", async ({ actor, membership, restaurantPk, requestId }) => {
    const parsed = dropStatusActionRequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return mobileResponseErr("VALIDATION", parsed.error.issues[0]?.message ?? "Review the status change.", requestId, {
        fieldErrors: parsed.error.issues.map((issue) => ({ field: String(issue.path[0] ?? "nextStatusCode"), message: issue.message })),
      });
    }

    const nextStatusCode = parsed.data.nextStatusCode;
    if (["ACTIVE", "SCHEDULED"].includes(nextStatusCode)) {
      if (membership.restaurantStatusCode !== "ACTIVE") {
        return mobileResponseErr("FORBIDDEN", "goZaika ops must reactivate this restaurant before drops can be resumed.", requestId);
      }
      const guardrails = await loadRestaurantOpsGuardrails(restaurantPk);
      if (!guardrails.publishingEnabled) {
        return mobileResponseErr("FORBIDDEN", "Publishing is paused by goZaika ops for this restaurant or pilot.", requestId);
      }
    }

    const service = createServiceRoleSupabaseClient();
    const { data: current, error: loadError } = await service
      .from("drop_drop")
      .select("drop_drop_pk,restaurant_fk,drop_title,drop_status_code,published_at")
      .eq("drop_drop_pk", dropId)
      .eq("restaurant_fk", restaurantPk)
      .maybeSingle<DropStatusRow>();

    if (loadError) {
      console.error("mobile_drop_status_load_failed", { requestId, message: loadError.message });
      return mobileResponseErr("SERVER_ERROR", "Could not check this drop.", requestId);
    }
    if (!current) {
      return mobileResponseErr("NOT_FOUND", "Drop not found.", requestId);
    }
    if (TERMINAL_DROP_STATUSES.includes(current.drop_status_code as (typeof TERMINAL_DROP_STATUSES)[number])) {
      return mobileResponseErr("CONFLICT", "Closed, sold-out, cancelled, or emergency-closed drops cannot be changed.", requestId);
    }

    const now = new Date().toISOString();
    if (current.drop_status_code !== nextStatusCode) {
      const updatePayload: Record<string, string | null> = {
        drop_status_code: nextStatusCode,
        updated_at: now,
      };
      if (nextStatusCode === "ACTIVE" || nextStatusCode === "SCHEDULED") {
        updatePayload.published_by_profile_fk = actor.profilePk;
      }
      if (nextStatusCode === "ACTIVE" && !current.published_at) {
        updatePayload.published_at = now;
      }
      if (nextStatusCode === "CANCELLED") {
        updatePayload.cancelled_at = now;
        updatePayload.cancelled_by_profile_fk = actor.profilePk;
        updatePayload.cancelled_reason_text = parsed.data.reasonText;
      }

      const { error: updateError } = await service
        .from("drop_drop")
        .update(updatePayload)
        .eq("drop_drop_pk", dropId)
        .eq("restaurant_fk", restaurantPk);

      if (updateError) {
        console.error("mobile_drop_status_update_failed", { requestId, message: updateError.message });
        return mobileResponseErr("SERVER_ERROR", "Could not update this drop.", requestId);
      }

      const eventReason = `Partner mobile status ${current.drop_status_code} -> ${nextStatusCode}: ${parsed.data.reasonText}`;
      const { error: eventError } = await service.from("drop_inventory_event").insert({
        drop_fk: dropId,
        event_type_code: nextStatusCode === "CANCELLED" ? "DROP_CLOSED" : "MANUAL_ADJUSTMENT",
        quantity_delta: 0,
        reason_text: eventReason,
        actor_profile_fk: actor.profilePk,
      });
      if (eventError) {
        console.error("mobile_drop_status_event_failed", { requestId, message: eventError.message });
      }

      const { error: auditError } = await service.from("audit_log").insert({
        actor_profile_fk: actor.profilePk,
        actor_role_code: membership.roleCode,
        action_code: `DROP_${nextStatusCode}`,
        target_entity_type_code: "DROP",
        target_entity_pk: dropId,
        audit_payload_json: {
          before: { drop_status_code: current.drop_status_code },
          after: { drop_status_code: nextStatusCode },
          reason: parsed.data.reasonText,
          source: "restaurant-mobile",
          historical_orders_untouched: true,
        },
      });
      if (auditError) {
        console.error("mobile_drop_status_audit_failed", { requestId, message: auditError.message });
      }
    }

    return mobileResponseOk(
      {
        dropPk: dropId,
        statusCode: nextStatusCode,
        message: current.drop_status_code === nextStatusCode ? `Drop is already ${nextStatusCode.toLowerCase()}.` : statusMessage(nextStatusCode),
      } satisfies DropStatusActionResult,
      requestId,
    );
  })(req);
}
