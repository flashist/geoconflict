# Verify 0492 live: citizenship purchases still grant after the B1 profile-box deploy (B1v)

## ID
0493

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Allocated in sequence `0492`–`0498` from a highest existing ID
> of `0491` (all three boards, base-10). See `0492`'s brief for the full check.

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. **OD-4**, typed by the owner: *"All should move to the current
> sprint"*. Quoted verbatim in the [spec](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)'s
> §9.1.
>
> ⚠️ **OD-4 overrides the standing build/verify rule for this task.** The owner's rule (2026-09-29) puts a verify task
> at the top of the **next** sprint. For the seven §11 tasks only, OD-4 puts it on **Sprint 9 now** (spec §9.1, §11).
> If `0492`'s deploy misses Sprint 9, this task cannot close in Sprint 9; the roll-over is the producer's.

## Priority
22

> ⚠️ Priority 22 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0492`**, because it checks that build's deploy and nothing else gates it.
> Appended after the board's highest rank (21), never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Live check **B1v** of the approved shared purchase-flow design:
[`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
§11 row **B1v**. `0492` changes how the profile box grants and reconciles purchases, including a live behaviour change
in `/reconcile`. This task proves citizenship sales still work after that deploy.

- **Entry gate (§11):** `0492` deployed to the profile box.
- **Who does what:** owned by the producer; **the owner runs the live steps** (the test purchase inside Yandex and the
  box-log read). An agent may run read-only checks only where the owner allows it.

## What to build

Nothing. A live check of the four points in §11 row B1v, recorded in this folder's `worklog.md`.

## Verification steps

1. A test purchase of citizenship (Yandex test purchase list) grants citizenship and the purchase is consumed.
2. `/complete`'s response for that purchase carries `becamePaidCitizen`.
3. A normal reconcile still grants a stray (unconsumed) purchase.
4. The profile box logs show no reconcile 500s after the deploy.
5. The worklog records the date, the deployed version, and each result; no connection strings, endpoints or keys.

## Notes

- **Depends on:** 0492 (and its profile-box deploy)
- **Blocks:** nothing
- **📌 Knock-on from `0492`'s build (added 2026-10-24 by a spawned `fkit-producer` at `0492`'s close).** Source:
  `0492`'s `plan.md` §Deploy notes, verbatim: *"(a) After B1, a failing reconcile entry no longer produces a 500. So
  0493 step 4 ("no reconcile 500s") is a weaker check than it sounds; the verifier should also search the box logs for
  `reconcile entry failed`."* and *"(b) The wiki records that live `/reconcile` has **never been observed** (`0297`). So
  0493 step 3 is probably the first live reconcile ever."* For step 4, the verifier also searches the profile box logs
  for `reconcile entry failed` (one line per failed entry, token's first 8 characters only). For step 3, expect no
  earlier live reconcile to compare against.
- **Spec:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §11 (B1v).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
