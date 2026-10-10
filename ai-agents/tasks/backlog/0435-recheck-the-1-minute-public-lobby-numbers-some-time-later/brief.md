# Re-check the 1-minute public lobby numbers some time later

## ID
0435

> ℹ️ **ID allocation, checked 2026-10-10 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0434` (folder names and `## ID` fields agree). `0435`: no task folder, no
> `## ID` hit, nothing in `.claude/`, no other repo-wide hit.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-10, typed by the owner in the `fkit lead` session** (the owner's own message, not an
> `AskUserQuestion` answer), relayed verbatim by `fkit-lead` to a spawned `fkit-producer` with no owner channel
> (ADR-021/037); ⛔ **not producer precedent.** Verbatim: *"Regarding 0370 - you can close the task, but add one task to
> Backlog, to recheck the numbers after a while (no specific date, whenever we got back to the task)"*. Filed on the
> Backlog board, **not** Sprint 8.

## Priority
Unscheduled

> **No date and no rank** — *"whenever we got back to the task"* (owner). Pulled in when the owner says so.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY AN AGENT AND BY THE OWNER / LEAD.** The server query is read-only and is run by
an agent session that has access (standing rule: read-only checks are run, not handed over). The GameAnalytics numbers
need the owner's login: read by the owner, or by `fkit-lead` read-only through the owner's Chrome with the owner logged
in (as `0370` did).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0370`](../../done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md).)*

## Context

**What happened.** [`0367`](../../done/0367-cut-the-public-lobby-wait-from-2-minutes-to-1-minute/brief.md) cut the
public multiplayer lobby wait from 2 minutes to 1 minute (live 2026-10-03, game `0.0.156`).
[`0370`](../../done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md) measured
it. On 2026-10-10 the owner ruled **"Keep 1 minute"**, knowingly **overriding** the 15 % line he had set for the share
of matches with only one real player — trading lonelier matches for more matches played. `0370` was then closed
**without its day-7 read** (Step 5 not run). This task is the owner's "look again later": did the one-player share
settle once players got used to the shorter wait, or is it still high?

**The numbers to compare against — all recorded in `0370`'s
[`worklog.md`](../../done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/worklog.md);
do not re-derive them.**

| | **Before** (2-minute, 2026-09-26 → 10-02, 7 d) | **After, day-4** (10-04 → 10-07) | **After, 6-day** (10-04 → 10-09) |
|---|---|---|---|
| lone-player share (exactly 1 real player ÷ public matches with ≥ 1 real player) | **11.8 %** | **18.5 %** | **17.7 %** |
| avg real players per such match | **7.41** (median 6) | 4.73 (median 4) | **~5.05** (median 4) |
| public matches with ≥ 1 real player / day | **~662** | ~1 215 | ~1 228 |
| real-player match entries / day (`sum(humans)`) | 4 908 | 5 753 | 6 203 |
| GameAnalytics `Game:Mode:Multiplayer` entries / day | **4.57K** | 5.55K | **5.96K** (+30 %) |

- The 15 % line (`0370` Step 3) was crossed on **every** After day (lowest 15.6 %). The owner kept 1 minute anyway.
- ⚠️ **No day-7 After figure exists** — `0370` Step 5 was not run. The 6-day interim is the latest After read.
- ⚠️ **The Before window's raw server rows are gone or going** (Uptrace keeps about 14 days; on 2026-10-10 the oldest row
  was 2026-09-26). That is fine: compare against the **recorded** numbers above. Do **not** try to re-query the old
  window.

## What to build

Nothing is built. Every step is a **read-only** reading of numbers.

**Step 1 — pick the window.** The **most recent 7 full UTC days** before the day the task is picked up (whole days
only; today left out). Record the window and the day it was read.

**Step 2 — server numbers (agent, read-only).** Re-run `0370`'s Step 1 query — the query text is in `0370`'s
`worklog.md` § *2026-10-03 — Step 1* → *Query text (no credentials)*; the access method is in § *Access* of the same
entry. Change **only the two dates** to the Step 1 window, and add the extra output column `sum(humans) AS
real_player_match_entries` as `0370`'s later reads did. Record the per-day table and the 7-day totals: public lobbies,
public matches with ≥ 1 real player, exactly-one-real-player matches, lone share, average and median real players,
real-player match entries.
- Credentials come from the telemetry container's own environment — **never pasted anywhere**. Read-only client,
  `SELECT`s only.
- The query depends on two server log strings (`sending start message` and the Worker's `creating Public … game with
  id`). **Check both still exist at HEAD before running.** If either was reworded, fix the query with it and say so.
- Also confirm `gameCreationRate()` still returns 60 s at HEAD and in the deployed build — if 1 minute was reverted or
  changed since, say so first; the comparison means something else then.

**Step 3 — GameAnalytics (owner, or lead with the owner's login).** Explore · Design · Count · event `Game:Mode:Multiplayer`
· the same 7 days, daily. Label it **"multiplayer match entries per day"** — one per player per match, **private lobbies
included**; **not matches**. Note the demo-mode caveat from `0370` (a hidden "Demo mode" element was in the page; judged
real data, not proven) and that GameAnalytics' own day boundary / time zone was never checked.

**Step 4 — note what else changed in the window.** List game deploys inside the window (version-bump commits and, where
known, go-live times) and anything that could move these numbers on its own. ⚠️ **In particular:** if private lobbies
were turned on for everyone ([`0428`](../0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md))
before or during the window, `Game:Mode:Multiplayer` now counts private-lobby entries too, so a rise there is **not**
comparable to `0370`'s figures without saying so. The server query counts **public** lobbies only and is not affected.
Seasonal / player-base changes (more or fewer players overall) also move these numbers — say so; do not adjust for them.

**Step 5 — report to the owner.** Put the new numbers next to `0370`'s Before / day-4 / 6-day figures (table above), in
plain words: did the one-player share **settle** (fall back toward 11.8 %, or below 15 %), stay around 17–18 %, or rise?
Did match entries per day hold? Then ask the owner **keep 1 minute or revert to 2 minutes** — the owner rules again.
Record the ruling verbatim, with the date.

## Verification steps

1. The window and the read date are recorded; HEAD and deployed `gameCreationRate()` checked (still 60 s, or the change
   stated).
2. Server per-day table and 7-day totals recorded, with the date the query ran; log strings checked at HEAD.
3. GameAnalytics `Game:Mode:Multiplayer` per day recorded, with who read it; anything not read is stated as not read,
   never estimated.
4. Game deploys and other changes in the window listed — including whether `0428` (private lobbies for everyone) was on.
5. Side-by-side comparison with `0370`'s recorded Before / day-4 / 6-day numbers, in plain words.
6. The owner's keep/revert ruling, verbatim, dated.
7. **If revert:** a new task is filed for the one-number change back to 120 s (next weekend game-server slot). Do not
   reopen `0367` or `0370`.
8. **If a reading cannot be taken** (query fails, log string changed, no access): say so plainly, with what was tried. No
   unlabelled proxy.
9. No host, IP address, full URL, token or credential appears anywhere in the brief or worklog — numbers, dates, event
   names and query text (with no credentials) only.

## Notes

- **Depends on:** nothing. **Blocks:** nothing.
- **Related:** [`0370`](../../done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md)
  (the measurement this re-checks; its worklog holds the query, the access method and every comparison number);
  [`0367`](../../done/0367-cut-the-public-lobby-wait-from-2-minutes-to-1-minute/brief.md) (the change);
  [`0428`](../0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md) (can confound the
  GameAnalytics number — Step 4).
- **No fixed date** — owner ruling. ⚠️ Practical note, not a ruling: since Uptrace keeps about 14 days, any 7-day window
  picked on the day of the read is still in retention; there is no data-loss reason to hurry.
- **Retention:** observed ~14 days, not the configured 7 — see
  [`0263`](../0263-confirm-uptrace-ce-14-day-retention-hard-cap-or-configurable/brief.md).
- **Privacy:** never paste a host, IP, full URL, token or credential into any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
