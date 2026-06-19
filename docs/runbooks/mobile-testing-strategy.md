# Mobile Testing Strategy

Owner: Mobile Slice 2. Layers below are additive; each slice adds rows to the
relevant layer and updates `docs/mobile/mobile-parity-ledger.md`.

## Layers

| Layer | Tool | Scope | Location |
| --- | --- | --- | --- |
| Unit | Vitest | Pure logic in `packages/mobile-core` (envelope/error/server-time/idempotency/redaction) and `packages/mobile-ui` token/contrast math | `packages/mobile-*/src/**/*.test.ts` |
| Contract | Vitest + shared fixtures | Mobile client decoding vs the same fixtures the BFF asserts against | `packages/types/test-fixtures/mobile/` (added in Slice 3) |
| Component | Vitest (logic) / manual + Maestro (render) | UI primitives — contrast/large-text/state behavior. Full RN render is asserted via Maestro, not Vitest, to avoid an RN-in-node preset | `packages/mobile-ui` |
| E2E | **Maestro** | Critical user journeys on a real dev build | `apps/*/.maestro/*.yaml` (see [ADR 0001](../adr/0001-maestro-over-detox.md)) |

## Running

```bash
# Unit/contract (all workspaces)
npm test
# A single package
npm --workspace @gozaika/mobile-core test
# E2E (requires a running emulator/device with the dev build installed)
maestro test apps/consumer-mobile/.maestro/smoke.yaml
maestro test apps/restaurant-mobile/.maestro/smoke.yaml
```

## Conventions

- mobile-core stays React-Native-free and node-testable: native concerns (SecureStore, network) are dependency-injected, so every code path has a deterministic Vitest test.
- mobile-ui render assertions belong in Maestro (accessibility-tree based), which doubles as the VoiceOver/TalkBack label check for Slice 17.
- Maestro flows are named by journey and assert on visible text / accessibility labels — keep those labels stable and human-readable.
- Never put real secrets, tokens, or OTPs in fixtures or flows. Use the deterministic demo phones/OTPs from `docs/mobile/demo-identity-reconciliation.md`.

## Slice 2 baseline coverage

- `@gozaika/mobile-core`: 31 unit tests (envelope decode incl. 401/403/409/426 mapping, server-time skew, idempotency keys, header construction, log redaction, session-storage namespacing, full client request/error/network paths).
- `@gozaika/mobile-ui`: 5 contrast tests (palette + status tones meet WCAG AA).
- Maestro `smoke.yaml` per app: launch + navigate every top-level tab.
