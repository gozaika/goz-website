import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import type { NextRequest } from "next/server";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";

/**
 * Short-lived signed download link for one settlement invoice PDF (Slice 15).
 * Gated by `viewFinance`; the invoice must belong to the authorized `restaurantPk`
 * (cross-tenant denied). The URL expires in 5 minutes and is never persisted.
 */
function makeHandler(invoiceId: string) {
  return withMobileRestaurantRole("viewFinance", async ({ restaurantPk, requestId }) => {
    const service = createServiceRoleSupabaseClient();
    const { data: invoice } = await service
      .from("finance_invoice")
      .select("restaurant_fk,invoice_number,storage_object(bucket_name,object_path)")
      .eq("finance_invoice_pk", invoiceId)
      .maybeSingle();

    if (!invoice?.restaurant_fk) {
      return mobileResponseErr("NOT_FOUND", "Invoice was not found.", requestId);
    }
    if (invoice.restaurant_fk !== restaurantPk) {
      return mobileResponseErr("FORBIDDEN", "You do not have access to this invoice.", requestId);
    }
    const storageObject = Array.isArray(invoice.storage_object) ? invoice.storage_object[0] : invoice.storage_object;
    if (!storageObject) {
      return mobileResponseErr("NOT_FOUND", "This invoice document isn't available to download yet.", requestId);
    }

    const { data, error } = await service.storage
      .from(storageObject.bucket_name)
      .createSignedUrl(storageObject.object_path, 60 * 5);
    if (error || !data) {
      return mobileResponseErr("SERVER_ERROR", "Could not create an invoice download link.", requestId);
    }
    return mobileResponseOk({ signedUrl: data.signedUrl, invoiceNumber: (invoice as { invoice_number: string }).invoice_number }, requestId);
  });
}

export async function GET(req: NextRequest, context: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await context.params;
  return makeHandler(invoiceId)(req);
}
