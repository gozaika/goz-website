# Slice 18 — Store packages, beta & staged release readiness

Date: 2026-06-29 · Branch: `codex/mobile-ux-uplift/d1-demo-presales` · Build mode: Plan B

Release-prep for **goZaika** (customer) + **goZaika Partner** (restaurant). This is
the **code/config-side** readiness package. Every action that mutates an external
service — creating EAS builds, `eas submit`, store-listing uploads, signing-key
creation, staged-rollout percentage changes — **requires explicit owner
authorization at action time** and is listed in §7. Nothing here performs one.

This doc is the tracked repo record; it supersedes the gitignored Codex-lane
`/.codex-artifacts/gozaika-store-launch/release/eas-config-audit.md` (2026-06-23),
whose gaps are reconciled below.

---

## 1. Identity (locked, verified in app config)

| Field | goZaika (customer) | goZaika Partner |
| --- | --- | --- |
| iOS bundle / Android package | `in.gozaika.customer` | `in.gozaika.restaurant` |
| Expo slug | `gozaika-customer` | `gozaika-restaurant` |
| EAS `projectId` | `4e7b2380-…-f0c66dfa6835` | `05e9378e-…-7dd79f578682` |
| `version` (versionName) | `0.1.0` | `0.1.0` |
| `runtimeVersion` | `{ policy: appVersion }` ✅ | `{ policy: appVersion }` ✅ |
| Expo SDK | ~55 | ~55 |
| iOS tablet | phone-only | tablet-capable |

`versionCode`/`buildNumber` are remote (`appVersionSource: remote`, `autoIncrement`
on production) — EAS owns them.

## 2. EAS gap closure (reconciles the 2026-06-23 audit)

| # | Gap | Status now |
| --- | --- | --- |
| G1 | `extra.eas.projectId` | ✅ **Closed** — both apps carry a `projectId` (EAS projects exist). |
| G2 | `runtimeVersion` policy | ✅ **Closed this slice** — `{ policy: "appVersion" }` on both. |
| G6 | Push / notifications config | ✅ **Closed** — Slice 16: `expo-notifications` + `googleServicesFile` on both; FCM delivery proven on device. |
| G7 | Production env pinned | ✅ **Closed** — `eas.json` `production` profile pins `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` + `customer/restaurant.gozaika.in` BFF origins. |
| G3 | `submit.production` creds | ⛔ **Owner-gated** — needs Play service-account JSON (+ Apple ASC key once enrolled), stored outside the repo. |
| G4 | First public `versionName` | ⛔ **Owner decision** — keep `0.1.0` for closed beta or bump to `1.0.0`. |
| G5 | Crash/diagnostics SDK | ⛔ **Open (decision)** — no Sentry-equivalent bundled yet (confirmed by the bundle scan). Needed for Apple "Diagnostics" + Data-Safety crash-log answers. Wire a DSN as a non-`EXPO_PUBLIC` build secret once the tool is chosen. |

App Links / `associatedDomains` / `intentFilters` remain a deferred Slice 16
follow-up (custom-scheme deep links work today; verified https App Links are the
follow-up).

## 3. Permission minimization (this slice)

The partner app declared **`android.permission.RECORD_AUDIO`** (injected by
`expo-camera`, which supports video+audio) even though it only scans pickup QR
codes. A microphone permission on a scanner app fails the data-minimization bar
and invites Play review questions. Fixed:
- removed `RECORD_AUDIO` from `android.permissions`;
- added `android.blockedPermissions: ["android.permission.RECORD_AUDIO"]` (strips it from the merged manifest);
- set `expo-camera` plugin `recordAudioAndroidPermission: false`.

Reproducible evidence: `node scripts/store-launch/permissions-manifest.mjs`
derives the manifest from the real app configs and **exits non-zero** if any
high-scrutiny permission (microphone, background location, contacts, all-files,
package-query) is declared and not blocked. Current run: **minimal — no
unexplained high-scrutiny permissions.** Effect on the native manifest is
confirmed on the next `expo prebuild` + release build (batched on-device).

## 4. Privacy / Data Safety answers (derived from §3 + the build)

| Question | goZaika | goZaika Partner |
| --- | --- | --- |
| Camera | — | Yes — QR scan only; no image captured/stored |
| Location | — | Yes — **foreground only**, to drop a pickup pin (no background location) |
| Microphone | No | **No** (blocked) |
| Push notifications (FCM) | Yes | Yes |
| Personal data collected | Phone (auth), name, language, order history | Restaurant profile, staff membership, finance (own tenant) |
| Data shared with third parties | No (only Supabase BFF + FCM transport) | No |
| Account deletion | In-app erasure flow (Slice 10) — DPDP liberal posture | n/a (tenant offboarding is operator-side) |
| Data encrypted in transit | Yes (HTTPS BFF) | Yes |

> **Account-deletion URL (Play policy):** Play requires a public account-deletion
> URL in the listing even though in-app erasure exists. Caveat P4 in the launch
> package — **owner to publish** `gozaika.in/account-deletion` (or equivalent).

## 5. Staged rollout & halt/rollback criteria

1. **Internal testing track** — install both `.aab`s; run the §6 smoke matrix on the Pixel 7a.
2. **Closed beta** — invite list; soak ≥ 48 h.
3. **Production staged rollout — 5% → 25% → 100%**, advancing only when the prior stage is clean for ≥ 24 h.

**Halt / rollback if any of:** crash-free sessions < 99.0% (once a crash SDK is
wired) or any reproducible crash on launch/sign-in; FCM push or sign-in (phone
OTP) broken; pickup-verify failures at the counter; a deep link routing
incorrectly; a Data-Safety/permission mismatch flagged by review. Rollback =
halt the staged rollout in Play Console and ship the previous `versionCode`
(remote `appVersionSource` keeps build numbers monotonic).

## 6. On-device release smoke matrix (batched)

Clean install + update over a prior build; production env (no dev menu / no Expo
gear overlay); phone-OTP sign-in via a non-expiring reviewer account; customer
claim → simulated pay → order → pickup; partner verify/no-show/incident;
push delivery + deep-link tap (running + cold start); camera + location
permission prompts show the rationale copy; offline banner over cached data.
Track in `deploy-verification-checklist.md`.

## 7. Requires owner authorization (do NOT perform autonomously)

- `eas build --profile production` for each app (signing-key creation/upload).
- `eas submit` (needs G3 Play service-account / Apple ASC key).
- First Play Console upload + store-listing metadata, screenshots, Data-Safety form.
- Publishing the public account-deletion + privacy/support URLs.
- Advancing the 5→25→100 staged rollout.
- Choosing G4 `versionName` and the G5 crash SDK + DSN.

## 8. Reviewer accounts & creatives

Reviewer test accounts + per-app reviewer notes live in the launch package
(`.codex-artifacts/gozaika-store-launch/reviewer/`, local/gitignored). Reviewer
notes must state: phone-OTP uses fixed demo OTP fixtures (non-expiring), payment
is the gated simulator (real Razorpay deferred), and the partner app needs an
OWNER-role membership. Polished store creatives are in `store-assets/` (D1f).
