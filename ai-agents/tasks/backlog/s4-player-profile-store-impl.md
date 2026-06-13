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

## Infrastructure Decision (resolved 2026-06-13)

The investigation (`ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`) recommended co-locating Postgres on the game-server VPS as a sibling container. **That recommendation is superseded.** The profile store and all non-game backend logic run on a **dedicated reg.ru VPS, separate from the game servers**, for failure-domain isolation:

- A profile-server outage must never stop matches — game servers are stateless turn relays and don't need the DB to run a match.
- A game-server crash/OOM must never threaten profile data or paid entitlements.

This isolation becomes critical once paid in-apps ship: profile data and backups are unrecoverable-loss-sensitive, while matches must stay playable independently of the profile backend.

**Resolved shape:**

- **New dedicated VPS on reg.ru (Russia).** All player data stays on Russian soil, so 152-FZ residency is satisfied (all existing game + telemetry VPS are already reg.ru/Moscow; the `Hetzner` comments in `setup.sh`/`update.sh` are stale and inaccurate).
- **Public HTTPS API behind a subdomain: `api.geoconflict.ru`** → the profile VPS, with nginx TLS termination, mirroring the telemetry box (`telemetry.geoconflict.ru`). Yandex Games disallows calls to raw IPs, so the client must reach the API via this subdomain, never an IP.
- **Postgres runs localhost-only on the profile VPS.** It is never exposed on the network; all access goes through the API service.
- **API consumers:** (1) the **client** for profile reads + guest→authenticated migration (player-authenticated), (2) the **game server** for server-authoritative match-end XP crediting (service-authenticated internal endpoint), and later (3) admin/messaging tooling.
- **Deploy pattern:** stand up the box by mirroring the telemetry deployment (`setup-telemetry.sh` + `build-deploy-telemetry.sh` + its own `docker-compose.yml`, with swap + Postgres memory caps baked in from the prior OOM lessons). Do not co-locate anything on the game VPS.

**Legal note (tracked separately):** storing Yandex IDs + display names makes the project a personal-data operator under 152-FZ — a Roskomnadzor operator notification and a user-consent flow are required. Handled as a separate product/legal task, not in this implementation task.

---

## Decomposition (child tasks)

This document is the **epic/overview**. The shared context above (Infrastructure Decision, Part B schema) plus the Parts and the Verification matrix below are the reference for all child slices. Implementation is split into 8 independently developable, verifiable, and shippable slices in `ai-agents/tasks/backlog/`:

| # | Child task | Covers | Depends on |
|---|---|---|---|
| T1 | `s4-profile-01-schema-contract.md` | Shared `PlayerProfile` type + `migrateProfile()` (Part B JSON) | — |
| T2 | `s4-profile-02-guest-localstorage.md` | Guest XP in localStorage (Part C) | T1 |
| T3 | `s4-profile-03-yandex-identity.md` | Verified Yandex identity plumbing (Part A) | — |
| T4 | `s4-profile-04-backend-infra.md` | Dedicated reg.ru VPS + API skeleton (Part D ops) | — |
| T5 | `s4-profile-05-backend-db-api.md` | Migration + repository + API endpoints (Part D DB + Part E profile half) | T1, T4 |
| T6 | `s4-profile-06-match-end-crediting.md` | Protocol ext + server-side crediting (Part E game half) | T3, T5 |
| T7 | `s4-profile-07-guest-migration.md` | Guest→authenticated migration (Part F) | T2, T3, T5 |
| T8 | `s4-profile-08-backups.md` | Profile DB backups (Part D step 7) | T4 |

**Strict one-by-one order:** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8.

**Parallel tracks (optional):** the client track (T1 → T2) and the backend track (T4 → T5) can run concurrently; T3 fits anywhere; **T6 converges them and is the production-verification gate** for the Citizenship Core UI task; T8 any time after T4, before paid citizenship ships.

**Part G (guest locked-card UX)** is delivered in the **Citizenship Core UI** task, consuming T3's helpers — it is not a child slice here.

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

## Part D — Dedicated Profile/Backend Server (reg.ru)

Stand up a new reg.ru VPS for the profile store and API. Mirror the telemetry box's deployment pattern — do not invent a parallel approach, and do not co-locate on the game VPS.

1. **Provision the VPS** (reg.ru, Russia) following the `setup-telemetry.sh` pattern: Docker, a swapfile (the prior telemetry OOM was a low-RAM reg.ru box — size RAM for Postgres + API + OS and add swap), a firewall, and nginx with Let's Encrypt TLS for `api.geoconflict.ru`. Point the `api.geoconflict.ru` DNS A-record at this VPS.

2. **`docker-compose.yml` on the profile box** with:
   - `postgres:16-alpine`, data on a named volume (`postgres_data`), **bound to `127.0.0.1` only** — never published on a public interface.
   - the **profile API service** (Node) — see Part E.
   - nginx terminating TLS for `api.geoconflict.ru` and reverse-proxying to the API service.
   Apply conservative Postgres memory settings (small `shared_buffers`, small `work_mem`, a small fixed connection pool) so the box cannot OOM.

3. **Profile-server code lives in this monorepo** under a new directory (e.g. `src/profile-server/`), built into its own Docker image via a `build-deploy-profile.sh` that mirrors `build-deploy-telemetry.sh`. Keeping it in-repo lets the versioned `PlayerProfile` type, the `migrateProfile()` pure function, and the relevant Zod schemas be shared across client, game server, and profile server.

4. **Config / secrets:**
   - Add `PROFILE_API_URL` (e.g. `https://api.geoconflict.ru`) to the env config following the existing `GAME_ENV` + layered `.env.secret` pattern, exposed to the client via `/api/env` so it calls the right host per environment.
   - Add `DATABASE_URL` **on the profile box only** — game servers never receive DB credentials. Do not commit real credentials.
   - Add a service-to-service secret (e.g. `PROFILE_INTERNAL_TOKEN`) shared by the game server and the profile API to authenticate internal crediting calls.

5. **Initial migration** `migrations/001_player_profiles.sql` (the `migrations/` dir already exists, empty) with the tables from Part B. Run migrations on the profile box at deploy time.

6. **Network posture:** the API is public over TLS (the client needs it via the subdomain), but the **internal crediting endpoints must be additionally protected** by the service secret and IP-allowlisted to the game-server VPS. Optionally tighten game↔profile traffic with a WireGuard tunnel; latency is irrelevant (both boxes are intra-Moscow) — this is purely integrity.

7. **Backups:** nightly `pg_dump` (plus WAL archiving if PITR is wanted before paid ships) to reg.ru S3-compatible storage. Backups are a prerequisite for paid citizenship — lost profiles/entitlements are unrecoverable.

---

## Part E — Repository Layer, Profile API, and Match-End XP Crediting

The DB-touching repository lives on the **profile server**; the game server reaches it over HTTP. Do not give the game server direct Postgres access.

### On the profile server

Create `PlayerProfileRepository` (direct Postgres, in `src/profile-server/`). Minimum interface for Sprint 4:

- `upsertProfile(yandexPlayerId: string, persistentId: string): Promise<void>` — creates a profile on first authenticated join; updates `persistent_id` linkage if it changes.
- `creditMatchXp(gameId: string, yandexPlayerId: string, xpAwarded: number): Promise<void>` — inserts into `player_match_xp_credits` and increments `xp` in `player_profiles` **atomically, in one transaction**. Idempotent: if `(game_id, yandex_player_id)` already exists, do nothing.
- `getProfile(yandexPlayerId: string): Promise<PlayerProfile | null>`

Expose these through the profile API:

- **Client-facing (player-authenticated):** `GET /v1/profile` (read), `POST /v1/profile/migrate` (guest→authenticated upload — see Part F).
- **Internal (service-authenticated via `PROFILE_INTERNAL_TOKEN`, IP-allowlisted to the game server):** `POST /internal/v1/credit` accepting a batch of `{ gameId, yandexPlayerId, xpAwarded }` and performing idempotent crediting.

### On the game server

Create `src/server/ProfileApiClient.ts` — a thin HTTP client to `PROFILE_API_URL` that calls the internal crediting endpoint. **Crediting is fail-soft:** it must never block or delay `GameServer` match-end cleanup, and a profile-server outage must not error the match. Fire-and-forget with bounded at-least-once retry; idempotency on `(game_id, yandex_player_id)` makes retries safe.

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

On the server in `GameServer` match-end handling (`handleWinner()`), for each client with a `yandexPlayerId`, credit 10 XP via `ProfileApiClient` only if:
- `hasSpawned === true`
- Player did not voluntarily leave
- Player was not disconnected at end without returning
- `isAliveAtEnd === true` OR `killedAt` is set

Crediting must be server-authoritative — never trust the client to credit itself. Batch the qualifying players into one internal API call (or `Promise.all()` the calls) — do not await serially, and never block the match loop.

---

## Part F — Guest-to-Authenticated Migration (on login)

When a guest player authenticates with Yandex for the first time in a session:

1. Call `getYandexUniqueId()` to get their Yandex player ID.
2. Call the profile API `GET /v1/profile` for that Yandex player ID.
3. **If a server-side profile exists:** use it. Discard the localStorage profile — do not merge. Update the local state from the server profile.
4. **If no server-side profile exists:** read the localStorage profile and `POST /v1/profile/migrate` to the profile API, which creates a new `player_profiles` row from the local data (preserving accumulated XP). Clear the localStorage profile after the successful write. Note: guest XP comes from untrusted localStorage, so migration can carry fabricated XP — accepted for Sprint 4 (citizenship is *earned*/free here; paid flags never come from migration).

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
- Do not expose the Postgres port publicly. Postgres is localhost-only on the **profile** VPS; the game server never connects to it directly — all access is through the profile API at `https://api.geoconflict.ru` (Yandex Games disallows raw-IP calls).
- Rewarded ad XP doubling (2× per match) is Sprint 5 scope. The `xp_awarded` column in `player_match_xp_credits` is designed to support variable XP values when that ships.
