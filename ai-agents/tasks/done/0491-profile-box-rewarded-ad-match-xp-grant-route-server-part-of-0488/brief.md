# Profile box: rewarded-ad match-XP grant route (server part of 0488)

## ID
0491

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0490`. `0491`: no task folder and no reference in
> `ai-agents/tasks/` or `ai-agents/sprints/`.

## Sprint
Sprint 9

> 📌 **Filed on an OWNER RULING of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Asked *"Split the server part into its own Sprint 9 task?"*, the owner
> picked, verbatim, **"Split it (Recommended)"** — option text: *"New server task on Sprint 9; 0488 (client) waits on it.
> Server deploys first. Nothing else waits on 0488."* Recorded in
> [`0488`'s worklog](../0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/worklog.md).

## Priority
20

> ⚠️ Priority 20 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0484`** (that is, directly above `0488`), because `0488` waits on it and the
> profile box deploys first. Appended after the board's highest rank (19), never inserted (ADR-035); no row renumbered.
> It sits **below** `0488` on the board; the ship loop orders by dependency, so `0488` still waits for it.

## Status
✅ Done (agent-closed — not owner-verified)

> (Status until 2026-10-24) ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

**Filed 2026-10-24 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given live via
`AskUserQuestion` in the lead's session and relayed by `fkit-lead`; ⛔ not producer precedent.** This is the server part
of [`0488`](../0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/brief.md) (opt-in Yandex
rewarded video, reward = double this match's XP), split out at plan approval.

**The owner approved the plan via `0488`** on 2026-10-24 — verbatim **"Approve as planned (Recommended)"** (option text:
*"Includes: one reward per match, 60 s gap before a forced ad, a lost reward is not retried on next page load."*) — and
ruled the split (see *Sprint* above). The four rulings are recorded verbatim in `0488`'s
[`worklog.md`](../0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/worklog.md).

**The approved plan is the spec:**
[`0488/plan.md`](../0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/plan.md). It is not
restated here. The parts this task builds from it:

- § *Answers to the six plan-step checks* → **4. XP crediting trust** — the design (route, ledger table, what a faked
  watch can gain, no game-server change).
- § *Step-by-step plan* → **Part S — profile box**, steps **1–6**.
- § *Tests* → the **Part S** tests: `tests/core/RewardedMatchXpContract.test.ts`,
  `tests/profile-server/RewardedMatchXpRoutes.test.ts`, `tests/integration/RewardedMatchXp.it.test.ts`; and the
  *Checks to run* list.

`0488` keeps **Part C** (steps 7–12 + the client tests) and calls the route this task adds.

**Deploy order: the profile box (this task) first, then the `0488` client.** Both in weekend slots (owner rule). The
offer stays off behind the remote flag until both are deployed (owner ruling *"Yes, starts off (Recommended)"*, a
Part C item). Until a client calls it, this route does nothing.

## What to build

**Part S of the approved plan — steps 1–6, plus the Part S tests — exactly as written in
[`0488/plan.md`](../0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/plan.md).** The plan was
owner-approved; this task needs no new plan approval for what the plan already says.

- Anything the plan does **not** settle and that changes what gets built goes back to the owner (through the producer
  or the lead), not decided in code.
- **Out of scope:** everything in Part C (client, `WinModal`, the SDK call, the remote flag, strings, analytics events),
  any change to `src/server` / `getCreditableYandexId`, and the plan's own *Not in scope* list.

## Verification steps

1. Every Part S step (1–6) of the plan is done, each with a file reference in the worklog; step 6 (no nginx change, no
   new env var) stated with the evidence checked.
2. The three Part S test files named in the plan's *Tests* section exist and cover every case listed there for them;
   `npm test -- <file>` passes for the two unit suites.
3. `npm run test:integration` passes for `RewardedMatchXp.it.test.ts` — **or**, if `TEST_DATABASE_URL` / the
   `gc-0012-it-pg` container is not available, it is reported **skipped, not passed**, and the gap is named.
4. One full `npm test` (through the npm script, project lock) and `npm run lint` pass. A single
   `Exceeded timeout of 5000 ms` in a supertest suite is judged by the known-flake rule in `CLAUDE.md`, and the re-run is
   said.
5. `npm run check:config-parity` reports no new finding.
6. No ids, tokens or game ids in any new log line (shown by the route test, as the plan asks).
7. `0488`'s Part C can call the route as the plan describes: the shared contract (step 1) is the one both sides import.

## Notes

- **Depends on:** nothing
- **Blocks:** 0488
- **Deploy order:** profile box first (this task), then the `0488` client. Weekend slot unless urgent (owner rule);
  committed is not deployed.
- **Build vs verify (owner rule, 2026-09-29):** the plan's live verify (§ *Build vs verify, deploy*) deploys both parts
  after `0488` closes. Whether this task gets its own verify task at close is the producer's call then.
- **Spec:** [`0488/plan.md`](../0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/plan.md) —
  owner-approved 2026-10-24. Do not edit it from this task.
- **Split from:** [`0488`](../0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/brief.md),
  2026-10-24 (owner ruling *"Split it (Recommended)"*).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
