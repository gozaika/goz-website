import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { orderIncidentCreateSchema, type IncidentCreatedDto } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadOrderRestaurantFk, mobileRpcError } from "@/lib/mobile/counter";

type IncidentRpcRow = {
  readonly incident_pk: string;
  readonly order_pk: string;
  readonly order_number: string;
  readonly type_code: IncidentCreatedDto["typeCode"];
  readonly severity_code: IncidentCreatedDto["severityCode"];
  readonly status_code: IncidentCreatedDto["statusCode"];
  readonly title_text: string;
  readonly created_at: string;
};

/**
 * Log an order-linked incident (Slice 7). Role-gated by `manageIncidents`,
 * tenant-checked. P1/P2 incidents enqueue alerts (best-effort, mirrors the web
 * portal). Server-authoritative via `api_create_order_incident`.
 */
export async function POST(req: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;

  return withMobileRestaurantRole("manageIncidents", async ({ actor, restaurantPk, requestId }) => {
    const service = createServiceRoleSupabaseClient();

    const ownerRestaurantPk = await loadOrderRestaurantFk(service, orderId);
    if (!ownerRestaurantPk) {
      return mobileResponseErr("NOT_FOUND", "Order not found.", requestId);
    }
    if (ownerRestaurantPk !== restaurantPk) {
      return mobileResponseErr("FORBIDDEN", "This order belongs to another restaurant.", requestId);
    }

    const parsed = orderIncidentCreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return mobileResponseErr("VALIDATION", parsed.error.issues[0]?.message ?? "Review the incident details.", requestId, {
        fieldErrors: parsed.error.issues.map((issue) => ({ field: String(issue.path[0] ?? "descriptionText"), message: issue.message })),
      });
    }

    const { data, error } = await service.rpc("api_create_order_incident", {
      p_order_pk: orderId,
      p_restaurant_pk: restaurantPk,
      p_actor_profile_pk: actor.profilePk,
      p_type_code: parsed.data.typeCode,
      p_severity_code: parsed.data.severityCode,
      p_description_text: parsed.data.descriptionText,
      p_internal_note_text: parsed.data.internalNoteText ?? null,
      p_source_code: "RESTAURANT_MOBILE",
    });

    if (error) {
      const mapped = mobileRpcError(error.message);
      return mobileResponseErr(mapped.code, mapped.message, requestId);
    }

    const row = Array.isArray(data) ? (data[0] as IncidentRpcRow | undefined) : undefined;
    if (!row) {
      return mobileResponseErr("SERVER_ERROR", "Incident was not created.", requestId);
    }

    if (row.severity_code === "P1" || row.severity_code === "P2") {
      const { error: enqueueError } = await service.rpc("api_enqueue_incident_alerts", { p_incident_pk: row.incident_pk });
      if (enqueueError) {
        console.error("mobile_incident_notification_enqueue_failed", { requestId, incidentPk: row.incident_pk });
      }
    }

    const result: IncidentCreatedDto = {
      incidentPk: row.incident_pk,
      orderPk: row.order_pk,
      orderNumber: row.order_number,
      typeCode: row.type_code,
      severityCode: row.severity_code,
      statusCode: row.status_code,
      titleText: row.title_text,
      createdAt: row.created_at,
    };
    return mobileResponseOk(result, requestId);
  })(req);
}
