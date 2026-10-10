# Verify 0228 live — a quick leave, a double Join, or closing the window during a lobby join all take effect

## ID
0433

> ℹ️ **ID allocation, checked 2026-10-10 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0432` (folder names and `## ID` fields agree). `0433`: no task folder, no
> board hit.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-10, given live via `AskUserQuestion` in the `fkit lead` session** (during a
> `/fkit-sprint-ship-loop` run on Sprint 8, at `0228`'s close), relayed by `fkit-lead` to a spawned `fkit-producer` with
> no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim: **"File it, before 0428 (Recommended)"** —
> option text: *"Owner-run live check, at the bottom of Sprint 8, and 0428 waits for it, since 0228 is a private-lobby
> gate item."* This applies the standing build/verify-split rule (2026-09-29: the build task closes, its live check
> becomes its own verify task).

## Priority
34

> ⚠️ **Priority 34 is append rank, NOT a merit ranking — flagged for owner confirmation.** The owner ruled "the bottom of
> Sprint 8"; appended after the board's highest (33, `0431`), per ADR-035. **On merit this belongs directly above
> `0428`** (rank 30), because `0428` now waits for it. Not inserted there: ADR-035 never renumbers rows, and a new row
> always appends. Rank barely matters: the deploy of `0228`, not the rank, decides when it can start.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human)**, by hand, inside the Yandex Games page, after `0228` is deployed.
It needs two real player accounts, a real phone if possible, and a human eye.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0429` and
`0430`.)*

## Context

**What this is, in plain terms.** [`0228`](../../done/0228-handlejoinlobby-stale-gamestop-race/brief.md) fixed a
timing bug in joining a lobby. While the game was still setting up a join (a short wait for the network), a second
click was mishandled:
- **S1** — a player clicked a public lobby card to join, then clicked it again to leave. The leave was lost, and the
  player was later pulled into the match anyway.
- **S2** — a player double-tapped **Join** on a private lobby. The host's list showed that player twice.
- **S3** — a player tapped **Join** on a private lobby and closed the window right away. The player stayed in the host's
  list.

`0228` reproduced all three 9 of 9 times on a dev build (real clicks, network slowed to "Slow 3G"), then fixed them
(new `src/client/LobbyJoinSequence.ts`: the latest join wins, and a leave cancels a join still being set up). After the
fix the same 9 runs were clean. `0228` closed on that local proof, agent-closed — not owner-verified. **This task is
the live check.**

**Why it gates private lobbies for everyone.** `0228` is item 3 of the private-lobby release gate (`0354`). By owner
ruling (2026-10-10, above) [`0428`](../0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md)
— turning private lobbies on for everyone — waits for this check.

**What `0228` did NOT prove — this task covers each where it can be seen:**
1. **The browser proof is older than the last code change.** Review fix R1 wrapped the join code in `runJoin` (same
   logic, unit-tested only); the owner chose no browser re-run. This live check runs on the final code.
2. **No real phone, no Yandex Games page, no Tutorial or Solo start** were tried — only desktop Chromium on a dev build.
3. **Production kicks a second connection from the same player** (dev does not). What S2 looked like in production was
   never traced. With the fix only one join is sent, so it should not arise — this check sees whether the joiner stays
   connected.

**Two things that make the bug easier to hit — use them, or a pass proves little.** The race window is only wide when
the network is slow **and** the game has to re-download one small file at join time:
- **Slow network.** A phone on a weak connection, or, on a computer, Chrome DevTools → Network → **Slow 3G**.
- **Stay on the start screen for more than 5 minutes before each try.** The game's cosmetics file is cached for 5
  minutes (`Cache-Control: max-age=300`, `src/server/Master.ts`). Within those 5 minutes the join is fast and the window
  is too small to hit; after them the join re-checks the file over the network. (On a fresh page with Slow 3G, `0228`
  could not reproduce S1.)

If the tries are made on a fast network or right after the page loads, "nothing went wrong" is weak evidence — record
the conditions either way.

**Deploy timing.** `0228` ships in a weekend deploy slot (owner rule 2026-09-29) unless the owner says otherwise.
Commit and deploy are the owner's call; committed is not deployed.

## What to build

Nothing to build. A short live checklist, run by the owner on the deployed game inside the Yandex Games page.

**Before you start:**
- Note the game version live in production.
- Two accounts for the private-lobby items: a **citizen host** and a **joiner**. Until `0428` flips the everyone-flag,
  **both need the tester marker** to see the Приватная tab.
- Ideally the joiner is on a **phone on a weak connection**. If a phone is not practical, use a computer with Chrome
  DevTools set to Slow 3G — and say which in the worklog.
- Before each try: stay on the start screen for **more than 5 minutes**, then make the slow network active, then click.
- Optional, desktop only: keep the DevTools console open. When the window is actually hit, the game logs
  `leaving lobby, cancelling a join still being set up` (S1, S3) or `replaced or left while setting up, not joining`
  (S2, S3). Seeing either line proves the try really landed inside the window.

**Checks (try each one at least twice):**
1. **(a) Quick leave from a public lobby (S1).** On the Multiplayer tab, click a public lobby card to join, wait about
   one second, then click the same card again to leave. **Pass:** you are not pulled into that match when it starts;
   the card is no longer highlighted. (If you are pulled in, leave the match — real players are in it.)
2. **(b) Double-tap Join on a private lobby (S2).** The host creates a private lobby and shares the code. The joiner
   opens Join, types the code, and taps **Join** twice quickly. **Pass:** the host's list shows the joiner **once**, and
   the joiner stays connected (is not dropped a few seconds later). Then let the host start the match and confirm the
   joiner is in it.
3. **(c) Join, then close the window right away (S3).** Same setup. The joiner taps **Join** and closes the window as
   soon as it shows the joined/waiting state. **Pass:** the joiner is **not** left in the host's list.
4. **(d) Normal paths still work** (one try each, no slowdown needed): join a public lobby and stay — the match starts
   with you in it; join then leave a public lobby normally; start a **Solo** game; start the **Tutorial**.

Record the result in this task's `worklog.md`: game version, date, device and network for each check (phone or
computer; weak connection or Slow 3G or normal; whether the 5-minute wait was done), each check pass / fail / not run,
and whether a console line above was seen (desktop only).

## Verification steps

1. The worklog names the deployed game version that includes `0228`.
2. Checks (a)–(d) are each recorded **pass**, **fail** or **not run**, with the device and network conditions. A check
   not run is never written as passed.
3. **Pass** = (a)–(c) pass on at least one try made under the slow-network + 5-minute-wait conditions, and (d) passes.
   If no try was made under those conditions, the worklog says so plainly: a pass then shows no regression, not that
   the fix works live.
4. **Any fail** = the worklog names the check, the device and what happened; a follow-up build task is filed (this task
   does not fix code), and `0428` stays blocked until the owner decides.
5. For `0228`'s unproven points 1–3 (see *Context*), the worklog says which were covered: (1) by any live pass on the
   deployed code; (2) by a phone try, by the Yandex page, and by check (d); (3) by check (b)'s "joiner stays connected".
6. No player id, Yandex id, lobby code, full URL, host, IP, token or credential in any artifact. Describe accounts by
   role only (citizen or not, tester or not, phone or computer).

## Notes

- **Depends on:** `0228` committed and deployed
- **Blocks:** `0428` (OWNER RULING 2026-10-10, above)
- Build task: [`0228`](../../done/0228-handlejoinlobby-stale-gamestop-race/brief.md) (closed 2026-10-10, agent-closed —
  not owner-verified). Its `worklog.md` holds the exact before/after runs (§2, §4) and the 5-minute cache finding.
- Related: `0428` (the everyone-flag, waits for this), `0376` (citizen hosts in production — its setup can be reused
  for (b) and (c)), `0432` (a separate leak `0228`'s builder noticed; not part of this check).
- Deploy: weekend slot (owner rule 2026-09-29) unless the owner says otherwise.
- Filed 2026-10-10 by a spawned `fkit-producer` at `0228`'s close, on the owner ruling above. ⛔ Not producer precedent.
