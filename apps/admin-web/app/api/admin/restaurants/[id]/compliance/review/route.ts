import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { adminComplianceReviewSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-auth";

async function requiredDocumentsApproved(restaurantPk: string) {
  const service = createServiceRoleSupabaseClient();
  const { data: requiredTypes } = await service.from("master_document_type").select("master_document_type_pk").eq("is_required", true);
  const requiredIds = new Set((requiredTypes ?? []).map((type) => type.master_document_type_pk));

  const { data: docs } = await service
    .from("restaurant_document")
    .select("master_document_type_fk,master_document_status(status_code),created_at")
    .eq("restaurant_fk", restaurantPk)
    .order("created_at", { ascending: false });

  const latestByType = new Map<string, string>();
  for (const doc of docs ?? []) {
    if (!requiredIds.has(doc.master_document_type_fk) || latestByType.has(doc.master_document_type_fk)) continue;
    const status = Array.isArray(doc.master_document_status) ? doc.master_document_status[0] : doc.master_document_status;
    latestByType.set(doc.master_document_type_fk, status?.status_code ?? "");
  }

  return [...requiredIds].every((id) => latestByType.get(id) === "APPROVED");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Platform admin access is required." }, { status: 403 });
  }

  const { id } = await context.params;
  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = adminComplianceReviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check compliance review details." }, { status: 400 });
  }

  if (parsed.data.statusCode === "APPROVED") {
    const approved = await requiredDocumentsApproved(id);
    if (!approved) {
      return NextResponse.json({ ok: false, error: "Approve all required documents first." }, { status: 409 });
    }
  }

  const service = createServiceRoleSupabaseClient();
  const { error } = await service
    .from("restaurant_compliance")
    .update({
      compliance_status_code: parsed.data.statusCode,
      last_reviewed_by_profile_fk: actor.profilePk,
      last_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_fk", id);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not update compliance review." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
