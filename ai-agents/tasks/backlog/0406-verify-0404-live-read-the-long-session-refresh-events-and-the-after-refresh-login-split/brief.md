# Verify 0404 live — read the long-session refresh events and the after-refresh login split

## ID
0406

> ℹ️ **ID allocation, checked 2026-10-07 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0405`. No `0406` hit under `ai-agents/` or `.claude/`. `0406` allocated in this
> run.

## Sprint
Sprint 8

## Priority
16

> ⚠️ **Priority 16 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs in the top group of the [Sprint 8 board](../../../sprints/plan-sprint-8.md)**, with the other
> verify tasks, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the
> next sprint"*. Not placed there: ranks 2–4 and 8–14 on that board are closed rows (`➡️ Moved` / `✅ Done`), and
> moving this row above them would renumber them — ADR-035 forbids that *"not even under an owner ruling"*; a spawned
> producer also never re-ranks. Appended after the board's highest rank (15,
> [`0405`](../0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md))
> instead — the reversible branch, as with `0405`.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The deploy is the owner's (weekend slot). The event reads
and the counter read are read-only and can be run by an agent session with the owner's read-only Uptrace /
analytics approval — **confirm that approval covers this task first** (standing rule: read-only checks are run, not
handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0405`](../0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md).)*

## Context

**Filed 2026-10-07 by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0404`'s close**, on the
owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop` on
Sprint 7. ⛔ Not producer precedent. The **build** task is closed; this **verify** task sits on the next sprint and
**must not block** Sprint 7's deploy. Content follows `0404`'s `plan.md` §5.4 (*"Production check: a separate verify
task filed at close"*).

**What this verifies.** [`0404`](../../done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md)
(closed 2026-10-07 `(agent-closed — not owner-verified)`) shows a forced *"please refresh the game"* popup once a page
has been open 23 h (owner rulings: 23 h; forced, no close button; everyone, guests included). It shows only on the
start screen, never mid-match, and waits while a Yandex payment or login dialog is open. Its job, for identity: a
player whose login pass (24 h) would otherwise expire mid-visit reloads first, so they do not join a match with an
expired pass — the exit for [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)'s
review finding R2.

It ships these analytics (all in `ai-agents/knowledge-base/analytics-event-reference.md`):
- **`Session:LongSessionRefresh:*`** — `Due` (value = minutes since page load) · `Shown` · `Waited` (value = minutes
  `Due` → `Shown`, only when it could not show at once) · `DeferredByDialog` · `PreemptedByStaleBuild` · `Refresh`
  (button pressed). Each at most once per page load.
- **`Profile:Login:SignatureAge:AfterRefreshPopup:*`** — the login signature-age split for the boot that follows a
  press of the popup's refresh button (`0404` plan §2.9, owner ruling Q2 *"#1"*). This is what answers *"do refreshed
  players come back verified?"*.

**What was proved before close, and what was not.** Unit tests; full `npm test` green; lint + `tsc` clean; 7 browser
checks passed in the owner's Chrome on a local dev server (clock shifted in-page). **Not proved:** the Yandex payment /
login deferral (real SDK only), a real tab-visibility change, the after-refresh marker on the next boot, and **anything
in production**. ⚠️ **Whether a refresh yields a *verified* pass is unproven** — ADR-121 notes Yandex may return the
same signed data for the whole visit. That is the main question this task answers.

### Preconditions — this task cannot start until all of these hold
- `0404` is **committed** (the owner commits) and deployed in a weekend slot (client-only; ships in the game image; any
  order relative to `0332`). Record the deploy date and time.
- ⚠️ **Time.** No `Session:LongSessionRefresh:*` event can appear until a page has been open **23 h** after the deploy,
  and only for players who keep a tab open that long. **Read after a few days**, not on deploy day.
- Access to the analytics events and Uptrace. ⚠️ The telemetry box is unreachable while a full-tunnel VPN is on — see
  the project memory note on telemetry VPN access.

## What to build

Nothing — this is a check, read-only after the owner's deploy.

1. Over a stated window (start ≥ 23 h after the deploy; a few days long), read the six `Session:LongSessionRefresh:*`
   events.
2. Read the `Profile:Login:SignatureAge:AfterRefreshPopup:*` split for the same window.
3. Read `0332`'s `geoconflict.profile.resolve.vouch{outcome="expired"}` share — **unless**
   [`0405`](../0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md) has
   already read it over a window that covers this deploy; then cite `0405`'s figure instead of re-reading.

## Verification steps

1. **The popup fires in production:** `Due` and `Shown` are non-zero. Record counts per event for the window. Expect
   `Due` ≥ `Shown` + `PreemptedByStaleBuild` (the rest: a match exit reloaded the page first, or the tab closed while it
   waited). Record `Refresh` / `Shown` — the share of shown popups that ended in a press (it should be close to 1; the
   popup has no close button, so the gap is tabs closed instead).
2. **It waits sensibly:** record the `Waited` distribution (minutes) and the `DeferredByDialog` count. A long wait is not
   a failure by itself (it means the player stayed in matches); say what it shows.
3. **Stale-build interplay:** record `PreemptedByStaleBuild`. Non-zero is expected right after a deploy and is correct
   behaviour (one popup only, stale-build wins).
4. **Refreshed players come back verified? (the main question):** read the `AfterRefreshPopup` signature-age buckets.
   Per ADR-121, ages inside the 24 h window (`Fresh` … `Past6h24h`) read as verifiable; `PastOver24h` means Yandex
   returned the same old signed data on refresh. **Record the share inside the window vs `PastOver24h`.** If
   `PastOver24h` dominates, say so plainly: the refresh fixes the *expired session token* but not *verification* — and
   raise it to the owner as an open question (do **not** file a fix task on that alone; it is an owner call).
5. **`0332`'s `expired` share falls:** compare `geoconflict.profile.resolve.vouch{outcome="expired"}` as a share of all
   resolves before vs after the `0404` deploy (or cite `0405`). ⚠️ **Per resolve, not per player.** A fall supports R2
   being closed in production; no fall, with `Refresh` events present, is a finding to report.
6. **No player-visible harm:** no new complaint or error spike tied to the popup in the window (the owner's call on what
   to look at).
7. Record in this task's `worklog.md`: deploy date, the window, every count above, the two shares (step 4 and step 5),
   and the method. **No tokens, player ids, endpoints or credentials** in the record. If a step fails, say which and
   file a fix task; do not reopen `0404`.

## Notes

- **Depends on:** [`0404`](../../done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md)
  committed and deployed (game image).
- **Blocks:** nothing. It does **not** block Sprint 7's deploy (owner's build/verify-split rule, 2026-09-29).
- **Related:** [`0405`](../0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md)
  (reads the same `vouch{outcome}` counter — coordinate so it is read once) ·
  [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) (review
  R2, the `expired` case) · [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
  (24 h signature window; the same-signed-data caveat).
- **Timing:** Uptrace keeps logs about 14 days in practice
  ([`0259`](../../done/0259-investigate-uptrace-retention-not-applied/brief.md)); read well inside that.
- No secrets in this task's record: no connection strings, endpoints, tokens or player ids.
