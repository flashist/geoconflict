# ADR-113 — Profiles get our own random internal player id; platform logins map to it; login issues a stateless signed token from v1; account linking is deferred

**Date**: 2026-09-15
**Status**: accepted

> Project ADR-113 — see [[decisions/adr-numbering-two-series]].
>
> 📝 **2026-10-07 (later) sync — point 6 CLARIFIED by [[decisions/adr-124-join-token]]** (accepted 2026-10-07; owner
> *"Accept with answers (Recommended)"*). `fkit-architect` appended a 📝 pointer at point 6, a *"Note, 2026-10-07 —
> ADR-124"* section and a Related line; **no decision changes, Status stays `accepted`.** From `0332`'s build:
> - the client also sends its profile session token — optional `profileSession` on the WebSocket `join`, or on the
>   existing `update_identity` if login finishes later; no new message type;
> - the game server passes it as an optional `sessionToken` on the resolve; the **profile server** checks it
>   (signature, expiry, `vfy === true`, platform `yandex_games`, token `pid` = the player the Yandex id resolves to via
>   `player_identities`) and replies an optional `verified`;
> - the game server holds the token **in memory only**, until the first answered vouch, never logged, stored or relayed;
> - **"the game server does not hold the session secret" still holds** — the owner chose this over the game server
>   checking tokens itself (ADR-124 Q6, *"Reuse login pass (Recommended)"*);
> - **new accepted residual:** a broken-into game box could reuse tokens in its memory at the profile server for up to
>   24 h — bounded, since that box already holds `PROFILE_INTERNAL_TOKEN`;
> - `verified` changes nothing the game server grants today (every use kept open, ADR-124 Decision 5).
> 🔧 The note says *"Not built yet"*; the build closed later that day ([[tasks/join-token-identity-vouch]]), committed
> `077c9e3`, **not deployed**. 📌 *2026-10-08 lint: deployed since — profile side in `0.0.156-profile.4`, game side in game `0.0.157`, both 2026-10-08 (`0396` worklog); live read still owed — `0405`.* Also: the point-5 reader list now marks `0323` *(cancelled 2026-10-07)*.
>
> 🆕 **2026-10-07 — ADR-116's NOTE IS APPLIED: the verification trigger fired.** `0340` (S3a) was deployed 2026-10-07
> (07:10:45Z, profile `0.0.156-profile.3`, commit `71efd10`) and the owner's live check returned **`vfy: true`**
> ([[tasks/verified-login-enforce-live]], task `0395`). `fkit-architect` appended to the canonical ADR a section
> *"Note, 2026-10-07 — the verification trigger fired"* plus three 📝 pointers and one Related line, under the
> README's carve-out for recording a pre-committed trigger. **No decision changes; Status stays `accepted`.** What now
> reads differently:
> - **Point 5:** a verified login issues `vfy:true`; `resolveCaller` carries `verified` (`src/profile-server/Routes.ts`
>   — `verified: claims.vfy === true`). The 🔓 *"the token adds NO security"* bullet now holds for **`vfy:false`
>   sessions only**. ⚠️ At the deployed commit **no route reads `verified` yet** — the readers are `0250` S3b, `0319`,
>   `0332`, `0323`.
> - **Point 9:** verification now happens at the **profile-server** login (ADR-116); the **game server** is still
>   client-asserted — [[decisions/adr-103-identity-trust-seam]] still governs it, exit `0332`.
> - **Re-raise list:** *"Identity verification lands (`0267`)"* — this is that trigger firing, via `0325`'s S3a slice
>   (carried by `0340`), not via `0267`.
> - **Key rotation:** rotating the session secret now **also drops every verified session**; the client's relogin makes
>   a fresh signed call, so it re-verifies (and falls back to unverified if that call fails, ADR-116 Decision 4). If the
>   secret **must** be rotated, do the key id / dual key first (ADR-116's re-raise).
> - ⚠️ The owner's approval (*"Yes to both"*) was given **after** the deploy. The two 📌 *pending* notes below are history.
>
> 📌 **2026-10-06 sync — ADR-116's note to this ADR is STILL PENDING.** `0340` (S3a) is built (commit `71efd10`) and
> closed as built + reviewed, but **not deployed**; applying the note after S3a is live moved to its verify task `0395`.
> See [[tasks/verified-login-enforce]].
>
> 📌 **2026-09-26 — fully implemented and in production.** All five slices and the epic (`0266`) are
> closed `(agent-closed — not owner-verified)`; the game deploy of 2026-09-26 (release `0.0.152`) put the
> client login and the game-server resolve/credit path live — **41 players / 41 identities** and the first
> real `(game_id, player_id)` credits at the window. See [[tasks/profile-identity-epic]].
> Source: `ai-agents/knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md`
>
> 📌 **2026-09-30 — a pending amendment, NOT yet applied.** [[decisions/adr-116-verified-login]] (accepted 2026-09-29)
> lists a dated note for this ADR — point 5 (*a token counts as "proven owner" only once a verified login issues
> `vfy:true`*), point 9, the re-raise list, and the key-rotation note — to be written **only once S3a (task `0340`)
> mints `vfy:true` in production**. Until then this ADR's text stands unchanged. The session claim `vfy` is already
> widened to a boolean by `0325` S2 (deployed 2026-09-29), but the server still mints only `false`. See
> [[tasks/verified-login-shadow-mode]].
> Design: `ai-agents/knowledge-base/reports/2026-09-15-profile-identity-design.md` (task `0266`)
>
> **Provenance:** owner-signed 2026-09-15 via `AskUserQuestion`. **The architect did not hear the rulings
> first-hand — all arrived by relay.** Owner rulings: design accepted with **"Token now, not later"** ·
> build **"Split into 4"** · monitoring **"Yes, before go-live"** · alerts by **email** · account linking
> recorded but **not built and with no task** · a 0-XP tenure check is **final**. Delegated to the
> architect: the id type, what the client sends after login, the platform value spelling, how a final
> 0-XP check is stored, and where the monitoring work sits.

## Context

Every profile table was keyed by the **raw, client-asserted Yandex id**, and every client and
game-server call sent it. The owner wanted our own internal id, logins as `platform + platformUserId`
mapped to it, all internal logic keyed only by the internal id, a login endpoint on every load, and more
login methods later.

**Verified read-only on the profile box, 2026-09-15:** applied migrations were **001–004 only** (`005`
never deployed), **every table had 0 rows**, and the disk held 48 G free. ⇒ **the reshape was almost free
then, and becomes a real data migration later.**

## Decision

1. **Internal id = random UUID v4, the `players` primary key.** Two profiles cannot share one — the PK's
   unique index rejects a duplicate at insert under any concurrency, whatever the application does; a
   collision rolls back and retries with a fresh id, bounded. **Chosen over a sequential integer so a
   leaked id, or a future route that wrongly accepts one, cannot expose every player by counting.**
2. **Logins live in `player_identities`**, PK `(platform, platform_user_id)`, many per player. No platform
   id on `players` or any child table. **Platform value `yandex_games`** — permanent once rows exist.
3. 🔑 **The internal id is never sent to or accepted from a client.** Hard rule: **no public route accepts
   a player id.** It lives only on servers.
4. **`POST /v1/login`** — idempotent, race-safe find-or-create; the loser of a parallel insert rolls back,
   so **no orphan rows**. Called once per load for Yandex-logged-in players, **not** behind the citizenship
   switch. Returns the public profile (no ids), `grantChecks.tenure`, and a session token.
5. **Session token ships in v1** (owner: *"Token now, not later"*, overruling the architect's
   recommendation to defer it on timing). Stateless HMAC-SHA256 `v1.<payload>.<mac>`, payload
   `{pid, plt, iat, exp, vfy:false}`, TTL ~24 h, `Authorization: Bearer`, secret `PROFILE_SESSION_SECRET`
   on the profile box only, a fresh token every load, **nothing stored** — a restore or secret rotation
   just makes clients log in again. Every public route takes its caller from **one** function
   (`resolveCaller`), token first.
   - 🔓 **Stated honestly: while identity is client-asserted the token adds NO security.** Login hands a
     token to anyone who asserts an id. What it buys: Yandex ids out of URLs and logs, one place to verify
     later, and the session a second login method will need anyway.
   - ⛔ **A token counts as "proven owner" only once a verified login issues `vfy:true`.**
6. **Game server** keeps the WS-join platform id through ADR-103's seam, calls
   `/internal/v1/players/resolve` (**replacing** `/internal/v1/profile/upsert`), and credits by
   `playerId` with ledger key `(game_id, player_id)`. **It does not hold the session secret.**
7. **Schema ships as a guarded migration `006`** — it raises and changes nothing if any affected table
   holds a row. `001`–`004` stay **byte-identical**; the never-deployed, untracked `005` is **deleted** and
   `player_xp_grants` is created by `006`.
8. **A final 0-XP tenure check is a `player_xp_grants` row with `xp_awarded = 0`** (ADR-112 amendment) —
   the table's check becomes `xp_awarded >= 0` and the PK `(player_id, kind)` **is** "the check is done".
   **No second marker table.**
9. **Identity is still client-asserted.** ADR-103's decision stands; login is where verification goes
   (research: `0267`).
10. **No per-IP rate limit** on login or claim routes (owner). **Monitoring instead**, landing before XP
    go-live: Uptrace metrics, **email** alerts, `PROFILE_LOGIN_CREATE_ENABLED` (a switch that stops
    new-profile creation on the public login), a documented cleanup query, and a daily disk/growth
    backstop in `profile-checks.sh`.
11. **Build in 5 slices** — the owner's 4 (database + re-keying → login + token → game server → client)
    plus **monitoring as a 5th**. **All five land before `0217` sets `PROFILE_INTERNAL_TOKEN`.**

### Account linking — recorded, deliberately NOT built, NO task

**Revisit when a second login method is actually scheduled** — that event re-raises it. The schema already
allows it. Deliberately **not** added: a `merged_into` tombstone, a merge audit table, or
`unique (player_id, platform)` (it would block merging two Yandex-only players). The future decision must
answer which XP, citizenship and paid state survive a merge, child-table PK clashes, and live tokens
pointing at a merged-away id.

⛔ **Do not add a device-cookie `web` identity for guests before linking is designed** — every guest who
later logs in would become **two players**. (What "web" means is an **open owner question**.)

## Consequences

**Positive:** one internal key everywhere · Yandex ids leave request URLs, logs and Telegram operator
commands · verification later is a change at login · multi-login needs no reshape.

**Negative / accepted:**

- **~9.5–12.5 dev days across five slices**, plus review; **XP go-live (`0217`) waits for all five** —
  the owner accepted that go-live may slip.
- A new deploy secret, and CORS preflights on the two GET routes.
- 🚨 **Junk profiles can be created by a script**, bounded only by detection and the switch — **~3–4 GB/day
  at 100 req/s against 48 G free ≈ 2 weeks of runway**, so **alerts must fire within minutes.** *(This is
  the number alert rule A1 is sized against — see [[systems/alert-delivery]].)*
- `001`–`004` remain as dead history.
- **Integration tests must apply migrations through the runner on a fresh schema** — the guarded `006`
  cannot be re-applied file by file.
- **ADR-103: decision stands.** It gains a profile-server seam (`resolveCaller` / login), and its rejected
  option *"a second account system"* is now **partly adopted, deliberately**.
- **ADR-112: amended the same day** (redesign; once per *player*; 0-XP final rows).
- **ADR-101: unchanged.**

### Options rejected

- **Sequential `bigint` id** — guessable, and leaks the profile count. *(Performance does not decide it at
  this scale.)*
- **Client sends the internal id after login** — it would make the internal id a client-held credential.
- **Token in a later phase** — the architect's first recommendation, on timing. **Overruled by the owner.**
- **Stored (DB) sessions** — a DB read per request on a 10-connection pool, a table that grows per load, a
  cleanup job.
- **Rewrite `001`–`004` in place** — the runner skips by filename, so a box that applied them would keep
  the old schema **silently**.
- **Keep platform ids on the credit wire** — breaks *"internal logic uses only the internal id"*.
- **A separate "checked" marker table** — a second place to keep in sync.
- **`yandexGames` camelCase** — DB identifiers here are snake case.
- **Per-IP or automatic global limits** — rejected by the owner in favour of monitoring plus a human
  switch. ⚠️ **CGNAT on Russian mobile carriers makes per-IP limits hit real players.**

## Re-raise only if

- Identity verification lands (`0267`) — then verify at login and issue `vfy:true`.
- A second login method is scheduled — then design account linking.
- Observed junk-profile creation or login overload that the switch cannot contain.
- **`0217` goes live before slice 1 lands** — then `006` becomes a data migration; **re-plan, don't bypass
  the guard.**
- A public route that accepts a player id is proposed — **that is a defect against this ADR.**

⛔ Absent those, *"the id could be sequential"*, *"the token adds no security"*, *"why no rate limit on
login"* and *"why not link accounts now"* are **closeout of this ADR, not new findings**.

## Related

- [[tasks/profile-identity-s1-database-rekeying]] — task `0270` (S1), which built and deployed `006`
- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271` (S2), the login endpoint and token
- [[decisions/adr-112-free-xp-grants]] — amended the same day by this decision
- [[decisions/adr-103-identity-trust-seam]] — stands; gains a profile-server seam
- [[decisions/adr-101-fail-soft-xp-crediting]] — unchanged
- [[decisions/adr-111-xp-economy-rescale]] — the 1 XP / 100 XP economy the grants sit inside
- [[systems/player-profile-store]] — the backend this reshapes
- [[systems/alert-delivery]] — the monitoring (slice 5) this ADR makes a precondition of go-live
- [[tasks/profile-backup-restore-reproof-006]] — task `0275`, which re-proved restore on this schema
- [[decisions/adr-numbering-two-series]]
- [[decisions/adr-114-admin-server-alert-relay]] — explicitly leaves this ADR unchanged; its relay adds no route that accepts a player id
- [[decisions/sprint-4]] — the sprint this decision was ruled inside
- [[systems/architecture-overview]] — the profile tier this reshapes
- [[systems/analytics]] — the `Profile:Login:*` event families that measure this login flow
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — task `0274` (S5), the monitoring slice this ADR's go-live depends on; closed 2026-09-19 with four of six alert rules deferred
- [[systems/weekend-deploy-window]] — the window whose **W12** first runs this identity path in production (`0272` server, `0273` client), and whose **W14** first row is its only end-to-end proof
- [[tasks/tenure-xp-grant]] — task `0253`, the tenure grant keyed on the internal `player_id`
- [[tasks/profile-identity-epic]] — epic `0266`, which delivered this decision; closed 2026-09-26
- [[tasks/profile-identity-s3-game-server-resolve-and-credit]] — S3, task `0272`: resolve at join, credit by `playerId`
- [[tasks/profile-identity-s4-client-login-session]] — S4, task `0273`: the client login session and Bearer calls
- [[decisions/adr-115-approved-name-in-matches]] — ADR-115 (2026-09-28): a citizen's approved name is shown in matches at ADR-103 trust level; forged-id and look-alike cases are owner-accepted risks
- [[decisions/adr-116-verified-login]] — the verified login that will update point 5, point 9 and the re-raise list once `0340` ships
- [[tasks/verified-login-shadow-mode]] — task `0325`, S2 shadow mode: `vfy` widened, still minted `false`
- [[tasks/verified-login-enforce]] — task `0340`, S3a; ~~the dated note here waits for its deploy (`0395`)~~ deployed 2026-10-07, note applied
- [[tasks/verified-login-enforce-live]] — task `0395`, the deploy and `vfy: true` live check that fired this ADR's trigger (2026-10-07)
- [[tasks/authenticated-profile-read]] — task `0250`: S3b branches the profile read on the session's `verified` claim
- [[decisions/adr-124-join-token]] — 2026-10-07: point 6 clarified — the game server relays the session token on resolve, holds it in memory only, never the secret
- [[tasks/join-token-identity-vouch]] — task `0332`, the build of that relay (committed, not deployed) 📌 *2026-10-08 lint: deployed since — profile side in `0.0.156-profile.4`, game side in game `0.0.157`, both 2026-10-08 (`0396` worklog); live read still owed — `0405`.*
