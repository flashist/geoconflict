# ADR-113: Profiles get our own random player id; platform logins map to it; login issues a stateless signed token from v1; account linking is deferred

- **Status:** ✅ **accepted** — owner-signed **2026-09-15**.
- **Date:** 2026-09-15
- **Deciders:** Owner (Mark Dolbyrev).
  - **Owner rulings (AskUserQuestion, 2026-09-15, relayed by `fkit-lead`):**
    - design accepted with **"Token now, not later"**;
    - build **"Split into 4"**;
    - monitoring **"Yes, before go-live"**;
    - alerts by **"Email"**;
    - account linking recorded here, **not built and with no task**;
    - a 0-XP tenure check is **final**.
  - **Delegated by the owner to the architect:**
    - the id type ("random is fine if better; two profiles must never share an id");
    - what the client sends after login;
    - platform value spelling;
    - how a final 0-XP check is stored;
    - where the monitoring work sits.
- **Provenance:** the architect did not hear the rulings first-hand; all arrived by relay. Design,
  evidence, slices and effort: [`../reports/2026-09-15-profile-identity-design.md`](../reports/2026-09-15-profile-identity-design.md).
  Task `0266`.
- **Citation frame:** content anchors; working tree on `dev` at `8be434c`, 2026-09-15. Profile-server files
  are dirty/untracked (task `0253`).

## Context

Every profile table is keyed by the raw, client-asserted Yandex id (`migrations/001_player_profiles.sql`
— `yandex_player_id         text primary key,`), and every client and game-server call sends it. The owner
wants:
- our own internal id;
- logins as `platform + platformUserId` linked to it;
- all internal logic keyed only by the internal id;
- a login endpoint on every load;
- more login methods later.

**Verified read-only on the profile box by `fkit-lead`, 2026-09-15:**
- applied migrations are **001–004 only** (`005` never deployed);
- **every table has 0 rows**;
- disk is 58 G with 48 G free;
- `YANDEX_PAYMENTS_SECRET` is set.

Nothing writes rows until `0217` wires the game server. So the reshape is almost free now, and a real data
migration later.

## Decision

1. **Internal id = random UUID v4 (`gen_random_uuid()`), the `players` primary key.**
   - **Two profiles cannot share an id.** The PK's unique index rejects a duplicate at insert, under any
     concurrency, whatever the application does.
   - A collision (`23505` on the PK) rolls the transaction back and retries with a fresh id (bounded).
   - Chosen over a sequential integer so a leaked id, or a future route that wrongly accepts one, cannot
     expose every player by counting.
2. **Logins live in `player_identities`**, PK `(platform, platform_user_id)`, many per player.
   - No platform id on `players` or any child table.
   - **Platform value: `yandex_games`** — lower snake case, like every DB identifier here. It is permanent
     once rows exist. A new platform needs a new migration (CHECK list).
3. **The internal id is never sent to or accepted from a client.** Hard rule: **no public route accepts a
   player id.** It lives only on servers: game-server memory, internal routes, operator tooling.
4. **`POST /v1/login`** — idempotent, race-safe find-or-create. The loser of a parallel insert rolls back,
   so no orphan rows.
   - Called once per load for Yandex-logged-in players, **not** behind the citizenship switch.
   - Returns the public profile (no ids), `grantChecks.tenure` (`done`/`pending`) and a **session token**.
5. **Session token ships in v1 (owner: "Token now, not later").**
   - **Format:** stateless HMAC-SHA256, `v1.<payload>.<mac>`. Payload `{pid, plt, iat, exp, vfy:false}`,
     TTL ~24 h.
   - **Transport:** `Authorization: Bearer`.
   - **Secret:** `PROFILE_SESSION_SECRET`, on the profile box only.
   - **Refresh:** a new token on every load. A `401` gets one re-login and one retry.
   - **Nothing is stored.** A restore or secret rotation just makes clients log in again.
   - Every public profile route takes its caller from **one** function (`resolveCaller`), token first.
   - For one release it also accepts the legacy body/query Yandex id (find-only), so client and box can
     deploy in either order. The legacy path is **removed at the end of the client slice**.
   - 🔓 **Stated honestly: while identity is client-asserted the token adds NO security.** Login hands a
     token to anyone who asserts an id. What it buys:
     - Yandex ids out of URLs and logs;
     - one place to verify later;
     - the session a second login method will need anyway.
   - **A token counts as "proven owner" (e.g. for paid state, `0250`) only once a verified login issues
     `vfy:true`.**
6. **Game server:** the WS join still carries the platform id through ADR-103's seam
   (`getCreditableYandexId`).
   - It calls `/internal/v1/players/resolve` (which **replaces** `/internal/v1/profile/upsert`) and stores
     the returned player id.
   - It credits by `playerId`; the ledger key is `(game_id, player_id)`.
   - The internal id never reaches a client. The game server does not hold the session secret.
7. **Schema ships as a new migration `006`, guarded** — it raises and changes nothing if any affected
   table has rows. `001`–`004` stay byte-identical. The never-deployed, untracked
   `005_player_xp_grants.sql` is **deleted**, and `player_xp_grants` is created by `006`, keyed by
   `player_id`.
8. **Final 0-XP check** (ADR-112 amendment, 2026-09-15) is a `player_xp_grants` row with
   `xp_awarded = 0`. The table's check is `xp_awarded >= 0`, and the PK `(player_id, kind)` means "checked".
   No second marker table.
9. **Identity is still client-asserted.** ADR-103's decision stands; login is where verification goes
   (research: `0267`).
10. **No per-IP rate limit** on login or claim routes (owner). **Before XP go-live** (`0217`) these must
    land as their own slice:
    - Uptrace metrics;
    - **email** alerts on creation rate, created-share, errors, latency, pool wait and request rate;
    - `PROFILE_LOGIN_CREATE_ENABLED` — a switch that stops new-profile creation on the public login;
    - a documented cleanup query;
    - a daily disk/growth backstop in `profile-checks.sh`.
11. **Build in 5 slices:** the owner's 4 (database + re-keying → login endpoint + token → game server →
    client), plus **monitoring as a 5th**. All five land before `0217` sets `PROFILE_INTERNAL_TOKEN`.

### Account linking — recorded, deliberately NOT built, NO task (owner, 2026-09-15)

- **Not built now and no backlog task.** **Revisit when a second login method is actually scheduled** —
  that event re-raises this section.
- The schema already allows it (point 2).
- Deliberately **not** added:
  - a `merged_into` tombstone;
  - a merge audit table;
  - `unique (player_id, platform)` — it would block merging two Yandex-only players.
- The future decision must answer:
  - which XP, citizenship and paid state survive a merge;
  - child-table PK clashes (two `tenure` rows, pending name changes);
  - live tokens pointing at a merged-away id (tombstone, or rely on the 24 h TTL).
- ⛔ **Do not add a device-cookie `web` identity for guests before linking is designed** — every guest who
  later logs in would become two players. (What "web" means is an **open owner question**.)

## Options considered

- **Sequential `bigint` id** — smaller and typeable. Rejected: guessable, and leaks the profile count.
  Performance does not decide it at this scale.
- **Client sends the internal id after login** — rejected: makes the internal id a client-held credential.
- **Token in a later phase** — the architect's first recommendation, on timing: ~2–2.5 days on a task that
  gates `0217`. **Overruled by the owner: token in v1.**
- **Stored (DB) sessions** — rejected: a DB read per request on a 10-connection pool, a table that grows per
  load, a cleanup job.
- **Rewrite `001`–`004` in place** — rejected: the runner skips by filename, so a box that applied them
  keeps the old schema silently.
- **Keep platform ids on the credit wire** — rejected: breaks "internal logic uses only the internal id".
- **Separate "checked" marker table for 0-XP checks** — rejected: a second place to keep in sync with the
  grant row; a 0-XP row is exactly what happened and keeps the XP invariant.
- **`yandexGames` (camelCase) platform value** — rejected: DB identifiers here are snake case.
- **Per-IP or automatic global limits** — rejected by the owner, in favour of monitoring plus a human
  switch. CGNAT on Russian mobile carriers makes per-IP limits hit real players.

## Consequences

- **Positive:**
  - one internal key everywhere;
  - Yandex ids leave request URLs, logs and Telegram operator commands;
  - verification later is a change at login;
  - multi-login needs no reshape.
- **Negative:**
  - ~9.5–12.5 dev days across five slices, plus review; XP go-live (`0217`) waits for all five (owner
    accepted that go-live may slip);
  - a new deploy secret, and CORS preflights on the two GET routes;
  - junk profiles can be created by a script, bounded only by detection and the switch — ~3–4 GB/day at
    100 req/s against 48 G free ≈ 2 weeks of runway, so alerts must fire within minutes;
  - `001`–`004` remain as dead history;
  - integration tests must apply migrations through the runner on a fresh schema (the guarded `006`
    cannot be re-applied file by file).
- **ADR-103:** decision stands. It gains a profile-server seam (`resolveCaller` / login). Its rejected
  option *"a second account system"* is now partly adopted, deliberately.
- **ADR-112:** amended 2026-09-15 (redesign; once per *player*; 0-XP final rows).
- **ADR-101:** unchanged.

### Re-raise only if

- Identity verification lands (`0267`) — then verify at login and issue `vfy:true`.
- A second login method is scheduled — then design account linking.
- Observed junk-profile creation or login overload that the switch cannot contain.
- `0217` goes live before slice 1 lands — then `006` becomes a data migration; re-plan, don't bypass the
  guard.
- A public route that accepts a player id is proposed — that is a defect against this ADR.

Absent those, *"the id could be sequential"*, *"the token adds no security"*, *"why no rate limit on
login"* and *"why not link accounts now"* are closeout of this ADR, not new findings.

## Related

- `../reports/2026-09-15-profile-identity-design.md` (slices in §9)
- [ADR-101](adr-101-fail-soft-xp-crediting-no-durable-queue.md), [ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md),
  [ADR-112](adr-112-free-xp-grants-capped-server-clamped-acked-once-per-account.md)
- Tasks `0266` (this), `0217`, `0250`, `0253`, `0267`, `0268`, `0219`, `0263`
