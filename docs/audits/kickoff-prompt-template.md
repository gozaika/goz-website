# Audit-implementation kickoff prompt — reusable template

> Copy this into a fresh session to begin implementing the findings of a completed audit.
> Fill in the bracketed `[...]` pointers first. Recommended starting model: **highest
> reasoning-effort tier available, high effort** for architecture/logic-bearing work;
> drop to a faster/cheaper tier for well-specified mechanical work (copy, straightforward
> component edits) — say so explicitly below so the model knows when it's safe to suggest
> a switch.

```
You are implementing the fixes for [PROJECT] arising from [docs/audits/<date>-<slug>/audit.md].
This is a MULTI-SESSION effort on ONE feature branch. Quality bar: [state it explicitly —
e.g. "world-class polish, non-negotiable" or "correctness first, polish only where it was
flagged"]. You are the sole developer / own the source exclusively [adjust if not true].

READ FIRST — source of truth, read fully before any edit:
- [docs/audits/<date>-<slug>/audit.md] — every finding to address (list finding-ID prefixes
  if the audit uses them, e.g. "CW-*, RP-*, MK-*, CM-*, RM-*"). Address ALL of them, or
  explicitly justify any you defer.
- [docs/audits/<date>-<slug>/business-model-strategy.md or equivalent strategy doc] — if the
  audit produced a converged strategy/positioning decision, it belongs here. Skip if N/A.
- [anti-drift conventions doc(s), e.g. docs/handoff/<handoff>.md] — tokens/design-system
  rules, banned copy lists, prior deliberate decisions (do NOT re-file these as bugs),
  gate names + required pass counts (e.g. "web-ci 10/10, mobile-ci 7/7").

GIT SETUP (do first):
- Create a feature branch off `main` (or the correct base — confirm). Bring the audit docs
  across if they live on a different branch.

GOAL: [one paragraph — what "done" looks like across which surfaces/apps].

BRANCH, DEPLOY & MIGRATION DISCIPLINE:
- [State push/deploy behavior: does pushing the branch trigger a preview deploy? Does
  merging to main auto-deploy prod? Are DB migrations authorized against a shared remote
  during this work, and via what path?]
- Merging to the base branch [auto-deploys prod / requires manual deploy — state which].
  Keep the base branch deployable at all times. Merge ONLY when every gate is green, and
  **ASK the user before the final merge** if it auto-deploys anything live.

BUILD SEQUENCE: [state the phase order, e.g. "marketing/copy first (lowest risk, cheapest
model), then feature surfaces in dependency order, then cross-cutting concerns, then
tests+deploy" — or paste the audit's own recommended sequence if it has one].

TESTING:
- [What's testable without live external providers — test credentials, simulators, dry-run
  flags — and what genuinely can't be tested this session (flag as out of scope, don't
  fake it).]
- Extend automated test coverage (unit/e2e/device) for every new/changed flow. Run it and
  iterate to green before calling anything done.
- Hands-on verify every changed surface (browser automation for web; device/emulator
  automation for mobile). Capture evidence.

TOOLING: [list what's actually available/verified this session — devices, browser
automation, local vs. remote environment access, any known environment gotchas (e.g. path
length limits, build quirks) — so the next session doesn't rediscover them.]

MODEL / EFFORT:
- [State the model/effort split by phase, and how to hand off across a model switch if the
  harness can't self-switch mid-run.]

HANDOFF DISCIPLINE (zero drift across sessions):
- Maintain a phased checklist doc and a "current state" doc; update both after every
  meaningful chunk of work.
- When context runs low: STOP, update both docs, and tell the user to start a fresh
  session pointed at the current-state doc. Do not let drift accumulate past that point.
- **At close**, fold the phased-checklist doc into `docs/audits/<date>-<slug>/` (rename to
  `implementation-plan.md`), extract any durable open items into
  `docs/audits/<date>-<slug>/follow-ups.md` (cross-linking the operational backlog they
  feed), and DELETE the live "current state" doc — it is session scratch, not history.
  Update this audit run's `README.md` to record the outcome (verdict → what shipped →
  PR/commit that merged it).

ANTI-DRIFT / QUALITY:
- [Restate the project's non-negotiables: design-token discipline, banned copy, real-data-
  only, required gate pass rates, "surgical changes only" if that's the house style.]

LOCKED DECISIONS (owner-approved — no need to re-ask): [list anything already decided so
the new session doesn't re-litigate it.]

BEGIN with the GIT SETUP + first phase. Confirm your plan with the user before editing.
```
