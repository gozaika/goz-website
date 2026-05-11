import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { adminDocumentReviewSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Platform admin access is required." }, { status: 403 });
  }

  const { documentId } = await context.params;
  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = adminDocumentReviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check review status and reason." }, { status: 400 });
  }

  const service = createServiceRoleSupabaseClient();
  const { data: status } = await service
    .from("master_document_status")
    .select("master_document_status_pk")
    .eq("status_code", parsed.data.statusCode)
    .single();

  if (!status) {
    return NextResponse.json({ ok: false, error: "Document status reference data is missing." }, { status: 500 });
  }

  const { error } = await service
    .from("restaurant_document")
    .update({
      master_document_status_fk: status.master_document_status_pk,
      rejection_reason: parsed.data.statusCode === "REJECTED" ? parsed.data.rejectionReason : null,
      reviewed_by_profile_fk: actor.profilePk,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_document_pk", documentId);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not update document review." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
