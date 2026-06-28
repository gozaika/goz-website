# Mobile uplift — deploy-time verification checklist

We're building under **Plan B** (owner-approved 2026-06-28): each vertical lands
code-correct with typecheck + types tests + `node scripts/mobile-ci.mjs` 7/7 + a smoke
script, but the **on-device** end-to-end check is deferred to a **batched pass after a
BFF deploy** (the apps on-device talk to the deployed cloud BFFs `customer.gozaika.in`
/ `restaurant.gozaika.in`, not local code).

## Prerequisite for the batch
1. Deploy **`consumer-web`** (customer BFF) and **`restaurant-mgmt-web`** (partner BFF)
   with the new routes.
2. Rebuild + install both apps so JS picks up new screens:
   `pwsh scripts/android-preview-install.ps1 -App consumer-mobile -CaptureScreenshot`
   and `... -App restaurant-mobile -CaptureScreenshot`.
3. Roll cloud demo windows forward for live data: `supabase/seed_demo/demo_prepare.sql`.
4. Have a COLLECTED order + a settlement-with-invoice seeded for the smokes.

## To verify (built but not yet device-verified)

| Slice | Feature | On-device walk | BFF route | Smoke |
| --- | --- | --- | --- | --- |
| 10 | Order review submit/status | Customer → Orders → a COLLECTED order → rate + submit → shows "pending moderation"; re-open shows status | `POST /reviews`, `GET /orders/[id]/review` | `scripts/smoke/slice10-reviews-smoke.mjs` |
| 10 | Account/data erasure | Customer → Account → Privacy & consent → "Request account & data erasure" → confirm → success | `POST /account/erasure` | — (idempotent insert) |
| 10 | Profile-edit + referral | Customer → Account → "Profile & referrals" → edit name/language → Save; share referral code | `GET/POST /account/profile` | — |
| 15 | Settlement invoice download | Partner → Finance → a settlement with an invoice → "Download invoice" opens the PDF | `GET /finance/invoice/[id]/signed-url` | — (needs an invoice with a stored PDF) |
| 14 | Partner reviews | Partner → Reviews → rating summary + review list with moderation badges | `GET /reviews` (partner, `viewReviews`) | — |

Notes:
- The invoice download yields a 404 if the seeded invoice has no stored PDF
  (`storage_object_fk` null) — that's data, not a code defect; the endpoint + UI are correct.
- New verticals below this point should **append a row here** as they land.
