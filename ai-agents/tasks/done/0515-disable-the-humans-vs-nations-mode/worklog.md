# Worklog — 0515

## 2026-10-28 — Build (spawned `fkit-coder`)

Spawned by `fkit-lead` running `/fkit-sprint-ship-loop` on Sprint 9, role **Build**, under the declared-approval
marker (ADR-055). Approved plan: `plan.md` (blob `55a1e061…`, checked with `git hash-object` before starting), its
**"public rotation only" variant**: steps 1, 5 (MapPlaylist part only) and 6, plus this worklog (step 7).

Owner choices, quoted verbatim from the `fkit-lead` session (AskUserQuestion, 2026-10-28):
- "0515: where should Humans Vs Nations be switched off?" → *"Public mix only"*
- "0515: hide the mode (keep its code) or delete its code?" → *"Hide (Recommended)"*
- old-tab private-lobby question → owner typed: *"Private lobbies are allowed for HvN"*
- "0515: build the public-mix-only version (1 source file + its test + analytics doc; private lobbies and single
  player keep HvN)?" → *"Yes, build it (Recommended)"*

**Done:**
- `src/server/MapPlaylist.ts` — `HumansVsNations` removed from `TEAM_COUNTS`; the old "keep Humans vs Nations in
  the public rotation" comment replaced with a two-line reason (left out of the public rotation by 0515; private
  lobbies and single player still offer it). The `disableNPCs: … playerTeams !== HumansVsNations` line and its import
  are unchanged, so turning it back on means editing only the list.
- `tests/server/MapPlaylist.test.ts` — `TEAM_COUNTS` now asserted as `[2, 3, 4, Duos, Trios, Quads]` plus
  `not.toContain(HumansVsNations)`; new test: 300 generated configs never use HvN, every Team config has
  `disableNPCs === true`, and 2/3/4/Duos/Trios/Quads all still appear (about 120 Team configs per run, so a missing
  count is ~1e-9 likely — not a flake source).
- `ai-agents/knowledge-base/analytics-event-reference.md` — `NationsTeam` paragraph rewritten: out of the public
  rotation from the game deploy that ships 0515 (owner ruling 2026-10-28); still offered in private lobbies and single
  player, so `TeamPrivate:…:NationsTeam` keeps arriving; a `TeamPublic:…:NationsTeam` after that deploy can only come
  from a game started before it; nothing filtered. Grep confirms no "live in the public rotation" claim is left and
  the doc says nothing about the worker refusing HvN.

**Not done (outside the approved variant):** plan steps 2, 3, 4 — no `WorkerSchemas` refine, no `TeamCountOptions`
module, no picker change, no new test files. No status change, no mover, no wiki write, no commit.

**Checks:** `npm test -- tests/server/MapPlaylist.test.ts` 13/13 pass · `eslint` on both changed TS files clean ·
`npx tsc --noEmit -p tsconfig.json` exit 0, 0 errors · `prettier --check` warns on `MapPlaylist.ts` and the doc, both
pre-existing and outside the changed lines (`MapPlaylist.ts:142` `{ }`; the doc's prettier diff is 422 lines both at
HEAD and now). Full `npm test` deliberately not run — the later Verify step runs it once for 0509 and 0515.

## Decision log

Build worker under the approved plan; no review fixes applied and no obvious-winner calls made: **none**.

## 2026-10-28 — Process-review, round 1 (spawned `fkit-coder`)

Spawned by `fkit-lead` running `/fkit-sprint-ship-loop` on Sprint 9, role **Process-review**, under the
declared-approval marker (ADR-055); same approved plan (`plan.md` blob `55a1e061…`, re-checked with
`git hash-object`), "public rotation only" variant. Ledger `review.md` round 1: R1, R2 (both verified `CORRECT`,
both low). Ledger set to `closed-out`. Checks: `npm test -- tests/server/MapPlaylist.test.ts` 13/13 pass ·
`eslint` clean on `WinCheckExecution.ts`, `MapPlaylist.ts`, `MapPlaylist.test.ts` · `prettier --check` clean on
`WinCheckExecution.ts`. Full `npm test` not run (the driver re-verifies).

### Decision log (process-review, applied without per-fix owner approval)

- **R1 — obvious-winner call.** Finding: the comment above `teamLeaderKind` in
  `src/core/execution/WinCheckExecution.ts` still said HvN "is live in the public rotation". Changed: that one
  sentence now says the mode is kept out of the public rotation (MapPlaylist.ts) but stays host-selectable in
  private lobbies, NPCs enabled; nothing else in the file. Why it qualified: verified `CORRECT`; comment-only and
  localized; the file is on the plan's "Not touched" list, but the comment is made wrong by plan step 1 itself and
  CLAUDE.md's hard rule requires fixing it in the same change, so it is the one option that stays within the plan's
  intent (leaving it is a rule breach; deleting it loses the reason the Nations leaf exists). No test: a comment-only
  `src/core` change has no behaviour to test.
- **R2 — in-plan fix (plan step 6).** Finding: the `NationsTeam` paragraph in `analytics-event-reference.md`
  (a) implied single player emits `TeamPrivate:…:NationsTeam`, (b) said a post-deploy `TeamPublic` sample "can only"
  come from a game started before the deploy. Changed: single player is now said to offer HvN but never emit the
  event; the post-deploy public sample is called most likely a late-delivered event, and the operator-only
  admin-token public create is named as still accepting the mode. Why it qualified: verified `CORRECT` against
  `WinConditionAnalytics.ts:42` and the `POST /api/create_game/:id` route; doc-only, localized, and inside step 6,
  which owns that paragraph.

