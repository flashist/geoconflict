# Verify 0367 in Production — 1-Minute Public Lobbies vs the 2-Minute Baseline (task 0370)

**Source**: `ai-agents/tasks/done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 1 / task `0370`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 on the owner's typed ruling *"you can close the task,
> but add one task to Backlog, to recheck the numbers after a while"*. **Owner ruling "Keep 1 minute"** — 1-minute
> public lobbies stay, **overriding the owner's own 15 % line**. ⚠️ **Step 5, the day-7 read, was NOT run.**

## Goal

Read the numbers that decide whether `0367`'s cut ([[tasks/public-lobby-one-minute]] — public lobby window 120 s →
60 s, production and preprod) stays. Rule (owner, 2026-10-01): keep if multiplayer matches per day **hold or rise** AND
the share of matches with only **one real player** does not jump noticeably. On 2026-10-03, before any "after" data, the
owner set "noticeably" as a 7-day lone share **above 15 %** (*"Above 15 % (Recommended)"*) — not an automatic revert.

## Key Changes

None — read-only reads. Server side: a query over the game server's start/creation log lines in Uptrace. Client side:
GameAnalytics `Game:Mode:Multiplayer` entries per day (one per client per match, private lobbies included — **not
matches**), read by `fkit-lead` through the owner's browser (the brief said owner-read; recorded as it happened; the page
again showed "Demo mode" text, judged real data, **not proven**). Deploy day 2026-10-03, excluded from both windows.

## Outcome

| Window | Lone-player share | Avg real players / match | GameAnalytics entries / day |
|---|---|---|---|
| **Before** (7 d, 2-min) | **11.8 %** | 7.41 | **4.57K** |
| Day-4 (4 d, 1-min) | 18.5 % | 4.73 | 5.55K (+21 %) |
| 6-day interim (1-min) — **not** Step 5 | **17.7 %** | 5.05 | **5.96K (+30 %)** |

- Lone share was **over 15 % on every After day**; entries per day **rose** on every same-weekday comparison (+16 % to
  +32 %). The two halves of the rule pointed opposite ways. The lead recommended revert; **the owner chose keep**
  (*"Keep 1 minute"*, 2026-10-10), accepting more one-real-player matches for more match entries. The 15 % line itself is
  unchanged and **was not met** — this is an override, not a re-reading. No revert task.
- ⚠️ **Confounders:** game deploys `0.0.157`–`0.0.161` (2026-10-08/09) fall inside the 6-day window (the day-4 window has
  none); not checked whether any of that changes who joins public lobbies. Entries count match starts, not unique
  players.
- ⚠️ **NOT RUN:** Step 5 (day-7 read, both sources) — the owner closed first and `fkit-lead` cancelled the scheduled
  read. Verification step 6 is **not met**. Carried, loosely, by **`0435`** (Backlog, no date): re-run for a recent 7
  days and compare with the **recorded** Before numbers in this worklog (the Before window's raw rows age out of
  Uptrace's ~14-day horizon about 2026-10-10).

## Related

- [[tasks/public-lobby-one-minute]] — task `0367`, the change this tested
- [[systems/architecture-overview]] — records the 60,000 ms lobby window
- [[systems/weekend-deploy-window]] — the 2026-10-03 deploy window in which Steps 1–3 ran
- [[decisions/sprint-8]] — the board (rank 1)
- [[decisions/sprint-backlog]] — the recheck `0435`
