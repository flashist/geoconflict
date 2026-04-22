# Task — Player Profile Store: Implementation

## Sprint
Sprint 4

## Priority
High — foundation for all citizenship and payments tasks. Nothing else in Phase 2 can ship until this is live.

## Context

Investigation A is complete (`ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`). The design has since been updated with the following product decisions:

- **XP system, not match counter.** Citizenship is earned at 1,000 XP. Each qualifying match awards 10 XP (flat). XP continues accumulating past citizenship.
- **Guest-first architecture.** Player profile data must be preserved even when the player is not logged in, and transferred to server-side storage when they eventually authenticate.
- **Versioned JSON schema.** The profile payload should include a `schema_version` field to enable forward-compatible reads and on-the-fly schema upgrades. The exact database storage strategy (JSONB column vs. rigid columns) is an **open question for the technical specialist** — see Part B.
- **Server wins on conflict.** If a server-side profile already exists for an authenticated player, it takes precedence. Local storage data is discarded. No merging.

This task is complex and requires careful planning. The technical specialist should validate the open questions in Part B before writing any migration or storage code.

---

## Part A — Add Verified Yandex Identity to the Join/Auth Path

The game server currently only sees an internal `persistentID` (`src/server/jwt.ts`). It never receives or verifies a Yandex player ID. That must change before Yandex-keyed profiles are safe for paid entitlements.

### Client side

1. In `src/client/flashist/FlashistFacade.ts`, add two helpers:
   - `isYandexAuthorized(): Promise<boolean>` — wraps `player.isAuthorized()`
   - `getYandexUniqueId(): Promise<string | null>` — wraps `player.getUniqueID()` when authorized, returns `null` for guests

2. When building the join payload (wherever `ClientJoinMessage` is assembled before `Transport.ts` sends it), call `getYandexUniqueId()` and include the result as `yandexPlayerId: string | null` in the message.

### Shared schema

3. In `src/core/Schemas.ts`, add `yandexPlayerId: z.string().nullable().optional()` to `ClientJoinMessage`.

### Server side

4. In `src/server/Worker.ts`, store `yandexPlayerId` on the `Client` object (`src/server/Client.ts`). For the earned-XP path in Sprint 4, no additional Yandex signature verification is required — the ID is used as a stable store key. Paid citizenship verification is handled in the Yandex Payments task.

---

## Part B — Profile JSON Schema and Storage Strategy

### Profile JSON schema

The player profile payload should be a versioned JSON object used consistently on both the client (localStorage) and the server (database). The structure for Sprint 4:

```json
{
  "schema_version": 1,
  "yandex_player_id": "string | null",
  "persistent_id": "string",
  "xp": 0,
  "is_citizen": false,
  "is_paid_citizen": false,
  "citizenship_earned_at": "ISO8601 | null",
  "citizenship_purchased_at": "ISO8601 | null",
  "display_name": "string | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

The `schema_version` field allows the application to detect old profiles and migrate them on read without requiring a database migration. Migration functions should be pure: `migrateProfile(raw: unknown): PlayerProfile`.

### Open question for the technical specialist — database storage strategy

The investigation recommended PostgreSQL with rigid columns. The product requirement is now a versioned JSON schema that can be extended without breaking old readers. The technical specialist must evaluate and decide between two approaches before implementation starts:

**Option A — JSONB column**
Store the entire profile as a single `profile jsonb` column alongside a top-level `yandex_player_id` primary key. Flexible, schema-less, easy to extend. Trade-off: no column-level constraints or indexes without expression indexes; queries on profile fields are more verbose.

**Option B — Rigid columns + JSONB overflow**
Keep critical fields as typed Postgres columns (`xp`, `is_citizen`, `display_name`, etc.) for constraint enforcement and indexing. Add a `extra jsonb` column for future fields not yet known. The `schema_version` is a regular integer column. Trade-off: schema migrations still needed when promoting a field from `extra` to a column.

Both options should store `player_match_xp_credits` as a separate table with `(game_id, yandex_player_id)` as the primary key for idempotent XP crediting — this part is not in dispute.

**The technical specialist should document their choice and reasoning before writing the first migration.**

### Proposed tables (regardless of storage strategy)

```sql
-- Primary profile table (column shape TBD by storage strategy decision)
create table player_profiles (
  yandex_player_id text primary key,
  persistent_id uuid unique,
  xp integer not null default 0 check (xp >= 0),
  is_citizen boolean not null default false,
  is_paid_citizen boolean not null default false,
  citizenship_earned_at timestamptz,
  citizenship_purchased_at timestamptz,
  display_name text,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index player_profiles_display_name_uq
  on player_profiles (lower(display_name))
  where display_name is not null;

-- Idempotent XP credit ledger
create table player_match_xp_credits (
  game_id text not null,
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  xp_awarded integer not null default 10,
  credited_at timestamptz not null default now(),
  primary key (game_id, yandex_player_id)
);

-- Future-aware tables (create now, no application logic yet)
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

## Part C — Guest Profile (localStorage)

For players who are not authenticated with Yandex, the profile is stored locally in localStorage using the same versioned JSON schema defined in Part B.

### Storage key
`geoconflict_profile_<persistentID>` — scoped to the player's internal persistent ID to avoid collisions on shared devices.

### On each qualifying match end (guest)
Read the local profile, increment `xp` by 10, update `updated_at`, write back. Check if `xp >= 1000` and flip `is_citizen = true` if so (local citizenship is a UI-only state until authenticated).

### On app init (guest)
Read the local profile. If none exists, create a fresh one with `schema_version: 1` and `xp: 0`. If one exists with an older `schema_version`, run the migration function before use.

### Durability tradeoff
localStorage clears on browser data wipe. This is an accepted tradeoff for v1 — guest profile data is best-effort, not guaranteed. No server-side fallback for guest profiles.

---

## Part D — PostgreSQL Service Setup

1. Add a `postgres` service to the game-server Docker Compose configuration. It should:
   - Use `postgres:16-alpine`
   - Persist data to a named volume (`postgres_data`)
   - Expose only on `localhost`
   - Start before the game server container

2. Add `DATABASE_URL` to the environment config following the existing `GAME_ENV` pattern in `src/core/configuration/`. Do not commit real credentials.

3. Create an initial migration file (`migrations/001_player_profiles.sql`) with the tables from Part B.

---

## Part E — Repository Layer and Match-End XP Crediting

Create `src/server/PlayerProfileRepository.ts`. Minimum interface for Sprint 4:

- `upsertProfile(yandexPlayerId: string, persistentId: string): Promise<void>` — creates a profile on first authenticated join; updates `persistent_id` linkage if it changes.
- `creditMatchXp(gameId: string, yandexPlayerId: string, xpAwarded: number): Promise<void>` — inserts into `player_match_xp_credits` and increments `xp` in `player_profiles` atomically. Idempotent: if `(game_id, yandex_player_id)` already exists, do nothing.
- `getProfile(yandexPlayerId: string): Promise<PlayerProfile | null>`

### Protocol extension for match-end state

Extend `ClientSendWinnerMessage` in `src/core/Schemas.ts` with an optional per-player participation summary:

```ts
playerParticipation: z.array(z.object({
  persistentId: z.string(),
  hasSpawned: z.boolean(),
  isAliveAtEnd: z.boolean(),
  killedAt: z.number().optional(),
})).optional()
```

On the client, populate this before sending the winner message.

On the server in `GameServer.endTurn()`, for each client with a `yandexPlayerId`, credit 10 XP via `PlayerProfileRepository.creditMatchXp()` only if:
- `hasSpawned === true`
- Player did not voluntarily leave
- Player was not disconnected at end without returning
- `isAliveAtEnd === true` OR `killedAt` is set

Use `Promise.all()` for concurrent credits — do not await serially.

---

## Part F — Guest-to-Authenticated Migration (on login)

When a guest player authenticates with Yandex for the first time in a session:

1. Call `getYandexUniqueId()` to get their Yandex player ID.
2. Call `PlayerProfileRepository.getProfile(yandexPlayerId)`.
3. **If a server-side profile exists:** use it. Discard the localStorage profile — do not merge. Update the local state from the server profile.
4. **If no server-side profile exists:** read the localStorage profile, POST it to the server, create a new `player_profiles` row from the local data (preserving accumulated XP). Clear the localStorage profile after successful server write.

This migration should happen at the point in `FlashistFacade` where Yandex authentication completes, before the UI reflects any profile state.

---

## Part G — Guest UX

In the citizenship UI component (built in the Citizenship Core task), on mount call `FlashistFacade.isYandexAuthorized()`. If not authorized:

- Render the citizenship card locked: lock icon, "Войдите, чтобы сохранить прогресс", "Войти в Яндекс" button.
- Do not hide the card. Guest XP still accumulates locally — the locked state communicates that progress won't persist without login, not that the feature is unavailable.
- Tapping "Войти в Яндекс" triggers the Yandex SDK login flow, then Part F migration runs.

---

## Verification

1. **Guest XP accumulation:** play a qualifying match without logging in. Confirm `xp` increments by 10 in localStorage. Play a disqualified match (leave mid-game) — confirm no increment.
2. **Guest-to-authenticated migration (no server profile):** accumulate XP as guest, then log in. Confirm XP transfers to server profile. Confirm localStorage profile is cleared.
3. **Guest-to-authenticated migration (server profile exists):** create a server profile manually, then log in from a guest session with local XP. Confirm server profile wins, local data discarded.
4. **Idempotency:** trigger match-end crediting twice with the same `game_id`. Confirm XP is credited only once.
5. **Citizenship threshold:** reach 1,000 XP. Confirm `is_citizen` flips to `true`.
6. **Schema version:** write a profile with `schema_version: 1`, then run the migration function with a future hypothetical v2 schema — confirm it returns a valid v2 object without errors.
7. **No regression:** normal match flow works with no errors in server logs related to database calls.

---

## Notes

- Paid-citizenship server-side verification is in scope for the Yandex Payments task, not here.
- The Citizenship Core UI task depends on this task being live. Do not start it until Part E is verified in production.
- The technical specialist must document the JSONB vs rigid columns decision (Part B) before writing any migration code.
- Do not expose the Postgres port publicly. Localhost-only from the game server process.
- Rewarded ad XP doubling (2× per match) is Sprint 5 scope. The `xp_awarded` column in `player_match_xp_credits` is designed to support variable XP values when that ships.
