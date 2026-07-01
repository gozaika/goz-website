# Marketing Asset Factory Decision Log

Status: active review log for autonomous or owner-directed decisions that affect launch asset truth,
creative scope, or production sequencing.

## 2026-07-01 - Task C Live Proof And Review Gate

Context: owner approved autonomous continuation with Android device connected and remote Supabase
available. Goal was to prepare live drops, refresh v1 proof, clean up Remotion/root artifacts, and
continue the Launch Asset Factory without fabricating product truth.

Decisions:

- Kept Remotion installed in the root package, but classified `remotion` and `@remotion/cli` as
  `devDependencies`. Rationale: video tooling is planned after still quality is accepted; runtime
  app/package consumers should not treat Remotion as a production dependency.
- Removed the tracked root `consumer-map-discovery-launch.png`. Rationale: capture evidence should
  live under `marketing-assets/captures/`; the compositor uses raw or curated capture sidecars, not
  loose root screenshots.
- Patched `demo_create_live_drops()` instead of working around remote Supabase failures. Rationale:
  the remote RPC exposed real drift between the demo function and the current schema. The checked-in
  source of truth now matches the remote function applied during this run.
- Updated the live-drop function to use current schema fields and ledger codes:
  `catalog_bag_template_fk`, restaurant `geo_city_fk` / `geo_neighborhood_fk`,
  `MANUAL_ADJUSTMENT`, `HOLD_CREATED`, and post-order converted-hold linkage.
  Rationale: these are schema compatibility fixes, not marketing data invention.
- Ran `demo_prepare_for_demo(p_cleanup_live_drops => true, p_create_live_drops => true)` through
  `npm run assets:prepare-demo`. Result: static drops refreshed and five live drops created.
- Captured fresh Android proof after live drops existed. The selected curated source is the real
  consumer Drops list showing `10 live` BAM Bags and real seeded restaurant/drop text.
- Tested the Map segment. It truthfully rendered `Map view unavailable` because public map
  coordinates are not exposed for these drops. Rationale: do not create a fake map, fake pins, or
  fake location claim.
- Adjusted `consumer-map-discovery` copy from map-first language to live nearby discovery language.
  Rationale: the v1 app-store card must describe the real captured state; native map-grade claims
  should wait until product proof exists.
- Cleared the v1 source-proof blocker only for curated proof sidecars with
  `captureKind: mobile-maestro-curated-proof`. Raw smoke captures remain blocker-prone.
- Added `assets:review` and wired creative review validation into `assets:validate`. Rationale:
  every generated composite now has an enforceable review record, score table, source/output
  traceability, AI background protection metadata, and v2/v3 promotion rules.

Open follow-ups:

- Product: decide whether native map coordinates should be fixed before any "map-first" v2/v3
  creative claim.
- Creative: v1 is functional proof only. v2 should improve composition, premium background
  treatment, device staging, and typography while preserving the screenshot pixels.
- Motion: Remotion work should still wait until still v2/v3 direction is accepted.
