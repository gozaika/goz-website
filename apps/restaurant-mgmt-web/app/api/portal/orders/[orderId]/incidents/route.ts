import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { orderIncidentCreateSchema, type ApiResponse, type OrderIncidentSummary } from "@gozaika/types";
import { NextResponse } from "next/server";
import { getPortalActor } from "@/lib/portal-auth";
import { pickupRpcErrorMessage } from "@/lib/pickup-verification";
import { loadDefaultRestaurant } from "@/lib/slice3";

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

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." } satisfies ApiResponse, { status: 401 });
  }

  const restaurant = await loadDefaultRestaurant(actor.profilePk);
  if (!restaurant || restaurant.restaurantStatusCode !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, error: "Restaurant access is required to log an incident." } satisfies ApiResponse,
      { status: 403 },
    );
  }

  const { orderId } = await params;
  const parsed = orderIncidentCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Review the incident details." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
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
