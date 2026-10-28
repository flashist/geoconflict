# Private-Lobby Funnels and Dashboard in GameAnalytics — `0451`'s Events Confirmed Arriving (task 0455)

**Source**: `ai-agents/tasks/done/0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 8 (moved from Sprint 8 rank 49 on 2026-10-16, owner: *"… it requires few days of analytics after deploy."*) / task `0455`

> ✅ Closed 2026-10-28 via `/fkit-task-done` by a spawned `fkit-producer` for `fkit-lead`. The one open step
> (verification 6, *the owner has seen the saved funnels and dashboard*) was met on the owner's words typed in the
> `fkit-lead` session on 2026-10-28, relayed: *"I looked at them, we're good here"*. Agent-closed because a spawned
> producer is an agent even when it relays the owner's words (ADR-033 §5).

## Goal

Task `0451` ([[tasks/private-lobby-funnel-events]]) added 16 `PrivateLobby:*` analytics events. This task, with the
owner logged in to GameAnalytics in his own Chrome, (1) confirms the events arrive and look sane, then (2) builds a
funnel and a small dashboard for them — each save only after the owner's yes. Time-gated: it needed `0451` deployed to
production and several full days of data. No code.

## Key Changes

Nothing in the repo. In GameAnalytics (names as shown there, recorded in the worklog 2026-10-20):

- **Funnel "Private lobby: host"** — 1 `UI:Tap:PrivateTab` · 2 `PrivateLobby:Created` · 3 `PrivateLobby:InviteCopied`
  (link or code) · 4 `PrivateLobby:Start:Tapped` · 5 `PrivateLobby:MatchStarted:Host` · 6 `PrivateLobby:MatchEnded`.
- **Funnel "Private lobby: guest"** — 1 `PrivateLobby:Joined` (link or code) · 2 `PrivateLobby:MatchStarted:Guest` ·
  3 `PrivateLobby:MatchEnded`.
- **Dashboard "Private lobbies"** (private, single game) — *"Private lobby events per day (by step)"* and *"Private tab
  taps per day"*. `Start:Failed` split by value was **not added** — no such events yet.
- **Why two funnels, not one:** GameAnalytics funnels are **per player**; the host and the friend are different players,
  so one funnel with "friend joined" in the middle would read ~0 % at that step. Owner ruling 2026-10-20, live
  `AskUserQuestion`: **"Two funnels + dashboard (Recommended)"**. Funnels are not a dashboard widget type as far as
  seen; the dashboard names both funnels in its description.

## Outcome

- **Read window:** `0451` shipped in game **`0.0.165`**, live 2026-10-16 ~12:17Z. Full days read: 17–19 Oct (20 Oct
  excluded; 16 Oct partial). "Demo mode" banner shown.
- **11 of 16 events seen.** Not seen: `CreateFailed`, `InviteCopied:Code`, `InviteCopyFailed`, `JoinFailed:Error`,
  `Start:Failed` — all failure or fallback paths. **Zero is plausible, not proof they work.**
- **Sanity flags put to the owner, not investigated:** 18 Oct had lobbies created but no join, start or match (low day
  or a problem — not told apart); `Joined:Link` was 0 on 17 Oct while `Joined:Code` was 16; `MatchEnded` is low against
  matches started (players closing the tab never fire it — expected shape, not checked). `MatchStarted:Host` equalled
  `Start:Tapped` every day.
- **Value check:** only `MatchEnded` carried values (seconds); no id-like value or name seen. Privacy check clean.
- **First funnel read (12–19 Oct):** host funnel total conversion 0.02 %, the big drop at step 2 (Create) — expected,
  only citizens can create; guest funnel 13 players, 100 % → 100 % → 30.77 %.
- No GameAnalytics id, session, token or URL was recorded anywhere.

## Related

- [[tasks/private-lobby-funnel-events]] — task `0451`, the 16 events this reads
- [[systems/analytics]] — the event reference these names come from
- [[tasks/private-lobbies-everyone-flag-flip]] — task `0428`, private lobbies on for everyone
- [[decisions/sprint-9]] — the board (rank 8) · [[decisions/sprint-8]] — where it was filed (rank 49)
