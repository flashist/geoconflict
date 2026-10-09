# Recheck in GameAnalytics the two 0397 status events missing from the 2026-10-08 read

## ID
0418

> ℹ️ **ID allocation, checked 2026-10-08 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0417` (folder names and `## ID` fields agree). `0418`: no task folder, no `## ID` hit, no `.claude/`
> hit; repo-wide only an unrelated number in `resources/ads.txt`.

## Sprint
Sprint 8

## Priority
17

> ⚠️ **Priority 17 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit its rank barely matters:** it blocks nothing and is time-gated (read it once several days of data exist
> after the 2026-10-08 deploy). Appended after the [Sprint 8](../../../sprints/plan-sprint-8.md) board's highest
> (16, `0406`), never inserted (ADR-035) — a position, not merit.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **NEEDS THE OWNER'S BROWSER.** GameAnalytics is read through the owner's Chrome with the owner
logged in himself (as on 2026-10-08). An agent session may do the clicking and reading only with the owner present
and logged in; nothing is saved or changed in GameAnalytics.

## Context

**Filed 2026-10-08 by a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.**
Authority: an OWNER RULING typed live by the owner in the `fkit lead` session on 2026-10-08, relayed by `fkit-lead`.
The lead had asked whether the producer should file a coder investigation for the missing `0400` events. Owner,
verbatim: *"1. No need for the investigation, brief a task to the Sprint 8 to recheck the numbers in GameAnalytics."*

**What this is, in plain terms.** [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md)
added a status line to the citizenship card and three analytics events for it
([reference](../../../knowledge-base/analytics-event-reference.md), rows `CITIZENSHIP_STATUS_*`). Its live check,
[`0400`](../../done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md), read
GameAnalytics on 2026-10-08 (check 8) and found only one of the three:

| Event | When it fires | 2026-10-08 read |
|---|---|---|
| `Citizenship:Status:ReadFailed` | "couldn't load your profile" line shown | ✅ seen, **95** (partial day) |
| `Citizenship:Status:Unverified` | "not confirmed" line shown — a logged-in **citizen** whose login was not verified | ⚠️ **not present** |
| `Citizenship:Status:Restart` | player pressed **Перезапустить** on the "couldn't load" line on the start screen, right before the reload | ⚠️ **not present** — although the owner pressed it on the start screen at least once that day and the game reloaded (`0400` check 5b, ~07:30–07:35Z) |

`ReadFailed` reporting shows the `Citizenship:Status` family itself reaches GameAnalytics. **This task is a later
re-read only — no investigation now (owner ruling above).** If the two events are still missing after several days
of data, the next step goes to the owner; a coder investigation is then the owner's call.

**How the 2026-10-08 read was done** (full record: `0400`'s
[`worklog.md`](../../done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/worklog.md)
§ *Check 8*): by `fkit-lead`, about 11:39Z, GameAnalytics Explore in the owner's Chrome (owner logged in), Design events,
aggregation Count, "Past 7 days" with the current day included. GameAnalytics showed its **"Demo mode" banner** on
every page (as on 2026-09-29 and 2026-10-05).

**⚠️ A note from `fkit-lead`, recorded in `0400` — NOT a diagnosis, unverified:** `Restart` fires right before a page
reload, so it may be lost before GameAnalytics sends its queue; `Unverified` needs an unverified citizen session
(~3 % of logins are stale), so its absence may be real (no such session that day) or a reporting gap. Nobody has checked
either idea. Do not treat them as the answer; this task does not test them.

**Facts that bear on the window:**
- Game client `0.0.157` (carrying `0397`) has been live since **2026-10-08T06:56:17Z** (deploy record in
  [`0396`](../../done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/worklog.md)).
  Before that, none of the three events existed.
- All three events sit **behind the `citizenship_ui` kill switch.** The owner switched it off and back on for about
  5 minutes ending ≈09:48Z on 2026-10-08 (`0398` / `0400` check 7); during that time no event could fire.
- A page load where the experiment flags time out reads `citizenship_ui` as off for that session, so no event fires
  there either (found during `0398`, filed as
  [`0411`](../0411-citizenship-card-suggest-a-reload-when-the-experiment-flags-fetch-timed-out/brief.md)).

## What to build

Nothing in source. A read-only read in GameAnalytics, then the owner's call if needed.

1. **Wait for the window.** Read once there are **several full days** of data after 2026-10-08 (producer's suggestion,
   not an owner ruling: at least 2026-10-09 to 2026-10-13, so one weekend is in it). If a new game client deploy
   lands in the window, say so and name its date.
2. **Read in GameAnalytics** with the same settings as the 2026-10-08 read: Explore, Design events, Count, the window
   above, current day **excluded** this time (full days only) — or say plainly if it was included.
3. **Record per day** (2026-10-08 onward): for each of `Citizenship:Status:Unverified`, `Citizenship:Status:Restart`,
   and — as the control — `Citizenship:Status:ReadFailed`: seen yes/no and the count. Note whether the "Demo mode"
   banner was shown.
4. **If either event is still absent:** do not investigate. Record the absence and put the next step to the owner —
   for example, a coder investigation task (the owner's call), or accepting the gap.
5. **If both appear:** record the counts and say the `0400` check 8 gap is closed by this read.

⛔ **Never copy a GameAnalytics user id, session id, token or URL** into chat, a worklog, a brief or any tool. Event
names, counts, dates and times only.

## Verification steps

1. `worklog.md` records the window (first and last day, UTC), the read time, the GameAnalytics settings used, and
   whether the "Demo mode" banner was shown.
2. A per-day table for `Citizenship:Status:Unverified`, `Citizenship:Status:Restart` and
   `Citizenship:Status:ReadFailed`: seen yes/no and count for each day.
3. A one-line result: both seen / one seen / neither seen.
4. If either is still absent: the next step put to the owner and the owner's answer recorded in the owner's words (or
   recorded as still open). No investigation is started by this task.
5. **No secrets:** no id, token, session, URL or response body in any artifact.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Time-gated:** pointless before several days of data exist after 2026-10-08.
- **Related:** [`0400`](../../done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md)
  (its check 8 is the failed / pending part this task carries; `0400` itself is not closed by this filing),
  [`0397`](../../done/0397-show-players-whether-their-session-is-verified/brief.md) (the events),
  [`0402`](../../done/0402-re-read-the-post-0340-login-verification-numbers-in-a-few-days/brief.md) (another later re-read,
  different numbers), [`0411`](../0411-citizenship-card-suggest-a-reload-when-the-experiment-flags-fetch-timed-out/brief.md)
  (loads where the flags never arrive fire no citizenship event).
- **Producer's suggestion, not an owner ruling:** if the owner wants a known-positive check for `Restart`, he can press
  **Перезапустить** once on the start screen (with the profile request blocked, as in `0400` check 5a–5b) and note the
  UTC time, then look for that day's count. This is a test action, so it is the owner's choice — not a step of this task.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

> 📌 **2026-10-08, later — `0400` is now closed.** The *Related* line above (*"`0400` itself is not closed by this
> filing"*) was true when written and is kept as history. [`0400`](../../done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md)
> was closed `✅ Done (agent-closed — not owner-verified)` on 2026-10-08 by a spawned `fkit-producer`, on the OWNER
> RULING typed live in the `fkit lead` session, relayed by `fkit-lead`, verbatim *"Close it, pointing at the Sprint 8
> re-check"*. Its check 8 is recorded **not passed** and points at this task, which carries it. Nothing else in this
> brief changed; this task's status is unchanged (`🔲 Backlog`).
