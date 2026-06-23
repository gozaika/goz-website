# Product media rollout

This runbook promotes the product-media pipeline described in
[`docs/product/product-media-pipeline.md`](../product/product-media-pipeline.md).
The pipeline is not live until the database migration and an end-to-end upload
have both been verified in the target environment.

## What is being deployed

- A private `media-ingest` bucket for short-lived browser uploads.
- A service-only `media_upload_session` authorization record.
- Server-side byte verification and normalized WebP rendition generation.
- Immutable files in `public-media`, with verified metadata in `storage_object`.
- Restaurant hero/logo and drop-primary attachment controls in the restaurant portal.
- Public read models that return only `READY` media and resolve drop media before
  the template fallback.

The ingest object is untrusted. It must never be rendered publicly or attached
directly to a product record.

## Pre-deployment gates

1. Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` are configured. The service-role key must remain
   server-only.
2. Run the focused tests:

   ```powershell
   npm.cmd --workspace @gozaika/restaurant-mgmt-web test -- --run lib/product-media.test.ts lib/product-media-policy.test.ts lib/product-media-migration.test.ts
   ```

3. Run production builds for both consumers of the read model:

   ```powershell
   npm.cmd --workspace @gozaika/consumer-web run build
   npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
   ```

4. Back up the target database according to the environment's normal release
   procedure.

## Apply and inspect the migration

For local development, start Supabase and reset the disposable database:

```powershell
supabase start
supabase db reset
```

For a shared environment, use the repository's controlled migration deployment
process. Do not substitute a local reset. Confirm migration
`20260622000000_product_media_pipeline.sql` is recorded as applied.

After application, verify:

- `media-ingest` exists with `public = false`, an 8 MiB limit, and only
  JPEG/PNG/WebP declared MIME types.
- authenticated/anonymous roles cannot access `media_upload_session`.
- `api_public_drop_card` and `api_public_restaurant_profile` can be selected by
  the expected public roles.
- existing drop and restaurant rows still appear in the views when no new media
  is attached.

## End-to-end smoke matrix

Use a non-production restaurant first.

| Check | Expected result |
| --- | --- |
| OWNER uploads a valid restaurant hero | 1600 x 900 WebP appears in the portal and public profile |
| ADMIN uploads a transparent logo | 512 x 512 WebP preserves transparency and containment |
| OPERATIONS uploads a drop image | 1200 x 900 WebP becomes the drop PRIMARY image |
| FINANCE attempts any media upload | request is denied |
| PICKUP attempts any media upload | request is denied |
| User targets another restaurant/drop | request is denied without exposing whether it exists |
| Renamed text/non-image bytes are uploaded | completion fails; nothing becomes public |
| Unsupported, oversized, or undersized image is uploaded | completion fails with a safe validation error |
| Same completion request is repeated | completed result is returned without a second attachment |
| Drop has no own image but template does | template PRIMARY is returned |
| Drop has neither image | client fallback remains stable |

Also inspect the rendered hero, logo, and drop card at mobile and desktop sizes.
Automated dimensions protect the file contract; they do not replace visual crop
review.

## Observability and incident response

Server logs include the upload session, restaurant, target, and safe failure code;
they must not include signed URLs, image bytes, or service-role credentials.

If unexpected public content is discovered:

1. Detach the affected `storage_object` from its restaurant/drop record.
2. Mark its `media_status_code` as `DELETED` so public views stop resolving it.
3. Remove the binary from `public-media` after confirming it has no remaining
   references.
4. Preserve the upload/session audit metadata needed for investigation.

Do not delete an older object merely because it was replaced. A storage object
may be shared; cleanup must first prove it is unreferenced.

## Production hardening gates

Before broad rollout, add and verify:

- endpoint rate limits and per-restaurant quotas;
- moderation policy appropriate to user-submitted restaurant media;
- scheduled expiration of abandoned ingest objects and sessions;
- scheduled deletion of objects marked `DELETED` only after reference checks;
- dashboards/alerts for validation failures, processing latency, and storage growth;
- a focal-point or crop-preview control if real operator testing shows automatic
  attention crops are insufficient.

These are deliberate rollout gates, not reasons to weaken the core trust boundary.

