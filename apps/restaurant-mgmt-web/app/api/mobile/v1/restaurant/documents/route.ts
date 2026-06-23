import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import {
  restaurantDocumentUploadRequestSchema,
  type DocumentUploadTicket,
  type RestaurantDocumentsData,
} from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { createPrivateDocumentPath, privateDocumentBucket } from "@/lib/portal-auth";

type DocRow = {
  restaurant_document_pk: string;
  document_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  master_document_type: { type_code: string; type_name: string | null } | { type_code: string; type_name: string | null }[] | null;
  master_document_status: { status_code: string } | { status_code: string }[] | null;
  storage_object: { original_filename: string | null; mime_type: string | null } | { original_filename: string | null; mime_type: string | null }[] | null;
};

function first<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/**
 * Restaurant compliance documents (Slice 12). Gated by `manageCompliance`
 * (OWNER/ADMIN). The role wrapper authorizes + scopes to `restaurantPk`, so reads
 * are tenant-isolated. GET returns metadata only (no bytes, no signed URLs). POST
 * mirrors the web `documents/sign-upload`: it returns a short-lived signed-upload
 * ticket for the non-public `private-documents` bucket and records the document as
 * PENDING_REVIEW.
 */
export const GET = withMobileRestaurantRole("manageCompliance", async ({ restaurantPk, requestId }) => {
  const service = createServiceRoleSupabaseClient();
  const { data, error } = await service
    .from("restaurant_document")
    .select(
      "restaurant_document_pk,document_number,issued_at,expires_at,rejection_reason,created_at," +
        "master_document_type(type_code,type_name),master_document_status(status_code)," +
        "storage_object(original_filename,mime_type)",
    )
    .eq("restaurant_fk", restaurantPk)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("mobile_documents_list_failed", { requestId, message: error.message });
    return mobileResponseErr("SERVER_ERROR", "Could not load your documents.", requestId);
  }

  const documents = ((data ?? []) as DocRow[]).map((row) => {
    const type = first(row.master_document_type);
    const status = first(row.master_document_status);
    const obj = first(row.storage_object);
    return {
      documentPk: row.restaurant_document_pk,
      documentTypeCode: type?.type_code ?? "UNKNOWN",
      documentTypeName: type?.type_name ?? null,
      statusCode: status?.status_code ?? "PENDING_REVIEW",
      documentNumber: row.document_number,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      rejectionReason: row.rejection_reason,
      originalFilename: obj?.original_filename ?? null,
      mimeType: obj?.mime_type ?? null,
      uploadedAt: row.created_at,
    };
  });

  return mobileResponseOk({ documents } satisfies RestaurantDocumentsData, requestId);
});

export const POST = withMobileRestaurantRole("manageCompliance", async ({ req, restaurantPk, actor, requestId }) => {
  const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = restaurantDocumentUploadRequestSchema.safeParse(json);
  if (!parsed.success) {
    return mobileResponseErr("VALIDATION", "Check the document file and try again.", requestId);
  }
  // The role wrapper already authorized restaurantPk; reject a mismatched body.
  if (parsed.data.restaurantPk !== restaurantPk) {
    return mobileResponseErr("FORBIDDEN", "This document does not belong to the selected restaurant.", requestId);
  }

  const service = createServiceRoleSupabaseClient();
  const [typeResult, statusResult, visibilityResult] = await Promise.all([
    service.from("master_document_type").select("master_document_type_pk").eq("type_code", parsed.data.documentTypeCode).single(),
    service.from("master_document_status").select("master_document_status_pk").eq("status_code", "PENDING_REVIEW").single(),
    service.from("master_storage_visibility").select("master_storage_visibility_pk").eq("visibility_code", "SERVICE_ONLY").single(),
  ]);
  if (typeResult.error || statusResult.error || visibilityResult.error) {
    return mobileResponseErr("SERVER_ERROR", "Document reference data is not ready.", requestId);
  }

  const objectPath = createPrivateDocumentPath(restaurantPk, parsed.data.documentTypeCode, parsed.data.fileName);
  const { data: signedUpload, error: uploadError } = await service.storage
    .from(privateDocumentBucket)
    .createSignedUploadUrl(objectPath);
  if (uploadError || !signedUpload) {
    return mobileResponseErr("SERVER_ERROR", "Could not prepare the private document upload.", requestId);
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
    return mobileResponseErr("SERVER_ERROR", "Could not track private document metadata.", requestId);
  }

  const { data: document, error: documentError } = await service
    .from("restaurant_document")
    .insert({
      restaurant_fk: restaurantPk,
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
    return mobileResponseErr("SERVER_ERROR", "Could not record the document for review.", requestId);
  }

  // Advance the onboarding task if present (best-effort, mirrors web).
  await service
    .from("restaurant_onboarding_task")
    .update({ task_status_code: "IN_PROGRESS", updated_at: new Date().toISOString() })
    .eq("restaurant_fk", restaurantPk)
    .eq("task_code", "DOCUMENT_UPLOAD");

  return mobileResponseOk(
    {
      documentPk: document.restaurant_document_pk,
      bucket: privateDocumentBucket,
      path: signedUpload.path,
      token: signedUpload.token,
    } satisfies DocumentUploadTicket,
    requestId,
  );
});
