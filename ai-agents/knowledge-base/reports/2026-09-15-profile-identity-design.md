# Profile identity — internal player id, platform logins, login endpoint + token (design)

- **Date:** 2026-09-15 (rev 2, same day — owner rulings folded in)
- **Author:** fkit-architect (consult from `fkit-lead`; owner input arrived by relay)
- **Status:** ✅ **design accepted** — [ADR-113](../decisions/adr-113-profile-internal-player-id-and-platform-identities.md),
  owner-signed 2026-09-15. [ADR-112](../decisions/adr-112-free-xp-grants-capped-server-clamped-acked-once-per-account.md)
  amended the same day.
- **Task:** `0266`. The build is split into **5 slices (§9)** for the producer to file.
- **Owner rulings folded in (AskUserQuestion, 2026-09-15, relayed):**
  1. Design as proposed, but **"Token now, not later"**.
  2. **"Split into 4"**: database + re-keying → login endpoint → game server → client.
  3. Monitoring **"Yes, before go-live"**.
  4. Alerts by **"Email"**.
  5. Account linking recorded in ADR-113, **not built, no task**.
  6. A **0-XP tenure check is final**.
- **Decided by the architect (delegated):**
  - id type: random UUID;
  - what the client sends after login: token (then overruled on timing → v1);
  - platform spelling: `yandex_games`;
  - 0-XP storage: `player_xp_grants` row with `xp_awarded = 0`;
  - monitoring placement: **5th slice**.
- **Box facts (verified read-only by `fkit-lead`, 2026-09-15):**
  - applied migrations **001–004 only** (`005` never deployed);
  - **all 7 tables have 0 rows**;
  - disk **58 G, 48 G free (18 %)**;
  - `YANDEX_PAYMENTS_SECRET` **is set**, so payments intent could create rows once there is traffic
    (none today: card switch off, game not wired).
- **Citation frame:** content anchors (`../conventions/file-line-citations.md`), working tree on `dev` at
  `8be434c`. ⚠️ **Dirty in exactly the files this touches:**
  - modified: `src/profile-server/Routes.ts`, `PlayerProfileRepository.ts`, `Server.ts`;
  - untracked (task `0253`, to be reworked): `migrations/005_player_xp_grants.sql`,
    `src/core/profile/TenureGrantContract.ts`, `src/client/TenureGrantClaim.ts`.

---

## 0. The picture today (evidence)

| Where | What | Anchor |
|---|---|---|
| Schema | `player_profiles` PK = raw Yandex id; child tables reference it | `migrations/001_player_profiles.sql` — `yandex_player_id         text primary key,` · 002 `purchase_intents`/`processed_purchases` · 003 `player_messages` · 004 `player_name_history` |
| Row creators | game-server upsert on join; payments intent "ensure profile" | `Routes.ts` — `app.post("/internal/v1/profile/upsert", internalAuth` · `PaymentsRepository.ts` — `const ENSURE_PROFILE_SQL = ` |
| Public routes take the id from the client | profile read (query), inbox (query/body), name change, payments intent, tenure grant | `Routes.ts` — `function resolvePlayerId(req: Request)` (inbox) and each route's own schema |
| Game server | untrusted `Client.yandexPlayerId`; funnel; credit key `(game_id, yandex_player_id)` | `GameServer.ts` — `private getCreditableYandexId(client: Client): string \| null {` · `ProfileApiClient.ts` — `const UPSERT_PATH = "/internal/v1/profile/upsert";` |
| Client callers | card read, inbox (also from `NewsModal.ts` — `void refreshInbox();`, i.e. possibly **outside** the card switch), name change, payments intent, tenure claim, WS join / `update_identity` | `PlayerProfileView.ts` — `/v1/profile?yandexPlayerId=` · `Inbox.ts` · `NameChangeRequest.ts` · `CitizenshipPurchase.ts` · `TenureGrantClaim.ts` · `Transport.ts` |
| Migrations | runner skips by **filename**, no checksum; runs at deploy | `migrate.ts` — `"select 1 from schema_migrations where filename = $1",` · `setup-profile.sh` — `if ! docker compose exec -T profile-api npm run migrate; then` |
| Integration tests | apply migration **files directly** in every suite, relying on `IF NOT EXISTS` | `tests/integration/TenureGrant.it.test.ts` — `"migrations/005_player_xp_grants.sql",` (same pattern in all 7 suites) |
| Monitoring | profile server has **no OTEL**; a daily cron check pings a dead-man's switch | `Logger.ts` — `OTEL export for the profile service can be added here` · `profile-checks.sh` — `schedules it daily at 08:00 UTC` |
| Pool | 10 connections | `Db.ts` — `max: 10,` |

Size of the change:
- ~170 identity references in 5 profile-server files, ~40 in `src/core/profile`, ~25 in `src/server`,
  ~40 in `src/client`;
- ~348 references in 35 test files.

Why it's cheap **now**:
- 0 rows (verified).
- The game server's profile calls do nothing while `PROFILE_INTERNAL_TOKEN` is blank
  (`ProfileApiClient.ts` — `private isConfigured(): boolean {`), so the internal contract can change freely
  until `0217`.

---

## 1. Internal id — **random UUID v4, PK** (decided)

| | Sequential `bigint` | **UUID v4 (`gen_random_uuid()`)** |
|---|---|---|
| Uniqueness | sequence + PK | **PK** + retry on collision |
| Guessing / count leakage | trivial / yes, wherever an id shows | needs a leaked id / none |
| Size / speed | 8 B | 16 B — irrelevant at ~1.5K logged-in players/day (`2026-09-14-0253-tenure-xp-grant-findings.md` — `Player:YandexLoggedIn` **1.26–1.55K**) |
| Repo precedent | — | `purchase_intents.id uuid primary key default gen_random_uuid()` |

**How "same id twice" is impossible:**
- The id is the **PRIMARY KEY**. Postgres checks its unique index inside the insert, under concurrency. A
  duplicate cannot be committed, whatever the application does.
- On the ~never case of a UUID collision (`23505` on `players_pkey`), the find-or-create transaction rolls
  back and retries with a new id (max 3 attempts, then 500).
- So correctness never depends on luck.

**Exposure:** never to clients (ADR-113 hard rule: **no public route accepts a player id**). Only on
servers: game-server memory, internal routes, operator Telegram/curl.

---

## 2. What the client sends after login — **signed token, in v1** (owner: "Token now, not later")

### The token
- **Format:** `v1.<base64url(payload)>.<base64url(HMAC-SHA256(secret, "v1." + payload))>`.
- **Payload:** `{ pid: uuid, plt: "yandex_games", iat, exp, vfy: false }`. TTL **24 h**. Compare MACs with
  `timingSafeEqual` (the pattern in `InternalAuth.ts`).
- **Transport:** `Authorization: Bearer <token>`. Never in a query string or a cookie (cookies are
  third-party inside the Yandex iframe).
- **Secret:** `PROFILE_SESSION_SECRET` — on the profile box only, generated by `setup-profile.sh`, in the
  0600 env file.
  - **Fail closed:** if it is empty, login and token routes answer `503 session_unavailable`, with a boot
    `warn` naming the variable, never its value.
- **Refresh:** the client logs in on every load, which gives a new token each load. On `401`
  (`session_expired` / `session_invalid`) the shared client helper logs in again **once** and retries once.
- **Caller resolution:** every public route gets its caller from **one** function, `resolveCaller(req)`:
  1. valid Bearer token → `playerId`;
  2. **legacy fallback, one release only:** Yandex id in body/query → find-only lookup (never creates);
  3. otherwise `401`.

  The fallback exists because a cached older client — and the inbox refresh in `NewsModal`, possibly
  outside the card switch — still send the legacy id. **Removing the fallback is the last step of slice 4.**

### Costs, honestly
| Concern | Answer |
|---|---|
| CPU on 2 vCPU / 4 GB | One HMAC per request, microseconds. No DB read. Not a factor. |
| Storage | None. |
| Expiry | 24 h. A tab left open longer gets one silent re-login on its next call. |
| Tabs / devices | Each load has its own valid token; no conflicts. |
| **Store lost** | Nothing is stored. A box restore or secret rotation → every client re-logs-in on its next call. **No data loss.** |
| Revocation | Not possible before expiry. Not needed while identity is asserted — a token is re-obtainable by asserting the id. |
| CORS | `Authorization` makes the two GETs (profile, inbox) preflighted → one `OPTIONS`, cached with `Access-Control-Max-Age`. |
| Deploy | New secret; `scripts/config-parity-allowlist.json`; the `profile-deploy-hardening` shell harness asserts over `setup-profile.sh` (CLAUDE.md consequence 1). |
| Effort | ~1 extra day server-side (slice 2) + ~1 day client-side (slice 4), included in §9. |
| 🔓 **Security today** | **None gained.** Login gives a token to anyone who asserts a Yandex id. The token buys: Yandex ids out of URLs/logs, one verification point later (`0267`), the session a second login method needs. **`vfy:false` tokens must never count as "proven owner" (e.g. `0250` paid state).** |

### Game-server path (unchanged by the token)
```
WS join / update_identity / reconnect
  └─ getCreditableYandexId(client)              ← ADR-103 seam (future verification point)
      └─ POST /internal/v1/players/resolve {platform:"yandex_games", platformUserId}
          └─ {playerId, isCitizen} → client.profilePlayerId, client.isCitizen (true-only, as today)
match end / participation self-report
  └─ selectMatchCredits → dedupe by playerId
      └─ POST /internal/v1/credit {credits:[{gameId, playerId, xpAwarded}]} → key (game_id, player_id)
      └─ identity known but playerId null (resolve failed at join) → resolve, then credit
         (the `backfillMissingProfiles` shape)
```
The game server never holds the session secret; the internal id never reaches a client.

---

## 3. Schema — new guarded migration `006_player_identity.sql`

```sql
create table players (
  id uuid primary key default gen_random_uuid(),
  xp bigint not null default 0 check (xp >= 0),
  is_citizen boolean not null default false, is_paid_citizen boolean not null default false,
  citizenship_earned_at timestamptz, citizenship_purchased_at timestamptz,
  display_name text, schema_version integer not null default 1,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  -- chk_paid_implies_citizen, chk_purchased_implies_paid, chk_earned_implies_citizen — verbatim from 001
);
create unique index players_display_name_uq on players (lower(display_name)) where display_name is not null;

create table player_identities (
  platform text not null check (platform in ('yandex_games')),
  platform_user_id text not null check (char_length(platform_user_id) between 1 and 128),
  player_id uuid not null references players (id) on delete cascade,
  created_at timestamptz not null default now(), last_login_at timestamptz not null default now(),
  primary key (platform, platform_user_id)
);
create index player_identities_player_idx on player_identities (player_id);

create table player_xp_grants (           -- created HERE; untracked 005 is deleted (never deployed)
  player_id uuid not null references players (id) on delete cascade,
  kind text not null check (kind in ('tenure')),
  xp_awarded integer not null check (xp_awarded >= 0),   -- 0 = checked, nothing granted (final)
  evidence jsonb not null, granted_at timestamptz not null default now(),
  primary key (player_id, kind)
);
```

**Re-keyed child tables** (`yandex_player_id text` → `player_id uuid`, everything else preserved):
- `player_match_xp_credits` — PK `(game_id, player_id)`.
- `player_name_history` — moderation check; 004's `rejection_reason`/`decided_at`; `…_one_pending_uq`
  partial unique; `…_player_recent_idx`.
- `player_cosmetic_ownership` — PK + `cosmetic_type` check.
- `purchase_intents` — uuid PK, player index.
- `processed_purchases` — `player_id` **without** FK (receipt outlives an erasure); `intent_id … on delete
  set null`.
- `player_messages` — `chk_message_content`, `chk_read_after_sent`, both indexes.

**Guard:** before any drop, `DO $$ … RAISE EXCEPTION` if any of the 7 old tables has a row. The deploy
aborts before nginx/systemd and nothing changes. Then the old tables are dropped and the new ones created.
`001`–`004` stay byte-identical.

**Dropped:** `persistent_id` and `PersistentIdConflictError` — nothing reads the column but the upsert, and
its UNIQUE constraint 409s a shared browser with two Yandex accounts.

**0-XP final check (decided):** a `player_xp_grants` row with `xp_awarded = 0`.
- The PK is "checked"; the popup shows only when `xp_awarded > 0`.
- `xp = Σ credits + Σ grants` still holds.
- A separate marker table was rejected: two places to keep in sync.

**Why not rewrite 001–004 in place:** the runner skips by filename, so a box that applied them silently
keeps the old schema.

⚠️ **Integration-test consequence (slice 1 scope):** the 7 suites apply migration files one by one in
every `beforeAll`. A guarded, dropping `006` cannot be re-applied that way: the second suite would hit
the guard or re-create old tables beside new ones. **Slice 1 moves them to one shared setup:** reset the
schema once, then run the real runner (`migrate.ts`'s apply loop, extracted into a callable function).
Local test/dev DBs that applied the untracked `005` or hold leftover rows need a one-time reset — document
it in the CLAUDE.md integration-test subsection.

**After `0217` goes live this path is gone.** The guard refuses, and the change becomes a data migration.

---

## 4. Login endpoint contract

`POST /v1/login` — public; CORS `POST` with `Content-Type, Authorization`; `OPTIONS` 204 with `Max-Age`.
**No per-IP limiter** (owner). The client calls it **once per load**, after platform init, for
Yandex-authorized players only, **not** behind `CITIZENSHIP_CARD_ENABLED`. Fail-soft.

```ts
// src/core/profile/LoginContract.ts — stub
export const PlatformSchema = z.enum(["yandex_games"]);
export const LoginRequestSchema = z.object({
  platform: PlatformSchema,
  platformUserId: z.string().min(1).max(128),   // becomes a union with a signed payload when 0267 lands
});
export const LoginResponseSchema = z.object({
  created: z.boolean(),
  profile: PublicPlayerProfileSchema,            // no yandex_player_id, no persistent_id, no player id
  grantChecks: z.object({ tenure: z.enum(["done", "pending"]) }),
  session: z.object({ token: z.string(), expiresAt: z.iso.datetime() }),
});
// 400 bad_request · 503 session_unavailable (secret unset) · 503 creation_paused (slice 5 switch,
// unknown identity only) · 500 internal_error
```

**Find-or-create** — one repository function, used by `/v1/login` and `/internal/v1/players/resolve`:
```ts
resolveOrCreatePlayer(platform: Platform, platformUserId: string, source: "login" | "game_server")
  : Promise<{ playerId: string; created: boolean; profile: PlayerProfile }>;
findPlayerByIdentity(platform: Platform, platformUserId: string): Promise<string | null>;
```
1. Select the identity. **Hit** → update `last_login_at` only if it is older than 1 h → return.
2. **Miss** → `BEGIN`; `INSERT INTO players DEFAULT VALUES RETURNING id`;
   `INSERT INTO player_identities … ON CONFLICT (platform, platform_user_id) DO NOTHING RETURNING player_id`.
   - Row returned → `COMMIT`.
   - No row (a parallel tab or device won) → **`ROLLBACK`** (no orphan player) → go to step 1.
   - `23505` on `players_pkey` → `ROLLBACK`, retry.
   - Max 3 attempts. ⛔ Not a single CTE — that would commit an orphan player.

**`grantChecks.tenure`** = `done` iff a `player_xp_grants (player_id, 'tenure')` row exists (any amount).

**Replaced:** `/internal/v1/profile/upsert` → `/internal/v1/players/resolve` (slice 3).

**Payments intent:** uses `resolveCaller` (token ⇒ the player exists); `ENSURE_PROFILE_SQL` is removed.
While the legacy fallback lives, a legacy intent for an unknown id gets `404 not_found`. That is
acceptable: payments are reachable only from the card, which is off.

**Operator routes** (`/internal/v1/messages/send`, `/internal/v1/name-change/decide`) and the Telegram
ready-to-paste command (`NameChangeRepository.ts` — `internal/v1/name-change/decide" -H`) take `playerId`,
so Yandex ids stop going to Telegram.

---

## 5. Account linking — recorded in ADR-113, not built, no task

- Schema allows it now: logins in their own table, many per player; no platform id anywhere else; no
  `unique (player_id, platform)`.
- Not added: tombstone, merge audit table, merge rules.
- Revisit when a second login method is scheduled.
- ⛔ No guest device-cookie `web` identity before linking is designed.

---

## 6. Monitoring without rate limits — its own slice, before go-live

**Baseline** (`2026-09-14-0253-tenure-xp-grant-findings.md`, O2/O3):
- ~1.26–1.55K logged-in players/day; loads per player unknown (assume 1.5–3) ⇒ ~2–5K logins/day.
- Creations: launch day ≤ ~1.6K, then ~400–650/day. ⚠️ Assumes new players log in at the average rate —
  unverified.

**Junk risk:**
- ~3–4 GB/day at a scripted 100 req/s.
- Box has **48 G free ⇒ ~12–16 days of runway**. Detection must take minutes, not days.

**Metrics** (`geoconflict.profile.*`; OTEL exporter added to the profile server, reading `OTEL_*` env
directly — `Logger.ts` note):

| Metric | Type | Attributes |
|---|---|---|
| `…login.requests` | counter | `platform`, `outcome` = existing \| created \| bad_request \| creation_paused \| error |
| `…players.created` | counter | `platform`, `source` = login \| game_server |
| `…http.duration` | histogram | `route`, `status_class` |
| `…session.rejected` | counter | `reason` = expired \| invalid \| legacy_fallback_used |
| `…tenure.claims` | counter | `outcome` (hook for `0253`) |
| `…db.pool.waiting` | gauge | — |
| `…players.total` | gauge, 5 min | — (`reltuples` estimate) |
| process CPU / memory | gauge | — |

⛔ Never `platformUserId`, `playerId` or a token in a metric attribute or log line.

**Email alerts (Uptrace; initial thresholds — re-baseline after 14 days, and Uptrace keeps ~14 days, `0263`):**

| # | Condition |
|---|---|
| A1 | `players.created` > 300 / 10 min, two windows in a row |
| A2 | created ÷ logins > 60 % over 1 h — **armed from day 8** after go-live |
| A3 | login 5xx > 5 % over 10 min (≥ 20 requests) |
| A4 | login p95 > 750 ms for 10 min |
| A5 | `db.pool.waiting` > 0 for 5 min |
| A6 | login requests > 20/s for 5 min |

**Switch that stops new-profile creation:** `PROFILE_LOGIN_CREATE_ENABLED` (default on). When off:
- existing players log in normally;
- unknown identities get `503 creation_paused`;
- game-server resolve still creates (needs a real match join).

Flip = env edit + container restart.

**Cleanup query** (runbook, not scheduled). Junk = players:
- whose only identity was created inside the incident window;
- with no credits, grants, intents, messages, name history or display name;
- who are not citizens.

Delete from `players` (cascades to identities). A real player caught by mistake loses nothing and is
recreated on the next load.

**Daily backstop** in `profile-checks.sh` (already alert-delivered, `0219`): fail if disk > 80 % or
`players` grew by > 20K in 24 h.

---

## 7. Impact

- **`0253` (tenure claim):**
  - Depends on slices 1, 2 and 4. The claim waits for the login reply and reads `grantChecks.tenure`.
  - The grant table now comes from `006`: the untracked `005` is deleted, and the uncommitted repository
    code is re-keyed in slice 1.
  - The route takes its caller from `resolveCaller` (token) and loses `tenureGrantLimiter`.
  - Every checked claim writes a row (`xp_awarded` 0…50).
  - ⚠️ **`0253`'s uncommitted code lives in the same files slice 1 rewrites.** The driver must serialize
    them: slice 1 absorbs the schema and repository re-keying of `0253`'s code; `0253`'s rework does
    route + client logic after slice 4.
- **ADR-112:** amended 2026-09-15:
  - login-then-claim, one after the other;
  - no client dates or snapshot; no 90-day window; no device rule; no ≥ 1-match rule;
  - no per-IP limit — monitoring instead;
  - popup shows XP only;
  - check final even under 3 days (0-XP row);
  - claim logic removed ~60 days after release (`0268`).
- **ADR-103:** decision stands. It gains the profile-server seam (`resolveCaller` / login). Its rejected
  "second account system" is now partly adopted, deliberately (ADR-113).
- **`0250`:** `vfy:false` tokens never unlock paid state.
- **`0267`:** verification goes into login.
- **`0217`:**
  - **All 5 slices land and deploy before `PROFILE_INTERNAL_TOKEN` is set.**
  - Brief edits: step 0 should expect `006` in `schema_migrations`; verification step 3 = a `players`
    row + a `player_identities` row + a `(game_id, player_id)` credit.
  - The owner accepted that go-live may slip past this weekend (`0253` brief, redesign item 6).

---

## 8. Open questions (later owner rulings — not blocking)

1. **What does "web" mean** as a platform — a guest device cookie, or a real account login? (ADR-113:
   no device-cookie identity before linking is designed.)
2. **Remove 004's `moderation_status` default `'approved'`** (a documented trap) during the `006` rebuild?
   Default if not ruled: **preserve it** (no silent scope).
3. Game loads per logged-in player per day (GameAnalytics) — to re-baseline A1/A6.
4. Yandex `getUniqueID()` charset/max length — sample real ids before tightening validation beyond 1–128.
5. Does the profile box reach the telemetry VPS's OTLP endpoint (network path, TLS)? Slice 5 must prove it.

---

## 9. Slices (for the producer to file)

**Order:**
```
S1 ──► S2 ──► S4 ──► (0253 rework)
  └──► S3 (parallel with S2)
S2 ──► S5 (parallel with S3/S4)
All of S1–S5 deployed and verified ──► 0217 (sets PROFILE_INTERNAL_TOKEN)
```
**Deploys:**
- S1, S2 and S5 are profile-box deploys.
- S3 and S4 ship with the game deploy (the game box holds the client bundle and the game server).
- Each slice is deployable on its own because of the legacy fallback and the no-op game-server client.

| Slice | Scope | Main files | Depends on | Verifies (acceptance) | Effort |
|---|---|---|---|---|---|
| **S1 — Database + re-keying** | `006_player_identity.sql` (guard, `players`, `player_identities`, all child tables re-keyed, `player_xp_grants` with `>= 0`); delete untracked `005`; `resolveOrCreatePlayer` / `findPlayerByIdentity`; all repositories on `playerId`; drop `persistent_id` + conflict path; `PlayerProfile` contracts drop `yandex_player_id`/`persistent_id`; **routes keep their current request shapes** and map Yandex id → player through a first `resolveCaller` (find-only; create only on the internal upsert route, which temporarily calls `resolveOrCreatePlayer`); operator routes + Telegram command take `playerId`; integration tests move to one runner-based setup; `ENSURE_PROFILE_SQL` removed | `migrations/006_player_identity.sql`, `migrations/005_player_xp_grants.sql` (delete), `src/profile-server/{PlayerProfileRepository,InboxRepository,NameChangeRepository,PaymentsRepository,Routes,migrate}.ts`, new `PlayerIdentityRepository.ts`, `src/core/profile/{PlayerProfile,InboxContract,NameChangeContract}.ts`, `tests/profile-server/*`, `tests/integration/*` + shared setup, CLAUDE.md integration subsection | — | `006` applies on a fresh DB and on a 001–004 DB with 0 rows; **refuses, and changes nothing, with 1 row**; parallel `resolveOrCreatePlayer` → exactly 1 player, 0 orphans; forced PK collision retries; every repository behaviour kept (citizenship flip, idempotent credit, one-pending name change, inbox citizen gate, payments grant); a 0-XP grant row accepted; `npm test` + `npm run test:integration` green; on the box after deploy: `schema_migrations` has `006`, tables empty, `/ready` 200 | **2.5–3.5 d** |
| **S2 — Login endpoint + token** | `LoginContract`; `POST /v1/login` (validation, find-or-create, `created`, `grantChecks.tenure`, profile, token); `SessionToken` module (sign/verify, 24 h, `vfy:false`); `resolveCaller` = token first, legacy id fallback (find-only), `401` codes; CORS adds `Authorization` + `Max-Age` on all public routes; `PROFILE_SESSION_SECRET` in `setup-profile.sh` / env file / config parity / harness, fail closed; no limiter on login | `src/core/profile/LoginContract.ts`, `src/profile-server/{Routes,SessionToken,Server}.ts`, `setup-profile.sh`, `build-deploy-profile.sh` (if it forwards env), `scripts/config-parity-allowlist.json`, `tests/scripts/profile-deploy-hardening.test.sh`, `tests/profile-server/*` | S1 | two parallel logins → one player; token tamper / expired / wrong key / wrong version → `401`; legacy fallback still serves; secret unset → `503` + boot warning without the value; no token, Yandex id or player id in any log line; CORS preflight answers; `npm test` (incl. shell harness) green; on the box: login returns a token, a Bearer `GET /v1/profile` works | **2–2.5 d** |
| **S3 — Game server** | `CreditContract` → `playerId`; `/internal/v1/players/resolve` replaces `/profile/upsert`; `/internal/v1/credit` by `playerId`; `ProfileApiClient.resolvePlayer` + credit; `Client.profilePlayerId`; `GameServer` join / `update_identity` / reconnect paths call resolve; `selectMatchCredits` dedupes by `playerId`; backfill = resolve then credit | `src/core/profile/{CreditContract,MatchQualification}.ts`, `src/server/{ProfileApiClient,GameServer,Client}.ts`, `src/profile-server/Routes.ts` (internal routes), `tests/server/*`, `tests/core/profile/*` | S1 (not S2) | join → one resolve → `profilePlayerId` set; late identity + reconnect resolve; match end credits by `playerId`, deduped; `null` `playerId` → resolve-then-credit; still fail-soft and non-blocking; `getCreditableYandexId` is the only reader of `yandexPlayerId` (ADR-103); local dev end to end: join → `players` + identity rows → match → `(game_id, player_id)` credit | **1.5–2 d** |
| **S4 — Client** | `ProfileSession` module (login once per load after platform init for authorized Yandex players, not behind the switch; timeout; fail-soft; token in memory; `grantChecks`; one re-login + retry on `401`); 6 callers → Bearer, `yandexPlayerId` removed from bodies/queries (`PlayerProfileView`, `Inbox`, `NameChangeRequest`, `PaymentsApiClient` intent, `TenureGrantClaim` if present); login analytics events (`flashistConstants.analyticEvents` + `analytics-event-reference.md`); **last step after the game deploy is verified: remove the legacy fallback from `resolveCaller`** (a profile-box deploy) | new `src/client/ProfileSession.ts`, `src/client/{Bootstrap or Main,PlayerProfileView,Inbox,NameChangeRequest,PaymentsApiClient,CitizenshipPurchase}.ts`, `src/client/flashist/FlashistFacade.ts`, `analytics-event-reference.md`, `src/profile-server/Routes.ts` (fallback removal), `tests/client/*` | S2 | guest → no login call; authorized → exactly one login per load; login failure breaks nothing (card, inbox, game start); every profile call carries Bearer and no Yandex id; `401` → one re-login, one retry, no loop; after fallback removal a legacy-shaped request gets `401`; `npm test` green | **1.5–2 d** |
| **S5 — Monitoring + creation switch** | OTEL metrics exporter in the profile server (§6 list); deploy wiring (OTLP endpoint + Uptrace DSN as a secret, config parity, harness); `PROFILE_LOGIN_CREATE_ENABLED`; cleanup query as a runbook section; `profile-checks.sh` disk/growth checks + `tests/profile-checks.sh` cases; **owner steps:** Uptrace dashboard + A1–A6 **email** alert rules, and a drill — force one alert and watch the email arrive (`0219` precedent) | new `src/profile-server/Telemetry.ts`, `src/profile-server/{Server,Routes,Db}.ts`, `setup-profile.sh`, `profile-checks.sh`, `tests/profile-checks.sh`, `tests/scripts/profile-deploy-hardening.test.sh`, `scripts/config-parity-allowlist.json`, runbook doc under `ai-agents/knowledge-base/` | S2 (metrics hook into login) | metrics visible in Uptrace from the box (proves the network path); switch off → existing player logs in, unknown gets `503 creation_paused`, game-server resolve still creates; cleanup query deletes only rows matching the junk definition (integration test); `checks.sh` fails the ping on forced disk/growth breaches; **an alert email actually arrives** (drill); no ids or tokens in attributes | **2–2.5 d** + owner UI time |

**Total ≈ 9.5–12.5 dev days, plus ~0.5–1 day of review per slice.** S2 and S3 can run in parallel after
S1, and S5 in parallel with S3/S4, so wall-clock time is shorter with two coders — but S1 is strictly first
and cannot be split.
