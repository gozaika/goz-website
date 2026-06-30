import { createServiceRoleSupabaseClient, STORAGE_BUCKETS } from "@gozaika/supabase";
import { productMediaUploadRequestSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { assertRestaurantMediaAccess, getPortalActor } from "@/lib/portal-auth";
import { createMediaIngestPath, sanitizeOriginalFilename } from "@/lib/product-media";

export async function POST(request: Request) {
  const actor = await getPortalActor();
  if (!actor) return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });

  const parsed = productMediaUploadRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Check the image and try again." }, { status: 400 });
  }

  const input = parsed.data;
  if (!(await assertRestaurantMediaAccess(input.restaurantPk, actor.profilePk, input.targetCode))) {
    return NextResponse.json({ ok: false, error: "Your restaurant role cannot change this public image." }, { status: 403 });
  }

  const service = createServiceRoleSupabaseClient();
  if (input.targetCode === "DROP_PRIMARY") {
    const { data: drop } = await service
      .from("drop_drop")
      .select("drop_drop_pk")
      .eq("drop_drop_pk", input.dropPk)
      .eq("restaurant_fk", input.restaurantPk)
      .maybeSingle();
    if (!drop) return NextResponse.json({ ok: false, error: "This drop does not belong to the selected restaurant." }, { status: 403 });
  }
  if (input.targetCode === "TEMPLATE_PRIMARY") {
    const { data: revision } = await service
      .from("catalog_bag_template_revision")
      .select("catalog_bag_template_fk")
      .eq("catalog_bag_template_revision_pk", input.templateRevisionPk)
      .maybeSingle();
    const { data: template } = revision?.catalog_bag_template_fk
      ? await service
          .from("catalog_bag_template")
          .select("restaurant_fk")
          .eq("catalog_bag_template_pk", revision.catalog_bag_template_fk)
          .maybeSingle()
      : { data: null };
    if (!template || template.restaurant_fk !== input.restaurantPk) {
      return NextResponse.json({ ok: false, error: "This template does not belong to the selected restaurant." }, { status: 403 });
    }
  }

  const objectPath = createMediaIngestPath(input.restaurantPk, input.mimeType);
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const { data: session, error: sessionError } = await service
    .from("media_upload_session")
    .insert({
      restaurant_fk: input.restaurantPk,
      drop_fk: input.dropPk ?? null,
      catalog_bag_template_revision_fk: input.templateRevisionPk ?? null,
      target_code: input.targetCode,
      ingest_bucket_name: STORAGE_BUCKETS.mediaIngest,
      ingest_object_path: objectPath,
      original_filename: sanitizeOriginalFilename(input.fileName),
      declared_mime_type: input.mimeType,
      declared_size_bytes: input.sizeBytes,
      alt_text: input.altText,
      upload_status_code: "PENDING_UPLOAD",
      created_by_profile_fk: actor.profilePk,
      expires_at: expiresAt,
    })
    .select("media_upload_session_pk")
    .single();

  if (sessionError || !session) {
    console.error("product_media_session_create_failed", { code: sessionError?.code, restaurantPk: input.restaurantPk, targetCode: input.targetCode });
    return NextResponse.json({ ok: false, error: "Could not prepare this image upload." }, { status: 500 });
  }

  const { data: signedUpload, error: signedError } = await service.storage
    .from(STORAGE_BUCKETS.mediaIngest)
    .createSignedUploadUrl(objectPath);
  if (signedError || !signedUpload) {
    await service
      .from("media_upload_session")
      .update({ upload_status_code: "FAILED", failure_reason_code: "SIGNING_FAILED", updated_at: new Date().toISOString() })
      .eq("media_upload_session_pk", session.media_upload_session_pk);
    console.error("product_media_sign_failed", { message: signedError?.message, uploadPk: session.media_upload_session_pk });
    return NextResponse.json({ ok: false, error: "Could not prepare this image upload." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      uploadPk: session.media_upload_session_pk,
      bucket: STORAGE_BUCKETS.mediaIngest,
      path: signedUpload.path,
      token: signedUpload.token,
      expiresAt,
    },
  });
}
