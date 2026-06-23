import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { NextRequest } from "next/server";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";

/**
 * Short-lived signed download link for one private compliance document (Slice 12).
 * Gated by `manageCompliance`; the document must belong to the authorized
 * `restaurantPk` (cross-tenant access denied even with the capability). The URL
 * expires in 5 minutes and is never persisted; the client opens it on demand and
 * keeps no local copy.
 */
function makeHandler(documentId: string) {
  return withMobileRestaurantRole("manageCompliance", async ({ restaurantPk, requestId }) => {
    const service = createServiceRoleSupabaseClient();
    const { data: document } = await service
      .from("restaurant_document")
      .select("restaurant_fk,storage_object(bucket_name,object_path)")
      .eq("restaurant_document_pk", documentId)
      .maybeSingle();

    if (!document?.restaurant_fk || !document.storage_object) {
      return mobileResponseErr("NOT_FOUND", "Document was not found.", requestId);
    }
    if (document.restaurant_fk !== restaurantPk) {
      return mobileResponseErr("FORBIDDEN", "You do not have access to this document.", requestId);
    }

    const storageObject = Array.isArray(document.storage_object) ? document.storage_object[0] : document.storage_object;
    if (!storageObject) {
      return mobileResponseErr("NOT_FOUND", "Document storage metadata was not found.", requestId);
    }

    const { data, error } = await service.storage
      .from(storageObject.bucket_name)
      .createSignedUrl(storageObject.object_path, 60 * 5);
    if (error || !data) {
      return mobileResponseErr("SERVER_ERROR", "Could not create a private document link.", requestId);
    }

    return mobileResponseOk({ signedUrl: data.signedUrl }, requestId);
  });
}

export async function GET(req: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params;
  return makeHandler(documentId)(req);
}
