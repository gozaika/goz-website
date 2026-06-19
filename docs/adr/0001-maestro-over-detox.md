# ADR 0001 — Maestro for mobile E2E (not Detox)

Status: Accepted (Mobile Slice 2, 2026-06-19)
Context: shared architecture spec §10 mandates a single v1 E2E framework and an ADR if Detox is added in parallel.

## Decision

Use **Maestro** as the sole v1 end-to-end framework for both mobile apps. Do **not** add Detox.

## Why

- **Expo development builds.** Both apps ship as Expo dev/production builds (Razorpay and other native modules make Expo Go invalid). Maestro drives the installed build as a black box over the accessibility tree; it needs no native test runner, no gray-box instrumentation, and no `detox build` step wired into EAS.
- **Lower maintenance / flake.** Maestro's implicit waits and YAML flows are markedly less flaky than Detox's synchronization for RN 0.83 + React 19, and require no per-RN-version adapter upkeep.
- **Accessibility-first.** Flows assert on visible text / accessibility labels — the same labels we must get right for VoiceOver/TalkBack (Slice 17), so the E2E suite doubles as an a11y smoke.
- **CI fit.** Runs against the same artifact CI already builds; no second toolchain.

## Consequences

- Unit/contract/component tests stay in **Vitest** (see `docs/runbooks/mobile-testing-strategy.md`). Maestro covers critical user journeys only.
- Flows live in each app's `.maestro/` folder, named by journey (`smoke.yaml`, later `auth.yaml`, `claim-pay-proof.yaml`, `counter-verify.yaml`).
- Adding Detox later requires a superseding ADR with a concrete justification (e.g. a flow Maestro cannot express).

## Alternatives rejected

- **Detox** — gray-box RN runner; heavier setup, version-coupled to RN, more flake on new RN/React majors, second build path in EAS.
- **Appium** — slower, more brittle selectors, heavier infra than Maestro for this scope.
