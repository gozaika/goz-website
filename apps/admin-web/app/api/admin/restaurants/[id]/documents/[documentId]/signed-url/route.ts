import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-auth";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Platform admin access is required." }, { status: 403 });
  }

  const { documentId } = await context.params;
  const service = createServiceRoleSupabaseClient();
  const { data: document } = await service
    .from("restaurant_document")
    .select("storage_object(bucket_name,object_path)")
    .eq("restaurant_document_pk", documentId)
    .maybeSingle();

  const storageObject = Array.isArray(document?.storage_object) ? document?.storage_object[0] : document?.storage_object;
  if (!storageObject) {
    return NextResponse.json({ ok: false, error: "Document was not found." }, { status: 404 });
  }

  const { data, error } = await service.storage
    .from(storageObject.bucket_name)
    .createSignedUrl(storageObject.object_path, 60 * 5);

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Could not create a private document link." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { signedUrl: data.signedUrl } });
}
