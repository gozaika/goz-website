import { createServiceRoleSupabaseClient, STORAGE_BUCKETS } from "@gozaika/supabase";
import { productMediaCompleteRequestSchema, type ProductMediaTargetCode } from "@gozaika/types";
import { NextResponse } from "next/server";
import { assertRestaurantMediaAccess, getPortalActor } from "@/lib/portal-auth";
import { createPublicMediaPath, toPublicMediaAsset, verifyAndRenderProductMedia } from "@/lib/product-media";

type UploadSession = {
  readonly media_upload_session_pk: string;
  readonly restaurant_fk: string;
  readonly drop_fk: string | null;
  readonly target_code: ProductMediaTargetCode;
  readonly ingest_bucket_name: string;
  readonly ingest_object_path: string;
  readonly original_filename: string;
  readonly declared_mime_type: string;
  readonly declared_size_bytes: number | string;
  readonly alt_text: string;
  readonly upload_status_code: string;
  readonly completed_storage_object_fk: string | null;
  readonly created_by_profile_fk: string;
  readonly expires_at: string;
};

function mediaErrorStatus(error: unknown): number {
  const code = error instanceof Error ? error.message : "";
  return [
    "INVALID_MEDIA_SIZE",
    "UNSUPPORTED_OR_INVALID_IMAGE",
    "IMAGE_DIMENSIONS_TOO_LARGE",
    "IMAGE_DIMENSIONS_TOO_SMALL",
    "DECLARED_MEDIA_MISMATCH",
  ].includes(code)
    ? 400
    : 500;
}

function mediaErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "IMAGE_DIMENSIONS_TOO_SMALL") return "This image is too small for a crisp public rendition.";
  if (code === "IMAGE_DIMENSIONS_TOO_LARGE") return "This image has too many pixels to process safely.";
  if (["UNSUPPORTED_OR_INVALID_IMAGE", "DECLARED_MEDIA_MISMATCH"].includes(code)) return "The uploaded bytes do not match a supported JPEG, PNG, or WebP image.";
  if (code === "INVALID_MEDIA_SIZE") return "The uploaded image must be no larger than 8 MB.";
  return "Could not finish processing this image.";
}

export async function POST(request: Request) {
  const actor = await getPortalActor();
  if (!actor) return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });

  const parsed = productMediaCompleteRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "A valid upload identifier is required." }, { status: 400 });

  const service = createServiceRoleSupabaseClient();
  const { data: rawSession, error: loadError } = await service
    .from("media_upload_session")
    .select("*")
    .eq("media_upload_session_pk", parsed.data.uploadPk)
    .eq("created_by_profile_fk", actor.profilePk)
    .maybeSingle();
  const session = rawSession as UploadSession | null;
  if (loadError || !session) return NextResponse.json({ ok: false, error: "Upload session not found." }, { status: 404 });
  const targetCode = session.target_code;

  if (!(await assertRestaurantMediaAccess(session.restaurant_fk, actor.profilePk, session.target_code))) {
    return NextResponse.json({ ok: false, error: "Your restaurant role can no longer change this public image." }, { status: 403 });
  }

  async function completedResult(storageObjectPk: string) {
    const { data: object } = await service
      .from("storage_object")
      .select("storage_object_pk,bucket_name,object_path,width_px,height_px,alt_text")
      .eq("storage_object_pk", storageObjectPk)
      .maybeSingle();
    const media = object
      ? toPublicMediaAsset({
          bucketName: object.bucket_name,
          objectPath: object.object_path,
          width: object.width_px,
          height: object.height_px,
          altText: object.alt_text,
        })
      : null;
    return object && media
      ? { storageObjectPk: object.storage_object_pk, targetCode, media }
      : null;
  }

  if (session.upload_status_code === "COMPLETED" && session.completed_storage_object_fk) {
    const existing = await completedResult(session.completed_storage_object_fk);
    if (existing) return NextResponse.json({ ok: true, data: existing });
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await service
      .from("media_upload_session")
      .update({ upload_status_code: "EXPIRED", failure_reason_code: "SESSION_EXPIRED", updated_at: new Date().toISOString() })
      .eq("media_upload_session_pk", session.media_upload_session_pk);
    return NextResponse.json({ ok: false, error: "This upload session expired. Choose the image again." }, { status: 410 });
  }

  const { data: claimed } = await service
    .from("media_upload_session")
    .update({ upload_status_code: "PROCESSING", failure_reason_code: null, updated_at: new Date().toISOString() })
    .eq("media_upload_session_pk", session.media_upload_session_pk)
    .eq("upload_status_code", "PENDING_UPLOAD")
    .select("media_upload_session_pk")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ ok: false, error: "This upload is already being processed or cannot be retried." }, { status: 409 });

  let publicPath: string | null = null;
  let storageObjectPk: string | null = null;
  let attached = false;
  try {
    const { data: blob, error: downloadError } = await service.storage
      .from(session.ingest_bucket_name)
      .download(session.ingest_object_path);
    if (downloadError || !blob) throw new Error("INGEST_OBJECT_MISSING");
    const source = await blob.arrayBuffer();
    if (source.byteLength !== Number(session.declared_size_bytes)) throw new Error("DECLARED_MEDIA_MISMATCH");

    const rendered = await verifyAndRenderProductMedia(source, session.target_code);
    if (rendered.sourceMimeType !== session.declared_mime_type) throw new Error("DECLARED_MEDIA_MISMATCH");

    publicPath = createPublicMediaPath(session.restaurant_fk, session.target_code, session.drop_fk);
    const { error: publicUploadError } = await service.storage.from(STORAGE_BUCKETS.publicMedia).upload(publicPath, rendered.bytes, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });
    if (publicUploadError) throw new Error("PUBLIC_RENDITION_UPLOAD_FAILED");

    const { data: visibility } = await service
      .from("master_storage_visibility")
      .select("master_storage_visibility_pk")
      .eq("visibility_code", "PUBLIC_CDN")
      .single();
    if (!visibility) throw new Error("PUBLIC_VISIBILITY_NOT_CONFIGURED");

    const { data: object, error: objectError } = await service
      .from("storage_object")
      .insert({
        bucket_name: STORAGE_BUCKETS.publicMedia,
        object_path: publicPath,
        original_filename: session.original_filename,
        mime_type: "image/webp",
        size_bytes: rendered.bytes.byteLength,
        checksum_sha256_hex: rendered.sha256,
        master_storage_visibility_fk: visibility.master_storage_visibility_pk,
        uploaded_by_profile_fk: actor.profilePk,
        width_px: rendered.width,
        height_px: rendered.height,
        alt_text: session.alt_text,
        media_status_code: "READY",
      })
      .select("storage_object_pk")
      .single();
    if (objectError || !object) throw new Error("MEDIA_METADATA_CREATE_FAILED");
    storageObjectPk = object.storage_object_pk;

    let previousStorageObjectPk: string | null = null;
    if (session.target_code === "DROP_PRIMARY") {
      const { data: existing } = await service
        .from("drop_media")
        .select("drop_media_pk,storage_object_fk")
        .eq("drop_fk", session.drop_fk)
        .eq("media_role_code", "PRIMARY")
        .maybeSingle();
      previousStorageObjectPk = existing?.storage_object_fk ?? null;
      const mutation = existing
        ? service
            .from("drop_media")
            .update({ storage_object_fk: storageObjectPk, updated_at: new Date().toISOString() })
            .eq("drop_media_pk", existing.drop_media_pk)
        : service.from("drop_media").insert({
            drop_fk: session.drop_fk,
            storage_object_fk: storageObjectPk,
            media_role_code: "PRIMARY",
            display_order: 0,
          });
      const { error } = await mutation;
      if (error) throw new Error("MEDIA_ATTACH_FAILED");
    } else {
      const { data: profile } = await service
        .from("restaurant_public_profile")
        .select("hero_storage_object_fk,logo_storage_object_fk")
        .eq("restaurant_fk", session.restaurant_fk)
        .maybeSingle();
      previousStorageObjectPk =
        session.target_code === "RESTAURANT_HERO"
          ? (profile?.hero_storage_object_fk ?? null)
          : (profile?.logo_storage_object_fk ?? null);
      const field = session.target_code === "RESTAURANT_HERO" ? "hero_storage_object_fk" : "logo_storage_object_fk";
      const { error } = await service.from("restaurant_public_profile").upsert(
        { restaurant_fk: session.restaurant_fk, [field]: storageObjectPk, updated_at: new Date().toISOString() },
        { onConflict: "restaurant_fk" },
      );
      if (error) throw new Error("MEDIA_ATTACH_FAILED");
    }
    attached = true;

    // Keep the detached object READY until a retention job proves that no
    // profile, drop, immutable template revision, review, or CMS row references
    // it. A shared storage object must never be invalidated during replacement.
    void previousStorageObjectPk;

    const completedAt = new Date().toISOString();
    const { error: completeError } = await service
      .from("media_upload_session")
      .update({
        upload_status_code: "COMPLETED",
        completed_storage_object_fk: storageObjectPk,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("media_upload_session_pk", session.media_upload_session_pk);
    if (completeError) console.error("product_media_session_complete_write_failed", { uploadPk: session.media_upload_session_pk, storageObjectPk });

    await service.storage.from(session.ingest_bucket_name).remove([session.ingest_object_path]);
    console.info("product_media_completed", {
      uploadPk: session.media_upload_session_pk,
      restaurantPk: session.restaurant_fk,
      targetCode: session.target_code,
      sourceMimeType: rendered.sourceMimeType,
      sourceBytes: source.byteLength,
      sourceWidth: rendered.sourceWidth,
      sourceHeight: rendered.sourceHeight,
      outputBytes: rendered.bytes.byteLength,
      outputWidth: rendered.width,
      outputHeight: rendered.height,
    });

    if (!storageObjectPk) throw new Error("PUBLIC_MEDIA_RESULT_FAILED");
    const result = await completedResult(storageObjectPk);
    if (!result) throw new Error("PUBLIC_MEDIA_RESULT_FAILED");
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const failureCode = error instanceof Error ? error.message.slice(0, 80) : "UNKNOWN_FAILURE";
    if (!attached) {
      if (publicPath) await service.storage.from(STORAGE_BUCKETS.publicMedia).remove([publicPath]);
      if (storageObjectPk) {
        await service
          .from("storage_object")
          .update({ media_status_code: "DELETED", updated_at: new Date().toISOString() })
          .eq("storage_object_pk", storageObjectPk);
      }
      await service
        .from("media_upload_session")
        .update({ upload_status_code: "FAILED", failure_reason_code: failureCode, updated_at: new Date().toISOString() })
        .eq("media_upload_session_pk", session.media_upload_session_pk);
      await service.storage.from(session.ingest_bucket_name).remove([session.ingest_object_path]);
    }
    console.error("product_media_complete_failed", { uploadPk: session.media_upload_session_pk, failureCode, attached });
    return NextResponse.json({ ok: false, error: mediaErrorMessage(error) }, { status: mediaErrorStatus(error) });
  }
}
