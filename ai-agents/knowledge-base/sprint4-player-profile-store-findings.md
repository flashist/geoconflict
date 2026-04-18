# Sprint 4 Investigation — Player Profile Store Findings

**Date:** 2026-04-18
**Status:** Complete — gates Sprint 4 player-store and citizenship implementation

## Executive Recommendation

- **Database technology:** PostgreSQL
- **Where it should live:** on the existing game-server VPS, but as a separate sibling service/container, not embedded inside the Node.js game process and not on the Uptrace/tooling VPS
- **Schema direction:** relational `player_profiles` plus an idempotent per-match credit table from day one
- **Match completion tracking:** server-side crediting at match end, with one small protocol extension because the current server does not yet have authoritative `hasSpawned` / final participation state
- **Guest UX:** do not silently hide citizenship; show a locked state with a Yandex login prompt

## Codebase Findings That Matter

### 1. Current server identity is not Yandex-based

The current multiplayer join flow sends `token`, `clientID`, `gameID`, `username`, and cosmetics in `ClientJoinMessage` (`src/core/Schemas.ts`). On the server, `verifyClientToken()` resolves that token into the existing internal `persistentId` (`src/server/jwt.ts`), and `Worker.ts` stores it on `Client.persistentID` (`src/server/Client.ts`).

There is **no Yandex player ID in the current join/auth path**. The game server never receives `ysdk.getPlayer().getUniqueID()` today.

### 2. The client already knows whether Yandex authorization exists, but only for name lookup

`FlashistFacade.initPlayer()` calls `yandexGamesSDK.getPlayer()` and stores the SDK player object (`src/client/flashist/FlashistFacade.ts`). `getCurPlayerName()` then checks `player.isAuthorized()` before reading the platform name. The current client does **not** expose wrappers for `getUniqueID()` or `getMode()`.

### 3. The server is a turn relay, not a full authoritative simulation host

`GameServer.endTurn()` packages intents, broadcasts turns, checks disconnect status, and archives the final record (`src/server/GameServer.ts`). It does **not** run the shared simulation or track per-player spawn/elimination state itself. Final winner + `allPlayersStats` arrive from clients through `ClientSendWinnerMessage` (`src/core/Schemas.ts`).

This is the key constraint for match qualification: the server can already credit matches at match end, but it needs one extra end-of-match signal to be fully reliable for `hasSpawned` and qualifying completion.

### 4. Deployment is one container per game VPS today

The repo's deployment docs show one Docker container per environment on a VPS behind host-level Nginx (`docs/vps-deployment-guide.md`, `docs/project-status.md`, `update.sh`). There is no existing game-side database service in the stack.

## 1. Database Technology Recommendation

**Recommend PostgreSQL.**

### Why PostgreSQL is the best fit

- Sprint 4 already needs durable per-player counters, booleans, timestamps, and uniqueness-safe lookups.
- Sprint 4 and Sprint 5 add naturally relational requirements: unique display names, name-history moderation, cosmetic ownership, citizen inbox, and eventually cross-player queries.
- Postgres gives the project the constraints it actually needs: unique indexes, partial indexes, transactional updates, and easy idempotent UPSERT flows for match crediting.
- The team already has operational familiarity with Postgres from the Uptrace deployment (`setup-telemetry.sh`), which lowers operational risk compared with introducing MongoDB for the first time.

### Why not the other options

- **MongoDB:** flexible, but the upcoming data model is not document-first; it is identity-first and constraint-heavy.
- **SQLite:** acceptable for a toy single-process store, but weak for concurrent writes, crash recovery, and future multi-process operations on a live VPS.
- **Redis:** useful later as a cache, not as the source of truth for paid entitlements or citizenship.

## 2. Where the Store Should Live

**Recommend: same game-server VPS, separate Postgres service/container, localhost-only access.**

### Why this is the best deployment shape

- It keeps the hot path local: no extra network hop to a different machine when a match ends.
- It avoids coupling player entitlements to the Uptrace/tooling box.
- It isolates the database from the Node.js process better than embedding file-based storage or an in-process store.
- It fits the current deployment model cleanly: the repo already expects one VPS per environment and containerized services on that machine.

### Important nuance

If forced to choose from the task's three buckets, this is closest to **"a separate lightweight service on the same game server VPS"**, but I would **not** add a separate Express/Fastify API in front of Postgres yet. The game server can talk to Postgres directly through a small repository layer. Adding a second API process now creates extra moving parts without solving a real Sprint 4 problem.

### Why not the Uptrace/tooling VPS

- Match-completion crediting becomes dependent on a different machine during a sensitive lifecycle moment.
- It ties game monetization/progression to observability infrastructure that should stay operationally separate.
- It creates more failure modes than it removes.

### Database size estimate

The initial profile row is small. The main growth driver is the idempotent match-credit ledger.

**Current-scale estimate:**

- `player_profiles`: tens of thousands to low hundreds of thousands of rows should remain well under 100 MB
- `player_match_credits`: if authorized players generate low millions of credited rows over time, expect roughly **0.5-1.5 GB**
- **Total practical expectation:** comfortably under **2 GB**

**10x-scale estimate:**

- `player_profiles`: still small, likely a few hundred MB at most
- `player_match_credits`: tens of millions of rows would push the store into roughly **5-15 GB**
- **Total practical expectation:** still feasible on a 50 GB VPS disk, but only with normal housekeeping, backups, and disk monitoring

This is small enough for the current game VPS plan. The store only becomes uncomfortable if the project keeps every per-match credit row forever at much larger scale. If that happens later, old credits can be rolled up into archival aggregates.

## 3. Initial Schema Recommendation

## Identity recommendation before the SQL

The task brief assumes the store is keyed by Yandex player ID. Product-wise, that is fine. Technically, the current server cannot verify or even see that ID yet.

So the schema should support **both**:

- `yandex_player_id` as the long-term product identity
- `persistent_id` as the current server-visible identity and migration bridge

For Sprint 4 implementation, the cleanest path is to add a **verified** Yandex identity claim into the existing join/auth token flow. Do **not** trust a raw client-submitted Yandex ID for paid entitlements.

### Proposed Sprint 4 tables

```sql
create table player_profiles (
  yandex_player_id text primary key,
  persistent_id uuid unique,
  qualifying_match_count integer not null default 0,
  is_citizen boolean not null default false,
  is_paid_citizen boolean not null default false,
  citizenship_earned_at timestamptz,
  citizenship_purchased_at timestamptz,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (qualifying_match_count >= 0),
  check (citizenship_earned_at is null or is_citizen),
  check (citizenship_purchased_at is null or is_paid_citizen)
);

create unique index player_profiles_display_name_uq
  on player_profiles (lower(display_name))
  where display_name is not null;

create table player_match_credits (
  game_id text not null,
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  outcome text not null check (outcome in ('eliminated', 'survived')),
  credited_at timestamptz not null default now(),
  primary key (game_id, yandex_player_id)
);
```

### Why `player_match_credits` should exist in Sprint 4

Blindly incrementing `qualifying_match_count` is risky because match-finalization code can be retried, duplicated, or re-run during operational incidents. The `(game_id, yandex_player_id)` primary key makes match crediting idempotent.

### Future-aware tables to plan for now

These do not all need to ship in the first migration, but the schema should assume them:

```sql
create table player_name_history (
  id bigserial primary key,
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  old_display_name text,
  new_display_name text not null,
  changed_at timestamptz not null default now(),
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected'))
);

create table player_cosmetic_ownership (
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  cosmetic_type text not null check (cosmetic_type in ('flag', 'pattern')),
  cosmetic_id text not null,
  granted_at timestamptz not null default now(),
  source text not null default 'purchase',
  primary key (yandex_player_id, cosmetic_type, cosmetic_id)
);
```

### If Sprint 4 cannot add verified Yandex identity yet

Keep the exact same table shape, but temporarily make `persistent_id` the primary application lookup and leave `yandex_player_id` nullable + unique until the verified Yandex claim exists. That is the safest fallback.

## 4. Match Completion Tracking Recommendation

**Recommend server-side crediting at match end.**

Do **not** use a separate client "match completed" API call. That is easy to fake and unnecessary.

### What is feasible right now

At match end, the server already has:

- the match ID
- the participant list from `gameStartInfo`
- the current internal `persistentID` for each player in `allClients`
- disconnect state and reconnect history through `mark_disconnected`
- final `winner` and `allPlayersStats`

That is enough to make the game server the place where credits are written.

### What is missing right now

The current server does **not** have authoritative:

- Yandex player ID
- `hasSpawned`
- a direct "this player survived to the end" / "this player was eliminated after participating" summary

`allPlayersStats` alone is not enough to exclude never-spawned players with full confidence.

### Simplest reliable implementation

1. Extend the join/auth flow so the server gets a **verified** `yandex_player_id`.
2. Extend the end-of-match winner payload with a compact per-player final-state summary, for example:

```ts
{
  hasSpawned: boolean;
  isAliveAtEnd: boolean;
  killedAt?: number;
}
```

3. On the server, credit a qualifying match only when all of these are true:

- player has a verified Yandex identity
- `hasSpawned === true`
- player did not voluntarily leave
- player was not disconnected at the end without returning
- player either has `killedAt` set or `isAliveAtEnd === true`

4. Insert into `player_match_credits` and increment `player_profiles.qualifying_match_count` in the same transaction.

### Bottom line

The **crediting location** should absolutely be server-side. But the current `GameServer.ts` does **not** already know enough to do that with zero protocol changes. One small end-of-match summary addition is needed.

## 5. Guest Player Handling

### What the client does today

The current client initializes the Yandex player object in `FlashistFacade.initPlayer()` and uses `player.isAuthorized()` inside `getCurPlayerName()` before it trusts the platform username (`src/client/flashist/FlashistFacade.ts`).

So the current codebase already has an authorization concept, but it is not wrapped as a reusable citizenship/auth-state helper yet.

### Recommendation on the detection API

Add explicit helpers to `FlashistFacade`, for example:

- `isYandexAuthorized(): Promise<boolean>`
- `getYandexPlayerIdentity(): Promise<{ mode: string; uniqueId: string | null }>`

If product wants exact guest detection semantics, use `player.getMode()` and treat `'lite'` as guest. If product only needs "authorized vs not", `isAuthorized()` is enough.

### Guest UX options

- **Silent hide:** lowest UI clutter, but poor discoverability and confusing once citizenship is marketed
- **Locked card with login CTA:** best balance; guest sees the feature exists, but the UI explains that progress and purchases require Yandex login
- **Prompt only when tapped:** workable, but weaker as a persistent progression motivator

**Recommendation:** show the citizenship UI in a locked state for guests with explicit copy such as "Log in with Yandex to track qualifying matches and unlock citizenship."

## Final Recommendation

If Sprint 4 started tomorrow, the implementation brief should be:

1. Add verified Yandex identity into the existing join/auth path.
2. Run PostgreSQL on the game VPS as a sibling service.
3. Ship `player_profiles` and `player_match_credits` first.
4. Credit qualifying matches on the game server at match end in an idempotent transaction.
5. Expose citizenship to guests as a locked/login-required surface, not as a hidden feature.

## Main Open Risk

The only serious architectural gap is **identity trust**. The game server currently has no verified Yandex player ID. That must be solved before paid citizenship or Yandex-keyed player profiles are safe.
