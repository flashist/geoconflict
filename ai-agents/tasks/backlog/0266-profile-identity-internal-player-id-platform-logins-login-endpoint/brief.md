# Epic — Profile identity: internal player id, platform logins, and a login endpoint

> 📌 **CONVERTED TO AN EPIC 2026-09-15 by a spawned `fkit-producer`, on OWNER RULINGS relayed by
> `fkit-lead` (see *Owner rulings — design, 2026-09-15* below).** Phase 1 (design) is delivered and
> owner-approved; the build is filed as **five child slices `0270`–`0274`**. This brief now tracks them
> and closes when all five close. Title prefixed `Epic —`; folder name and ID unchanged (links stable).

## ID
0266

> ℹ️ **ID allocation, checked 2026-09-15 before filing.** Highest ID on disk across `backlog/`, `done/`,
> `cancelled/` was `0264` (folder prefixes and `## ID` fields agree; duplicate-prefix check empty).
> ⛔ **`0265` was SKIPPED on purpose:** step 3 of
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md) (`grep -rn 0265 .claude/`)
> hits `.claude/skills/fkit-status/dashboard.sh` — an upstream toolkit reservation listed in that
> convention's table. `0266`: no folder, no `## ID` hit, no `.claude/` hit, no repo-wide hit
> (`.svg`/`.json` filtered).

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0217`**, because it blocks [`0253`](../0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md)
(which sits directly below `0217`) and must be done before XP go-live (`0217`). The row was
**appended at the bottom** of the Sprint 4 board (ADR-035 — a new row never inserts mid-board).

## Status
🔲 Backlog

## Owner
fkit-producer (epic) — child slices carry their own owners.

*(Superseded owner, kept: ~~fkit-architect~~ — phase 1 is delivered.)* ⚠️ **~~`fkit-architect` for phase 1~~ (the design), which the lead reports is already under way as of
2026-09-15** — the status stays `🔲 Backlog` because a new brief is always created so. Phase 2 (the
build) is `fkit-coder`'s; see *Notes* for the producer's split recommendation.

## Context

**Filed 2026-09-15 by a spawned `fkit-producer` on OWNER RULINGS given live in a design discussion in
the lead session and relayed by `fkit-lead`.** The owner's scheduling: **Sprint 4, done before XP
go-live.**

### Owner's design direction (intent as relayed — the owner's, not the producer's)

- Profiles get **our own internal id**.
- Each login is stored as **platform** (e.g. `yandexGames`, `web`) **+ platformId**, linked to that
  internal id.
- **All internal logic uses only the internal id.** Platform + platformId matter only for login and
  profile creation.
- Later one profile can have **several logins** (Yandex, Gmail, Apple, Web). Linking is designed for,
  **not built** here.
- A **login endpoint** — find-or-create by platform + platformId — is called **on every game load by a
  logged-in player** (not behind the citizenship card switch).
- The platform id is **trusted for now** (no signature check) — verifying it is
  [`0267`](../0267-investigate-verifying-platform-player-identity/brief.md), on the Backlog board.
- **No per-IP rate limit on the new login route** — replaced by **monitoring** (e.g. Uptrace) so
  problems are visible. ⚠️ **Accepted, monitored risk (owner, 2026-09-15):** the lead noted that a login
  route that creates profiles on demand, with no limit, can be used to create junk profile rows without
  end. The owner accepted that risk in favour of monitoring. Recorded, not re-argued.

### Why now

The profile database is expected to hold **no player rows yet** (XP crediting is not wired — `0217`
open), so re-keying costs no data migration of real players. ⚠️ **Not re-verified this turn** — the
"0 rows" figure comes from the `0211`/`0215` records; the design must confirm it on the box before a
migration assumes it.

### What is keyed by the Yandex id today — the blast radius (read 2026-09-15, working tree)

- **Tables** (`migrations/`): `player_profiles` (unique `yandex_player_id`), `player_match_xp_credits`
  (key `(game_id, yandex_player_id)`), `player_name_history` (+ `004_name_change.sql` indexes),
  `player_cosmetic_ownership`, `purchase_intents` / `processed_purchases` (`002`), `player_messages`
  (`003`), and `player_xp_grants` (`005` — ⚠️ **untracked, part of `0253`'s uncommitted build**, which
  will be reworked).
- **Wire contract:** `src/core/profile/CreditContract.ts` — a credit item carries `yandexPlayerId`.
- **Game server:** `src/server/GameServer.ts` — `getCreditableYandexId(client)` (the ADR-103 trust
  funnel) and `upsertProfileForClient(client)` → `POST /internal/v1/profile/upsert`.
- **Profile server routes** (`src/profile-server/Routes.ts`): `GET /v1/profile`, the payments routes
  (`/v1/payments/yandex/intent|complete|reconcile`), `GET /v1/messages` + internal send, the
  name-change routes (request, cancel, internal decide), `POST /internal/v1/credit`, and `0253`'s
  uncommitted `POST /v1/profile/tenure-grant`.
- **Repositories:** `PlayerProfileRepository`, `PaymentsRepository`, `NameChangeRepository`,
  `InboxRepository` — all query by `yandex_player_id`.

### Dependencies, conflicts, constraints

- **Blocks [`0253`](../0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md)**
  — its redesigned flow (owner, 2026-09-15) sends a login request first and a tenure claim only after
  the login reply. `0253` is `🚧 Blocked` on this task's design.
- **Blocks XP go-live** ([`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)) — the
  owner wants the identity model in place before crediting writes real rows.
- **ADR-103** (client-asserted Yandex id, one trust funnel) — this task **keeps trusting the id** but
  changes what the funnel resolves to (internal id). The design must say how ADR-103 reads afterwards
  (amend or supersede — architect's call, owner approves).
- **ADR-112** (free XP grants) — keyed "once per account"; it needs amending for the `0253` redesign
  anyway (architect). "Account" becomes the internal id.
- **`0250`** (authenticated profile read) and **`0014`** (Yandex secret key) — signed identity is still
  out of scope here; the design should not make it harder later.
- **Monitoring replaces the rate limit** — the telemetry path exists (Uptrace), but whether profile
  server metrics/logs reach it today is a design question, not an assumption.
- **No secrets, hosts or player ids** in the design doc or ADR.

## Owner rulings — design, 2026-09-15

**Given via `AskUserQuestion` in the lead session and relayed by `fkit-lead` to a spawned
`fkit-producer`. Not producer precedent.**

1. **Design approved, with the login token in v1** — owner: *"Token now, not later"*.
2. **[ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md)
   accepted** (owner-signed); [ADR-112](../../../knowledge-base/decisions/adr-112-free-xp-grants-capped-server-clamped-acked-once-per-account.md)
   amended the same day.
3. **Build "Split into 4"** — database + re-keying → login endpoint → game server → client. The
   architect added **monitoring as a 5th slice** under the owner's *"Yes, before go-live"* ruling
   (placement delegated to the architect).
4. **Alerts by "Email".**
5. Account linking recorded in ADR-113, **not built, no task**. A 0-XP tenure check is **final**.

Design: [`2026-09-15-profile-identity-design.md`](../../../knowledge-base/reports/2026-09-15-profile-identity-design.md)
(§9 is the slice table these children are filed from).

## Child slices

| Slice | Status | Task | Effort (design §9) | Depends on |
|---|---|---|---|---|
| **S1 — Database + re-keying** | 🔲 Backlog | [`0270`](../0270-profile-identity-s1-database-and-rekeying/brief.md) | 2.5–3.5 d | — (first; never concurrent with `0253` code work) |
| **S2 — Login endpoint + 24 h token** | 🔲 Backlog | [`0271`](../0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) | 2–2.5 d | S1 |
| **S3 — Game server resolve + credit by player id** | 🔲 Backlog | [`0272`](../0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md) | 1.5–2 d | S1 |
| **S4 — Client login session + Bearer; legacy fallback removed last** | 🔲 Backlog | [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) | 1.5–2 d | S2 |
| **S5 — Monitoring + creation switch (+ owner: dashboard, 6 email alerts, drill)** | 🔲 Backlog | [`0274`](../0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) | 2–2.5 d + owner UI | S2 |

**Order:** S1 → (S2 ∥ S3) · S2 → (S4 ∥ S5) · S4 → `0253` rework · all five deployed and verified →
`0217` sets `PROFILE_INTERNAL_TOKEN`. **Total ≈ 9.5–12.5 dev days + ~0.5–1 day review per slice.**

## What to build

> ✅ **Phase 1 DELIVERED 2026-09-15** (design report + ADR-113, owner-approved). **Phase 2 below is
> SUPERSEDED by the child slices** — kept as history, not deleted. Build nothing from this brief
> directly; build from `0270`–`0274`.

### Phase 1 — Design (fkit-architect), put to the owner

A design spec in `ai-agents/knowledge-base/reports/` (`/fkit-design-spec`) plus an ADR
(`/fkit-record-decision`) for the identity model. It must answer — **the producer lists these, the
architect proposes, the owner decides:**

1. **Internal id form — sequential vs random.** Sequential ids leak player counts and allow
   enumeration if they ever reach a client; random (e.g. UUID) do not. Recommend one with its cost.
2. **What the client holds and sends after login** — the platform id (as today), a session token issued
   by the login endpoint, or the internal id. State the **forging implication** of each while the
   platform id is still trusted, and which choice makes `0267` (verified identity) cheapest to add.
3. **Schema:** the `player_logins` (or equivalent) table — `(platform, platform_id)` unique, linked to
   the internal id — and how every table in the blast-radius list re-keys to the internal id. One
   migration or several; how `0253`'s `005` fits.
4. **Login endpoint contract:** request/response, find-or-create semantics, idempotency under two
   concurrent first logins for the same platform id (must create exactly one profile), what the reply
   carries (at least what `0253` needs: whether the tenure check has happened).
5. **Game server:** how `getCreditableYandexId` / the internal upsert / the credit contract change —
   does the game server resolve platform id → internal id, or does the client send something else.
6. **Linking two logins of the same person later** — design the data model so it is possible;
   **building it is out of scope.** Say what a later merge of two existing profiles would need.
7. **Monitoring plan in place of rate limiting** — what is measured (login calls, profiles created per
   hour, claim calls), where it is visible, and what level makes someone look. Owner-accepted risk:
   junk profile rows.
8. **Identity still trusted** — state plainly what an attacker with someone else's platform id can do
   after this change, compared with today.
9. **ADR amendments:** ADR-103 and ADR-112 — which change and how.

**Gate:** the owner reviews the design and rules on 1, 2 and 7 at minimum before any build starts.

### Phase 2 — Build (fkit-coder), only after the owner approves the design

Work breakdown, in dependency order (see *Notes* — the producer recommends filing these as separate
briefs once the design is approved):

1. **Schema + re-key** — migration(s) introducing the internal id and the logins table; every
   repository and route moved from `yandex_player_id` to the internal id; all existing tests updated.
2. **Login endpoint** — find-or-create by platform + platformId; no per-IP rate limit (owner ruling);
   monitoring hooks per design item 7.
3. **Game server** — the trust funnel, internal upsert and credit contract moved to the new identity.
4. **Client** — on every load, a logged-in Yandex player calls the login endpoint (not behind the
   citizenship card switch); failures are fail-soft (the game still starts).

## Verification steps

> 📌 **Epic close criterion (2026-09-15):** this epic closes when **all five child slices `0270`–`0274`
> are closed**. Steps 3–9 below are carried out and proved inside the child slices; step 1 is met
> (design + ADR-113 exist; rulings recorded above with date and channel); step 2 held (no build before
> the ruling).

1. **Design:** the spec and ADR exist, answer items 1–9 each with a recommendation, and the owner's
   ruling on each is recorded with date and channel; unanswered items are recorded as open, not
   defaulted.
2. **No build before the ruling:** no source or migration file changed by this task before the owner's
   design ruling is recorded.
3. **Find-or-create:** against a local profile server + Postgres (`npm run test:integration`), a first
   login for a new platform id creates exactly one profile and one login row; a second login returns the
   same internal id and creates nothing.
4. **Concurrency:** two simultaneous first logins for the same platform id produce one profile, not two
   — covered by an integration test.
5. **Re-key complete:** `grep -rn "yandex_player_id" src/ migrations/` shows the column only where the
   design says it survives (e.g. the logins table / a migration history); every other query uses the
   internal id. Match crediting, payments, name change, inbox and grants integration tests pass.
6. **Game server path:** a credited match lands against the internal id (integration test through the
   internal credit route).
7. **Client:** a logged-in load sends exactly one login request; a guest load sends none; with the
   profile server stopped the game still reaches the start screen.
8. **Monitoring:** the metrics/logs named in the design are visible in the chosen tool from a local or
   staging run.
9. `npm test` and `npm run test:integration` pass; `tsc --noEmit` and `npm run lint` exit 0.

## Notes

- **Depends on:** [`0270`](../0270-profile-identity-s1-database-and-rekeying/brief.md), [`0271`](../0271-profile-identity-s2-login-endpoint-and-session-token/brief.md), [`0272`](../0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md), [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md), [`0274`](../0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) — the epic's five child slices (filed 2026-09-15)
- *(Superseded dependency line, kept: ~~Depends on: nothing — the design can start now; the build waits on the owner's design ruling~~ — the design is delivered and ruled.)*
- **Blocks:** [`0253`](../0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md), XP go-live via [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md), [`0268`](../0268-remove-tenure-xp-claim-logic-after-60-days/brief.md) (indirectly, through `0253`)
- **Related:** [`0267`](../0267-investigate-verifying-platform-player-identity/brief.md) (verify the
  platform identity — Backlog), [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md),
  ADR-103, ADR-112.
- ✅ **~~Split recommendation — flagged for owner confirmation, not ruled.~~ RULED 2026-09-15: "Split into 4"** (+ monitoring as a 5th slice) — filed as `0270`–`0274`. History below kept: The build's four units are
  independently testable, and units 1→2→3→4 ship in order. The producer recommends that once the
  design is approved, the build is filed as **separate briefs** (schema+re-key; login endpoint; game
  server; client), each blocking `0253`. It is filed as one brief today because the owner named one
  task and the build's exact seams depend on the design (investigation-first: no implementation briefs
  before the design exists). If the owner prefers one brief — as ruled for `0253` on 2026-09-13 — this
  brief stays whole and its Owner moves to `fkit-coder` at hand-off.
- ⚠️ **XP go-live may slip past this weekend** (owner, 2026-09-15: *"it's ok"*; may even skip the next
  weekend slot). The game deploy still happens with `PROFILE_INTERNAL_TOKEN` blank.
- No wiki writes here; `fkit-wiki` ingests the design and ADR after the ruling.
