# Re-check in GameAnalytics the Two `0397` Status Events Missing From the 2026-10-08 Read (task 0418)

**Source**: `ai-agents/tasks/done/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md` (`worklog.md` in the same folder read as supporting evidence for the result; the close note is the Sprint 8 board row for `0418`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 17 (ADR-035 append rank, not a merit rank) / task `0418`

> ✅ Done (agent-closed — not owner-verified), closed **2026-10-16** by a spawned `fkit-producer` via `/fkit-task-done`,
> on the owner's ruling given live via `AskUserQuestion` in a Claude Code session (not `fkit lead`): asked *"Restart
> showed up only once in 8 days. What do we do about it?"*, the owner chose **"Accept and close"**. ⛔ Not producer
> precedent.
>
> **Not owner-verified:** the read was done by an agent session driving the owner's Chrome, with the owner present and
> logged in to GameAnalytics himself. Read-only — nothing saved in GameAnalytics. Re-verified by me: nothing — no
> GameAnalytics access. ⛔ No GameAnalytics id, session, token or URL on this page — event names, dates and counts only.

## Goal

Close the gap left by `0400`'s check 8 ([[tasks/session-verified-status-line-live]]). `0397`
([[tasks/session-verified-status-line]]) added three `Citizenship:Status:*` events; the 2026-10-08 read (partial day)
saw only `ReadFailed` (95). `Unverified` and `Restart` were missing — `Restart` although the owner pressed the button
on the start screen that morning. Owner ruling 2026-10-08: **no investigation**, just re-read the numbers after
several days. If either were still missing, the next step was the owner's call.

## Key Changes

Nothing in source or in GameAnalytics. One read, 2026-10-16 ~11:00–11:20Z:

- **Window:** 2026-10-08 to 2026-10-15, both included — 8 full days; current day excluded. Day boundaries are
  GameAnalytics' own — assumed UTC, **not checked**.
- **Settings:** Explore · Design events · Count · filtered to `Citizenship` / `Status`, split by the third event id,
  by day. Same as the 2026-10-08 read, except the window and the current day left out. *"Demo mode"* banner shown (as
  on every earlier read).
- **Checked in the repo first:** the event code (`src/client/CitizenshipNotice.ts`, `src/client/ProfileReadRestart.ts`,
  the enum in `src/client/flashist/FlashistFacade.ts`) had no change touching these events since 2026-10-08.
- **Game client deploys inside the window** (deploy-commit times): `0.0.158`–`0.0.160` (08 Oct evening), `0.0.161`
  (09 Oct), `0.0.162`/`0.0.163` (10 Oct), `0.0.164` (13 Oct).

| Day (2026) | `Unverified` | `Restart` | `ReadFailed` (control) |
|---|---|---|---|
| 08 Oct | 0 | **1** | 208 |
| 09 Oct | 6 | 0 | 324 |
| 10 Oct | 6 | 0 | 161 |
| 11 Oct | 1 | 0 | 162 |
| 12 Oct | 8 | 0 | 204 |
| 13 Oct | 11 | 0 | 183 |
| 14 Oct | 16 | 0 | 242 |
| 15 Oct | 9 | 0 | 232 |
| **Total** | **57** | **1** | **1,716** |

GameAnalytics' own query total (1.77K) matches the sum (1,774).

## Outcome

- **Result: both seen.** `Unverified` on 7 of 8 days (57). `Restart` **once only**, on 2026-10-08.
- **Owner ruling *"Accept and close"*:** `0400`'s check-8 gap counts as **closed for both events**.
- ⚠️ **Left unanswered, accepted knowingly by the owner:** from 09 to 15 Oct there were **0** `Restart` against
  **1,508** `ReadFailed` (each `ReadFailed` is a *couldn't load* line with the Restart button shown). Whether nobody
  pressed it, or presses are **lost before GameAnalytics sends them** (the page reloads right after), is **not
  checked**. No investigation started.
- ⚠️ The single 08 Oct `Restart` was not in that day's 11:39Z read. It may be the owner's own press (~07:30–07:35Z)
  arriving late, or a later press by anyone — **not told apart** (GameAnalytics' hour view was greyed out).
- 08 Oct's `ReadFailed` is now 208 (full day) vs 95 at the partial-day read — consistent.
- Same shape seen elsewhere: `0406`'s `Refresh` (also fires just before a reload) read 0 against 3 `Shown`
  ([[tasks/long-session-refresh-popup-live]]). Not linked by any check; noted only.

## Related

- [[tasks/session-verified-status-line-live]] — task `0400`, whose failed check 8 this task carried
- [[tasks/session-verified-status-line]] — task `0397`, the status line and its three events
- [[systems/analytics]] — the `Citizenship:Status:*` events
- [[tasks/long-session-refresh-popup-live]] — task `0406`, the same "event fires just before a reload" question
- [[decisions/sprint-8]] — the board (rank 17)
- [[systems/weekend-deploy-window]] — the runbook's 2026-10-08 residual list that pointed here
