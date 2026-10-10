# Update `Routes.it.test.ts` to expect the `verified` field the resolve route now returns

## ID
0431

> ℹ️ **ID allocation, checked 2026-10-09 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run, after `0430`: `0430`. `0431`: no task folder, no board hit.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-09, given live via `AskUserQuestion` in the `fkit lead` session** (during a
> `/fkit-sprint-ship-loop` run on Sprint 8, at `0425`'s close), relayed by `fkit-lead` to a spawned `fkit-producer` with
> no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim: **"File a small fix task (Recommended)"**.
> Placement: bottom of Sprint 8 (append rank, ADR-035).

## Priority
33

> ⚠️ **Priority 33 is append rank, NOT a merit ranking — flagged for owner confirmation.** Appended after the board's
> highest (32, `0430`). **On merit its rank barely matters:** it is a small test-only fix that blocks nothing — but until
> it lands, `npm run test:integration` is red on `dev`, which makes every later integration run harder to read.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**What is wrong, in plain terms.** Two tests in `tests/integration/Routes.it.test.ts` fail on `dev`:
- `"resolve -> credit -> read produces xp 10, no leaked fields"` (around line 305; its resolve `toEqual` is near `:318`)
- `"resolve returns the approved display name, and null for a player with none"` (around line 353; its `toEqual` is near
  `:367`)

Both compare the resolve route's response body with `toEqual({ playerId, isCitizen, … })`. The route now also returns a
`verified` field, so the exact-match comparison fails. The **route is right; the test is stale.**

**Evidence (from `0425`'s worklog, 2026-10-09):**
- `npm run test:integration` was 176/178; the 2 failures are these two tests.
- **Proven pre-existing:** the same suite on a clean `HEAD` worktree (without `0425`'s changes) fails the same 2 tests.
  `0425` does not touch the resolve route or this test.
- ~~**Likely cause:** task `0340` (commit `71efd10`, *"login mints vfy:true for a verified signature; resolveCaller reports
  verified (S3a)"*). ⚠️ Traced from logs and code, **not bisected** — the coder confirms before relying on it.~~

  > ⚠️ **Correction, 2026-10-10, recorded by the closing producer** (from the coder's `plan.md` § 1 and `worklog.md`).
  > The cause above is **wrong**. The `verified` key in the resolve reply was added by commit **`077c9e3`** ("Sprint
  > push", 2026-10-07) — task **`0332`** (ADR-124, session vouch). Confirmed by `git blame` on the route line, by
  > `git log -S` (only `077c9e3`), and by reading the `71efd10` diff (it does not add this key). Not bisected; not needed.

## What to build

1. Confirm the cause: what the resolve route returns today, and since which change (a quick `git log` / blame on the
   route and the test is enough; a bisect is not required).
2. Update the two expected bodies to include the `verified` field with the value the route returns for these callers
   (expected `false` — the test resolves without a verified login). Keep `toEqual` (exact match): the tests exist to catch
   leaked fields, so do **not** loosen them to `toMatchObject`.
3. Check the rest of the file and the other `tests/integration/**` suites for the same stale shape; fix only the same
   cause, and list anything else you find instead of growing the task.
4. Do **not** change `src/profile-server/Routes.ts` — the route's behaviour is intended (~~`0340`~~ `0332` / ADR-124 —
   ⚠️ corrected 2026-10-10, see § Context).

## Verification steps

1. `npm run test:integration` (per `CLAUDE.md` — named script, `.env.test`, local `gc-0012-it-pg` on port 5433) is
   **fully green**. If a `supertest` failure appears, judge it by the known-flake rule in `CLAUDE.md` and say you re-ran.
2. `npm run lint` is green.
3. The worklog names the change that added `verified`, and how it was confirmed.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing (it makes `npm run test:integration` green again on `dev`).
- Found by: [`0425`](../../done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md)
  (closed 2026-10-09, agent-closed — not owner-verified), worklog § *Residuals*.
- Test-only change; no deploy needed.
- Filed 2026-10-09 by a spawned `fkit-producer` at `0425`'s close, on the owner ruling above. ⛔ Not producer precedent.
