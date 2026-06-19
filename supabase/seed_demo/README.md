# goZaika Demo Seed

Realistic demo / test dataset for local Supabase development.

**Two ways to sign in to the same rich personas:**

- **Phone OTP** (production-style, mobile + web) — fixed local OTP codes, see [Login credentials](#login-credentials). Requires running `demo_test_otp_linkage.sql` (below) once after seeding.
- **Email + password** (SQL-editor / quick web login) — all passwords: **`DemoPass@2026`**. Local convenience only; never shipped to clients.

Identities are `*.demo@gozaika.dev` (consumers and restaurant owners). See `docs/mobile/demo-identity-reconciliation.md` for the canonical manifest and why the older `*.demo.gozaika.in` / `*.gozaika.example` sets are retired.

---

## Before each demo (quick refresh)

**Do not re-run parts 2–4** to fix expired drops. Those files use `ON CONFLICT DO NOTHING`, so D11–D15 keep their original pickup dates and disappear from discovery once the window passes.

Run this single script instead:

```bash
psql "$DATABASE_URL" -f supabase/seed_demo/demo_prepare.sql
```

Or in the SQL editor:

```sql
select * from demo_prepare_for_demo();
```

That will:

1. Remove any prior `demo_create_live_drops()` batches (static seed stays)
2. Roll **D11–D15** pickup to tonight, **D16–D17** to tomorrow
3. Refresh **O26–O28** order pickup windows and **H01–H03** hold expiries

**First-time setup only** — run parts 1–4 once (see below). After that, use `demo_prepare.sql` before every demo.

Optional extras:

```sql
-- Also add a fresh random batch of 5 ACTIVE drops (additive, new UUIDs):
select * from demo_prepare_for_demo(p_create_live_drops => true);

-- Or call the pieces individually:
select * from demo_refresh_static_drops();
select * from demo_create_live_drops();
```

---

## Files — run in order (first-time setup)

| File | What it seeds |
|---|---|
| `demo_seed.sql` | Part 1 — consumers, restaurants, preferences, subscriptions |
| `demo_seed_part2_catalog_drops.sql` | Part 2 — bag templates, revisions, 17 drops |
| `demo_seed_part3_orders_reviews.sql` | Part 3 — 28 orders, pickup events, holds, 12 reviews |
| `demo_seed_part4_functions.sql` | Part 4 — payment data, finance settlement, utility functions |
| `demo_test_otp_linkage.sql` | **Phone/OTP linkage** — backfills phones on the rich users + adds Bawarchi role-matrix staff (run once after parts 1–4) |
| `demo_prepare.sql` | **Pre-demo refresh** — roll dates forward (run before each demo) |

```bash
# Run all four parts + the phone linkage against your local Supabase (postgres / service_role):
psql "$DATABASE_URL" -f supabase/seed_demo/demo_seed.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_seed_part2_catalog_drops.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_seed_part3_orders_reviews.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_seed_part4_functions.sql
psql "$DATABASE_URL" -f supabase/seed_demo/demo_test_otp_linkage.sql
```

The fixed OTP codes live in `supabase/config.toml` under `[auth.sms.test_otp]` (local only — no effect on hosted Supabase). After editing `config.toml`, restart Supabase (`supabase stop && supabase start`) to load them.

All inserts use `ON CONFLICT DO NOTHING` — safe to re-run.

---

## Login credentials

Email + password (`DemoPass@2026`) works for all rows below. Phone + OTP works after `demo_test_otp_linkage.sql` has been run.

### Consumer accounts

| Name | Email | Phone (OTP login) | Test OTP | Dietary | Passport tier | Subscribed |
|---|---|---|---|---|---|---|
| Priya Sharma | priya.demo@gozaika.dev | +919876510001 | 100001 | — | SILVER (7 bags) | MONTHLY active |
| Rahul Mehta | rahul.demo@gozaika.dev | +919876510002 | 100002 | VEG only | GOLD (18 bags) | QUARTERLY active |
| Anjali Kumar | anjali.demo@gozaika.dev | +919876510003 | 100003 | — | BRONZE (3 bags) | — |
| Vikram Rao | vikram.demo@gozaika.dev | +919876510004 | 100004 | NON_VEG | BRONZE (2 bags) | YEARLY paused |
| Deepa Nair | deepa.demo@gozaika.dev | +919876510005 | 100005 | — | SILVER (12 bags) | — |
| Arjun Singh | arjun.demo@gozaika.dev | +919876510006 | 100006 | VEG only | GOLD (22 bags) | MONTHLY active |
| Meera Patel | meera.demo@gozaika.dev | +919876510007 | 100007 | — | BRONZE (2 bags) | — |
| Karthik Reddy | karthik.demo@gozaika.dev | +919876510008 | 100008 | — | PLATINUM (35 bags) | — |

### Restaurant portal accounts (OWNER)

| Restaurant | Owner | Email | Phone (OTP login) | Test OTP | Neighbourhood | Cuisine |
|---|---|---|---|---|---|---|
| Bawarchi Biryani Palace | Mohammed Bawarchi | bawarchi.owner@gozaika.dev | +919876520001 | 200001 | Secunderabad | Biryani / Hyderabadi / Mughlai |
| Sattvik Kitchen | Lakshmi Sattvik | sattvik.owner@gozaika.dev | +919876520002 | 200002 | Banjara Hills | South Indian / Multi-cuisine (VEG/JAIN) |
| The Smoky Grill | Rajesh Smoky | smoky.owner@gozaika.dev | +919876520003 | 200003 | Gachibowli | Mughlai / North Indian / Continental |
| Andhra Spice Trail | Venkat Andhra | andhra.owner@gozaika.dev | +919876520004 | 200004 | Jubilee Hills | South Indian / Hyderabadi / Seafood |
| Sweet Bytes Bakery | Preethi Sweet | sweet.owner@gozaika.dev | +919876520005 | 200005 | HiTech City | Bakery / Desserts (VEG) |

### Role-matrix staff (Bawarchi Biryani Palace — added by `demo_test_otp_linkage.sql`)

For exercising the restaurant role matrix (mobile Slices 4/7). All belong to Bawarchi.

| Name | Email | Phone (OTP login) | Test OTP | Role |
|---|---|---|---|---|
| Bawarchi Admin | bawarchi.admin@gozaika.dev | +919876530001 | 300001 | ADMIN |
| Bawarchi Ops | bawarchi.ops@gozaika.dev | +919876530002 | 300002 | OPERATIONS |
| Bawarchi Counter | bawarchi.counter@gozaika.dev | +919876530003 | 300003 | PICKUP_STAFF |
| Bawarchi Finance | bawarchi.finance@gozaika.dev | +919876530004 | 300004 | FINANCE |

---

## Demo flows

### 1 — Map view

**What's in the data:**  
All 5 restaurants have `geo_address` rows with real Hyderabad lat/lng coordinates spread across 5 neighbourhoods.

| Restaurant | lat / lng | Neighbourhood |
|---|---|---|
| Bawarchi Biryani Palace | 17.4435, 78.4987 | Secunderabad |
| Sattvik Kitchen | 17.4126, 78.4483 | Banjara Hills |
| The Smoky Grill | 17.4409, 78.3482 | Gachibowli |
| Andhra Spice Trail | 17.4311, 78.4078 | Jubilee Hills |
| Sweet Bytes Bakery | 17.4484, 78.3762 | HiTech City |

**To demo:**  
Open the consumer map screen. All 5 pins appear across Hyderabad. Tap any pin to see the restaurant profile card. D11–D15 are ACTIVE drops with tonight's pickup window (18:30–21:00 IST).

> ⚠️ **Known exception E1:** The `api_public_restaurant_profile` view in slice9 references `ga.street_address` which does not exist (correct columns are `line_1`, `line_2`, `landmark`). The view will error until that migration is patched. The geo coordinates are still stored correctly in `geo_address`.

---

### 2 — Ratings

**What's in the data:**  
Average ratings are auto-maintained by the `COMPUTED_refresh_restaurant_rating` trigger on every APPROVED review insert.

| Restaurant | avg_rating | rating_count | Notes |
|---|---|---|---|
| Bawarchi Biryani Palace | 4.5 | 2 | R01 (4★) + R02 (5★) |
| Sattvik Kitchen | 4.67 | 3 | R03 (5★) + R04 (4★) + R05 (5★) |
| The Smoky Grill | 0 / null | 0 | Only review is PENDING (R06) |
| Andhra Spice Trail | 4.0 | 2 | R07 (5★) + R09 (3★); R08 is PENDING |
| Sweet Bytes Bakery | 4.5 | 2 | R10 (5★) + R11 (4★); R12 REJECTED |

**To demo:**  
- Show the restaurant list sorted by rating — Sattvik highest (4.67), then Bawarchi and Sweet Bytes (4.5).
- Smoky Grill has zero rating (no approved reviews yet) — realistic for a newer listing.
- Use Karthik's account (PLATINUM) to show the rejected review (R12, 2★ Sweet Bytes).
- Use the admin panel to approve Priya's PENDING review (R06, 4★ Smoky Grill) — watch the restaurant rating update live.

---

### 3 — Reviews with category breakdown

**What's in the data:**  
12 reviews across 5 restaurants. The `categories` JSONB column (slice9) captures per-category scores.

Categories: `food_quality`, `value_for_price`, `pickup_experience`, `packaging` (each 1–5).

Highlights:

| Review | Consumer | Stars | Standout category signal |
|---|---|---|---|
| R01 | Priya / Bawarchi Biryani | 4★ | value_for_price 5 — great deal |
| R02 | Deepa / Bawarchi Mutton | 5★ | All 5s — flagship review |
| R04 | Arjun / Sattvik Veg Thali | 4★ | pickup_experience 5, packaging 4 — smooth ops |
| R05 | Arjun / Sattvik Jain Special | 5★ | All 5s — Jain authenticity callout |
| R09 | Priya / Andhra Spice Trail | 3★ | Mixed — anchors realistic rating |
| R12 | Karthik / Sweet Bytes | 2★ | REJECTED (community guideline) |

**To demo:**  
- Consumer profile → "My Reviews" shows Priya's 3 reviews (R01, R06, R09).
- Restaurant portal → Andhra Spice Trail → Reviews shows both APPROVED and PENDING reviews.
- Admin moderation queue shows R06 (PENDING) and R08 (PENDING).

> ⚠️ **Known exception E2:** `api_public_restaurant_reviews` and `api_restaurant_own_reviews` (slice9) join on `oo.order_pk` instead of `oo.order_order_pk`. Both views return empty until the migration is patched. The underlying `review_review` rows are correct.

---

### 4 — Cuisine signals & pickup neighbourhoods

**What's in the data:**  
14 cuisine-map rows covering all 5 restaurants. Consumer dietary and allergen preferences set on 4 consumers.

**Cuisine coverage:**

| Cuisine code | Restaurants |
|---|---|
| BIRYANI | Bawarchi Biryani Palace |
| HYDERABADI | Bawarchi Biryani Palace, Andhra Spice Trail |
| MUGHLAI | Bawarchi Biryani Palace, The Smoky Grill |
| SOUTH_INDIAN | Sattvik Kitchen, Andhra Spice Trail |
| MULTI_CUISINE | Sattvik Kitchen |
| NORTH_INDIAN | The Smoky Grill |
| CONTINENTAL | The Smoky Grill, Sweet Bytes Bakery |
| SEAFOOD | Andhra Spice Trail |
| BAKERY | Sweet Bytes Bakery |
| DESSERTS | Sweet Bytes Bakery |

**Dietary / allergen preferences:**

| Consumer | Dietary pref | Allergen avoidance |
|---|---|---|
| Rahul | VEG | — |
| Arjun | VEG | — |
| Vikram | NON_VEG | DAIRY |
| Priya | — | NUTS |

**To demo:**  
- Log in as Rahul → discovery feed shows only VEG drops (Sattvik, Sweet Bytes).  
- Log in as Vikram → discovery shows NON_VEG drops; Dairy-containing bags surfaced with allergen warning.
- Filter by neighbourhood: Gachibowli → only Smoky Grill. Jubilee Hills → only Andhra Spice Trail.
- Filter by cuisine: BIRYANI → only Bawarchi. DESSERTS → only Sweet Bytes.

**Neighbourhood spread (5 distinct zones):**  
SECUNDERABAD · BANJARA_HILLS · GACHIBOWLI · JUBILEE_HILLS · HITECH_CITY

---

### 5 — Drops across restaurants (live distribution)

#### Static seed drops

**Past drops (D01–D10)** — all closed, full order history:

| Drop | Restaurant | Type | Price | Outcome |
|---|---|---|---|---|
| D01 | Bawarchi Biryani | STANDARD | ₹149 | PICKUP_CLOSED — 4/12 orders |
| D02 | Bawarchi Mutton | CHEF_SPECIAL | ₹249 | SOLD_OUT — 2/2 |
| D03 | Sattvik Veg Thali | STANDARD | ₹99 | PICKUP_CLOSED — 3/10 |
| D04 | Sattvik Jain Special | STANDARD | ₹129 | PICKUP_CLOSED — 2/6 |
| D05 | Smoky Tandoor | STANDARD | ₹179 | PICKUP_CLOSED — 2/8 |
| D06 | Smoky Spotlight | SPOTLIGHT | ₹199 | EMERGENCY_CLOSED — power failure |
| D07 | Andhra Meals | STANDARD | ₹99 | PICKUP_CLOSED — 3/10 |
| D08 | Andhra Coastal | CHEF_SPECIAL | ₹199 | PICKUP_CLOSED — 2/6 |
| D09 | Sweet Artisan Bakes | BLIND_ADVENTURE | ₹149 | PICKUP_CLOSED — 2/5 |
| D10 | Sweet Desserts | STANDARD | ₹119 | SOLD_OUT — 3/3 |

**Today's active drops (D11–D15)** — pickup 18:30–21:00 IST tonight:

| Drop | Restaurant | Type | Price | Status |
|---|---|---|---|---|
| D11 | Bawarchi Biryani | STANDARD | ₹149 | ACTIVE — 12 bags, Priya CONFIRMED |
| D12 | Sattvik Kitchen | STANDARD | ₹99 | ACTIVE — 15 bags, Rahul CONFIRMED, Arjun holding |
| D13 | Smoky Grill | SPOTLIGHT | ₹199 | ACTIVE — 8 bags, Karthik CONFIRMED, Deepa holding |
| D14 | Andhra Spice Trail | CHEF_SPECIAL | ₹199 | ACTIVE — 6 bags, Vikram holding |
| D15 | Sweet Bytes | BLIND_ADVENTURE | ₹149 | ACTIVE — 10 bags, available |

**Future drops (D16–D17)** — tomorrow, SCHEDULED:

| Drop | Restaurant | Type | Price |
|---|---|---|---|
| D16 | Andhra Spice Trail | CHEF_SPECIAL | ₹199 |
| D17 | Sattvik Kitchen | STANDARD | ₹99 |

#### Order distribution (28 total)

| Status | Count | Consumers |
|---|---|---|
| COLLECTED | 20 | All 8 consumers across D01–D10 |
| CANCELLED | 3 | Priya (D03 — before pickup), Deepa + Anjali (D06 — emergency) |
| PICKUP_EXPIRED | 2 | Karthik (D01), Arjun (D09) |
| CONFIRMED | 3 | Priya (D11), Rahul (D12), Karthik (D13) |

#### Active holds (checkout-in-progress)

| Consumer | Drop | Expires |
|---|---|---|
| Arjun | D12 (Sattvik) | ~8 minutes |
| Deepa | D13 (Smoky) | ~12 minutes |
| Vikram | D14 (Andhra) | ~4 minutes |

---

### 6 — Live drop generator function

Run this to create a fresh random batch of ACTIVE drops:

```sql
-- Preview: create drops for all 5 demo restaurants
select * from demo_create_live_drops();

-- Create CHEF_SPECIAL drops only
select * from demo_create_live_drops(p_drop_type => 'CHEF_SPECIAL');

-- Create drops for specific restaurants only
select * from demo_create_live_drops(
  p_restaurant_fks => array[
    '20000000-0000-0000-0000-300000000001'::uuid,  -- Bawarchi
    '20000000-0000-0000-0000-300000000004'::uuid   -- Andhra Spice Trail
  ]
);
```

Each call creates per restaurant:
- 1 ACTIVE drop with 8–15 bags, tonight's pickup window
- 2 CONVERTED holds → CONFIRMED orders (with payment intents + transactions)
- 2 ACTIVE holds (consumers mid-checkout, expires in 7–12 min)

Registered in `dev_demo_seed_registry` with `slice = 'demo_live_drops'`.

---

### 7 — Payment trail

**What's in the data (Part 4):**

| Order | Consumer | Amount | Method | Intent status |
|---|---|---|---|---|
| O01 (D01 Bawarchi) | Priya | ₹149 | UPI | CAPTURED |
| O07 (D03 Sattvik) | Rahul | ₹99 | UPI | CAPTURED |
| O16 (D07 Andhra) | Karthik | ₹99 | CARD (Visa) | CAPTURED |
| O26 (D11 Bawarchi — today) | Priya | ₹149 | UPI | CAPTURED |
| O27 (D12 Sattvik — today) | Rahul | ₹99 | UPI | CAPTURED |
| O28 (D13 Smoky — today) | Karthik | ₹199 | NETBANKING | CAPTURED |

**To demo (consumer):**  
- Log in as Priya → active order O26 (Bawarchi, tonight) with QR code available.  
- Past orders screen shows 3 COLLECTED, 1 CANCELLED (D03), 1 CONFIRMED.

**To demo (admin payment view):**  
```sql
select * from api_admin_payment_order_summary;
```

---

### 8 — Finance settlement

**What's in the data:**  
One PAID settlement run for Bawarchi Biryani Palace covering D01 + D02.

| Field | Value |
|---|---|
| Restaurant | Bawarchi Biryani Palace |
| Period | 25 days ago → 18 days ago |
| Gross sales | ₹1,094 (6 orders) |
| Commission | ₹164.10 (15% STANDARD_15PCT) |
| Net payout | ₹929.90 |
| Status | PAID |

**To demo:**  
- Restaurant portal → Finance → Settlement history shows 1 PAID run.
- Line-level entries: 6 ORDER_GROSS rows + 1 COMMISSION deduction.
- Other 4 restaurants have no settlement runs yet (DRAFT state — realistic for new listings).

---

### 9 — Zayka Passport (loyalty tiers)

Consumer passport stats (bag count → tier):

| Consumer | Bags | Tier |
|---|---|---|
| Karthik | 35 | PLATINUM |
| Arjun | 22 | GOLD |
| Rahul | 18 | GOLD |
| Deepa | 12 | SILVER |
| Priya | 7 | SILVER |
| Anjali | 3 | BRONZE |
| Vikram | 2 | BRONZE |
| Meera | 2 | BRONZE |

Tier thresholds: BRONZE <5 · SILVER 5–14 · GOLD 15–29 · PLATINUM 30+

**To demo:**  
- Karthik's PLATINUM profile — exclusive access visual.
- Priya is at 7/15 towards GOLD — progress bar demo.
- Referral chain: Deepa referred Rahul (REWARDED state).

---

### 10 — Swaad Club subscriptions

| Consumer | Plan | Status |
|---|---|---|
| Priya | MONTHLY (₹99/mo) | ACTIVE |
| Rahul | QUARTERLY (₹249/qtr) | ACTIVE |
| Arjun | MONTHLY (₹99/mo) | ACTIVE |
| Vikram | YEARLY (₹799/yr) | PAUSED |
| Anjali | MONTHLY (₹99/mo) | CANCELLED |

**To demo:**  
- Priya and Rahul → active Swaad Club badge on profile.
- Vikram → paused subscription with renewal CTA.
- Anjali → cancelled — shows churn scenario.

---

### 11 — Emergency closure (D06)

Drop D06 (Smoky Grill SPOTLIGHT) was closed due to a power failure.  
An `emergency_closure_log` entry records the reason.  
Deepa (O13) and Anjali (O14) had CANCELLED orders with cancellation_reason = `EMERGENCY_CLOSED`.

**To demo:**  
- Restaurant portal → drop D06 → shows EMERGENCY_CLOSED status + log entry.
- Consumer order history → Deepa → shows 1 CANCELLED order with reason.

---

## Known exceptions (slice9 migration bugs — NOT fixed in seed)

| ID | Table / view | Bug | Impact |
|---|---|---|---|
| E1 | `api_public_restaurant_profile` | References `ga.street_address` — column doesn't exist (should be `line_1`, `line_2`, `landmark`) | View errors on SELECT; map pins break |
| E2 | `api_public_restaurant_reviews`, `api_restaurant_own_reviews` | Join uses `oo.order_pk` — should be `oo.order_order_pk` | Views return empty; review display broken |

Both are single-line fixes in the slice9 migration. The underlying data rows are correct.

---

## Cleanup

When demo data accumulates (especially repeated `demo_create_live_drops()` calls), use targeted cleanup:

| Goal | Command |
|---|---|
| Preview counts (safe default) | `select * from demo_cleanup_data();` |
| Remove only dynamic live-drop batches | `select * from demo_cleanup_data(p_slice => 'demo_live_drops', p_dry_run => false);` |
| Remove today's live-drop batches only | `select * from demo_cleanup_data(p_slice => 'demo_live_drops', p_after_at => current_date::timestamptz, p_dry_run => false);` |
| Full wipe — all demo seed | `select * from demo_cleanup_data(p_slice => 'ALL', p_dry_run => false);` |

```sql
-- Preview what would be deleted (dry run, default):
select * from demo_cleanup_data();

-- Delete only live drops created today (keep static seed):
select * from demo_cleanup_data(
  p_slice    => 'demo_live_drops',
  p_after_at => current_date::timestamptz,
  p_dry_run  => false
);

-- Delete all live drop batches (any date):
select * from demo_cleanup_data(p_slice => 'demo_live_drops', p_dry_run => false);

-- Full wipe — remove all demo data (consumers, restaurants, everything):
select * from demo_cleanup_data(p_slice => 'ALL', p_dry_run => false);
```

The cleanup function deletes in FK dependency order:
finance entries → payment transactions → payment intents → reviews → orders → holds → drops → templates → subscriptions → consumer profiles → restaurants → iam profiles → auth.users

---

## UUID quick reference

```
Consumer auth.users   : 20000000-0000-0000-0000-1000000000{01-08}
Consumer iam_profile  : 20000000-0000-0000-0000-1100000000{01-08}
consumer_profile      : 20000000-0000-0000-0000-1200000000{01-08}
Restaurant auth.users : 20000000-0000-0000-0000-2000000000{01-05}
Restaurant iam_profile: 20000000-0000-0000-0000-2100000000{01-05}
restaurant_restaurant : 20000000-0000-0000-0000-3000000000{01-05}
geo_address           : 20000000-0000-0000-0000-4000000000{01-05}
catalog_bag_template  : 20000000-0000-0000-0000-5000000000{01-10}
template_revision     : 20000000-0000-0000-0000-6000000000{01-10}
drop_drop (past)      : 20000000-0000-0000-0000-7000000000{01-10}
drop_drop (today)     : 20000000-0000-0000-0000-7000000000{11-15}
drop_drop (future)    : 20000000-0000-0000-0000-7000000000{16-17}
order_order           : 20000000-0000-0000-0000-8000000000{01-28}
drop_inventory_hold   : 20000000-0000-0000-0000-9000000000{01-09}
payment_order_intent  : 20000000-0000-0000-0000-a000000000{01-06}
payment_transaction   : 20000000-0000-0000-0000-b000000000{01-06}
review_review         : 20000000-0000-0000-0000-c000000000{01-12}
consumer_subscription : 20000000-0000-0000-0000-d000000000{01-05}
subscription_plan     : 20000000-0000-0000-0000-e000000000{01-03}
finance_settlement_run: 20000000-0000-0000-0000-f000000000{01}
```
