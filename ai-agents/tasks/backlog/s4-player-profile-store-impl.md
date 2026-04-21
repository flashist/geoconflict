# Task — Player Profile Store: Implementation

## Sprint
Sprint 4

## Priority
High — foundation for all citizenship and payments tasks. Nothing else in Phase 2 can ship until this is live.

## Context

Investigation A (complete, findings in `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`) produced the following decisions:

- **Database:** PostgreSQL, running as a sibling service/container on the existing game-server VPS. Not embedded in the Node.js process, not on the Uptrace VPS.
- **Schema:** relational `player_profiles` + idempotent `player_match_credits` tables.
- **Match crediting:** server-side at match end in an idempotent transaction. Requires one small protocol extension (per-player end-of-match state summary).
- **Identity gap:** the game server currently has no verified Yandex player ID. This must be solved in this task before paid entitlements or Yandex-keyed profiles are safe.
- **Guest UX:** show citizenship in a locked state with a Yandex login CTA — do not silently hide it.

This task has four parts that should be implemented in order, since each unblocks the next.

---

## Part A — Add Verified Yandex Identity to the Join/Auth Path

The game server currently only sees an internal `persistentID` (resolved in `src/server/jwt.ts`). It never receives or verifies a Yandex player ID. That must change before Yandex-keyed profiles are safe.

### Client side

1. In `src/client/flashist/FlashistFacade.ts`, add two helpers:
   - `isYandexAuthorized(): Promise<boolean>` — wraps `player.isAuthorized()`
   - `getYandexUniqueId(): Promise<string | null>` — wraps `player.getUniqueID()` when authorized, returns `null` for guests

2. When building the join payload (wherever `ClientJoinMessage` is assembled before `Transport.ts` sends it), call `getYandexUniqueId()` and include the result as `yandexPlayerId: string | null` in the message.

### Shared schema

3. In `src/core/Schemas.ts`, add `yandexPlayerId: z.string().nullable().optional()` to `ClientJoinMessage`.

### Server side

4. In `src/server/Worker.ts`, where a `Client` is created from a join message, store `yandexPlayerId` on the `Client` object (`src/server/Client.ts`). No additional verification step is required for the earned-match path in Sprint 4 — the ID is used only as a stable store key. For the paid-citizenship path, verification must use Yandex SDK server-side token checks; that requirement should be noted in the Yandex Payments task brief, not done here.

---

## Part B — PostgreSQL Service Setup and Schema Migration

### Infrastructure

1. Add a `postgres` service to the game-server Docker Compose configuration (or equivalent deployment config). It should:
   - Use the official `postgres:16-alpine` image
   - Persist data to a named volume (`postgres_data`)
   - Expose only on `localhost` (not externally)
   - Be started before the game server container

2. Add `DATABASE_URL` (Postgres connection string) to the environment config. Follow the existing `GAME_ENV`-based config pattern in `src/core/configuration/`. Do not commit real credentials — reference the env var only.

3. Update the deployment documentation if it exists (`docs/vps-deployment-guide.md`) to note the new Postgres service and required env var.

### Migration

Create an initial migration file (`migrations/001_player_profiles.sql` or equivalent) containing the following tables. Run it once on first deploy:

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

Also create the future-aware tables in the same migration (columns but no application logic yet):

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

---

## Part C — Repository Layer and Match-End Crediting

### Repository layer

Create `src/server/PlayerProfileRepository.ts`. This module owns all SQL queries — the rest of the server interacts with the database through this interface only. Minimum functions needed for Sprint 4:

- `upsertProfile(yandexPlayerId: string, persistentId: string): Promise<void>` — creates a profile on first join, updates `persistent_id` linkage if it changes. Use `INSERT ... ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE` as appropriate.
- `creditQualifyingMatch(gameId: string, yandexPlayerId: string, outcome: 'eliminated' | 'survived'): Promise<void>` — inserts into `player_match_credits` and increments `qualifying_match_count` in `player_profiles` atomically. Must be idempotent: if `(game_id, yandex_player_id)` already exists, do nothing.
- `getProfile(yandexPlayerId: string): Promise<PlayerProfile | null>` — returns the profile row for a given player.

### Protocol extension for match-end state

`GameServer.endTurn()` in `src/server/GameServer.ts` currently receives `allPlayersStats` from `ClientSendWinnerMessage` (`src/core/Schemas.ts`). It does not have authoritative `hasSpawned` or final participation state.

1. Add an optional per-player participation summary to `ClientSendWinnerMessage` in `src/core/Schemas.ts`:

```ts
playerParticipation: z.array(z.object({
  persistentId: z.string(),
  hasSpawned: z.boolean(),
  isAliveAtEnd: z.boolean(),
  killedAt: z.number().optional(),
})).optional()
```

2. On the client, populate this field before sending the winner message. The client simulation already knows spawn state and elimination events.

3. On the server, in `GameServer.endTurn()`, after the game concludes, iterate over connected clients. For each client with a `yandexPlayerId`, find their entry in `playerParticipation` and credit a qualifying match if all of the following are true:
   - `hasSpawned === true`
   - Player did not voluntarily leave (`disconnectReason !== 'leave'` or equivalent)
   - Player was not disconnected at the end without returning
   - `isAliveAtEnd === true` OR `killedAt` is set (meaning they participated fully)

Call `PlayerProfileRepository.creditQualifyingMatch()` for each qualifying player. Do not await all of them serially — use `Promise.all()`.

---

## Part D — Guest UX

In the citizenship UI component (to be built in the Citizenship Core task), the component should call `FlashistFacade.isYandexAuthorized()` on mount. If the player is not authorized:

- Render the citizenship card in a locked/disabled visual state
- Show copy such as: "Log in with Yandex to track qualifying matches and earn citizenship"
- Tapping the card (or a CTA button on it) should call the Yandex SDK login flow

Do not hide the card entirely. Guest players should understand the feature exists and how to unlock it.

---

## Verification

1. **Profile creation:** join a match as an authorized Yandex player. Confirm a `player_profiles` row exists in the database after joining.
2. **Match crediting (idempotency):** complete a qualifying match. Confirm one row in `player_match_credits` and `qualifying_match_count = 1`. Trigger the end-of-match flow again with the same `game_id` — confirm the count does not increment a second time.
3. **Disqualified outcomes:** complete a match where a player never spawns, and one where a player leaves mid-match. Confirm neither produces a `player_match_credits` row.
4. **Guest UX:** open the citizenship surface without Yandex authorization. Confirm the locked state and login CTA render. Confirm the card is not hidden.
5. **No regression:** normal match flow (join, play, end) works with no errors in server logs related to the new database calls.

---

## Notes

- Paid-citizenship verification (checking Yandex purchase signatures on the server) is in scope for the Yandex Payments task, not this one. This task only needs the Yandex player ID to be present in the join path as a stable store key.
- The Citizenship Core task (match counter + progress UI) depends on this task being live — do not start it until Part C is verified in production.
- If Yandex identity cannot be added in time, the fallback is to key profiles on `persistent_id` and make `yandex_player_id` nullable. Do not ship paid citizenship in that state.
- Do not expose the Postgres port publicly. Access must be localhost-only from the game server process.
