# goZaika — Go-Live Gap Plan (technology push)

**Created:** 2026-07-08 · **Companion to:** `docs/strategy/technology/master-technology-document.docx` (§18 Risks/Gaps) and `docs/audits/2026-07-05-launch-readiness/implementation-plan.md` (feature-parity phases, complete).
**Purpose:** the prioritized, owner-assigned list of **technology gaps** discovered while authoring the Master Technology Document — the work required to move goZaika from "pilot-ready / gates green" to **production go-live and DD-ready**. These are platform/operations/security gaps, distinct from the (now-complete) feature-parity program.

**Status key:** ☐ todo · ◐ in progress · ☑ done. **Sev:** severity (Impact × Likelihood).

---

## P0 — Go-live blockers (must close before real customers / prod money)

| ID | Gap | Sev | Owner | Mitigation / Definition of done | Target | Status |
|---|---|---|---|---|---|---|
| G-01 | **Razorpay live** — payments run in simulator (`PAYMENTS_SIMULATOR_ENABLED`). | High | Payments Owner (TBD) | Provision live keys; validate prod webhook signature end-to-end (`payment.captured`/`failed`); **turn simulator OFF in prod**; run one real ₹ capture + refund. | Aug 2026 | ☐ |
| G-02 | **Notification channels deferred** — WhatsApp (WATI) / SMS not sending; OTP login + pickup/reorder nudges depend on them. | High | Notifications Owner (TBD) | Onboard SMS provider (MSG91 recommended) + WATI templates; wire outbox workers to send; disable `NOTIFICATION_DRY_RUN`; verify OTP delivery + one order/pickup message live. | Pre-launch | ☐ |
| G-03 | **Backup validation + DR** — no tested restore, no RPO/RTO, backup tier unconfirmed. | High | Platform Owner (TBD) | Confirm Supabase PITR/backup tier for prod; define RPO/RTO; perform a **restore drill**; write DR runbook. | Pre-launch | ☐ |
| G-04 | **Secrets & prod env hygiene** — rotation policy + per-env access control informal; simulator flag must be prod-off. | High | Security Owner (TBD) | Document secret owners + rotation cadence; audit Vercel/Supabase env per environment; confirm no demo flags in prod. | Pre-launch | ☐ |

## P1 — Launch-hardening (close within the launch window)

| ID | Gap | Sev | Owner | Mitigation / Definition of done | Status |
|---|---|---|---|---|---|
| G-05 | **Dependency / vulnerability scanning** absent. | Med-High | Security Owner | Add Dependabot (or Snyk) + `npm audit` gate in CI. | ☐ |
| G-06 | **Monitoring / alerting / on-call** not formalized (Sentry wired but no alerts). | Med | Ops Owner | Configure Sentry alerts + release health; add uptime/synthetic checks on key routes + BFF `/health`; define on-call rota + escalation. | ☐ |
| G-07 | **Scheduled jobs** — `recurring-drop-scheduler` is a stub; `release-expired-holds` not scheduled. | Med | Backend Owner | Implement recurring-drop state machine (HUMAN_REVIEW gate); schedule expired-holds cron; verify pickup-reminder + settlement workers on cron. | ☐ |
| G-08 | **Human a11y sign-off** pending (structural axe gated only). | Med | Web Owner | Complete keyboard + screen-reader audit (checklist in `docs/web/web-parity-audit.md`); resolve color-contrast semantic-badge decision (D8). | ☐ |
| G-09 | **Admin-web** outside automated gate; minimal test coverage; highest-privilege surface. | Med | Web Owner | Add admin-web to a gate; smoke + a11y; document admin access matrix; consider admin MFA. | ☐ |
| G-10 | **Automated E2E gaps** — no Maestro mobile specs; no lead-capture test; authed web specs opt-in. | Med | QE Owner | Add Maestro flows (§16/CM-1/CM-2/§20) when a dev-client is warm; add website lead-capture happy/fail test; wire authed specs into a scheduled run. | ☐ |
| G-21 | **Demo seed pickup window is UTC-anchored** — `demo_create_live_drops()` anchors the pickup window to `current_date 13:00–15:30` in **UTC**, so a seed run in the UTC afternoon/evening produces already-expired "live" drops (list shows "No active drops"). Not launch-blocking (seed/demo tooling only), but wastes verification sessions. | Low-Med | Backend Owner | Anchor the window to a forward offset from `now()` (or to IST) instead of a fixed UTC clock time. | ☐ |

## P2 — DD-readiness & maturity (fast-follow)

| ID | Gap | Sev | Owner | Mitigation / Definition of done | Status |
|---|---|---|---|---|---|
| G-11 | **No IaC** — Vercel/Supabase configured via dashboards. | Med | Platform Owner | Adopt IaC where feasible (Terraform providers) to make env reproducible + DR faster. | ☐ |
| G-12 | **No API spec** (no OpenAPI/Swagger). | Low-Med | Backend Owner | Generate OpenAPI for the `/api/mobile/v1/*` BFF from zod schemas; publish. | ☐ |
| G-13 | **CI Node 20 vs `engines` 22.x** mismatch. | Low | Release Owner | Align GitHub Actions to Node 22 to match local/runtime. | ☐ |
| G-14 | **Legacy Android app-id** `com.orbitwell.gozaikamonorepo` in root `app.json` (per-app is `in.gozaika.*`). | Low | Mobile Owner | Reconcile all identifiers to `in.gozaika.*`; remove legacy config. | ☐ |
| G-15 | **QR is visual-only** (OTP is the verifiable credential). | Low | Mobile Owner | Add `react-native-svg` scannable QR + native rebuild. | ☐ |
| G-16 | **Cost monitoring** not formalized (Razorpay/SMS/Supabase/Vercel). | Low-Med | Finance/Ops | Per-vendor budget alerts + monthly review. | ☐ |
| G-17 | **Index / retention audit** — full index review + concrete retention windows per data class undefined. | Low-Med | Backend Owner | Audit indexes against hot queries; define retention windows in `privacy_retention_policy`. | ☐ |
| G-18 | **Named owners TBD** across governance roles. | Med | Founder | Assign owners for the roles in the Tech Doc "Document Ownership" table. | ☐ |
| G-19 | **Staging environment** not clearly separated from preview/prod. | Low-Med | Platform Owner | Decide on a dedicated staging Supabase project + Vercel env; or document why preview suffices. | ☐ |
| G-20 | **Store submission** (iOS/Android) not started. | Med | Mobile Owner | Prepare store assets + metadata; EAS submit; TestFlight/internal track. | ☐ |
| G-22 | **restaurant-mobile "↻ Reorder" counter badge not device-verified** — code-complete (§20 Order Again), but no warm restaurant-mobile dev-client was available to confirm on-device. | Low | Mobile Owner | Verify the badge renders on a physical/emulator restaurant-mobile build against a live reorder order. | ☐ |

---

### Notes
- Owners are **TBD** pending assignment (G-18); the founder/owner authorizes prod merges, migration applies, and payment/notification go-live.
- This plan is technology-scoped. Product/positioning decisions are locked in `docs/audits/2026-07-05-launch-readiness/business-model-strategy.md` (§14–§25); feature-parity execution is tracked in `docs/audits/2026-07-05-launch-readiness/implementation-plan.md` (complete) and `docs/audits/2026-07-05-launch-readiness/follow-ups.md` (open items carried forward).
- Update this file as gaps close; mirror any material change into the Master Technology Document §18 on the next revision.
