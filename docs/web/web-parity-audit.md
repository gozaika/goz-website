# goZaika Web Parity — Audit & Sign-off (W7)

Status: **automated program complete (W0–W7) 2026-06-30** · Human a11y sign-off: **PENDING**
Branch: `codex/mobile-ux-uplift/d1-demo-presales` → `main`

Companion: [spec](../../project%20docs/gozaika_web_parity_spec_v1.md) ·
[plan](../../project%20docs/gozaika_web_parity_implementation_plan_v1.md) ·
[ledger](web-parity-ledger.md) ·
[autonomous decision log](w5-w7-autonomous-decisions.md)

## 1. What shipped

Both web apps (`apps/consumer-web`, `apps/restaurant-mgmt-web`) were brought up to the
mobile UX-uplift design-system + accessibility standard:

- **Design system (W1–W3):** shared `@gozaika/design-tokens` (palette + AA contrast
  companions, drift-locked by `contrast.test.ts`), `theme.css` Tailwind mirror, and the
  `@gozaika/ui` primitive set (base + customer + partner), all consumed by both apps.
- **Customer surfaces (W4):** all 16 routes recomposed on tokens/primitives, incl. the 3
  large interactive clients (drops discovery, restaurant directory, restaurant detail) and
  the net-new **F1 "Restaurants you follow"** home rail.
- **Partner surfaces (W5):** all 10 portal surfaces recomposed on the partner primitives;
  partner label reconciled **"Zayka Pro" → "goZaika Partner"**; **RestaurantSwitcher** added
  to the chrome (multi-membership, app-level cookie resolver — no shared-lib/schema change).
- **A11y / contrast / motion (W6):** global brand-hex flip (only `theme.css` exempt); all
  white-on-saffron / gold-as-text → AA companions; opacity-dimmed charcoal text → `text-muted`;
  axe-playwright structural gate; global `prefers-reduced-motion` rule.
- **Release polish (W7):** built-`.next` client-bundle secret-value scan; functional smoke per
  app; tokenized `not-found` pages; reduced-motion; this audit + ledger closure.

## 2. Release gate — `node scripts/web-ci.mjs` (9/9)

typecheck · vitest · `next build` ×2 · banned-copy scan · source client-secret scan ·
**global** brand-hex scan · **built-bundle secret-value scan** · **axe a11y + functional
smoke** (both apps). Mobile gate `scripts/mobile-ci.mjs` stays **7/7** (token-extraction guard).

## 3. Accessibility results

- **Structural WCAG (axe, hard-gated, green):** landmarks (one `<main>`, no nested
  complementary), accessible names on controls (switch `aria-label`, ProgressBar role),
  document `<title>` on both apps, heading order (MetricHero `titleAs="h1"`), skip-link.
- **Contrast:** token companions proven AA by `contrast.test.ts`; all white-on-saffron and
  gold-as-text occurrences eliminated. **Residual (reported, non-blocking):** axe flags
  ~37 `color-contrast` nodes on `/drops`, 1 on `/swaad-club`, 1 on `/auth/login` — all
  **semantic component accents on live data cards** (dietary/allergen badges using
  green/red/orange/yellow). These need a human design decision (see §5).
- **Motion:** global `prefers-reduced-motion: reduce` disables animations/transitions;
  primitives also use `motion-reduce:animate-none`.

## 4. Perf / SEO

- Both apps ship `metadata` (title + description); mgmt gained a root-layout title template.
- Tokenized `not-found` pages on both apps (previously unstyled Next defaults).
- `next build` passes for both apps; `ProductMedia`/fixed-aspect media avoids layout shift.
- **Residual / recommended (not gated):** Lighthouse LCP/CLS capture on home + a drop detail
  + the dashboard, and per-route OpenGraph images, are recommended before a marketing push.

## 5. Human sign-off — REQUIRED (owner)

The spec mandates a human pass that automated checks cannot replace. Please verify and tick:

- [ ] **Keyboard-only walkthrough** — consumer home → drops → drop detail → claim → checkout;
      partner login → dashboard → drops → new drop. Every control reachable/operable; visible
      focus ring; logical order; skip-link works.
- [ ] **Screen-reader pass** (NVDA/VoiceOver) on the same flows — names, roles, headings,
      live regions read sensibly.
- [ ] **Card-accent contrast decision** — accept or restyle the dietary/allergen badge colors
      flagged by axe (§3). If restyled, fold into tokens and the change becomes gate-enforced.
- [ ] **Multi-membership RestaurantSwitcher** — with a 2+ active-restaurant OWNER seed, confirm
      the switcher appears, switching re-scopes the single-restaurant pages + drop/template
      mutations, and single-membership accounts still never see it (`RUN_AUTHED_*=1` opt-in
      specs available).
- [ ] **200% zoom / 320px reflow** spot-check on home, drops, dashboard.

**Sign-off:** _________________________  **Date:** ____________

Once ticked, flip the W6 ledger row + the program status to **Done (human-signed)**.
