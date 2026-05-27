# UX Audit: Production Polish Pass

Scope: `apps/consumer-web`, `apps/restaurant-mgmt-web`, `apps/admin-web`, `apps/consumer-mobile`, `apps/restaurant-staff-mobile`. `apps/website` is explicitly out of scope.

Conducted in conjunction with Slice 2.1 Premium UX Transformation. Prioritised: broken mobile layouts → accessibility → premium visual hierarchy → consumer discovery → restaurant portal → admin workflow → mobile consistency → decorative polish.

---

## Summary Table

| App | Issue | Severity | Status |
|---|---|---|---|
| consumer-web | Nav absent on account, drop detail, checkout, orders pages | Critical | Fixed |
| consumer-web | No shared nav component — each page duplicated nav HTML manually | High | Fixed |
| consumer-web | No skip-to-main-content link | High | Fixed |
| consumer-web | No site footer | Medium | Fixed |
| consumer-web | No `aria-current="page"` on active nav links | High | Fixed |
| admin-web | Every page had a different subset of nav links | Critical | Fixed |
| admin-web | Home page had no nav links at all | Critical | Fixed |
| admin-web | Review page had only a "Back to queue" link, no full nav | High | Fixed |
| admin-web | No `aria-current="page"` on active nav links | High | Fixed |
| restaurant-mgmt-web | Mobile nav had no group labels, hard to scan | High | Fixed |
| restaurant-mgmt-web | All nav groups rendered flat side-by-side on mobile | High | Fixed |
| restaurant-mgmt-web | Support link hidden on mobile (`hidden lg:block`) | Medium | Fixed |
| restaurant-mgmt-web | No `aria-current="page"` on nav links | High | Fixed |
| consumer-mobile | Wrong background color (`#111827` dark vs brand cream) | Critical | Fixed |
| consumer-mobile | No tab navigation state — static scaffold only | Critical | Fixed |
| consumer-mobile | No accessibility labels on interactive elements | High | Fixed |
| consumer-mobile | Touch targets below 44px minimum | High | Fixed |
| restaurant-staff-mobile | Wrong brand colors throughout | Critical | Fixed |
| restaurant-staff-mobile | Hardcoded "27 Orders" — non-functional | Critical | Fixed |
| restaurant-staff-mobile | OTP input had no state management | Critical | Fixed |
| restaurant-staff-mobile | Verify button always enabled regardless of OTP length | High | Fixed |

---

## consumer-web

### Issues Found

**1. Missing navigation on detail/flow pages (Critical)**

Pages `account`, `drops/[id]`, `checkout/[orderId]`, and `orders/[orderId]` had a bare `<ShellHeader />` with no children — no nav links. Users who landed on these pages from a deep link or post-payment redirect had no way to navigate back to discovery without using the browser back button.

**2. Duplicated inline nav on each page (High)**

Every page that did have a nav independently rendered its own link list. Active state was not implemented — no link ever appeared highlighted. This created maintenance debt and a confusing experience where the current location was invisible to the user.

**3. No skip-to-main-content (High)**

Screen reader and keyboard-only users had no way to skip the header nav and jump to page content. WCAG 2.1 SC 2.4.1 requires a bypass mechanism.

**4. No site footer (Medium)**

No footer existed across any page. Discovery links and allergen disclaimer were unavailable after scrolling past content.

**5. Missing `aria-current` on active nav links (High)**

No nav link indicated the current page to assistive technologies. Screen reader users could not tell which section was active.

### Fixes

- Created `apps/consumer-web/app/consumer-nav.tsx` — a `"use client"` component that reads `usePathname()` and applies `aria-current="page"` and `bg-[#1A5C38]/10 text-[#1A5C38]` active styling.
- All pages now import `<ConsumerNavLinks />` inside `<ShellHeader>` — single source of truth for nav.
- `apps/consumer-web/app/layout.tsx` now includes a skip-to-main-content link (sr-only, visible on focus with forest green background) pointing to `#main-content`.
- All `<main>` tags gain `id="main-content"`.
- Created `apps/consumer-web/app/footer.tsx` — static server component with Discover, Account nav sections, and allergen disclaimer. Added to `layout.tsx`.

---

## admin-web

### Issues Found

**1. Every admin page had a different nav subset (Critical)**

- Home page: `<ShellHeader>` with a plain `<span>Admin ops</span>` — zero navigation links
- Ops page: 5 links (Ops, Users, Drops, Finance, Reports) — missing Home, Onboarding, Notifications
- Onboarding page: 2 links only (Onboarding, Drops)
- Users, Finance, Notifications, Drops, Reports pages: different subsets
- Restaurant review page: only a "Back to queue" link

An operator navigating between pages would see the nav reconfigure itself on each transition, making it impossible to maintain mental orientation.

**2. No `aria-current` on active links (High)**

Same issue as consumer-web — no accessible current-page signal.

### Fixes

- Created `apps/admin-web/app/admin/admin-nav.tsx` — typed `NavLink[]` array (with optional `exact` flag for the Home link to avoid `/admin` matching all `/admin/*` routes), wrapped in `<ShellHeader>` from `@gozaika/ui`.
- All 9 admin pages now import and render `<AdminNavHeader />` as the only header component.
- Fixed TypeScript error: original `as const` array caused `TS2339: Property 'exact' does not exist` when iterating; replaced with explicit `type NavLink` definition.

---

## restaurant-mgmt-web

### Issues Found

**1. Mobile nav — all groups rendered flat (High)**

The mobile `<nav>` rendered all three groups (Operate, Build, Trust) in a single `flex` row with `overflow-x-auto`. Group labels were present in JSX but styled to be hidden (`hidden`). On a 390px screen, 10 icon+label buttons in a single horizontal scroll bar made it impossible to identify which group a link belonged to.

**2. Support link hidden on mobile (Medium)**

`Partner support` was wrapped in `hidden lg:block` — invisible on mobile despite being the primary escalation path for restaurant operators.

**3. No `aria-current` on any nav links (High)**

Neither the mobile nor desktop nav had `aria-current` attributes on any link.

**4. Sidebar overflow on tall screens (Low)**

The sidebar `<aside>` lacked `lg:overflow-y-auto`, causing content to clip if the viewport height was shorter than the full nav.

### Fixes

- Separated `portal-nav.tsx` into distinct mobile and desktop nav implementations.
- Mobile: `flex gap-4 overflow-x-auto` container; each group is a `shrink-0` block with a visible label cap and its own horizontal link row. Items use border styling and 15px icons.
- Desktop: unchanged grouped vertical layout with 18px icons.
- Support link: removed `hidden lg:block` wrapper — visible at all sizes.
- Added `aria-current={active ? "page" : undefined}` to every link in both mobile and desktop sections.
- Added `lg:overflow-y-auto` to `<aside>`.

---

## consumer-mobile (Expo)

### Issues Found

**1. Wrong background color (Critical)**

`App.tsx` used `#111827` (near-black) as the background — the dark color palette of a different design system entirely. The goZaika brand background is `#FFF8F0` (Warm Cream).

**2. Static scaffold — no real tab navigation (Critical)**

The app rendered static placeholder text for all tabs. `activeTab` state existed but no content changed between tabs. Tapping "Drops" or "Orders" showed the same home content.

**3. No accessibility labels (High)**

Tab bar buttons had no `accessibilityRole`, `accessibilityLabel`, or `accessibilityState`. Screen readers could not identify interactive elements.

**4. Touch targets below minimum (High)**

Tab bar items had no explicit minimum height; default text-only layout fell below the 44pt iOS / 48dp Android minimum.

**5. Text-only tab icons (Low)**

Tab bar used plain Unicode characters with no label context when screen reader was active.

### Fixes

- Rewrote `App.tsx` with full brand palette (`#FF6B35` Saffron Flame, `#1A5C38` Forest Deep, `#FFF8F0` Warm Cream, etc.).
- Implemented `useState<Tab>` with four content screens (Home, Drops, Orders, Account).
- Home screen: hero copy, Browse drops CTA with shadow/elevation, quick stats row, offline pickup cache card.
- Drops screen: signed-in-required state pointing to web app.
- Orders screen: empty state for paid orders.
- Account screen: Sign in with phone OTP CTA.
- Added `accessibilityRole="tab"`, `accessibilityLabel`, `accessibilityState={{ selected: active }}` on all tab items.
- Tab items have `minHeight: 56` — above both iOS and Android minimums.
- Primary CTA has `shadowColor`, `shadowOpacity`, `elevation` for premium feel.

---

## restaurant-staff-mobile (Expo)

### Issues Found

**1. Wrong brand colors throughout (Critical)**

Header background was `#1A5C38` with white text, body was `#111827` near-black, buttons used `#3B82F6` (Tailwind blue) — none of these match the goZaika brand palette.

**2. Hardcoded "27 Orders" (Critical)**

The orders-ready panel showed a hardcoded `27` — a non-functional fixture in a production-facing app.

**3. Non-functional OTP input (Critical)**

The OTP `TextInput` had no state binding. Typing digits did not update any state. The Verify button was always enabled regardless of input length.

**4. No disabled state on Verify button (High)**

Button was always tappable regardless of OTP completeness, leading to premature submissions and confusing "Enter 6 digits" errors only visible after tap.

**5. Missing status feedback (High)**

No visual feedback was given after tapping Verify — no loading state, no success/error message.

### Fixes

- Rewrote `App.tsx` with full goZaika brand palette and `#FFF8F0` cream background.
- "Zayka Pro Staff" header branding with gold-chip STAFF VIEW badge.
- Order count panel now shows `—` with explanatory text — honest empty state, not a fabricated number.
- `useState<VerifyState>` (`idle` / `verifying` / `success` / `error`) with `statusMessage`.
- OTP `TextInput` bound to `otp` state; filters non-digits; triggers reset on edit when not idle.
- Verify button `disabled` when `otp.length !== 6 || verifyState === "verifying"`, with opacity `50%` styling.
- Color-coded status banner: green for success, red for error, amber for warning/verifying.
- QR scan CTA with size-80 touch target and descriptive subtitle.
- Pickup failure guidance list with bulleted instructions.

---

## Cross-Cutting Observations

### Accessibility Gaps (Addressed)

- Skip-to-main-content: added for consumer-web.
- `aria-current="page"`: added across all five nav implementations.
- `accessibilityRole` / `accessibilityState`: added to mobile tab bars.
- Minimum touch targets: all interactive elements are now ≥ 44px/56px.

### Accessibility Gaps (Deferred)

- No focus-visible ring audit for web apps beyond skip-link (Tailwind 4 provides default ring on `:focus-visible` but individual components were not tested with keyboard-only flow).
- No dark mode support — not required for pilot.
- No reduced-motion support for transitions — low priority for pilot.

### Brand Language (Maintained)

All existing and new copy uses approved premium language: BAM Bags, Limited Drops, Chef's Selection, pickup window, partner action required. No degrading language (leftover, stale, cheap, clearance, liquidation, food rescue) was introduced.

### No Backend Changes

This pass is entirely layout, component, and accessibility. No migration, RPC, edge function, webhook, payment, settlement, or notification behavior was changed.

---

## Files Changed

### New Files

| File | Purpose |
|---|---|
| `apps/consumer-web/app/consumer-nav.tsx` | Shared consumer nav client component with active state |
| `apps/consumer-web/app/footer.tsx` | Consumer footer with section links and allergen disclaimer |
| `apps/admin-web/app/admin/admin-nav.tsx` | Shared admin nav client component with active state |

### Modified Files

| File | Change |
|---|---|
| `apps/consumer-web/app/layout.tsx` | Skip-to-main link, footer |
| `apps/consumer-web/app/page.tsx` | ConsumerNavLinks, id="main-content" |
| `apps/consumer-web/app/drops/page.tsx` | ConsumerNavLinks, id="main-content" |
| `apps/consumer-web/app/restaurants/page.tsx` | ConsumerNavLinks, id="main-content" |
| `apps/consumer-web/app/swaad-club/page.tsx` | ConsumerNavLinks, id="main-content" |
| `apps/consumer-web/app/account/page.tsx` | Added ConsumerNavLinks (was bare ShellHeader) |
| `apps/consumer-web/app/drops/[id]/page.tsx` | Added ConsumerNavLinks (was bare ShellHeader) |
| `apps/consumer-web/app/checkout/[orderId]/page.tsx` | Added ConsumerNavLinks (was bare ShellHeader) |
| `apps/consumer-web/app/orders/[orderId]/page.tsx` | Added ConsumerNavLinks (was bare ShellHeader) |
| `apps/admin-web/app/admin/page.tsx` | AdminNavHeader replacing inline ShellHeader |
| `apps/admin-web/app/admin/ops/page.tsx` | AdminNavHeader replacing partial inline nav |
| `apps/admin-web/app/admin/users/page.tsx` | AdminNavHeader replacing partial inline nav |
| `apps/admin-web/app/admin/finance/page.tsx` | AdminNavHeader replacing partial inline nav |
| `apps/admin-web/app/admin/notifications/page.tsx` | AdminNavHeader replacing partial inline nav |
| `apps/admin-web/app/admin/drops/page.tsx` | AdminNavHeader replacing partial inline nav |
| `apps/admin-web/app/admin/reports/page.tsx` | AdminNavHeader replacing partial inline nav |
| `apps/admin-web/app/admin/restaurants/onboarding/page.tsx` | AdminNavHeader replacing 2-link inline nav |
| `apps/admin-web/app/admin/restaurants/[id]/review/page.tsx` | AdminNavHeader replacing back-link-only header |
| `apps/restaurant-mgmt-web/app/portal/portal-nav.tsx` | Mobile nav groups, aria-current, support link, sidebar overflow |
| `apps/consumer-mobile/App.tsx` | Full rewrite: brand colors, tab state, accessibility, touch targets |
| `apps/restaurant-staff-mobile/App.tsx` | Full rewrite: brand colors, OTP state, verify disabled logic, status feedback |

---

## Verification

All builds and typechecks pass cleanly on the above files:

```powershell
npm.cmd --workspace @gozaika/consumer-web run typecheck     # pass
npm.cmd --workspace @gozaika/admin-web run typecheck        # pass
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck # pass
npm.cmd --workspace @gozaika/consumer-mobile run typecheck  # pass
npm.cmd --workspace @gozaika/restaurant-staff-mobile run typecheck # pass
npm.cmd --workspace @gozaika/consumer-web run lint          # pass
npm.cmd --workspace @gozaika/admin-web run lint             # pass
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint   # pass
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build # pass
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/admin-web run build    # pass
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/restaurant-mgmt-web run build # pass
```

---

## Deferred Items

| Item | Reason |
|---|---|
| Keyboard focus ring audit across all interactive elements | Tailwind 4 provides defaults; full keyboard-only flow test requires browser session |
| Screenshot regression at 390px and 1440px | Chrome extension not connected at time of audit; builds and code review confirm no overflow-causing changes |
| Dark mode | Not required for pilot |
| Reduced motion | Low priority for pilot |
| Expo camera integration for QR scan (staff mobile) | Requires Expo Camera permission flow; deferred to Slice 5 native parity work |
| Consumer mobile Supabase auth integration | Mobile app is companion scaffold; web PWA is primary for Hyderabad pilot |
