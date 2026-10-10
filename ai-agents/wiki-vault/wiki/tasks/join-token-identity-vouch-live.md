# Verify 0332 Live — the Identity Counters, and No Session Token in the Logs (task 0405)

**Source**: `ai-agents/tasks/done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 15 / task `0405`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 on the owner rulings **"Not 'much worse', leave it
> (Recommended)"** (ADR-124 trigger 2 **not hit**) and **"No complaints, close it (Recommended)"**. No fix task.

## Goal

The live check for `0332` ([[tasks/join-token-identity-vouch]], [[decisions/adr-124-join-token]]): the client sends its
profile session token to the game server, which has the profile server vouch for it. Read the two new counters
(`geoconflict.profile.resolve.vouch{outcome}` — **per resolve, not per player**; `geoconflict.server.match.identity{state}`
— per player per match), compare with login, and confirm the 24 h bearer token is **never logged**.

## Key Changes

None — read-only reads. Deploys: profile `0.0.156-profile.4` then game `0.0.157`, 2026-10-08, ~14 min apart in the
required order. Window **2026-10-08 06:56:30 → 2026-10-10 08:00 UTC** (~49 h, no weekend evening).

## Outcome

- **Vouch, 14,266 resolves:** `verified` 94.75 %, `absent` 3.54 %, `unverified_session` 1.71 %; every other outcome **0**
  (`no_secret`, `other_platform`, `invalid`, `other_player`, `expired`).
- **Match start, per player:** verified **95.3 %** (5,676 of 5,958 players with a Yandex id); guests 58.2 % of all.
- **Login, same window:** verified **97.55 %**. Match start's not-verified share (4.7 %) is ~1.9× login's (2.45 %) —
  counted differently (per login vs per player per match). Put to the owner as ADR-124 **re-raise trigger 2** → **not
  hit**, by owner ruling; no task.
- **Token in logs: 0 hits in ~3.0M lines** across Uptrace logs, the game container, the game box's collector and the
  profile container (counts only; the patterns were tested on a made-up string first). Profile API: 0 errors, 0 warnings.
- `expired` share **0 of 14,266** — also serves `0406` ([[tasks/long-session-refresh-popup-live]]), but confounded.
- ⚠️ **Coverage limits:** game container logs only from 2026-10-09 07:41 UTC (earlier via Uptrace only); host nginx logs
  not searched; no weekend evening in the window. Owner reports no new complaints or error spike tied to joins.

## Related

- [[tasks/join-token-identity-vouch]] — task `0332`, the build this checks
- [[decisions/adr-124-join-token]] — ADR-124 and its re-raise triggers
- [[decisions/adr-116-verified-login]] — the login-side verification compared against
- [[tasks/long-session-refresh-popup-live]] — task `0406`, which cites this read for its `expired` share
- [[tasks/post-0340-login-reread]] — task `0402`, the earlier login-numbers read this method follows
- [[decisions/sprint-8]] — the board (rank 15)
