# Make the profile-deploy-hardening shell harness finish inside its 150 s deadline again

## ID
0371

> ℹ️ **ID allocation, checked 2026-10-02 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0369`. `0370` and `0371` allocated in this run, in that order.

## Sprint
Sprint 7

> 📌 **2026-10-02 — was ~~Backlog~~; moved to [Sprint 7](../../../sprints/done/plan-sprint-7.md).** OWNER RULING given 2026-10-02 via `AskUserQuestion` in the live `fkit lead` session, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
> *"Move into Sprint 7 (Recommended)"*. Was filed on the [Backlog board](../../../sprints/backlog.md) earlier the same day;
> that row is kept as `➡️ Moved`. No folder moved, no mover run.

## Priority
34

> 📌 **2026-10-02 — was ~~Unscheduled~~; rank 34 is append rank** on the Sprint 7 board: the owner named the sprint, not a rank; the board's
> highest was 33, and writing it higher would renumber closed rows, which ADR-035 forbids. A position, not a merit
> rank. The *"Placement is UNRULED"* note below is **answered** — kept as history.

> ⚠️ **Placement is UNRULED — flagged for owner confirmation.** The owner asked for this task (2026-10-02) but named no
> sprint and no rank, so it is filed on the unranked [Backlog board](../../../sprints/backlog.md).
> **On merit this belongs in the current sprint (Sprint 7)**, because while it stays red, **every** task's full
> `npm test` is red, every close has to carry a "pre-existing red" caveat, and a real new failure can hide behind it —
> the gate `0201` built stops being a gate.

## Status
✅ Done (agent-closed — not owner-verified)

📌 **Set 2026-10-02** by `fkit-lead` driving `fkit-sprint-ship-loop`. *(Earlier value, kept as history:)* ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

**Filed 2026-10-02 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`: *"Close + file both tasks (Recommended)"* — close
[`0367`](../../done/0367-cut-the-public-lobby-wait-from-2-minutes-to-1-minute/brief.md) despite the red full
`npm test`, and file a task to fix the slow harness.** ⛔ Not producer precedent.

**In plain terms.** `npm test` runs a set of hand-written shell test scripts through a thin jest wrapper,
`tests/scripts/ShellHarnesses.test.ts` (task [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md)).
The wrapper kills any one script that runs longer than **150 s**. One of them,
`tests/scripts/profile-deploy-hardening.test.sh`, now takes longer than that, so full `npm test` is red. Every check
inside it still passes — it is too **slow**, not wrong.

**What was measured on 2026-10-02** (`0367`'s `worklog.md`, § *Verification* step 4 — not investigated further):
- Full `npm test`: the wrapper killed the harness at the 150 000 ms deadline, mid-run (at T50). Every assertion it had
  printed was ✅. Red twice in a row.
- Standalone, working tree: **ALL PASS in 3 min 10 s, at about 7 % CPU** — mostly **waiting**, not computing.
- Standalone, **clean `HEAD` `40ccb06`** (no `0367` changes): **ALL PASS in 5 min 10 s** — so the slowness is not
  `0367`'s.
- The wrapper suite alone on a quiet machine (`npm test -- tests/scripts/ShellHarnesses.test.ts`): 4/4 pass, this
  harness 114 s — under the deadline, but with little room; under full-suite load it goes over.
- ⚠️ **Likely, NOT investigated:** it got slow after the harness's last two changes, commits `05c3cfa` and `49a419d`
  (2026-10-01), which carried the deploy-version-tag work of
  [`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md) and
  [`0356`](../../done/0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md) (the harness reported
  740 checks at `0356`). The low CPU suggests time spent waiting (sleeps, timeouts, something not stubbed) — a
  **hypothesis**, not a finding.

**Locked rules this task must respect** (CLAUDE.md § *Shell harnesses are part of `npm test`*, owner ruling at `0201`):
- **No skip valve.** There is deliberately no `SKIP_SHELL_HARNESSES` (or similar) escape hatch, by owner ruling — the
  valve would become the default and the harnesses would rot unrun again. Do not add one, in any form (env var, flag,
  conditional `describe.skip`, moving the harness out of `npm test`).
- **The 180 s jest timeout and the 150 s `spawnSync` deadline are load-bearing.** Do not remove them.
- **Each harness is checked for its own success marker**, not just exit 0. If the final summary line changes, update
  `ShellHarnesses.test.ts` with it.
- **The harness carries grep-level assertions over the deploy scripts** (`nginx.conf`, `setup-profile.sh`,
  `setup-telemetry.sh`, `build-deploy-telemetry.sh`, `build-deploy-profile.sh`, `setup.sh`, `update.sh`, and the
  version-tag helper). Speeding it up must not drop or weaken any of them.

## What to build

**Step 1 — find where the time goes (record it before changing anything).** Time the harness section by section (it
is a numbered list of tests, `T1…`), on the working tree and at a commit before `05c3cfa`, and record the slowest
sections and **why** each is slow (a `sleep`, a retry/back-off, a network or remote look-up that is not stubbed, a
timeout waiting on something that never answers, a repeated expensive setup, …) in this task's `worklog.md`.

**Step 2 — make the harness itself fast again, without losing coverage.** Fix the cause found in Step 1 inside the
test harness (e.g. stub what is not stubbed, shorten a test-only wait through an existing knob, share a setup), so
that it finishes well inside the deadline under full-suite load.
- **Target:** standalone wall time comfortably under half the 150 s deadline, and full `npm test` green.
- **Coverage must not drop:** the same checks run, with the same assertions. Report the check count before and after.
- **Prefer test-side changes.** If the cause is in a deploy script itself (e.g. a real wait the script does in
  production that the test cannot avoid), say so and stop for the plan gate — a change to a deploy script ships with a
  deploy and is a different kind of change.

**Step 3 — only if Step 2 cannot get there without losing coverage: stop and bring the options to the owner at the
plan gate.** Do **not** pick one alone. The options to lay out, with what each costs:
- raise the 150 s / 180 s numbers (keeps them, but loosens the gate and can hide the next slowdown);
- split the harness into two files, each registered in `ShellHarnesses.test.ts` with its own success marker and its
  own deadline (no coverage lost; more files to keep registered — CLAUDE.md's *known residual: the harness list is
  hardcoded*);
- anything else Step 1 suggests.

## Verification steps

1. `worklog.md` records Step 1's per-section timings (before and after) and the cause of each slow section.
2. `bash tests/scripts/profile-deploy-hardening.test.sh` → **ALL PASS**, with its wall-clock time recorded, before and
   after; after is under the Step 2 target.
3. The check count before and after is recorded and **not lower** after; no assertion removed or weakened (diff of the
   harness reviewed for removed `assert`/check lines).
4. Full `npm test` **green twice in a row**, wall time recorded. (A supertest-family failure follows CLAUDE.md's
   known-flake rule: check the signature, re-run, and say you re-ran. A `SIGSEGV` is `0197`'s, not this task's.)
5. `ShellHarnesses.test.ts`: `JEST_TIMEOUT_MS` and `HARNESS_TIMEOUT_MS` are **unchanged** (unless the owner ruled
   otherwise at the plan gate — then the ruling is quoted in the worklog); no skip/opt-out path added; the success
   marker check still matches the harness's final line.
6. `npm run lint` and `npx tsc --noEmit` clean.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing formally. ⚠️ But until it ships, every task's full `npm test` is red and closes carry a
  "pre-existing red" caveat — first seen at `0367`'s close (2026-10-02).
- **Related:** `0201` (the gate itself and its owner rulings); [`0223`](../../backlog/0223-no-pre-commit-hook-runs-format-enforcement-is-dead/brief.md)
  (the inert pre-commit hook); `0355` / `0356` (the likely source of the new checks — unverified).
- **Placement:** ~~unruled — see `## Priority`. Owner to confirm: leave on the Backlog board, or pull into a sprint.~~
  📌 **2026-10-02 — ruled:** *"Move into Sprint 7 (Recommended)"* → Sprint 7, rank 34 (see `## Sprint` / `## Priority`).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
