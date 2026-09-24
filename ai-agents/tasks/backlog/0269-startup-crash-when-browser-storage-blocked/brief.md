# Startup can crash when browser storage is blocked (logDaysPlayedAnalytics in initializeImmediate)

## ID
0269

> ℹ️ **ID allocation, checked 2026-09-15 before filing** (same run as `0266`). `0269`: no folder, no
> `## ID` hit, no `.claude/` hit, no repo-wide hit (`.svg`/`.json` filtered).

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Low–Medium** — not owner-ruled. Pre-existing, affects only
players whose browser blocks storage access; how many is unknown.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-15 by a spawned `fkit-producer` on an OWNER RULING given live in the lead session and
relayed by `fkit-lead` — `0253` review finding R4, owner: *"Fix comment + file task"*.** `0253` fixed its
own misleading "never throws" comments; this task is the older boot exposure the review found next to
it. **Pre-existing — not caused by `0253`** (the same code is at `HEAD`).

### The exposure (read 2026-09-15)

- `src/client/DaysPlayedAnalytics.ts` — `logDaysPlayedAnalytics(today = localDateString(), storage:
  StorageLike = localStorage)`. The function body is wrapped in `try … catch`, **but the default
  parameter `localStorage` is evaluated before the `try`.** In a browser that throws when a page reads
  `window.localStorage` (storage/site data blocked), the call throws.
- It is called from `FlashistFacade.initializeImmediate()` (`src/client/flashist/FlashistFacade.ts` —
  `logDaysPlayedAnalytics();`), which `src/client/Bootstrap.ts` calls first, before platform init.
- A throw there rejects `bootstrap()`; `Bootstrap.ts`'s `bootstrap().catch(...)` then runs its
  before-the-gate branch. **What the player sees in that branch is not established here** — step 1.
- The nearby `Player:New` / `Player:Returning` block reads `localStorage` **inside** its own `try`, so it
  is not exposed the same way.
- ⚠️ `0253`'s uncommitted build added `snapshotTenureEvidenceOnce()` on the line before, with the same
  default-parameter shape (its comment was corrected in review). `0253`'s 2026-09-15 redesign removes
  the client snapshot, so that call may be gone by the time this runs — check.

## What to build

1. **Reproduce first.** In a real browser with storage access blocked (and inside the Yandex iframe if
   possible), confirm whether `window.localStorage` throws and whether startup fails. Record what the
   player sees. If it does not reproduce in any current browser, say so and put it to the owner whether
   to still apply the fix.
2. **Fix:** make the boot path survive a throwing storage getter — the storage read happens inside the
   guard, not in a default parameter. Apply the same to any other call reached from
   `initializeImmediate()` with the same shape.
3. **Sweep (report, do not fix):** list other unguarded `localStorage` reads on the startup path, so the
   owner can decide on them.

## Verification steps

1. Step 1's result (reproduced or not, per browser tried) is written in the worklog.
2. A unit test makes the `localStorage` getter throw and asserts `initializeImmediate()` does not throw
   (and that `logDaysPlayedAnalytics` still does not throw when given no storage argument).
3. Mutation check: moving the storage read back into the default parameter makes that test fail.
4. `npm test` passes; `tsc --noEmit` and `npm run lint` exit 0.
5. The sweep list from step 3 is in the worklog.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Source:** [`0253`](../../done/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md)
  `review.md`, finding R4 and its owner disposition.
- Client-only; no localization or analytics changes expected.
