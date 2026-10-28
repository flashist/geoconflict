# Verify 0495 live inside Yandex: a guest's "Log in and buy" opens the payment window with no second tap (B5)

## ID
0498

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Allocated in sequence `0492`–`0498` from a highest existing ID
> of `0491` (all three boards, base-10). See `0492`'s brief for the full check.

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. **OD-4**, typed by the owner: *"All should move to the current
> sprint"*. **RP-1** → **"Guide: keep 'Later' (Recommended)"**. Both quoted verbatim in the
> [spec](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)'s §9.1.
>
> ⚠️ **OD-4 overrides the standing build/verify rule for this task.** The owner's rule (2026-09-29) puts a verify task
> at the top of the **next** sprint. For the seven §11 tasks only, OD-4 puts it on **Sprint 9 now** (spec §9.1, §11).
> If `0495`'s deploy misses Sprint 9, this task cannot close in Sprint 9; the roll-over is the producer's.

## Priority
27

> ⚠️ Priority 27 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0495`**, because it checks that build's deploy (and with it `0494`'s, which
> has no verify task of its own). Appended after the board's highest rank (26), never inserted (ADR-035); no row
> renumbered.

## Status
⛔ Cancelled (agent-closed — not owner-verified) (2026-10-28) — Hand-run live verification replaced by GameAnalytics metrics verification in `0516` (owner ruling 2026-10-28, relayed by `fkit-lead`); server-side read-only steps folded into `0511`

> 2026-10-27 — live checks partly run by the owner (relayed by `fkit-lead`; recorded by a spawned `fkit-producer`). Results and what is still open: [`worklog.md`](worklog.md). Not closed: verification steps not all met.

## Owner
fkit-producer

## Context

Live check **B5** of the approved shared purchase-flow design:
[`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
§11 row **B5**. Part 1(a) of the spec is **documented only** — nobody has tried the in-page continue live. This task
proves it, inside Yandex, after `0495` (and `0494`) are deployed.

- **Entry gate (§11):** `0495` deployed to the game.
- **Who does what:** owned by the producer; **the owner runs every live step** — inside Yandex, with the test
  purchase list.
- Its measured login-to-payment time sets `AUTO_CONTINUE_DEADLINE_MS` (spec §15.2 item 1).

## What to build

Nothing. A live check of the §11 row B5 points, recorded in this folder's `worklog.md`.

## Verification steps

1. The §1a **unverified** items are checked live and each recorded as confirmed or not: the payment window opens after
   login with no second tap; a payment object fetched while a guest still works after login; the purchase is billed
   to the account that just logged in.
2. A guest's "Log in and buy" opens the Yandex payment window with **no second tap**. If Yandex needs a tap, the plain
   Buy button appears (`needs_tap`) and one tap completes the purchase — record which happened.
3. The grant lands on the account that just logged in (paid citizen, no interstitial ads).
4. **The restart popup appears after the purchase**, with both "Restart now" and "Later" (RP-1 = guide); a restart
   from it boots logged in.
5. Cancelling the login shows a message, then exactly one reload.
6. The 15 s deadline holds; the real login-to-payment time is measured and written down (at least three runs).
7. The worklog records the date, the deployed version, and each result; no connection strings, endpoints or keys.

## Notes

- **Depends on:** 0495, 0506, 0510 (and its game deploy, held for 0510; the profile box with 0506 goes first)
- 📌 **2026-10-26, later — `0510` added; the deploy hold carried over at the split.** OWNER RULING **"Approve
  (Recommended)"** (relayed; ⛔ not producer precedent) — option text: *"ADR-126 becomes accepted; producer splits 0506
  into profile-server and game build tasks, then planning starts."* `0506` is now S1 (profile box); the held **game**
  code (`0494`/`0495`) ships with `0510` (S2), so this game check waits on `0510`. `0506` stays because the guest's
  purchase lands on the profile box, which deploys first (spec §9). The game deploy also waits for `0512` part (a)
  (T3 is the release blocker). With S2 shipped, step 4's purchase is **not** consumed (ADR-126) — expected, not a
  failure.
- 📌 **2026-10-26 — `0506` added to Depends on, OWNER RULING** given via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Asked whether to hold the pending purchase-flow deploy for the no-consume change, the owner picked **"Hold it"** — option text: *"0493, 0497, 0498, 0499 then also wait on 0506 (design + ADR + build first). All Sprint 9."* The deploy this task checks (`0491`/`0492`/`0494`/`0495`/`0496`) does not go out until `0506` is built; this check follows it.
- **Blocks:** nothing
- **Spec:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §1(a), §11 (B5), §15.2.
- **ADR:** [ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
