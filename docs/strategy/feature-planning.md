# goZaika Feature Planning

Living document. Updated as features are explored, scoped, and implemented.

---

## Feature Table

| # | Feature Name | Concept | UX References | Status |
|---|---|---|---|---|
| A | Restaurant Search & Map Discovery | Expedia-style sidebar filters, sort, list/map toggle, Google Maps with drop-count pins | Expedia Hotels, Zomato | Prompt drafted |
| B | Ratings & Reviews | Full review lifecycle — post-order submission, moderation queue, public display with category scores | Expedia Guest Reviews, Zomato Reviews | Prompt drafted |
| C-Detail | Restaurant Detail Page | Expedia hotel detail — photo gallery, tabbed content (Overview / Active Drops / History / Reviews / Location), sticky claim panel, mobile bottom bar | Expedia Hotel Info, Zomato Restaurant Page | Prompt drafted |
| C-Discovery | Cuisine & Food Adventure Discovery | Serendipitous discovery of cuisines and kitchens the user has never tried. FOMO is social: "be the person at the table who found that hidden Chettinad kitchen." Flavor Diversity Score, Cuisine Passport, weekly adventure pick, shareable discovery cards. | Spotify Discover Weekly, Airbnb Experiences | Prompt drafted — see below |
| D | Gamification & FOMO Mechanics | Zayka Passport tiers (BRONZE→PLATINUM), drop urgency signals, "Closing Soon" feed, "Drops You've Missed" section, Discovery Score, streak nudges | Duolingo, Spotify | Prompt drafted |

---

## Feature C-Discovery — Full Concept

### The Insight

Most food apps optimize for convenience: find what you already like, order fast, repeat. goZaika has a structural advantage that no convenience app can replicate: the BAM Bag lowers the commitment threshold (it's a fraction of a full meal cost) while the Limited Drop mechanic creates genuine scarcity. Together these unlock a behaviour most food apps never access — **adventurous first-time cuisine exploration**.

The FOMO here is not about missing a deal. It is about missing an *experience you could have talked about*. The person who discovered a Bohri kitchen tucked into Kondapur, or the only Sindhi thali drop in Hyderabad, has social currency — at a bar, at a dinner party, in a work kitchen. goZaika should make that feeling of discovery its core consumer identity.

### The Water Cooler Effect

Target moment: user tells a colleague "I tried this Chettinad place last week via goZaika — it's run out of a home kitchen in Banjara Hills, you've never heard of it, it only does 12 bags a week."

Platform role:
- Surface cuisines, kitchens, and neighbourhoods the user genuinely would not have found themselves
- Give users the language and social proof to share the discovery ("verified by 14 other explorers this week")
- Make it feel like the platform found *this* for *you*, not algorithmic product placement

### What Already Exists in the DB (no new tables needed for core features)

| Existing table | What C-Discovery uses it for |
|---|---|
| `master_cuisine` | The full "cuisine universe" (BIRYANI, MUGHLAI, CHETTINAD, SINDHI, JAIN, etc.) |
| `restaurant_cuisine_map` | Maps each restaurant to one or more cuisines |
| `order_order` (status = COLLECTED) | User's actual cuisine history (what they have eaten) |
| `geo_neighborhood` | Neighbourhood discovery: city → area → drops concentration |
| `consumer_passport_stat` | `total_restaurants_visited` already computed |
| `consumer_saved_restaurant` | "Following" a kitchen — foundation for next-drop alerts |
| `analytics_event` | Track discovery interactions (cuisine.explored, adventure_drop.claimed) |
| `drop_drop` (drop_type_code) | Can add BLIND_ADVENTURE type (requires 1 migration) |

### Feature Components

#### 1. Tried vs Untried Cuisine Map

A visual "Cuisine Wheel" or grid showing every cuisine on the platform.

- **Tried**: illuminated with the cuisine colour, shows count of bags
- **Untried**: greyed silhouette with a "Undiscovered" label
- Summary line: "You've explored 3 of 11 cuisines available in Hyderabad"
- Click any untried cuisine → Discovery Mode filtered to that cuisine

Empty state (0 collected orders): "Start your flavour journey — every cuisine you try lights up your map."

#### 2. Flavour Diversity Score (0–100)

A single number that captures breadth + depth of exploration. Computed client-side from order history and passport stats. Formula:

```
cuisineBreadth   = (distinct_cuisines_tried / total_available_cuisines) × 40   // max 40
geoBreadth       = (distinct_neighborhoods / total_active_neighborhoods) × 30  // max 30
volumeDepth      = min(total_bags_collected, 30) / 30 × 20                     // max 20
engagementBonus  = min(approved_reviews, 3) / 3 × 10                           // max 10
score            = sum of above, rounded to integer
```

Score labels (shown as personality title, not a rating):

| Score | Label |
|---|---|
| 0–20 | Home Comfort — you know what you love |
| 21–40 | Local Explorer — branching out |
| 41–60 | Spice Voyager — boldly selective |
| 61–80 | Flavour Nomad — crosses borders willingly |
| 81–100 | Culinary Ambassador — maps the unmapped |

The score is **shareable** (see §6). It is explicitly *not* a ranking — it celebrates all play styles. "Home Comfort" is not a shame label.

Note: this score is **distinct** from the Zayka Passport tier (Slice D). Passport = volume (how many bags). Discovery Score = diversity (how many different things). A customer can be PLATINUM tier with a low Discovery Score (loyal to Biryani) or BRONZE tier with a high score (adventurous newcomer). Both identities are celebrated differently.

#### 3. "Your Next Food Adventure" — Daily Recommendation

A single highlighted recommendation on the home feed and discovery page.

**Algorithm** (server-side, stateless, computed per-request):
1. Find all active drops
2. Exclude drops from restaurants the user has a COLLECTED order with
3. Exclude cuisines the user already has ≥ 2 COLLECTED orders in
4. Rank remaining by: (is restaurant followed by user's friends? → not yet) → recency of restaurant joining platform + cuisine rarity (fewest platform orders city-wide) + proximity to user (if location permitted)
5. Return top pick

**Card design** (distinct from standard DropCard — it's an "adventure card"):
- Dark forest-green background with gold accent
- Large headline: "Your next food adventure"
- Sub-headline: "{cuisine} · You've never tried this"
- Restaurant name + neighbourhood
- Drop pickup window + price
- "Claim the adventure" CTA (saffron button)
- Small social proof: "{N} first-time explorers claimed this cuisine this week"

**If user has no order history:** Show "Explore something unexpected today" with 3 curated picks.

#### 4. Neighbourhood Food Stories (Discovery Feed Cards)

Editorial-style cards (using `marketing_cms_spotfeature` or a lightweight local config) that read like micro-journalism:

> "Kondapur has Hyderabad's only Bohri kitchen doing BAM Bags. 23 people discovered it this month."

> "There are 4 Jain drops active today in Banjara Hills — most goZaika customers have never tried Jain cuisine."

These are not ads. They are facts derived from platform data. They make the platform feel like it knows the city.

#### 5. Shareable Discovery Cards ("Flavour Report")

A monthly or on-demand card the user can generate and share on WhatsApp / Instagram Stories.

Content:
- "This month I discovered [N] new cuisines on goZaika"
- Lists cuisine names + restaurant names
- Shows their Flavour Diversity Score with label
- goZaika brand footer + "Find your next drop at gozaika.in"

**Technical**: generated client-side using `html2canvas` or a server-side `/api/discovery/share-card?token=...` that returns a PNG. The PNG is pre-composed, not a live page screenshot.

#### 6. Blind Adventure Drop Type

A new drop_type_code = `BLIND_ADVENTURE` (1 DB migration to add to check constraint).

Rules:
- Restaurant sets dietary category (VEG / NON_VEG / JAIN / EGG_ONLY) — this is always disclosed
- Allergen summary is always disclosed (required by platform rules)
- **Cuisine is hidden until after pickup** — shown as "Mystery Cuisine" on the card
- After COLLECTED order: platform reveals the cuisine and prompts "You discovered {cuisine}! Add it to your Passport." with an animated stamp
- Price: same as standard BAM Bags
- Admin must approve this drop type before it goes live (flag in admin)

This is the highest-intensity adventure mechanic. Not every restaurant needs to use it. It is opt-in per drop, not per restaurant.

#### 7. "What Explorers Are Eating" — Aggregate Social Proof

Aggregate (never individual) stats surfaced on discovery pages:

- "18 first-time explorers tried Mughlai cuisine in Hyderabad this week"
- "Banjara Hills had 3 new cuisine discoveries per day this week"
- "This Chettinad kitchen has been claimed 41 times — 67% were first-time tries"

These numbers come from aggregated `order_order` data — no PII. They are computed in an API route, not in the client. The framing is always "explorers", not "users" or "customers."

---

## Implementation Notes

### API Routes Required (C-Discovery)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/account/discovery-profile` | GET | Required | User's tried cuisines, untried cuisines, Flavour Diversity Score, neighbourhood history |
| `/api/drops/adventure-pick` | GET | Optional (personalised if authed, generic if not) | Single recommended "adventure" drop |
| `/api/discovery/cuisine-stats` | GET | None | Aggregate stats for "what explorers are eating" (no PII) |
| `/api/discovery/share-card` | GET | Required | Returns PNG of the user's shareable discovery card |

### DB Migrations Required (C-Discovery)

1. Add `BLIND_ADVENTURE` to `drop_type_code` check constraint on `drop_drop`
2. No other schema changes — all logic derives from existing tables

### Phasing

| Phase | What | Dependency |
|---|---|---|
| 1 | `/api/account/discovery-profile` route | None |
| 2 | Cuisine Passport component + Discovery Score UI | Phase 1 |
| 3 | "Your Next Food Adventure" card on home/discovery | Phase 1 |
| 4 | Neighbourhood Food Stories (editorial cards) | Static config, no API |
| 5 | Aggregate social proof stats | Phase 1 (cuisine-stats route) |
| 6 | Shareable Discovery Card PNG | Phase 2 (score computation) |
| 7 | Blind Adventure drop type | DB migration + restaurant portal + admin flag |

---

## Open Questions

1. **Blind Adventure approval gate**: Should admin approve each Blind Adventure drop individually, or just enable the type per restaurant? Recommendation: per-restaurant flag in admin, individual drop still goes through standard moderation.

2. **Discovery Score visibility**: Should the score be public (on the consumer's profile page, visible to others)? Or private (only visible to the user themselves)? Recommendation: private by default, opt-in to share.

3. **"First in your city to try" mechanic**: Worth tracking whether a user is the first person on the platform to try a given cuisine from a given restaurant. Creates a unique "Pioneer" badge. Low DB cost (one query on order_order). Include?

4. **Neighbourhood Food Stories authoring**: Manual editorial (goZaika ops writes them in an admin CMS) vs auto-generated from platform data. Recommendation: auto-generate from data in Phase 1, add CMS editing in a later slice.

---

---

## Testing Protocol

Every feature must be visually verified at both desktop and mobile viewports before
it is considered done. Type-check and build passing is a necessary but not sufficient
bar — layout correctness requires eyes on the rendered output.

### Test Environment

| App | Command | Port |
|---|---|---|
| consumer-web | `npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run dev` | 3000 |
| restaurant-mgmt-web | `npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/restaurant-mgmt-web run dev` | 3001 |
| admin-web | `npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/admin-web run dev` | 3002 |
| consumer-mobile (Expo web) | `npm.cmd --workspace @gozaika/consumer-mobile run web` | 8081 |
| restaurant-staff-mobile (Expo web) | `npm.cmd --workspace @gozaika/restaurant-staff-mobile run web` | 8082 |

Browser testing uses the **Claude in Chrome** extension (already open). Expo web runs
in Chrome at 390×844 viewport — no physical device or simulator required.

### Viewports

| Viewport | Width × Height | Used for |
|---|---|---|
| Desktop | 1440 × 900 | All web apps |
| Mobile | 390 × 844 | All web apps + Expo web (ports 8081/8082) |
| Tablet | 768 × 1024 | Only if a distinct tablet breakpoint is implemented |

### Testing Cadence

Test each slice immediately after implementation, not at the end.

| After implementing… | Test these surfaces |
|---|---|
| Slice B (Reviews) | Review submission, review display, admin moderation queue |
| Slice C-Detail | Restaurant detail page, all tabs, claim panel |
| Slice A (Discovery) | Discovery page, filters, map view |
| Slice C-Discovery | Cuisine passport, adventure card, share card PNG |
| Slice D (Gamification) | Passport page, urgency signals, home feed |
| Any mobile screen change | Expo web at 390px before continuing |

### Stop Conditions

Do not mark a slice done if any of the following are true:

- A primary user flow is broken
- Horizontal overflow at 390px or 1440px (`scrollWidth > clientWidth`)
- A required UI element is missing or unreachable at either viewport
- Uncaught JS errors in the Chrome console on load or interaction
- Expo web crashes or shows a blank screen on a changed screen

### Evidence Required in Final Response

- Screenshot table: Page / Screen → Viewport → Pass/Fail → scrollWidth vs clientWidth
- One desktop screenshot (1440px) per new or significantly changed page
- One mobile screenshot (390px) per new or significantly changed page
- One Expo web screenshot (390px) per changed mobile screen
- Before + after screenshots for any layout regression found and fixed
- Chrome console error summary (must be zero uncaught errors)

---

*Last updated: 2026-05-28*
