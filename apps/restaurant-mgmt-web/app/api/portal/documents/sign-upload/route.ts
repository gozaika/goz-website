import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { restaurantDocumentUploadRequestSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import {
  assertRestaurantAccess,
  createPrivateDocumentPath,
  getPortalActor,
  privateDocumentBucket,
} from "@/lib/portal-auth";

export async function POST(request: Request) {
  const actor = await getPortalActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = restaurantDocumentUploadRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the document file and try again." }, { status: 400 });
  }

  const allowed = await assertRestaurantAccess(parsed.data.restaurantPk, actor.profilePk);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "You do not have access to this restaurant." }, { status: 403 });
  }

  const service = createServiceRoleSupabaseClient();
  const [typeResult, statusResult, visibilityResult] = await Promise.all([
    service
      .from("master_document_type")
      .select("master_document_type_pk")
      .eq("type_code", parsed.data.documentTypeCode)
      .single(),
    service.from("master_document_status").select("master_document_status_pk").eq("status_code", "PENDING_REVIEW").single(),
    service.from("master_storage_visibility").select("master_storage_visibility_pk").eq("visibility_code", "SERVICE_ONLY").single(),
  ]);

  if (typeResult.error || statusResult.error || visibilityResult.error) {
    return NextResponse.json({ ok: false, error: "Document reference data is not ready." }, { status: 500 });
  }

  const objectPath = createPrivateDocumentPath(parsed.data.restaurantPk, parsed.data.documentTypeCode, parsed.data.fileName);
  const { data: signedUpload, error: uploadError } = await service.storage
    .from(privateDocumentBucket)
    .createSignedUploadUrl(objectPath);

  if (uploadError || !signedUpload) {
    return NextResponse.json({ ok: false, error: "Could not prepare private document upload." }, { status: 500 });
  }

  const { data: storageObject, error: storageError } = await service
    .from("storage_object")
    .insert({
      bucket_name: privateDocumentBucket,
      object_path: objectPath,
      original_filename: parsed.data.fileName,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.sizeBytes,
      master_storage_visibility_fk: visibilityResult.data.master_storage_visibility_pk,
      uploaded_by_profile_fk: actor.profilePk,
    })
    .select("storage_object_pk")
    .single();

  if (storageError || !storageObject) {
    return NextResponse.json({ ok: false, error: "Could not track private document metadata." }, { status: 500 });
  }

  const { data: document, error: documentError } = await service
    .from("restaurant_document")
    .insert({
      restaurant_fk: parsed.data.restaurantPk,
      master_document_type_fk: typeResult.data.master_document_type_pk,
      master_document_status_fk: statusResult.data.master_document_status_pk,
      storage_object_fk: storageObject.storage_object_pk,
      document_number: parsed.data.documentNumber ?? null,
      expires_at: parsed.data.expiresAt ?? null,
      uploaded_by_profile_fk: actor.profilePk,
    })
    .select("restaurant_document_pk")
    .single();

  if (documentError || !document) {
    return NextResponse.json({ ok: false, error: "Could not record document for review." }, { status: 500 });
  }

  await service
    .from("restaurant_onboarding_task")
    .update({ task_status_code: "IN_PROGRESS", updated_at: new Date().toISOString() })
    .eq("restaurant_fk", parsed.data.restaurantPk)
    .eq("task_code", "DOCUMENT_UPLOAD");

  return NextResponse.json({
    ok: true,
    data: {
      bucket: privateDocumentBucket,
      path: signedUpload.path,
      token: signedUpload.token,
      documentPk: document.restaurant_document_pk,
    },
  });
}
