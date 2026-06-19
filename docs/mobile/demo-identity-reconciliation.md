# Demo-Identity Reconciliation — Slice 5

Audit date: 19 June 2026
Scope: reconcile the three incompatible demo-fixture stories into one manifest, and define the deterministic phone→OTP linkage that makes phone-OTP login resolve to the rich seeded data.
Companion: `mobile-parity-ledger.md` (defect **D4**), customer spec §3.4, restaurant spec §4.1.

## 1. The problem: three fixture stories, none usable for phone-OTP

Production UI accepts **phone OTP (primary) and Google (secondary)** — no password login. None of the three checked-in fixture sets supports that against rich data:

| # | Source | Identity pattern | Auth method | Has phone? | Rich data? |
| --- | --- | --- | --- | --- | --- |
| 1 | `supabase/seed_demo/*.sql` (rich seed) | `*.demo@gozaika.dev` (e.g. `priya.demo@gozaika.dev`), pw `DemoPass@2026` | email/password only (`provider:"email"`) | **No** — `auth.users.phone` NULL, `iam_profile.phone_e164` NULL | **Yes** — 8 consumers, 5 restaurants, 17 drops, 28 orders, reviews, holds, finance |
| 2 | `supabase/seed_demo/README.md` | `*.demo.gozaika.in` (e.g. `priya.sharma@demo.gozaika.in`) | claims pw `DemoPass@2026` | No | **Mislabels set #1** — these emails do not exist in the SQL |
| 3 | `scripts/demo/demo-auth-shared.ts` | `*.gozaika.example`, pw `GozaikaDemo@123` | email/password, **phones present** (`+919000100001`–`5`, `+919100200001`–`15`) | Yes | **No** — different restaurants (Biryani Baithak…) and consumers (Aarav Reddy…); thin/no rich orders |

### Confirmed discrepancies

- **README ≠ SQL.** README §"Login credentials" lists `priya.sharma@demo.gozaika.in`; the SQL actually inserts `priya.demo@gozaika.dev` (`demo_seed.sql:83`). README password `DemoPass@2026` is correct for the SQL set.
- **Two different passwords.** Rich seed `DemoPass@2026`; scripts `GozaikaDemo@123` (`demo-auth-shared.ts:3`).
- **Two disjoint restaurant/consumer universes.** Rich seed: Bawarchi, Sattvik, Smoky Grill, Andhra Spice, Sweet Bytes. Scripts: Biryani Baithak, Charminar Chai, Deccan Dosa, Golconda Grills, HITEC Handi. No overlap.
- **Rich seed has no phone anywhere.** Phone-OTP login cannot land on Priya/Bawarchi etc. today.
- **Rich seed has only OWNER memberships** (`demo_seed.sql:752`, `role_code = 'OWNER'`). The 5-role matrix (`ADMIN/OPERATIONS/PICKUP_STAFF/FINANCE`) cannot be exercised against current data.

## 2. Decision

- **Canonical fixture set = the rich SQL seed (#1).** It is the only set with realistic orders/passport/finance/reviews. README and scripts are corrected/retired to point at it.
- **Add deterministic phones to the rich seed** so phone-OTP resolves to the rich personas. Local `[auth.sms.test_otp]` provides fixed codes. No password backdoor ships.
- **Email/password stays** on the seed (harmless locally; useful for SQL-editor inspection) but is **not** the demo-login story and is **not** shipped to clients.
- **Add non-owner staff memberships** on one restaurant so the role matrix (Slice 4) is testable.
- README is rewritten to the `*.demo@gozaika.dev` truth + phone/OTP table. `demo-auth-shared.ts` `*.gozaika.example` set is **deprecated** (kept only if a test needs throwaway phone users; not a persona story).

## 3. Canonical manifest

Phone block chosen to avoid collisions with existing fixtures (`+919876540001`–`5` are restaurant *contact* phones, not login; `+9190001000xx`/`+9191002000xx` belong to the deprecated script set).

### Consumers (rich seed — `auth.users` `20000000-…-1000000000{01–08}`)

| Persona | Seed email | Assigned login phone | Test OTP | Rich state (from README) |
| --- | --- | --- | --- | --- |
| Priya Sharma | `priya.demo@gozaika.dev` | `+919876510001` | `100001` | SILVER 7 bags, MONTHLY active, order O26 today, 3 reviews |
| Rahul Mehta | `rahul.demo@gozaika.dev` | `+919876510002` | `100002` | GOLD 18, QUARTERLY active, VEG, O27 today |
| Anjali Kumar | `anjali.demo@gozaika.dev` | `+919876510003` | `100003` | BRONZE 3, cancelled order (D06) |
| Vikram Rao | `vikram.demo@gozaika.dev` | `+919876510004` | `100004` | BRONZE 2, YEARLY paused, NON_VEG/DAIRY, holding D14 |
| Deepa Nair | `deepa.demo@gozaika.dev` | `+919876510005` | `100005` | SILVER 12, holding D13, referred Rahul |
| Arjun Singh | `arjun.demo@gozaika.dev` | `+919876510006` | `100006` | GOLD 22, MONTHLY active, VEG, holding D12 |
| Meera Patel | `meera.demo@gozaika.dev` | `+919876510007` | `100007` | BRONZE 2, newest account |
| Karthik Reddy | `karthik.demo@gozaika.dev` | `+919876510008` | `100008` | PLATINUM 35, O28 today, rejected review R12 |

### Restaurant owners (rich seed — `auth.users` `20000000-…-2000000000{01–05}`)

| Persona | Seed email | Assigned login phone | Test OTP | Restaurant / role |
| --- | --- | --- | --- | --- |
| Mohammed Bawarchi | `bawarchi.owner@gozaika.dev` | `+919876520001` | `200001` | Bawarchi Biryani Palace — OWNER, 1 PAID settlement |
| Lakshmi Sattvik | `sattvik.owner@gozaika.dev` | `+919876520002` | `200002` | Sattvik Kitchen — OWNER (VEG/JAIN) |
| Rajesh Smoky | `smoky.owner@gozaika.dev` | `+919876520003` | `200003` | The Smoky Grill — OWNER, D06 emergency closure |
| Venkat Andhra | `andhra.owner@gozaika.dev` | `+919876520004` | `200004` | Andhra Spice Trail — OWNER |
| Preethi Sweet | `sweet.owner@gozaika.dev` | `+919876520005` | `200005` | Sweet Bytes Bakery — OWNER |

### Role-matrix test memberships (new — added by linkage script on Bawarchi)

So Slice 4's matrix can be exercised. Phones in a distinct `…5300xxxx` block; new minimal IAM profiles.

| Persona | Login phone | Test OTP | Restaurant | Role |
| --- | --- | --- | --- | --- |
| Bawarchi Admin | `+919876530001` | `300001` | Bawarchi Biryani Palace | `ADMIN` |
| Bawarchi Ops | `+919876530002` | `300002` | Bawarchi Biryani Palace | `OPERATIONS` |
| Bawarchi Counter | `+919876530003` | `300003` | Bawarchi Biryani Palace | `PICKUP_STAFF` |
| Bawarchi Finance | `+919876530004` | `300004` | Bawarchi Biryani Palace | `FINANCE` |

These four are the **acceptance fixtures** for the role-matrix contract tests in `role-matrix-enforcement-gap.md` §5.

## 4. Linkage mechanics

`supabase/seed_demo/demo_test_otp_linkage.sql` (idempotent) does:

1. Backfill `auth.users.phone` + `phone_confirmed_at` for the 13 rich identities (phone-OTP can now resolve them; email login still works).
2. Backfill `iam_profile.phone_e164` to match.
3. Create the 4 staff `auth.users` + `iam_profile` + `restaurant_team_membership` (non-owner roles) on Bawarchi.
4. Re-assert `is_restaurant_user` denormalization on affected profiles.

The matching `[auth.sms.test_otp]` block is in `supabase/config.toml` (local only — `enable_confirmations=false`, so confirmation is not required, but we still set `phone_confirmed_at` for realism).

### Reproduce from clean checkout

```bash
supabase db reset                                   # migrations + seed.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_seed.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_seed_part2_catalog_drops.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_seed_part3_orders_reviews.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_seed_part4_functions.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_test_otp_linkage.sql   # <-- new
supabase stop && supabase start                     # reload config.toml test_otp
# then: phone-OTP login with +919876510001 / OTP 100001 → Priya (rich)
```

## 5. Remote safety

- `test_otp` is local-only Supabase config; it has **no effect on hosted Supabase**. Never add real customer phones.
- The linkage SQL is gated to the demo UUID space (`20000000-…`) and uses `ON CONFLICT DO NOTHING` / guarded updates — safe to re-run, refuses to touch non-demo rows.
- Do not run against a remote project. The existing `demo-auth-shared.ts` `isAllowedDemoSupabaseUrl` guard remains the model for any scripted runner.

## 6. Non-secret fixture status

These phones/OTPs are **deterministic local test fixtures, not secrets** — safe to commit and document. The shared password `DemoPass@2026` is local-seed only and must never be enabled as a production login (plan §5: a general password-login UI is rejected).

## 7. Follow-ups for Slice 5 implementation

- Rewrite `supabase/seed_demo/README.md` "Login credentials" to the `*.demo@gozaika.dev` + phone/OTP truth (delete the `*.demo.gozaika.in` table).
- Deprecate or delete `scripts/demo/demo-auth-shared.ts` `*.gozaika.example` personas, or relabel them explicitly as "throwaway phone users, no rich data."
- Add the phone/OTP table to each app's review-account notes (store submission, Slice 18).
