# Profile identity S3 — Game server: resolve the player at join, credit matches by `playerId`

## ID
0272

## Parent / Epic
[`0266-profile-identity-internal-player-id-platform-logins-login-endpoint`](../0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0271`** (it runs in parallel with S2 after `0270`); the S1–S5
run as a whole belongs directly below `0217`. Appended at the bottom (ADR-035).

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-15 on OWNER RULINGS (`AskUserQuestion`, lead session, relayed by `fkit-lead`):** design
approved with the login token in v1; ADR-113 accepted; build split into slices; monitoring before
go-live; alerts by email.

**Source of truth:** [`2026-09-15-profile-identity-design.md`](../../../knowledge-base/reports/2026-09-15-profile-identity-design.md)
§2 *Game-server path*, §4 (find-or-create, replaced routes), §9 row **S3**;
[ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md).

**The token does not touch this path.** The game server never holds the session secret, and the
internal id never reaches a client. `getCreditableYandexId(client)` stays the single ADR-103 trust
funnel and the only reader of `yandexPlayerId`.

**Why it is safe to change now:** the game server's profile client does nothing while
`PROFILE_INTERNAL_TOKEN` is blank (`ProfileApiClient.isConfigured()`), so the internal contract can
change freely until `0217` sets the token.

## What to build

Per design §9 S3:

1. **`CreditContract`** carries `playerId` (not a Yandex id); `/internal/v1/credit` credits by
   `(game_id, player_id)`.
2. **`POST /internal/v1/players/resolve`** `{platform: "yandex_games", platformUserId}` →
   `{playerId, isCitizen}`, using S1's `resolveOrCreatePlayer` (source `game_server` — **always
   creates**, independent of S5's creation switch). **Replaces `/internal/v1/profile/upsert`**, which
   is removed.
3. **`ProfileApiClient.resolvePlayer`** + credit by `playerId`.
4. **`Client.profilePlayerId`**; `GameServer` join, `update_identity` and reconnect paths call resolve
   and set `profilePlayerId` and `isCitizen` (true-only, as today).
5. **`selectMatchCredits`** dedupes by `playerId`.
6. **Backfill:** identity known but `playerId` null (resolve failed at join) → resolve, then credit
   (the `backfillMissingProfiles` shape).
7. Still **fail-soft and non-blocking** — a profile outage never delays a join or a match end.

### Owner steps
- None of its own. Ships with the **normal game deploy**, with `PROFILE_INTERNAL_TOKEN` still blank —
  no live effect until [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md). The live
  proof of this path is `0217`'s verification.

## Verification steps

1. Join → exactly one resolve call → `profilePlayerId` set (unit test with a mocked profile client).
2. A late identity (`update_identity`) and a reconnect each resolve once.
3. Match end credits by `playerId`, deduped when one player appears twice.
4. `playerId` null at match end → resolve, then credit.
5. Profile server unreachable → join and match end proceed; no throw, no await on the hot path.
6. `grep -rn "yandexPlayerId" src/server` — the only reader is `getCreditableYandexId` (ADR-103).
7. **Local dev end to end:** join a match → one `players` row and one `player_identities` row → finish
   the match → one `(game_id, player_id)` credit row.
8. `npm test` and `npm run test:integration` green; `npx tsc --noEmit` and `npm run lint` exit 0.

## Notes

- **Depends on:** [`0270`](../0270-profile-identity-s1-database-and-rekeying/brief.md) (S1 — not S2)
- **Blocks:** [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live)
- **Can run in parallel with** [`0271`](../0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2) — both touch `src/profile-server/Routes.ts` (S3 internal routes only).
- **Effort (design §9):** 1.5–2 days.
- **Deploys:** game deploy (game server) **and** a profile-box deploy for the new internal routes. ⚠️
  Order does not matter while the token is blank; it **does** matter at `0217` — both halves must be
  live before the token is set.
- 🔒 No secrets, hosts or player ids in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
