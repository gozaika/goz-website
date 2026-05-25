import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { orderIncidentCreateSchema, type ApiResponse, type OrderIncidentSummary } from "@gozaika/types";
import { NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal-auth";
import { pickupRpcErrorMessage } from "@/lib/pickup-verification";
import { loadActiveRestaurantsForProfile } from "@/lib/slice3";

type IncidentRpcRow = {
  readonly incident_pk: string;
  readonly order_pk: string;
  readonly order_number: string;
  readonly type_code: OrderIncidentSummary["typeCode"];
  readonly severity_code: OrderIncidentSummary["severityCode"];
  readonly status_code: OrderIncidentSummary["statusCode"];
  readonly title_text: string;
  readonly created_at: string;
};

type OrderRestaurantRow = {
  readonly restaurant_fk: string;
};

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
  }

  const { orderId } = await params;
  const service = createServiceRoleSupabaseClient();
  const { data: order, error: orderError } = await service
    .from("order_order")
    .select("restaurant_fk")
    .eq("order_order_pk", orderId)
    .maybeSingle<OrderRestaurantRow>();

  if (orderError) {
    console.error("incident_order_tenant_lookup_failed", orderError.message);
    return NextResponse.json(
      { ok: false, error: "Could not check this order. Please try again." } satisfies ApiResponse,
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." } satisfies ApiResponse, { status: 404 });
  }

  const restaurants = await loadActiveRestaurantsForProfile(actor.profilePk);
  const restaurant = restaurants.find((activeRestaurant) => activeRestaurant.restaurantPk === order.restaurant_fk);
  if (!restaurant) {
    return NextResponse.json(
      { ok: false, error: "This order belongs to another restaurant." } satisfies ApiResponse,
      { status: 403 },
    );
  }

  const parsed = orderIncidentCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Review the incident details." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const { data, error } = await service.rpc("api_create_order_incident", {
    p_order_pk: orderId,
    p_restaurant_pk: restaurant.restaurantPk,
    p_actor_profile_pk: actor.profilePk,
    p_type_code: parsed.data.typeCode,
    p_severity_code: parsed.data.severityCode,
    p_description_text: parsed.data.descriptionText,
    p_internal_note_text: parsed.data.internalNoteText ?? null,
    p_source_code: "RESTAURANT_PORTAL",
  });

  if (error) {
    const mapped = pickupRpcErrorMessage(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data) ? (data[0] as IncidentRpcRow | undefined) : undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Incident was not created." } satisfies ApiResponse, { status: 500 });
  }

  if (row.severity_code === "P1" || row.severity_code === "P2") {
    const { error: enqueueError } = await service.rpc("api_enqueue_incident_alerts", {
      p_incident_pk: row.incident_pk,
    });
    if (enqueueError) {
      console.error("incident_notification_enqueue_failed", { incidentPk: row.incident_pk });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        incidentPk: row.incident_pk,
        orderPk: row.order_pk,
        orderNumber: row.order_number,
        restaurantPk: restaurant.restaurantPk,
        restaurantName: restaurant.restaurantName,
        typeCode: row.type_code,
        typeName: row.type_code.replaceAll("_", " "),
        severityCode: row.severity_code,
        statusCode: row.status_code,
        titleText: row.title_text,
        descriptionText: parsed.data.descriptionText,
        reportedByProfilePk: actor.profilePk,
        occurredAt: row.created_at,
        createdAt: row.created_at,
        updatedAt: row.created_at,
      },
    } satisfies ApiResponse<OrderIncidentSummary>,
    { status: 201 },
  );
}
