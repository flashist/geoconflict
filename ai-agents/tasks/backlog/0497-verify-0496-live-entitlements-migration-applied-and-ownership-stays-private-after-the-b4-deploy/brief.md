# Verify 0496 live: the entitlements migration applied and ownership stays private after the B4 deploy (B4v)

## ID
0497

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
> If `0496`'s deploy misses Sprint 9, this task cannot close in Sprint 9; the roll-over is the producer's.

## Priority
26

> ⚠️ Priority 26 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0496`**, because it checks that build's deploy and nothing else gates it.
> Appended after the board's highest rank (25), never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Live check **B4v** of the approved shared purchase-flow design:
[`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
§11 row **B4v**. `0496` adds a migration and a private ownership list to the profile box.

- **Entry gate (§11):** `0496` deployed (profile box after `0491`'s migration `009`; game for the client parse).
- **Who does what:** owned by the producer; **the owner runs the live steps** (box reads and the test purchase). An
  agent may run read-only checks only where the owner allows it.

## What to build

Nothing. A live check of the four points in §11 row B4v, recorded in this folder's `worklog.md`.

## Verification steps

1. The entitlements migration is applied on the profile box (the migration runner's record shows it, after `009`).
2. A verified (confirmed-login) profile read carries `entitlements: []`.
3. An unverified profile read carries no `entitlements` field.
4. A citizenship test purchase (Yandex test purchase list) still grants citizenship.
5. The worklog records the date, the deployed versions, and each result; no connection strings, endpoints or keys.

## Notes

- **Depends on:** 0496, 0506, 0510 (and its profile-box and game deploys, held for 0506 and 0510)
- 📌 **2026-10-26, later — `0510` added; the deploy hold carried over at the split.** OWNER RULING **"Approve
  (Recommended)"** (relayed; ⛔ not producer precedent) — option text: *"ADR-126 becomes accepted; producer splits 0506
  into profile-server and game build tasks, then planning starts."* `0506` is now S1 (profile box), and the held
  **game** code ships with `0510` (S2). This check reads both deploys (box migration + game client parse), so it waits
  on both. Same sprint; the hold itself is unchanged.
- 📌 **2026-10-26 — `0506` added to Depends on, OWNER RULING** given via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Asked whether to hold the pending purchase-flow deploy for the no-consume change, the owner picked **"Hold it"** — option text: *"0493, 0497, 0498, 0499 then also wait on 0506 (design + ADR + build first). All Sprint 9."* The deploy this task checks (`0491`/`0492`/`0494`/`0495`/`0496`) does not go out until `0506` is built; this check follows it.
- **Blocks:** nothing
- **Spec:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §11 (B4v).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
