# Monitor GameAnalytics for event-volume spikes — check 2 (window from 2026-10-20)

## ID
0473

> ℹ️ **ID allocation, checked 2026-10-20 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0472` (folder names and `## ID` fields agree, base-10 arithmetic). `0473`: no task folder, no
> `## ID` hit, no hit in `.claude/`, no `tasks/*/0473*` path in any branch's history; repo-wide hits are SVG
> coordinates only.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **NEEDS THE OWNER'S BROWSER.** GameAnalytics is read through the owner's Chrome with the owner
logged in himself. An agent session may do the clicking and reading only with the owner present and logged in.
**Read-only**: nothing is saved, exported, shared, alerted or changed in GameAnalytics, and the banner is not
dismissed.

## Context

**Filed 2026-10-20 by a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.**
This is the **second instance** of the recurring check defined in
[`0458`](../../done/0458-monitor-gameanalytics-for-event-volume-spikes/brief.md), filed at its close as that brief's
step 6 requires. **Read `0458`'s brief first** — the method, the owner's constraint and the background all live there
and are not repeated here.

**Settled by OWNER RULING 2026-10-20** (live `AskUserQuestion` in a Claude Code session, relayed; verbatim *"Accept all
three (Recommended)"*; recorded in `0458`'s brief):
- **Cadence:** about once a month, reading the whole month since the last check.
- **Spike:** a day where `Platform` ÷ "Session Count (started)" is **≥ 1.5** (normal ≈ 0.9). ✅ **Gap closed — OWNER RULING 2026-10-20** (live `AskUserQuestion`, relayed; ⛔ not producer precedent): *"What should count as a spike for the monthly check?"* → verbatim **"Ratio 1.5 or more (Recommended)"**. Threshold = `Platform` ÷ sessions **≥ 1.5** (absolute ratio). The earlier "1.5× normal" wording was the relaying session's own error.
- **Log:** append to [`gameanalytics-spike-log.md`](../../../knowledge-base/reports/gameanalytics-spike-log.md).

⛔ **Owner's constraint, unchanged: events from ALL builds keep being collected** — no filtering of old builds, no
interfering with GameAnalytics' handling of duplicates. Monitoring only; if a spike looks like it needs action, that is
a new question for the owner.

**Where check 1 left off** (`0458`, read 2026-10-20): window 2026-10-13 … 2026-10-19, one spike on 18 Oct (ratio 1.55,
mostly 3 users in IE on build 0.0.165). This check starts at **2026-10-20**. Due **about 2026-11-20**; a late check
loses nothing (Explore shows the past 90 days).

## What to build

Nothing is built. One read-only check, exactly as `0458`'s *What to build* steps 1–5:

1. Read, for every day from **2026-10-20** to the day before the check: `Platform` count by day, "Session Count
   (started)" by day, and the Integration chart *"Total number of events per active user (per day)"* on any spike day.
2. Flag every day with `Platform` ÷ sessions ≥ 1.5.
3. For each spike day record: date, `Platform` count, sessions, ratio, events per active user, build split, country
   split, and banner / "Limit reached" badge state. Anything the UI cannot show is *"could not be determined"*.
4. A window with no spike is recorded as *"checked <from>–<to>, no spike"*.
5. Append a dated entry to the spike log; this task's worklog links to it.
6. Optional, if quick: say whether the IE source from 18 Oct shows up again (country split). Do not investigate it
   further — monitoring only.

## Verification steps

1. The log has a dated entry covering every day from 2026-10-20 to the day before this check, with `Platform` count,
   sessions and ratio for each spike day, or *"no spike"*.
2. Every spike day has its build split, country split and banner state, or *"could not be determined"* for a part the
   UI did not show.
3. Every figure is labelled as read off the GameAnalytics UI, with the date it was read.
4. 🔒 The log and worklog contain **no** game key, secret key, numeric game/dashboard ID, URL containing one, user id or
   token — names, counts and dates only.
5. Nothing was saved, exported, shared or changed in GameAnalytics (stated in the worklog).
6. The next instance is filed (or the owner has ruled a different reminder).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Previous instance:** [`0458`](../../done/0458-monitor-gameanalytics-for-event-volume-spikes/brief.md) (check 1).
- **Related (background only):** [`0230`](../0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md)
  (why the spikes happen — open). A check could share one sitting with other GameAnalytics reads in the owner's Chrome.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact.**
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
