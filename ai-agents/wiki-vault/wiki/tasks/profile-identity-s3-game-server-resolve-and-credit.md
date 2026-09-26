# Profile Identity S3 — Game Server: Resolve the Player at Join, Credit Matches by `playerId`

**Source**: `ai-agents/tasks/done/0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (moved from Sprint 4 on 2026-09-23) · task `0272` · slice S3 of epic `0266` · High (label owner-ratified)

> ⚠️ **Closed 2026-09-26 by a spawned `fkit-producer` on an owner ruling** given live in the
> `fkit lead` session (closed together with `0273`, `0217`, `0220`); no owner channel in the spawn ⇒
> **`(agent-closed — not owner-verified)`**. This task's own verification steps are **local**; its live
> proof is [[tasks/profile-p2-wire-game-server]]'s V1/V3, met 2026-09-26.

## Goal

Move the game server's side of the profile backend onto the internal player id of
[[decisions/adr-113-internal-player-id]]: resolve each player **once at join** to a `playerId`, and
credit matches by `(game_id, player_id)` instead of by the Yandex id.

**The session token does not touch this path.** The game server never holds the session secret and the
internal id never reaches a client. `getCreditableYandexId(client)` stays the single trust funnel and the
only reader of `yandexPlayerId` ([[decisions/adr-103-identity-trust-seam]]).

## Key Changes

Per design §9 row S3:

1. **`CreditContract`** carries `playerId`; `/internal/v1/credit` credits by `(game_id, player_id)`.
2. **`POST /internal/v1/players/resolve`** `{platform, platformUserId}` → `{playerId, isCitizen}`, using
   S1's `resolveOrCreatePlayer` (source `game_server` — **always creates**, independent of S5's creation
   switch). **Replaces `/internal/v1/profile/upsert`**, which was removed.
3. **`ProfileApiClient.resolvePlayer`**, and credit by `playerId`.
4. **`Client.profilePlayerId`** — set on join, `update_identity` and reconnect, together with
   `isCitizen` (true-only).
5. **`selectMatchCredits`** dedupes by `playerId`.
6. **Backfill** — identity known but `playerId` null (resolve failed at join) → resolve, then credit.
7. Still **fail-soft and non-blocking** — a profile outage never delays a join or a match end
   ([[decisions/adr-101-fail-soft-xp-crediting]]).

Also carried from S1's close: stale `player_profiles` / `(game_id, yandex_player_id)` comments, and a
`setup-profile.sh` failure message that still called migrations idempotent (false since `006`'s guard).

Built and reviewed 2026-09-15 (review rounds 1–2 closed out, Codex coverage full; the integration suite
includes `GameServerProfileCredit.it`).

## Outcome

**Timeline.** Server half deployed to the profile box **2026-09-17** (the collapsed deploy — clean, 0
error lines, 0 rows). From then until 2026-09-26 the path had **zero production evidence**: the game
server was not deployed, and the game-side `PROFILE_INTERNAL_TOKEN` was still blank, so even a deployed
game server would have taken a 401 on every call. On **2026-09-19** the owner ruled the token is set **at**
the weekend slot rather than one slot later — **against** the recommendation to prove S3/S4 live first;
the tradeoff was stated and accepted.

✅ **The zero-evidence gap was crossed 2026-09-26** — all three blockers gone: the game server deployed
(W12, release `0.0.152`); the token set on the game side and **equal** to the box's (W11, A1 `MATCH`);
`0217`'s acceptance criterion met (W14):

- **41 players / 41 identities** (0 before); `player_match_xp_credits` **13 rows, 5 games, 13 XP**.
- Worker log repeatedly `match credit results: 1 credited, 0 duplicate, 0 no_profile, 0 error`; **0**
  error-level profile lines.

🚩 **Residual — watch item F-B**, shared with `0217`: two `players/resolve` calls stalled past the 10 s
per-attempt timeout under new login traffic; a retry succeeded both times; **no cause known, none
asserted.** 👁️ W15 counts `players/resolve request failed` and `failed after retries` in the game
container log. Per the code, `player resolve failed after retries` is retried at the next identity event
or at credit time; `credit batch failed after retries; N award(s) dropped` is **lost XP** — **must stay
0**. See [[systems/weekend-deploy-window]].

## Related

- [[tasks/profile-identity-epic]] — epic `0266`, the parent
- [[tasks/profile-identity-s1-database-rekeying]] — task `0270` (S1), which this depends on
- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271` (S2), built in parallel; shipped in the same 2026-09-17 profile deploy
- [[tasks/profile-p2-wire-game-server]] — task `0217`, whose V1/V3 is this task's live proof
- [[tasks/profile-match-end-crediting]] — the crediting path this re-keyed
- [[decisions/adr-113-internal-player-id]] — the decision this slice implements
- [[decisions/adr-103-identity-trust-seam]] — the one funnel that still reads the Yandex id
- [[decisions/adr-101-fail-soft-xp-crediting]] — why a failed credit is dropped, not queued
- [[systems/player-profile-store]] — the backend whose internal routes this changed
- [[systems/weekend-deploy-window]] — W11–W14, where the live proof ran
- [[tasks/profile-identity-s4-client-login-session]] — S4, task `0273`, the client half shipped in the same game deploy
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — S5, task `0274`, the monitoring and the creation switch (which S3's `game_server` source bypasses)
- [[decisions/sprint-5]] — the board that tracked its close
