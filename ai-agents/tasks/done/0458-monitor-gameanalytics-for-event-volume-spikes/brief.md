# Monitor GameAnalytics for event-volume spikes

## ID
0458

> ℹ️ **ID allocation, checked 2026-10-14 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0457` (folder names and `## ID` fields agree, base-10 arithmetic). `0458`: no task folder, no
> `## ID` hit, no `tasks/*/0458*` path in any branch's history, no other hit under `ai-agents/`.

## Sprint
Backlog

## Priority
Unscheduled

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer — ⚠️ **NEEDS THE OWNER'S BROWSER.** GameAnalytics is read through the owner's Chrome with the owner
logged in himself (like [`0418`](../../done/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md)
and `0456`). An agent session may do the clicking and reading only with the owner present and logged in. **Read-only**:
nothing is saved, exported, shared, alerted or changed in GameAnalytics, and the banner is not dismissed.

## Context

**Filed 2026-10-14 by a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.**
Authority: an **OWNER RULING, 2026-10-14**, live `AskUserQuestion` in the `fkit lead` session (driver of
`fkit-sprint-ship-loop`), relayed by `fkit-lead`. The owner wrote, verbatim (in the "Other" field): *"Do I understand
correctly that you're saying that the problem is not going to be repeated in tegular situations? If yes, I suggest
adding a task to the backlog sprint about monitoring the spikes in the future, but don't mention the proposed
solutions there: to be honest, I don't like the options of us "intruding" into the GameAnalytics logic of
deduplication and filtering events from not latest builds (the last one is a no-no, because we need to collect the
events from all builds to be able to spot any problems during releases)"*. `fkit-lead` answered that normal days are
fine (~114 events per user), that spikes will very likely recur (about 10 since late August), and that GameAnalytics'
docs say going over the limit only shows an alert, with no data lost. The owner then chose **"Yes, file it in Backlog
(Recommended)"** — option text: *"Monitoring only; no proposed solutions; nothing dropped or filtered."*

### What this task is — and is not

- **It is a watch, not a fix.** It records each spike so the pattern is known over time. It changes no code and no
  GameAnalytics setting.
- ⛔ **Owner's constraint, binding on this task and on anyone acting on what it finds: events from ALL builds must keep
  being collected.** No filtering of old builds, and no interfering with GameAnalytics' own handling of duplicates.
  In the owner's words, events from all builds are needed *"to be able to spot any problems during releases"*.
- If a logged spike ever looks like it needs action, that is a **new question for the owner**, raised separately —
  not something this task decides.

### Background (for reading the numbers only)

What a spike looks like, from [`0456`](../../done/0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/brief.md)'s
read of 2026-10-14 (its [findings report](../../../knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md)
§1–§4 and the task's worklog § *Sitting record (2026-10-14)*, both background only):

- **Normal day:** ~106–121 events per active user (7–13 Oct, 12 Oct excepted). The `Platform` event category fires
  once per page load, and **`Platform` count ÷ "Session Count (started)" is about 0.9** on normal days (0.91–0.93 on
  7–11 and 13 Oct) [inference on observations].
- **Spike day:** far more `Platform` events than sessions. 12 Oct: 863.89K `Platform` events against 21.75K sessions
  (ratio ~40), 1,822.3 events per active user, banner shown. Most of the extra events carried **old build strings**;
  all came from Russia.
- **Frequency so far:** `Platform` spikes on 25 Aug, 3–4 Sep, 9 Sep, 19 Sep, 26 Sep (the biggest, 1.52M), 28 Sep,
  3 Oct and 12 Oct — roughly weekly. On the smaller days sessions also rose somewhat (e.g. 19 Sep).
- **What GameAnalytics says the limit does** (its docs, read 2026-10-14): it alerts on Game Overview → Integrations;
  the docs do **not** say the per-user limit drops or throttles anything.
- **Why the spikes happen is NOT settled** — see [`0230`](../../backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md)
  (Backlog, kept open by owner ruling 2026-10-14). This task's log is evidence for that question; it does not answer
  it.

## What to build

**A recurring read-only check, plus a running log.** One check per instance of this task.

1. **Read, for every day since the previous check** (the first check starts at 2026-10-14; GameAnalytics Explore shows
   the past 90 days, so nothing is lost if a check is late):
   - `Platform` category, aggregation Count, by day (Explore, filter Event id 01 = `Platform`);
   - the predefined **"Session Count (started)"**, by day;
   - the Integration tab chart *"Total number of events per active user (per day)"* — the value on any spike day.
2. **Flag a day as a spike** when `Platform` ÷ sessions is far above normal. *Producer's proposed threshold, owner
   confirms (open question 2):* **1.5 or more** (normal ~0.9).
3. **For each spike day, record:**
   - the date (as GameAnalytics labels it — note the dashboard timezone once, if it can be read);
   - its size: `Platform` count, sessions, the ratio, and events per active user;
   - the **build split** of that day's `Platform` events (split by Build, Count, and Unique users if shown);
   - the **country split** (did anything other than RU move?);
   - **whether the "Limit Exceeded" banner was showing** at the time of the check, and whether the Integration chart
     carried the "Limit reached" badge.
   - Anything the UI could not show is written as *"could not be determined"*, never guessed.
4. **Record a check with no spike too** — *"checked <from>–<to>, no spike"* is a valid result.
5. **Where it goes:** one running log, `ai-agents/knowledge-base/reports/gameanalytics-spike-log.md`, created by the
   first check and appended to by every later one (dated entries, newest last). Each instance's worklog links to its
   entry. *(Producer's proposal — open question 3.)*
6. **Recurring:** the task system has no repeating task, so (as with
   [`0388`](../../backlog/0388-quarterly-check-for-a-new-postgres-minor-release-on-both-boxes-and-bump-the-lock/brief.md)) each
   check is one instance; when an instance closes, the producer files the next one with a new ID, linking back here.
   *Cadence — producer's proposal, owner confirms (open question 1):* **about once a month**, reading the whole month.

## Verification steps

1. The log has a dated entry covering every day from the previous check (or 2026-10-14) to this check, with the
   `Platform` count, sessions and ratio for each spike day, or *"no spike"*.
2. Every spike day has its build split, country split and banner state, or *"could not be determined"* for a part
   the UI did not show.
3. Every figure is labelled as read off the GameAnalytics UI, with the date it was read.
4. 🔒 The log and worklog contain **no** game key, secret key, numeric game/dashboard ID, URL containing one, user id or
   token — names, counts and dates only.
5. Nothing was saved, exported, shared or changed in GameAnalytics (stated in the worklog).
6. The next instance is filed (or the owner has ruled a different reminder).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **One brief:** a single read-and-log check; nothing in it ships separately.
- **Related (background only):** [`0230`](../../backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md)
  (why the spikes happen — open), `0456` (the investigation this comes from), `0418` and
  [`0455`](../../done/0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive/brief.md) (other GameAnalytics
  reads in the owner's Chrome — a check could share one sitting with them).
- **If the `Platform` events ever change**, re-check with the owner that the `Platform` ÷ sessions comparison still
  means what it means today before relying on it.
- ✅ **OWNER RULING 2026-10-20 — Q1–Q3 ANSWERED: all three proposals accepted.** Given live via `AskUserQuestion`
  in a Claude Code session, relayed by it to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not
  producer precedent. Asked: *"accept the producer's proposals (check about once a month, spike = 1.5× the normal
  Platform/session ratio, log in knowledge-base/reports/gameanalytics-spike-log.md)?"* Selected, verbatim: **"Accept all
  three (Recommended)"**. ⇒ **Q1:** about once a month, reading the whole month. **Q2:** a day is a spike when
  `Platform` ÷ sessions is **≥ 1.5** — ⚠️ the question's wording said *"1.5× the normal ratio"* (≈ 1.35), but the option
  accepted is the producer's proposal, which is the absolute ratio 1.5 (Q2 below); this record reads it as the
  proposal. ✅ **Gap closed — OWNER RULING 2026-10-20** (live `AskUserQuestion`, relayed; ⛔ not producer precedent): *"What should count as a spike for the monthly check?"* → verbatim **"Ratio 1.5 or more (Recommended)"**. Threshold = `Platform` ÷ sessions **≥ 1.5** (absolute ratio). The earlier "1.5× normal" wording was the relaying session's own error. **Q3:** one running log, `ai-agents/knowledge-base/reports/gameanalytics-spike-log.md`. The questions
  below are kept as history.
- ~~**Open questions for the owner**~~ *(answered 2026-10-20 — see the bullet directly above)* (the producer could not ask — spawned without an owner channel):
  1. **How often?** Recommended: **about monthly** — enough to keep the pattern, light on the owner's time (the 90-day
     view means a late check loses nothing). Alternative: every two weeks, or only when the banner is seen.
  2. **What counts as a spike?** Recommended: `Platform` ÷ sessions **≥ 1.5** (normal ~0.9; 12 Oct was ~40).
  3. **Where is the log kept?** Recommended: one running file in `ai-agents/knowledge-base/reports/` (above), so the
     history sits in one place rather than across many worklogs.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact.**
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
