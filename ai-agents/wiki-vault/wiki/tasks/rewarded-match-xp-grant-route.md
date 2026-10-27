# Profile Box: Rewarded-Ad Match-XP Grant Route (task 0491)

**Source**: `ai-agents/tasks/done/0491-profile-box-rewarded-ad-match-xp-grant-route-server-part-of-0488/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder, and `0488/plan.md` §4 + Part S, read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 20 (ADR-035 append rank; on merit directly above `0488`) / task `0491` — server part of `0488`

> ✅ Closed 2026-10-24. `npm run test:integration` 14/14 suites, 188/188 tests (migration `009` applied by the real
> runner); `npm run test:scripts:docker` 55 passed; review R1 (runbook) fixed, R2 resolved by the owner-ruled ADR-112
> amendment.
> 🏗️ **2026-10-26 sync (`4e9160a`): committed in `a3c32b4`; `git tag --contains` → none ⇒ NOT deployed.** Deploy order:
> **this profile-box change first, then the `0488` client**; then B4's migration `010`. Live check: `0499`.

## Goal

Grant the rewarded-ad bonus ("double this match's XP") on the profile box, safely, when nobody can prove a watch:
Yandex documents **no server-side proof** of a rewarded view.

## Key Changes

- `src/core/profile/RewardedMatchXpContract.ts` — request `{ gameId }` (1..128 chars), response
  `{ status: granted | duplicate | not_credited, xpAwarded, xp }`.
- **`migrations/009_player_rewarded_match_xp.sql`** — ledger `player_rewarded_match_xp`, PK `(game_id, player_id)`,
  FK to `players` with cascade, `xp_awarded >= 0`.
- `PlayerProfileRepository.grantRewardedMatchXp()` — one transaction, `players` row locked first: read the **base
  credit row** for `(gameId, caller)` from `player_match_xp_credits`; none ⇒ `not_credited`; insert the ledger row
  (conflict ⇒ `duplicate`); add the base row's `xp_awarded` to `players.xp`; run the earned-citizenship crossing and
  the post-commit inbox hook, like `creditMatchXp`.
- `Routes.ts` — `POST /v1/profile/rewarded-match-xp`, Bearer session (`resolveCaller`), `publicCors("POST")`; no
  repository ⇒ `503`. No ids, tokens or game ids in logs. `Telemetry.ts` — a counter by outcome. No nginx change, no new
  env var.

## Outcome

- **What a faked watch can gain:** at most the base XP of a match the server **really** credited to this player, once
  — exactly what an honest watcher gets. It cannot mint XP for a made-up `gameId`, someone else's match, or twice.
- **Not gated on a verified login** — owner ruling *"Accept, no follow-up"* (2026-10-24), same as the tenure grant.
- **No rate limiter** (in-plan reading: tenure-grant has none, by owner ruling).
- **ADR-112 amended 2026-10-24** (owner: *"Write a short ADR update (Recommended)"*): the ad bonus is a per-match award
  in its own ledger, not a Part 2 grant; the invariant now reads `xp = Σ match credits + Σ grants + Σ rewarded match
  bonus` — **nothing checks it in code** ([[decisions/adr-112-free-xp-grants]]).
- **Restore drill:** `verify.sql` covers the new table, but the drill seed puts **0 rows** in it; row behaviour is covered
  by `RewardedMatchXp.it.test.ts`. A live drill must wait until `009` is deployed.
- No change to `src/server` / `getCreditableYandexId`: a player who spoofed an id on the game server sent the base XP to
  the victim's id, so their own session finds no row ⇒ `not_credited`.

## Related

- [[tasks/rewarded-video-double-match-xp]] — task `0488`, the client that calls this route
- [[decisions/adr-112-free-xp-grants]] — the 2026-10-24 amendment this task triggered
- [[tasks/profile-p2-wire-game-server]] — task `0217`, the base match credits this reads
- [[tasks/tenure-xp-grant]] — task `0253`, the route this mirrors
- [[tasks/durable-items-entitlements]] — task `0496`, migration `010`, deploys after this `009`
- [[systems/player-profile-store]] — the profile box
- [[tasks/profile-backup-restore-reproof-006]] — the drill's table inventory, updated here
- [[decisions/sprint-9]] — the board (rank 20)
- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, 2026-10-26: this held profile code (migration `009`) deploys with S1
