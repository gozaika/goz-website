# Slice 17 — Accessibility, security, observability & performance gate

Date: 2026-06-29 · Branch: `codex/mobile-ux-uplift/d1-demo-presales` · Build mode: Plan B

This is the release-readiness hardening audit for both mobile apps (goZaika
customer + goZaika Partner). It records what was audited, what was fixed in code
this slice, the measured numbers, the accepted residual risks, and the
**human sign-off that is still required** (model review does not replace it).

Scope: cross-app accessibility, threat-model fixes, telemetry/redaction,
performance and a final parity reconciliation. **No new product features.**

---

## 1. Accessibility

**Method (code-side, Plan B):** static audit of every screen + shared primitive;
the live TalkBack/VoiceOver + Dynamic-Type sweep is a batched on-device step.

**Already in place (Slice X1, on `main`):**
- Contrast re-audit fixed brand saffron (2.84:1) and gold (2.38:1) as text on
  light surfaces — AA companions `palette.saffronText`/`goldText` via
  `tokens/contrast.ts`, wired through `Button`/`CustomerPrimitives`/`PartnerPrimitives`.
  Vivid saffron/gold remain for fills; only text color changed. 12 contrast tests.
- `Skeleton` honors `useReducedMotion()` (no continuous loop under reduce-motion).
- `Text` honors Dynamic Type (no fixed font scaling).
- Accepted deviation (owner-acknowledged 2026-06-27): customer primary buttons
  render charcoal-on-saffron; flip point is `onAccentTextColor()`.

**Fixed this slice:**
- **Form input labels.** Every `TextInput` across both apps now carries an
  `accessibilityLabel` so a screen reader announces the field on focus (the
  visible caption above the field is a separate node and is not reliably
  associated). Covered: consumer profile (name fields), consumer order review
  comment, partner drop-create (bags, price), partner profile (name, email,
  phone, pickup, headline, story, latitude, longitude), partner counter panel
  (pickup OTP, no-show reason, incident description). Login screens already had
  labels.

**Verified OK (no change needed):**
- No raw `<Image>` in any screen — all media flows through `ProductMedia` /
  `RestaurantAvatar`, which apply labels and never render a broken-image glyph.
- Star rating uses `accessibilityRole="adjustable"` with a value label, and each
  star is a labeled button with `hitSlop`.
- Text inputs use `minHeight: 48`+ (meets the 44–48px touch-target floor).

**Residual (batched on-device):** a full TalkBack (Android) + VoiceOver (iOS)
read-through of the customer claim→pay→pickup and partner verify flows at 200%
text. Tracked in `deploy-verification-checklist.md`. **Human a11y sign-off
required before store submission.**

---

## 2. Security / threat model

| Risk | Posture | Evidence |
| --- | --- | --- |
| **Session/refresh secrets** | Stored in `expo-secure-store`, namespaced per app; never AsyncStorage | `packages/mobile-core/src/storage/session.ts` (spec §3/§5.1) |
| **Server secrets in the client** | Source gate (`git grep`) **plus** a new scan of the shipped Hermes bundle | `scripts/security/mobile-bundle-secret-scan.mjs` — clean over both apps; no `service_role`/`*_SECRET`/FCM service-account/private keys, and no JWT with role `service_role` |
| **Malicious push deep-link** | **Fixed this slice** — `data.link` is no longer routed verbatim; `safeInternalPath()` allows only an in-app absolute single-slash path (rejects external/`//host`/scheme/backslash/control-char) | `packages/mobile-core/src/navigation/deepLink.ts` (+8 tests); wired into both apps' `src/push/push.ts` |
| **Media trust boundary** | Only the `public-media` bucket resolves to a public URL; the untrusted `media-ingest` bucket never reaches discovery | `resolveDropImage` tests + `slice17-media-gate-smoke` (0 ingest leaks live) |
| **Role/capability enforcement** | Every partner `/api/mobile/v1` route is wrapped by `withMobileRestaurantRole(capability)` over the data-driven matrix; customer routes by `withMobileAuth` | Slice 4 + `role-matrix-enforcement-gap.md` |
| **Token replay / pickup proof** | Pickup verify is server-authoritative (signed credential secret server-side only); no pickup code or QR nonce is ever displayed or logged | Slice 7 sign-off; redaction below |
| **Log / crash PII** | Redacting logger strips Authorization, tokens, OTP, QR nonce, phone/email, signed URLs and precise coordinates before any sink | `packages/mobile-core/src/telemetry/redact.ts` (+tests) |
| **Offline honesty** | Customer Home/Drops show an offline banner over cached data on NETWORK error rather than a hard failure | `OfflineBanner`, Slice 16 |

**Residual:** endpoint rate limits / per-restaurant media quotas and abandoned-
ingest expiry are deployment-time rollout gates (product-media runbook §"Production
hardening gates"), not client code. **Human security sign-off required.**

---

## 3. Observability & redaction

- All `mobile-core` internals log through `createLogger`, which runs every record
  through `redact()` before the sink — raw tokens/PII cannot be emitted.
- Server BFF logs use safe failure codes only (no signed URLs, image bytes, or
  service-role creds) — see the product-media runbook.
- **No third-party analytics/crash SDK is bundled** (confirmed by the bundle
  scan: no Sentry/analytics secret markers). A Sentry-equivalent with source maps
  and the same PII scrub is a **Slice 18** release task; until then crash triage
  relies on store-console stack traces + the redacting logger.

---

## 4. Performance

**Measured (Expo SDK 55, Hermes, `expo export -p ios`, 2026-06-29):**

| App | Hermes bytecode | Bundled assets |
| --- | --- | --- |
| consumer-mobile | 4.65 MB | 4.1 MB |
| restaurant-mobile | 4.71 MB | 4.1 MB |

Both are well within a mid-range budget (JS bundle < 8 MB target). Notes:
- Lists use the React Native virtualized list primitives; discovery/queue render
  from already-paged BFF payloads.
- `ProductMedia` keeps a fixed `aspectRatio` frame so image load/fail never
  triggers a layout reflow (no list jank on slow media).
- Start-up/list-scroll/render-budget measurement on the Pixel 7a is a batched
  on-device step (Plan B); no perf regression is expected from this slice (label
  props + a pure guard function).

---

## 5. Parity ledger reconciliation

`docs/mobile/mobile-parity-ledger.md` was generated at the Slice 0 baseline with
every row `Not started`. It has been reconciled to the built, gated state: each
mobile target now points at its shipped BFF route + screen + owning slice, with
the smoke/evidence reference. Excluded rows (admin-web, review-media uploads,
native billing, ZaikaIQ, dynamic pricing, POS, WhatsApp bot) remain out of scope
per the shared-spec release boundary. Remaining open items are the **batched
on-device walks** in `deploy-verification-checklist.md`, not missing code.

---

## 6. Accepted residual risks (carry to release)

1. On-device a11y sweep (TalkBack/VoiceOver/200% text) — batched; **needs human a11y sign-off**.
2. Crash/observability SDK (Sentry-equivalent) — **Slice 18**.
3. Media rate-limits/quotas/ingest-expiry — deploy-time rollout gates.
4. Render-real product-media walk — needs an actual uploaded `public-media`
   object (demo seed has none; trust-boundary + fallback already proven live).
5. Real Razorpay — owner-deferred; simulator retained.

## 7. Required human sign-off

Per the slice spec, **security and accessibility sign-off remain mandatory and
cannot be replaced by model review.** This document is the package for that
review; it does not itself constitute sign-off.
