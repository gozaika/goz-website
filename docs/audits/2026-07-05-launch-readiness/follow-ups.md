# Follow-ups (durable, extracted at close — 2026-07-08)

The implementation that closed this audit (Phase 1–5, merged via PR #1 / `d8dae0d`)
deliberately left some items open. This file is the audit-side record of *what* and
*why*; the actionable, still-open version of each lives in
[`docs/operations/go-live-gap-plan.md`](../../operations/go-live-gap-plan.md) (IDs
noted below) so there's one place to track closure.

- **Demo seed pickup window is UTC-anchored** (`go-live-gap-plan.md` G-21). `demo_create_live_drops()`
  anchors the pickup window to `current_date 13:00–15:30` in UTC, so a seed run in the
  UTC afternoon/evening produces already-expired "live" drops. Discovered during Session 6
  mobile-evidence capture; wasted a verification pass before the cause was understood.
- **restaurant-mobile "↻ Reorder" counter badge not device-verified** (G-22). The Order
  Again (§20) badge is code-complete and mirrors the already-verified portal badge, but no
  warm restaurant-mobile dev-client was available this session to confirm on-device.
- **Maestro (mobile) E2E flows not added** (G-10). The §16 allergen-gate, CM-1 checkout,
  CM-2 pickup-proof, and §20 reorder flows are all verified on-device via manual capture
  (see `evidence/` and `docs/screenshots/consumer-mobile/`), but no automated Maestro specs
  exist yet — deferred because no warm dev-client was available to iterate on selectors.
- **QR code is visual-only, not scannable** (G-15). The OTP is the verifiable credential;
  a real scannable QR needs `react-native-svg` + a native rebuild.
- **Razorpay live + SMS/WhatsApp notification channels** (G-01, G-02). Payments run on the
  simulator and notifications are dry-run; both are deliberately deferred to a real
  go-live push, not implementation gaps.
- **Expired-holds release job not scheduled** (G-07 covers scheduled jobs generally).
  Owner will install a cron for `api_release_expired_inventory_holds` after this
  implementation; stale holds were manually cleared once during the work as a stopgap.
- **Human a11y sign-off deferred** (G-08). The automated axe gate is green throughout;
  the owner will run a full keyboard + screen-reader review separately.
- **Demo cover photos are Wikimedia Commons (CC), sourced for pre-launch demo purposes
  only** (not yet in the gap plan — flag if picked up). Owner confirmed copyright isn't a
  concern pre-commercial-launch; swap to licensed/owned food photography before
  commercial launch.
- **Mobile ROI period label is UTC-day-aligned, shown in IST** (minor, cosmetic — not in
  the gap plan). `defaultRoiPeriod` builds a UTC-day-aligned window; the end label can
  read one day later than an IST-native reader would expect (e.g. a window ending 7 Jul
  shows "8/7"). IST-aligning the window itself (`defaultRoiPeriod` + `parseRoiPeriod` +
  `dateInputValue`, coherently) is optional polish, not a correctness bug.
