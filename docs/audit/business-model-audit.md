# goZaika — Business Model Audit (running doc)

**Purpose:** A living strategy document capturing the business-model discussion between the founder and the reviewer (Fable), spun out of the 2026-07-05 launch-readiness audit. Intended to give the team complete context on positioning, the core diagnosis, and the candidate pivots. Append new entries; do not overwrite.

**Companion doc:** `docs/audit/launch-readiness-audit-2026-07-05.md` (technical/product audit of all 5 apps).

**Status:** Draft for team review. Sections marked _[founder]_ are the founder's stated reasoning; _[reviewer]_ is analysis; _[open]_ are unresolved questions.

---

## 0. Implementation kickoff (READ FIRST)

**Brief:** Take goZaika to a world-class, go-live-ready state across all five surfaces (marketing site, consumer web + mobile, restaurant portal + mobile) and gozaika.in, projecting the converged strategy in this doc — the **Bada Zayka** brand, the generous chef's-thali product, the two-layer moral/discovery messaging, defendable value props for both sides, the restaurant economics calculator, the **Order Again** reorder funnel — and fixing **every** functional/parity/polish gap in `launch-readiness-audit-2026-07-05.md`. Highest quality bar; **world-class polish is non-negotiable.** Payment via the simulator (Razorpay lands August). All SMS/OTP function points are testable now **without a live provider** (hosted test phone numbers — verified — + `NOTIFICATION_DRY_RUN=true`). Work on a feature branch; keep `main` deployable (push to main auto-deploys to Vercel prod); **merge only when all gates are green, and ask before the final prod merge.** This is a multi-session marathon — maintain the handoff docs and flag context exhaustion (see the kickoff prompt: `docs/audit/implementation-kickoff-prompt.md`).

**Ordered build sequence:**
0. **Setup** — new branch off `main`; verify tooling (device/adb, Chrome MCP, local Docker Supabase fallback, `.env.local`); refresh seed (`demo_prepare_for_demo(p_create_live_drops => true)`); read this doc + the launch audit + `gozaika_handoff_v1.md`.
1. **Marketing (start here)** — banners (A4 te/hi/en, A6) + explainer HTML → apply §21 brand + §12/§15 messaging + §22 tiers. Then gozaika.in copy/positioning + the restaurant economics calculator (§11).
2. **Consumer surfaces (web + mobile)** — thali/variety framing; passport-cuisines fix (CW-1); mobile checkout via simulator (CM-1); in-app mobile pickup code (CM-2, also de-risks testing); holds/toast polish (CM-3); allergen-conflict gate (§16).
3. **Restaurant surfaces (portal + mobile)** — template archetype + allergen envelope + reusable copy (§19); drop-time surplus fill (internal); calculator / decision-support tab; #418 hydration fix (RP-1); finance "Orders 0" (RP-2); mobile ROI parity (RM-1); Order Again surfaced in the Orders/counter queue.
4. **Cross-cutting** — Order Again reorder end-to-end + sample→reorder instrumentation (§20); real imagery (CW-3); a11y pass; schedule the expired-holds release job.
5. **Test + deploy** — extend Playwright (web) + Maestro (mobile) for all new coverage; run; test-fix until web-ci 10/10, mobile-ci 7/7, e2e green; keep branch deployable; open PR; merge to `main` only when all green (auto-deploys). Ask before the final prod merge.

Model/effort per phase: Sonnet 5 for well-specified marketing/mechanical work; **Opus 4.8 (high effort)** for app-surface bugs, the calculator/reorder/allergen logic, and the test-fix debug loop. Full paste-ready session prompt: `docs/audit/implementation-kickoff-prompt.md`.

---

## 1. What goZaika is today (as-built)

A mystery/surprise-bag pickup marketplace. Restaurants publish limited "BAM Bag" drops (surprise chef-curated bags), customers claim → hold → pay → collect via OTP/QR. Pickup-only, allergen-disclosed, no delivery. Hyderabad-first. ~₹99–249 per bag, 15% platform commission. Loyalty via "Zayka Passport"; "Swaad Club" subscription is "coming soon." Positioning v4 is two-sided: B2B customer-acquisition / B2C discovery, with an explicit banned-copy list (`leftover|stale|cheap|clearance|liquidation|food rescue|sample|surplus`).

Mechanically, this is the **Too-Good-To-Go (TGTG) model**. The engine underneath (drops publisher, server-validated pickup counter, finance/ROI console, loyalty, allergen pipeline) is well-built; the restaurant portal is a genuinely mature merchant console.

---

## 2. Core diagnosis — and an important update

### 2.1 Original diagnosis _[reviewer]_
goZaika took the TGTG *mechanic* (surprise bag, pickup-only, restaurant-sourced, allergen-disclosed) and deliberately deleted the TGTG *economic engine* (surplus recovery + discount) to protect a premium/dignity brand. That appeared to leave a **consumer-side motivation vacuum**: the customer pays near-full price, gives up choice (mystery) *and* convenience (pickup), and gets back only "discovery / serendipity / no algorithm" — a nice-to-have, not a need-to-have. The restaurant's motivation, by contrast, is strong and clear ("a brand-safe acquisition channel that dodges aggregator commissions, delivery economics, and public discounting"). Asymmetric marketplace.

### 2.2 Updated diagnosis after the founder's brainstorm _[reviewer]_
The founder's variety/volume ideas (§4) change the picture. The proposed unit — **~1.5× the volume for ~0.75–0.8× the price** — is a **~45–50% effective per-unit discount**. So the economic value was never actually removed; it is being **re-wrapped**. The variety/abundance/"flight" framing functions as a **stigma-laundering mechanism for a discount**: the customer receives real savings (more food per rupee) but the social narrative is aspirational ("a chef's tasting flight") rather than shameful ("discounted leftovers").

This reframes the strategic story from "we removed TGTG's engine" to **"we kept TGTG's economics and replaced its stigmatized wrapper with a culturally-native, aspirational one."** For India specifically, that may be the winning adaptation (see §3).

**The question therefore shifts** from *"why would a consumer buy?"* (largely solved by variety + savings + discovery) to **_"who funds the per-unit discount, and is it sustainable?"_** (§5).

---

## 3. Why deviate from TGTG _[founder]_

1. **Leftover/"sale food" stigma is severe in India.** Combined with generally low restaurant-trust, buying discounted/giveaway food carries real social shame (loose parallel to the cultural weight around handouts/begging, which is highly visible in India). This is a plausible reason a well-capitalized TGTG has not gained ground here despite the model working in Europe. The pivot away from surplus/discount language is a deliberate response to this cultural friction.
2. **The Indian restaurant market is huge and highly fragmented** on both sides — across cuisine, price tier, and ambiance/experience. With that much variability there should be clever, tech-enabled business models beyond what exists. Innovation stalled at Swiggy/Zomato, which became a ~30%-commission duopoly. Thesis: a well-positioned neutral platform will let suppliers and consumers get creative and use it in new ways that the duopoly can't/won't enable.

_[reviewer] Both points are sharp. The stigma insight (point 1) is, I think, the correct and load-bearing reason the "flight/sampler" reframe is right for India — it is a cultural adaptation, not just marketing gloss. Point 2 is directionally right about the opportunity (fragmentation + duopoly stagnation + commission pain), with one caution in §6._

---

## 4. Founder's brainstorm ideas, with grades _[founder idea / reviewer grade]_

| # | Idea | Reviewer grade |
|---|---|---|
| 1 | Restaurants offer **~30% more quantity** ("no additional cost" to the restaurant). | **Right instinct, one caveat.** Food cost is low (~30% of menu → 30% more food is a few rupees), but the real cost is **labour to curate/portion variety**, which is not free. It only stays near-free with *batch curation* (every bag in a drop is the same combo, batch-prepped, not per-order). The template engine already enables this — protect it. |
| 2 | Restaurants offer **variety (3+ SKUs)**, ~50% portion each → customer gets ~150% volume of a typical order for ~75–80% cost. Sampling a large slice of a menu affordably; reinforces discovery/adventure. | **Core of the product. Endorse fully.** This is the single strongest idea; it resolves the motivation vacuum and re-introduces real economic value under an aspirational frame. |
| 3 | **"Flights"** (like beer/wine flights): 3 small pours instead of one regular order, applied to food. | **Best framing in the thread — and stronger than pitched.** India already has and loves this format: the **thali**. A BAM Bag as a *chef's tasting thali / flight* is culturally native, aspirational, and impossible to read as "surplus." Recommend building the entire brand on this metaphor. |
| 4 | **Reveal 1 of 3 SKUs, keep 2 a surprise.** | **Endorse.** A tunable "risk dial": kills the total-gamble objection (you know one thing you'll like), keeps the adventure, and quietly de-risks allergen/aversion. Make it restaurant-configurable. |
| 5 | **Multi-restaurant aggregation** — 2+ restaurants co-create surprise bags; ad-hoc neighbourhood associations; a "community food-fest / tents-in-a-park" discovery experience in a bag. | **Most differentiated idea = a genuine moat** (nobody — Swiggy, TGTG — does a food-crawl in a bag). But operationally brutal (revenue splits, cross-kitchen QC, shared pickup, customer ownership). **Phase 3.** Lighter v1: a bundled "neighbourhood route" — separate bags from 2–3 nearby kitchens picked up on one trip — same discovery, far less ops risk. |
| 6 | At hold time, customer specifies **preferences (~3); restaurant tries to honour them; variable pricing** if preferences are met at checkout. | **Handle with care.** Full per-customer preferences **break the batch economics** that make drops cheap (turns a batch back into à la carte). Keep preferences *coarse and pre-batchable* (veg/non-veg, no-nuts, spice level — largely already supported). "We-filled-your-wish" surcharge risks nickel-and-diming; shelve until there's pricing power. |

---

## 5. Unit economics — who funds the discount? _[reviewer]_

The variety/flight framing solves *positioning*, but positioning does not change *who pays for the ~50% per-unit discount*. Only two sustainable funding sources exist:

1. **Genuine surplus / end-of-batch food** — near-zero marginal cost, so the discount is effectively free to the restaurant. Honest and cheap; reintroduces a faint "is this leftover?" risk, mitigated by fresh variety + reveal-one (#4) + brand.
2. **A deliberate acquisition budget on freshly-made food** — the restaurant eats the discount *as marketing spend*, justified only if the sampler drives downstream full-price repeat business.

**The key reframe for the B2B pitch:** the BAM Bag is **not a margin product — it is a menu-discovery funnel.** A customer affordably samples 3 dishes, loves one, and converts to a full-price repeat orderer of *that dish* (in-restaurant or on the aggregators). The bag's thin margin is irrelevant; the ROI is the **downstream conversion**, acquired at ~15% + a food discount instead of Swiggy's ~30% + commoditization + no customer relationship. This makes the founder's "no additional cost" instinct (idea 1) roughly true — **but only if the funnel is measured.**

### Illustrative math (one restaurant, avg SKU menu price X = ₹200)
- Flight = 3 SKUs × ~50% portion = 1.5 SKU-equivalents ≈ ₹300 of menu value.
- Priced at ~0.75–0.8× a typical single order → ~₹150–160 (≈ a ~47–50% discount on menu value).
- Restaurant food cost ≈ 30% of ₹300 = ₹90.
- Platform commission 15% of ₹155 ≈ ₹23.
- Restaurant net ≈ ₹155 − ₹23 = ₹132; minus food ₹90 = **~₹42 contribution**, before incremental portioning labour/packaging (~₹20–40) → **~₹5–20/bag**, potentially break-even or negative on the bag alone.
- **Therefore the model is only rational if funded by (a) genuine surplus (marginal cost ≈ 0, contribution jumps to ~₹110/bag) or (b) downstream LTV** (e.g. even 20–30% sample→full-price-repeat within 60 days beats a cold Swiggy acquisition at 30%).

_[open] Which funding source is the intended default — surplus, acquisition budget, or a blend? The honest best-of-both is likely: restaurants use genuine end-of-batch abundance, framed as flights. This must be decided; it drives pricing, partner messaging, and whether "no additional cost" holds._

_[open] Instrumentation: sample→repeat conversion must be tracked from day one, or the core ROI claim is unprovable._

---

## 6. Strategic cautions _[reviewer]_

1. **"Provide rails and creativity emerges" is a phase-3 luxury, not a v1 strategy.** Marketplaces bootstrap on one crisp, opinionated, forcibly-merchandised use case — not emergent supplier creativity. (Shopify nailed one flow before enabling infinite ones.) Ideas 5 and 6 are the emergent future; earn them after density. **Phase 1 needs one sentence a Hyderabad techie understands instantly:** *"An affordable chef's tasting flight from a great kitchen, reserved and ready for pickup."* Force that.
2. **Labour/curation, not food cost, is the binding constraint.** Preserve batch curation (same combo per drop). Anything that fragments it (idea 6 taken too far) erases the economics.
3. **Consistency & food safety with variety.** More SKUs per bag = more items to keep fresh within a pickup window; more surface area for quality complaints. Curation discipline matters.
4. **Pickup-only friction still has to be earned.** Near-full-experience for a customer who forgoes delivery requires the variety to be worth the trip. **Density (office towers, tight neighbourhoods) is the antidote** — it collapses pickup friction and cold-start simultaneously.

---

## 7. Positioning read on gozaika.in _[reviewer, from the audit]_

**Working:** the B2B page ("a customer-acquisition channel for premium kitchens") is the clearest, most investable copy on the site; trust hygiene is excellent (FSSAI allergens, packed-time/best-before, pickup-only kitchen-fresh); the anti-aggregator, dignity-first stance is a defensible brand and a wedge Swiggy can't easily copy.

**Working against itself:** "mystery" asks the consumer to accept two frictions (no choice + pickup) with no compensating hook *in the current live copy* (the variety/flight reframe fixes this but isn't live yet); heavy proprietary jargon (BAM Bags, Zayka Passport, Swaad Club, Limited Drops) front-loads education; the two audiences are blurred (the more investable B2B story is buried a click behind the consumer surprise-bag page).

---

## 8. Recommended direction & sequencing _[reviewer]_

**Reframe the product from "mystery discount bag" to "affordable chef's tasting flight / thali."** Keep the real savings; change the wrapper. Then sequence:

1. **Single-restaurant tasting flights** (ideas 2 + 3 + 4) — the wedge. Merchandise the thali/flight metaphor hard; make "reveal one, hide two" a restaurant knob; **instrument sample→repeat conversion.**
2. **Swaad Club subscription** as the retention/revenue engine it currently isn't — "a new kitchen's flight every week."
3. **Neighbourhood crawls / multi-restaurant** (idea 5) — the differentiated moat, after density and ops muscle exist. Start with the lighter bundled-route version.

Re-sequence the site so the anti-aggregator B2B story leads, and lead the consumer story with variety/discovery ("sample a great kitchen") rather than "mystery."

---

## 9. Open questions for the team

- Funding source for the discount: surplus vs acquisition-budget vs blend? (§5) — decides pricing + partner messaging.
- Is the restaurant ROI narrative (menu-discovery funnel → downstream full-price conversion) something partners will believe without proof? What's the minimum instrumentation to prove it in the pilot?
- Does the batch-curation constraint hold operationally for premium kitchens at peak, or only off-peak slots?
- Is "flight/thali" the brand, and if so how much of the BAM/Zayka/Swaad jargon survives?
- Pricing architecture: house flight / chef's flight / grand tasting tiers to build an AOV ladder?

**Resolutions (2026-07-05 convergence):** all five closed. Funding source → restaurant-chosen blend via the calculator (§11). ROI proof → the full-price reorder feature *is* the instrumentation; spec in §20. Batch-curation at peak → naturally an off-peak fit; default off-peak, allow peak by restaurant choice (§23). Brand → BAM/Zayka/Swaad stay the brand; thali = composition (§21). Pricing → House / Chef's / Dawat ladder (§22).

---

## 10. Product design — SKUs & portions _[reviewer]_

Illustrative "3 SKUs × 50%" numbers were placeholders. Guidance:

- **SKU count: 3 is the right default** (the cognitive sweet spot for a "flight" — 2 reads as thin, 5+ tips into buffet: costly to portion, harder to keep each item fresh in one window, stops feeling curated). Flex by tier: **duo (2)** for dessert/bakery/tiffin, **grand tasting (4–5)** as a premium tier.
- **Portion % is a product-tier lever, not a constant — and the number chosen decides who the customer is:**
  - ~33–40% each (≈1.0–1.2 total portions) = **solo tasting flight** — taste three properly, minimal waste, lower price, "discovery for one."
  - ~50–60% each (≈1.5–1.8 total) = **shared sampler / thali-for-two** — a meal for ~2, higher price, "value + variety for the table."
  - Decide which is the hero *before* setting the number; they are different buyers at different price points.
- **Visible, distinct portioning matters more than the exact %.** A flight works because you *see* three equal small servings. Anchor on "three clearly-portioned tasting servings," compartmentalized/thali-style presentation — the presentation carries the premium as much as the volume.

---

## 11. The "fill-the-gap" spectrum + the restaurant economics calculator

### 11.1 The spectrum _[founder — core contribution]_
Consumer messaging ("chef's tasting thali") stays **invariant** regardless of how a restaurant chooses to fulfil a bag. Each restaurant fills the ~50% value gap along a **continuous spectrum**, and the optimal blend shifts by neighbourhood, cuisine, clientele, meal daypart (breakfast/lunch/dinner) and season:

- **100% surplus** — fill the entire ~150% volume from surplus raw/semi-prepared/prepared food; treat the bag as pure *additional revenue* at ~zero marginal cost.
- **Blended** — `x%` surplus (≈free) + `y%` semi-prepared food nearing expiry (partial/salvage cost) + `z%` specifically-prepared food (full marginal cost), with the fresh portion justified as **customer-acquisition (CAC) spend**.
- Emphasis on CAC vs surplus flexes seasonally (e.g. push acquisition in slow months, lean on surplus in peak).

**Why this matters:** it decouples consumer positioning + platform brand from restaurant operations. The guest always gets the same great thali; the kitchen optimizes its own economics underneath. This is the concrete form of the "restaurants innovate on the platform" thesis.

_[reviewer] This resolves the §5 funding question — it is not surplus-vs-acquisition (binary) but a restaurant-chosen blend (continuous). It also answers the §6 caution: the worry was asking **consumers** to invent use cases; this instead hands **restaurants** a bounded optimization problem inside one crisp, well-merchandised consumer product. That is constrained innovation, not open-ended emergence — correct for phase 1._

### 11.2 Restaurant economics calculator _[founder idea / reviewer spec]_
A modeling tool on gozaika.in (and the restaurant web app) that lets a restaurant find the profitable configuration for *its* situation — doubling as a B2B sales and onboarding instrument.

- **Inputs:** bag price; SKUs + portion %; full menu value of contents; fill-mix sliders (% surplus / % semi-prep salvage / % fresh-made); cost assumptions (food-cost %, salvage value, fresh marginal cost, packaging, incremental labour/bag); 15% commission; CAC engine (expected sample→repeat conversion %, avg repeat order value, repeat margin); bags/drop, drops/week.
- **Outputs:** per-bag contribution (before/after CAC offset); effective CAC per acquired repeat customer; break-even conversion rate; headline framing — *"this drop turns ₹X of surplus + ₹Y acquisition spend into Z repeat regulars at ₹W CAC — vs ~30% commission for one cold aggregator order."*
- **Cautions:** don't over-build (a two-panel "your economics / your acquisition" tool beats a 30-input sheet); the conversion input is a guess until there's data — ship with sane defaults, then **feed real platform sample→repeat data over time** (turns the calculator from a guess into a data-backed moat; depends on the §5 instrumentation).

---

## 12. Messaging system — "chef's tasting thali" _[reviewer]_

Source-agnostic copy system to apply across all surfaces.

- **Core line:** *"A chef's tasting thali — three dishes, one great kitchen, ready for pickup."*
- **Pillars:**
  - *Variety / discovery:* "Sample three of a kitchen's best in one bag."
  - *Value-through-abundance (not discount):* "More food, more flavours, for less than ordering each."
  - *Dignity / freshness:* "Chef-curated, packed fresh, all allergens disclosed."
  - *Anti-aggregator (B2B):* "Fill your quiet hours and win repeat regulars — without 30% commissions or delivery riders."
- **Reveal-one knob (idea 4):** "Know one dish, discover two."
- **Daypart variants:** breakfast tiffin flight · lunch thali · dinner chef's flight.
- **Naming guidance:** _superseded by §21 (brand & naming architecture)._ In short: brand stays **BAM / Zayka / Swaad**; **thali** is the composition descriptor (the "how"), reinforcing not primary; drop "flight." Retire any residual "mystery = you can't choose" framing in favour of "curated variety / bada zayka."
- **Cultural anchor:** the **thali** — India already understands and loves a plate of small, varied portions; it is impossible to read as "surplus," which is exactly why it defuses the §3 stigma.

---

## 13. Implementation plan (surgical) _[reviewer — handoff]_

To be executed in a **fresh session** (this doc + `launch-readiness-audit-2026-07-05.md` are the handoff). Read each surface before editing; keep app changes minimal and copy/positioning-first — most of the capability (variety via multi-item drops, reveal via the existing "Blind Adventure" type, allergen disclosure) already exists.

1. **gozaika.in** — lead with the anti-aggregator B2B story; reframe the consumer hero to "chef's tasting thali / variety + discovery" (retire "mystery"); add the **restaurant economics calculator**; reduce reliance on proprietary jargon (BAM/Zayka/Swaad) in first-impression copy.
2. **`marketing/banners/banner-restaurant-A4-telugu-hindi-en.html`** and **`marketing/banners/banner-restaurant-A6.html`** — apply the §12 restaurant-side messaging (acquisition + surplus/CAC framing + "your call how you fill it"); keep tri-lingual parity (te/hi/en).
3. **`marketing/explainer/gozaika-explainer.html`** — reframe the explainer around the thali/flight metaphor and the fill-the-gap spectrum for restaurants.
4. **Five app surfaces — surgical, only as necessary:**
   - *Consumer web + mobile discovery/detail:* frame drops as "chef's tasting thali / N dishes"; surface SKU count/variety; "know one, discover two" for reveal drops. Copy-level, not new features.
   - *Restaurant portal + mobile templates/new-drop:* ensure multi-SKU-per-bag + which-are-revealed + portion sizing are expressible; fill-the-gap is an **internal/ops** concept (a private note/config), never consumer-facing.
   - *Calculator:* net-new (site + restaurant web app) — the one larger build.
   - Do a per-file diff plan after reading; do not expand scope.

**Sequencing reminder (from §8):** single-restaurant tasting flights → Swaad Club subscription → neighbourhood crawls. Instrument sample→repeat conversion from day one (feeds both the ROI story and the calculator).

---

## 14. Decisions locked _[founder + reviewer]_

- **Portion/volume = 1.5× ("generous"), NOT branded "thali-for-two."** Indian customer is value-oriented (→ 1.5×), but naming a headcount converts a pleasant surprise into a contractual promise (review-markdown risk) and piles definitive pressure on the kitchen. Signal abundance ("a generous chef's tasting thali," "a proper spread," "more than you'd expect"); never promise a serving count. Under-promise headcount, over-deliver volume.
- **Calculator = prominent but not the hero.** Site calculator reinforces "revenue from what's wasted" (restaurant-safe framing); restaurant web app gets a fuller **decision-support** version on a dedicated tab. The primary brand message stays the values/moral sell (respect food, reduce waste, access to great food for all) — reconciled in §15.

## 15. The two-layer message — moral mission vs product sell _[reviewer]_

Resolves the apparent conflict between "ban consumer-facing surplus/leftover copy" (§3 stigma) and "keep the moral/anti-waste message primary." Split the message by layer:

- **Product layer (what the guest buys):** discovery, variety, generous chef's tasting thali, value. **Never** described as surplus/leftover.
- **Brand/mission layer (why goZaika exists):** respect food, reduce waste, democratize access to great kitchens — framed around **access + honoring food + the restaurant**, never "you (customer) are eating surplus."
- **Asymmetry that makes it safe:** "turn what's wasted into revenue" is *attractive* to restaurants but *stigmatizing* to consumers. So the waste-economics framing + calculator are **B2B-safe (lean in)**; the consumer surface never says surplus.
- Pattern: great product sold on its merits, wrapped in a values mission (Patagonia).

## 16. Quality & allergen conformity — the trust stack _[reviewer]_

**Reviews are the weakest, most-gameable, most-lagging instrument and MUST NOT be the primary control for allergens** — allergens are a safety/legal matter (potentially fatal), not a quality preference. Load-bearing controls, in priority order:

1. **Onboarding gates** — FSSAI verification (have), capture FSSAI hygiene rating, allergen-handling attestation.
2. **Structural, pre-harm allergen controls** — mandatory *structured* allergen declaration at template level, re-confirmed per drop; conservative "union of all SKUs + may-contain" disclosure (variety bags carry *higher* allergen risk); **product-level allergen gate** — wire the already-captured customer dietary/allergen prefs to the claim flow to warn/block on conflict. Reveal-one lowers uncertainty.
3. **Incident/severity system (have — `incident_incident`/`incident_event`, P0–P3)** — the real safety backbone. Allergen/safety complaints route to a fast incident path → review → suspension → delist, **not** to an aggregate star rating. Beef *this* up.
4. **Behavioral, hard-to-fake signals** — repeat rate, refund rate, incident rate, no-show rate.
5. **Verified-purchase-only reviews (have)** as a *supplementary* signal, with anti-manipulation: rate-limits, anomaly detection (5★/1★ bursts, low-trust/new accounts, correlated timing), reviewer-trust weighting, human moderation queue (have PENDING/APPROVED/REJECTED).

Verdict: extend review/comment functionality, but the safety backbone is the **product-level allergen gate + incident system**, not community policing. Allergen violations = zero-tolerance fast track.

## 17. AI in the apps — where it's real _[reviewer]_

- **Low value / me-too** (restaurants get it free externally): title/description/tagline generation. Bundle as a cheap convenience, not a strategy.
- **High value / defensible** (needs goZaika's proprietary data):
  - **Drop decision-support** — compose bag + price + quantity from neighbourhood/daypart/sell-through/surplus (the calculator's smart sibling).
  - **Surplus → bag auto-composition** — input surplus → balanced, allergen-coherent flight (+ copy for free).
  - **Allergen safety cross-check** — flag declared-vs-listed omissions. **Assist/flag only; human confirms; never authoritative** (hallucination = danger).
  - **Passport-based personalized discovery + grounded gamification** (honesty rules: no fabricated state).

Verdict: build the data-advantaged uses; copy-gen is a throw-in. AI advisory, human-in-loop, never auto-publishes allergen-critical content.

## 18. Home cooking adjacency — verdict: not now _[reviewer]_

Home cooks selling on the platform is a *different business* — different trust/safety/licensing regime, different supply, brand collision with the premium/chef/dignity positioning. Founder correctly won't loosen the license burden. **Keep the wedge pure: licensed restaurants only through launch**; adding unlicensed home cooking multiplies safety/regulatory surface exactly when you can least afford it. Conditional future: the drops/pickup/verification/allergen **rail generalizes to any FSSAI-licensed micro/cloud kitchen** — a phase-N supply expansion on the same infrastructure, still licensed. Unlicensed home cooking = no.

## 19. Where composition lives — template vs drop _[founder question / reviewer]_

Split by job, because templates (stable, reusable) and surplus (dynamic, perishable) have opposite lifecycles. Freezing today's surplus into a reusable template is a category error.

- **Template time = the reusable *archetype* + constraints:** count (e.g. 3-item flight), dietary, spice, portion profile (1.5× "generous"), **allergen envelope** (union of anything that could ever be in this archetype), price band, presentation, and reusable copy. AI here suggests a coherent/balanced/allergen-consistent archetype + writes the reusable thali/flight copy **once** (the one place the otherwise-me-too copy-gen is genuinely useful).
- **Drop time = fill the archetype from today's actual surplus:** map on-hand surplus/semi-prep/fresh to the archetype's slots; internal-only; feeds the economics calculator (fill mix). AI checks the fill against the template's declared allergen envelope.

**Safety payoff (ties to §16):** the allergen envelope is declared once at template time; per-drop substitution is *bounded* within it, so a same-envelope swap can never violate a customer's disclosed allergens, and out-of-envelope surplus is flagged/blocked. Composition-in-template = the guardrail; fill-in-drop = the flexibility.

**Concept:** the "surprise" is not only marketing — it is the **operational slack** that makes surplus-filling possible. A fixed-menu bag can't absorb variable surplus; a loose "chef's tasting flight" archetype can. So surplus-fed templates should be deliberately *loose/slot-based, not rigid recipes*. Consumer framing (discovery) and ops model (surplus flexibility) are the same degree of freedom.

**Phase-1 caution:** do NOT over-engineer formal slots. Minimal version — template declares *count + allergen envelope + dietary/portion + reusable copy*; drop optionally records the fill (internal note). This is the one app change in the set that is more than cosmetic — scope it tightly; add structured slots later only if AI composition warrants.

## 20. "Order Again" — post-taste full-price reorder (MVP spec) _[founder idea / reviewer spec]_

**Purpose:** the reorder action *is* the ROI instrumentation — it converts the unprovable "menu-discovery funnel" claim into a measured, per-item conversion event. Also incremental revenue (full price → 15% to platform). Design principle: **reuse the existing drops→hold→pay→pickup rails; it is a customer-initiated single-item pre-order, not a new ordering engine.**

- **Entry points:** order detail ("Get the [dish] you loved"), passport/discovery, and a **post-pickup outbound nudge** (SMS/push) with a deep link into the one-tap reorder.
- **"Menu" = zero catalog build:** reorderable items are exactly the SKUs that have appeared in this restaurant's templates.
- **Order model:** single-item **pre-order for the restaurant's next/scheduled pickup window** (not on-demand); **full price**; reuses hold → pay (Razorpay/simulator) → pickup-OTP. Reorders surface in the **same Orders/counter queue** the restaurant already uses.
- **SMS = one-way nudge, not two-way parsing.** Outbound "loved it? → [link]" is cheap, impulse-timed, and signals restaurant commitment. Two-way "reply YES to buy" (inbound parsing) is a **fast-follow only** if link CTR is weak — it adds build/cost and depends on SMS infra (currently `NOTIFICATION_DRY_RUN=true`; must be live for any nudge channel).
- **Instrumentation:** log sample (BAM containing item X) → reorder (full-price item X) within N days, item-level. This is the pilot ROI metric.
- **Explicitly OUT of scope (the trap to avoid):** on-demand ordering, delivery, full menu catalog, POS/kitchen integration, two-way SMS parsing (fast-follow only).
- **Future levers (not v1):** Zayka Passport tier perk on reorders; reorder as a Swaad Club hook.

## 21. Brand & naming architecture _[founder — supersedes §12 naming]_

- **Brand = the "what": BAM / Zayka / Swaad.** Emotional territory = great taste, great food, discovery, *maza* (fun), *bada* (generous). **BAM = "Bada Zayka Ayega Maza."**
- **Thali = the "how": composition** — a plate of varied portions. Reinforcing/secondary, culturally native (pairs with Zayka). **Drop "flight"** (Western pub metaphor; fights the brand).
- **Coherence to protect:** *"Bada"* already promises generous portions, so the **name itself delivers on the 1.5× decision** (§14). The brand line, the flavour promise, and the portion guarantee are one phrase.
- Retire "mystery = you can't choose"; use "curated variety / bada zayka / discovery."

## 22. Pricing ladder _[founder + reviewer]_

Good-better-best AOV ladder, tiers tied to SKU count / portion / premium-ness:
- **House Thali** — everyday, house selection (~3 items).
- **Chef's Thali** — chef's picks / premium SKUs (~3–4 items).
- **Dawat** (feast) — grand tasting, celebration (~4–5 items), highest AOV.

**Dawat** reads premium without reading "expensive," signals feast/abundance/celebration, and **anchors the ladder high** — making Chef's Thali feel accessible. Exact tier names are the founder's call; Dawat for the top is endorsed.

## 23. Batch-curation — definition & peak/off-peak _[reviewer]_

**Batch-curation** = the restaurant prepares *one standard bag composition for the whole drop, assembly-line style* (all bags in tonight's drop are identical), not per-customer customization. This is what keeps per-bag labour near-zero (and why per-customer preferences, idea 6, are dangerous — they revert to à la carte).

**Peak vs off-peak:** it is primarily an **off-peak fit, and that's a feature.** At peak the kitchen competes for the same hands (dine-in/delivery); off-peak (post-meal lull, pre-close) the kitchen has slack *and* surplus is clearest → bags are nearly free to make. Aligns with the "fill your quiet hours" B2B pitch. **Default/encourage off-peak; allow peak by restaurant choice** (the calculator's CAC lens lets them justify a peak acquisition drop).

## 24. The surprise does triple duty — guard it _[reviewer — model-hardening insight]_

The surprise/variety is load-bearing in three independent ways:
1. **Consumer framing** — discovery, *maza*.
2. **Operational slack** — lets variable surplus fill the bag (§19).
3. **Anti-cannibalization (protects the whole ROI thesis)** — because you can't reliably get item X in a BAM (surprise, limited, reveal-one), the discounted bag is **not a substitute** for the full-price reorder (§20). A customer who wants X specifically will reorder at full price rather than gamble. **If bags were predictable, savvy customers would farm cheap food and never convert — the funnel collapses.**

Implication: "surprise" is not a droppable marketing gimmick. **Guarding the unpredictability is guarding the revenue model.** Do not let templates become fixed/predictable recipes (ties to §19's loose-archetype principle).

---

### Changelog
- **2026-07-05** — Initial doc. Captures launch-audit-derived diagnosis, founder's TGTG-deviation reasoning, six brainstorm ideas with grades, the "stigma-laundered discount" reframe, unit economics, cautions, and recommended sequencing.
- **2026-07-05 (2)** — Added §10 SKU/portion design, §11 fill-the-gap spectrum + restaurant economics calculator (founder's core contribution), §12 "chef's tasting thali" messaging system, §13 surgical implementation plan / handoff for the 4 marketing/app targets.
- **2026-07-05 (3)** — Added §14 locked decisions (1.5× "generous" not "for-two"; calculator prominent-not-hero), §15 two-layer moral/product message reconciliation, §16 quality & allergen trust stack, §17 AI opportunities (data-advantaged vs me-too), §18 home-cooking adjacency verdict.
- **2026-07-05 (4)** — Added §19: composition splits template (reusable archetype + allergen envelope + copy) vs drop (dynamic surplus fill); envelope-bounds-substitution safety tie-in; "surprise = operational slack"; phase-1 keep-it-light caution.
- **2026-07-05 (5)** — Convergence: closed all §9 open questions. Added §20 "Order Again" reorder MVP spec (reorder = ROI instrumentation; single-item pre-order on existing rails; one-way SMS nudge; OMS out of scope), §21 brand & naming architecture (BAM/Zayka/Swaad = brand; thali = composition; "Bada" delivers the 1.5×), §22 pricing ladder (House/Chef's/Dawat), §23 batch-curation defined + off-peak fit, §24 the surprise does triple duty (framing + surplus slack + anti-cannibalization). Refined §12 naming to defer to §21.
- **2026-07-05 (6)** — Implementation kickoff. Added §0 (brief + ordered build sequence) at top; created `docs/audit/implementation-kickoff-prompt.md` (paste-ready session prompt). Verified tooling live: Pixel 7a + both apps, Chrome MCP, local Docker Supabase, and HOSTED test-OTP login (+919876510001/100001 → session), which resolves audit blocker CW-2/RP-3 for testing. Model guidance (Opus for logic/debug, Sonnet for spec'd mechanical), SMS-provider rec (MSG91 + WhatsApp over Twilio for India), and confirmation that all SMS/OTP function points are testable without a live provider.
- **2026-07-05 (7)** — Owner locked all open items. Prompt updated: branch `claude-feature-parity` off main + git handoff (docs committed at 8683660 on codex/docs-marketing-rebaseline-bc); branch-push = Vercel preview + remote migrations authorised, merge-to-main = prod (ask first); `PAYMENTS_SIMULATOR_ENABLED=true` set (Vercel Shared; verify post-deploy, disable at Razorpay launch); imagery = web-search demo images + AI edits (swap to licensed pre-commercial-launch); a11y human sign-off deferred to owner post-impl; 32 expired holds released once this session (Cron deferred to owner); SMS provider deferred. Added mobile-build note (release builds on device — client changes need rebuild) + branch-base note.
