import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { orderIncidentCreateSchema, type ApiResponse, type OrderIncidentSummary } from "@gozaika/types";
import { NextResponse } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";

function mapRpcError(message: string): { readonly error: string; readonly status: number } {
  if (message.includes("order not found")) return { error: "Order not found.", status: 404 };
  if (message.includes("incident type invalid")) return { error: "Choose a valid incident type.", status: 400 };
  if (message.includes("description")) return { error: "Add a short incident description.", status: 400 };
  return { error: "Could not create incident.", status: 500 };
}

export async function POST(request: Request, { params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const actor = await requireAdminActor();
  if (actor instanceof NextResponse) return actor;

  const { orderId } = await params;
  const parsed = orderIncidentCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Review the incident details." } satisfies ApiResponse,
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabaseClient();
  const { data: order } = await service
    .from("order_order")
    .select("order_order_pk,order_number,restaurant_fk,snapshot_restaurant_name")
    .eq("order_order_pk", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." } satisfies ApiResponse, { status: 404 });
  }

  const { data, error } = await service.rpc("api_create_order_incident", {
    p_order_pk: orderId,
    p_restaurant_pk: order.restaurant_fk,
    p_actor_profile_pk: actor.profilePk,
    p_type_code: parsed.data.typeCode,
    p_severity_code: parsed.data.severityCode,
    p_description_text: parsed.data.descriptionText,
    p_internal_note_text: parsed.data.internalNoteText ?? null,
    p_source_code: "ADMIN_PORTAL",
  });

  if (error) {
    const mapped = mapRpcError(error.message);
    return NextResponse.json({ ok: false, error: mapped.error } satisfies ApiResponse, { status: mapped.status });
  }

  const row = Array.isArray(data)
    ? (data[0] as
        | {
            readonly incident_pk: string;
            readonly order_pk: string;
            readonly order_number: string;
            readonly type_code: OrderIncidentSummary["typeCode"];
            readonly severity_code: OrderIncidentSummary["severityCode"];
            readonly status_code: OrderIncidentSummary["statusCode"];
            readonly title_text: string;
            readonly created_at: string;
          }
        | undefined)
    : undefined;

  if (!row) {
    return NextResponse.json({ ok: false, error: "Incident was not created." } satisfies ApiResponse, { status: 500 });
  }

  if (row.severity_code === "P1" || row.severity_code === "P2") {
    const { error: enqueueError } = await service.rpc("api_enqueue_incident_alerts", {
      p_incident_pk: row.incident_pk,
    });
    if (enqueueError) {
      console.error("admin_incident_notification_enqueue_failed", { incidentPk: row.incident_pk });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        incidentPk: row.incident_pk,
        orderPk: row.order_pk,
        orderNumber: row.order_number,
        restaurantPk: order.restaurant_fk,
        restaurantName: order.snapshot_restaurant_name,
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
