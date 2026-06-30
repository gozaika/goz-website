# Product media pipeline

Status: implementation contract  
Owner: product/platform  
Initial surfaces: restaurant hero, restaurant logo, drop primary image, template primary image

## Why this is a pipeline

An uploaded image is untrusted input. A production system must establish who owns it, whether its bytes really form a supported image, how it is transformed, which public entity references it, and when it may be removed. Persisting a browser-supplied URL skips those controls and creates security, performance, accessibility, and lifecycle debt.

## Ownership model

- `marketing-source/` and website campaign masters are not product media.
- Restaurant teams own restaurant hero/logo, reusable template imagery, and drop-specific imagery for restaurants they can administer.
- `storage_object` is the durable metadata record for a verified rendition.
- `restaurant_public_profile` attaches the current hero and logo.
- `drop_media` attaches a drop-specific primary image.
- `catalog_bag_template_media` stores reusable primary images on immutable template revisions.
- Consumer clients receive only a bounded `{ url, width, height, alt, blurhash }` contract. They never receive bucket credentials or internal upload-session data.

## Trust boundary and state machine

1. `PENDING_UPLOAD`: the authenticated restaurant actor requests a short-lived upload session.
2. The browser uploads directly to private `media-ingest` with a signed, single-object token.
3. `PROCESSING`: the completion endpoint atomically claims the session.
4. The server downloads the quarantined object, verifies decoded format and pixel limits, removes metadata, normalizes orientation, and renders WebP.
5. The server uploads the rendition to `public-media`, creates a `storage_object(READY)` row, and attaches it to the authorized target.
6. `COMPLETED`: the session records the resulting storage object and the ingest object is deleted.
7. Failures become `FAILED`; expired sessions become `EXPIRED`. Neither state is consumer-visible.

Completion is idempotent: repeating completion for a completed session returns the existing media asset. Concurrent completion is prevented by a conditional `PENDING_UPLOAD -> PROCESSING` transition.

## Rendition contracts

| Target | Output | Fit | Input limits |
|---|---:|---|---|
| Restaurant hero | 1600 x 900 WebP | cover, attention crop | JPEG/PNG/WebP, <= 8 MiB, 800..12000 px per side, <= 40 MP |
| Restaurant logo | up to 512 x 512 WebP | contain, transparent | JPEG/PNG/WebP, <= 8 MiB, 128..12000 px per side, <= 40 MP |
| Drop primary | 1200 x 900 WebP | cover, attention crop | JPEG/PNG/WebP, <= 8 MiB, 600..12000 px per side, <= 40 MP |
| Template primary | 1200 x 900 WebP | cover, attention crop | JPEG/PNG/WebP, <= 8 MiB, 600..12000 px per side, <= 40 MP |

The pipeline strips EXIF and other source metadata. Animated images, SVG, HEIC and arbitrary binary uploads are not accepted in v1. SVG is deliberately excluded because active content and external references require a separate sanitizer.

## Public resolution order

- Drop card/detail: drop `PRIMARY` -> template-revision `PRIMARY` -> client’s truthful local drop fallback.
- Restaurant card/detail: restaurant hero -> client’s truthful local restaurant fallback.
- Restaurant logo is optional and never substitutes for the hero.

The database view emits only `READY` objects from `public-media`. The BFF constructs the public URL server-side with path-segment encoding and emits dimensions and alt text.

## Replacement and deletion

Replacing media first attaches the new object. The detached object remains `READY` until a retention job proves it is unreferenced; only then may it become `SUPERSEDED`. This prevents a shared object from breaking historical or editorial surfaces. A scheduled retention job may delete unreferenced superseded objects after 30 days. Hard deletion must verify that no restaurant profile, drop media, template media, review media, or CMS feature still references the object.

Template edits publish immutable revisions. A new revision carries forward the previous revision's `PRIMARY` media row by copying the `storage_object` reference, so editing copy or disclosure fields does not silently remove the reusable drop image. Restaurants may replace the active revision's template image after publishing, and individual drops may still override with their own `DROP_PRIMARY`.

## Accessibility and editorial requirements

- Alt text is required at upload time, 1–240 characters, and should describe visible content rather than repeat the restaurant name alone.
- Product images must not promise exact BAM Bag contents unless the published product guarantees them.
- Logos must be genuine restaurant marks; generated lookalike branding is not acceptable.
- The portal explains crop behavior before upload.

## Observability and abuse controls

- Log request ID, actor profile, restaurant, target, declared/decoded MIME, byte size, source dimensions, output dimensions, and failure code—never raw image bytes or signed tokens.
- Limit session creation by actor/IP at the platform edge before public launch.
- Alert on repeated decode failures, oversized attempts, and abandoned-ingest growth.
- A scheduled job should delete expired ingest objects and close stale sessions.

## Rollout gates

1. Apply migration and verify buckets, constraints, views, and grants in local Supabase.
2. Run type/unit tests and both web builds.
3. Upload representative portrait, landscape, transparent-logo, malformed and oversized files.
4. Confirm unauthorized restaurant access is denied before a signed URL is issued.
5. Confirm mobile receives new media and still falls back when media is null or fails to load.
6. Add production rate limiting and retention cleanup before broad restaurant self-service.
