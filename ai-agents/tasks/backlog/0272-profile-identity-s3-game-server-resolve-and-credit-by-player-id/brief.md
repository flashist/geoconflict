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
🚧 Blocked — **server side DEPLOYED 2026-09-17 (owner-executed). Crediting still cannot be exercised at all.** The collapsed profile-box deploy shipped S3's server half; the deploy was clean (config parity 10 OK / 0 findings, migrations `migrations up to date`, both containers healthy) and the lead verified **zero error-level log lines since boot** and **0 players / 0 identities** in the DB. 🚨 **Still waiting on, and nothing here is bookkeeping:** (1) **the game server is NOT deployed** — none of S3's game-side code is running anywhere; (2) **`PROFILE_INTERNAL_TOKEN` is still blank on the game side by owner ruling**, and `internalAuth` is a `timingSafeEqual` on a *shared* secret, so even a deployed game server would take a 401 on every credit call; (3) **[`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)** is what sets that token and the current egress IP. ⇒ **There is no crediting path today and the DB has 0 rows — that is expected, not a fault.** No box probe has touched `/internal/v1/players/resolve` or `/internal/v1/credit` with a valid token, so **S3's end-to-end behaviour has zero production evidence.** Blocked on: the game deploy and `0217`. No code. · earlier: 🚧 Blocked — built + reviewed 2026-09-15 (review rounds 1–2 closed-out, Codex full; npm test 128/1552, integration 9/103 incl. GameServerProfileCredit.it); open pending the profile-box deploy (with S2) and a later game deploy · earlier: 🔄 In progress — driven from the lead session (/fkit-sprint-ship-loop), started 2026-09-15 (plan step) · earlier: 🔲 Backlog

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

- **Depends on:** [`0270`](../../done/0270-profile-identity-s1-database-and-rekeying/brief.md) (S1 — not S2)
- **Blocks:** [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live)
- **Can run in parallel with** [`0271`](../../done/0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2) — both touch `src/profile-server/Routes.ts` (S3 internal routes only).
- **Effort (design §9):** 1.5–2 days.
- **Deploys:** game deploy (game server) **and** a profile-box deploy for the new internal routes. ⚠️
  Order does not matter while the token is blank; it **does** matter at `0217` — both halves must be
  live before the token is set.
- 🔒 No secrets, hosts or player ids in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.

## Carried from `0270` (S1) — added 2026-09-15 at S1's close

Added by a spawned `fkit-producer` closing [`0270`](../../done/0270-profile-identity-s1-database-and-rekeying/brief.md),
at `fkit-lead`'s request. **These are now items of this task.**

1. **`0270` review R3 — stale comments.** They still name `player_profiles` or the
   `(game_id, yandex_player_id)` key, both gone since migration `006`. Update them to the `006` schema
   (`players` / `(game_id, player_id)`). Line numbers checked 2026-09-15; they will drift:
   - `src/core/profile/CreditContract.ts:37`, `:55`
   - `src/server/ProfileApiClient.ts:32`, `:74`
   - `src/server/GameServer.ts:104`, `:1330`
   - `tests/server/GameServerParticipation.test.ts:148`
2. **`setup-profile.sh:1013` — failure message is no longer true.** On a failed migration it says
   *"Fix the migration and re-run (migrations are idempotent)"*. Since `006`, that is false: its guard
   refuses to run once any old table holds a row. Reword it so an operator is not told a re-run is
   safe. **Producer's choice: kept here on S3** (S3 already needs a profile-box deploy) rather than a
   separate follow-up task — not owner-ruled. ⚠️ `setup-profile.sh` carries grep-level assertions in
   `tests/scripts/profile-deploy-hardening.test.sh`; run `npm test` after the edit.
