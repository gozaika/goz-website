import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { assertRestaurantAccess, getPortalActor } from "@/lib/portal-auth";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const { documentId } = await context.params;
  const service = createServiceRoleSupabaseClient();
  const { data: document } = await service
    .from("restaurant_document")
    .select("restaurant_fk,storage_object(bucket_name,object_path)")
    .eq("restaurant_document_pk", documentId)
    .maybeSingle();

  if (!document?.restaurant_fk || !document.storage_object) {
    return NextResponse.json({ ok: false, error: "Document was not found." }, { status: 404 });
  }

  const allowed = await assertRestaurantAccess(document.restaurant_fk, actor.profilePk);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "You do not have access to this document." }, { status: 403 });
  }

  const storageObject = Array.isArray(document.storage_object) ? document.storage_object[0] : document.storage_object;
  if (!storageObject) {
    return NextResponse.json({ ok: false, error: "Document storage metadata was not found." }, { status: 404 });
  }

  const { data, error } = await service.storage
    .from(storageObject.bucket_name)
    .createSignedUrl(storageObject.object_path, 60 * 5);

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Could not create a private document link." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { signedUrl: data.signedUrl } });
}
