# Coder handoff — s4-profile-05-backend-db-api (round 3)

> **Spec, not an applied change.** This file *describes* recommended fixes from a review of
> PR 126. It changes no code. A separate coder run decides and implements. Findings are
> recommendations — verify each against the code before acting (per CLAUDE.md Review Notes).

## Status (read first)

- **Round-1 findings (C1 upsert endpoint, C2-residue `persistent_id` strip, Cl1 ROLLBACK guard,
  Cl4 dead-column drop) are ALREADY IMPLEMENTED and re-verified clean** by both reviewers in
  round 3. **Do not re-do them.** They are listed under "Already done" only for context.
- **This round's actionable work is R1 (one real defect) + R2–R4 (test strengthening).**

## Context

**What the code is.** Task **T5 — Player Profile: Backend DB + API**. A Postgres-backed
profile backend that runs **only** on the dedicated profile server (`api.geoconflict.ru`);
the game server reaches it over HTTP and never touches Postgres directly. Relevant files:

- `migrations/001_player_profiles.sql` — schema (Option B: typed columns + `extra jsonb`).
  `persistent_id text unique`; `yandex_player_id text primary key`.
- `src/profile-server/PlayerProfileRepository.ts` — the only Postgres-touching code
  (`upsertProfile`, `creditMatchXp`, `getProfile`, `ping`).
- `src/profile-server/Routes.ts` — `createApp(repo)` factory: `GET /health`, `GET /ready`,
  `GET /v1/profile`, `POST /internal/v1/credit`, `POST /internal/v1/profile/upsert`.
- `src/core/profile/CreditContract.ts` — shared wire schemas (`CreditBatchRequestSchema`,
  `ProfileUpsertRequestSchema`).

**In scope:** R1 (in `PlayerProfileRepository.ts` / `migrations/` / `Routes.ts`) and the R2–R4
test additions. **Out of scope:** the game-server `ProfileApiClient` and match-end wiring (T6),
and full Yandex-signature auth (the Payments task). **Identity-model note:** `yandexPlayerId`
is **account-scoped**; `persistentId` is **browser/device-scoped** (`src/server/jwt.ts`,
predates Yandex auth) — the two are many-to-many over time. R1 falls out of exactly this.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| R1 | medium | yes | `PlayerProfileRepository.ts:66-73` (+ migration / route) | Handle the `persistent_id` cross-account UNIQUE collision; pick & implement a relink/conflict policy + cross-account test. |
| R2 | low | yes | `tests/profile-server/Routes.test.ts` | Assert `citizenship_purchased_at` absent in the upsert response. |
| R3 | low | yes | `tests/integration/Routes.it.test.ts` | Add an HTTP-layer no-op upsert test (same `persistentId` twice). |
| R4 | low | yes | `tests/core/profile/CreditContract.test.ts` | Add direct unit tests for `ProfileUpsertRequestSchema` bounds. |

---

### R1 — Cross-account `persistent_id` collision → permanent 500 (raised by both reviewers)

**File:** `src/profile-server/PlayerProfileRepository.ts:66-73` (`UPSERT_SQL` / `upsertProfile`);
the `persistent_id text unique` constraint in `migrations/001_player_profiles.sql:22`; the route
handler in `Routes.ts`.

**Problem.** `persistent_id` is `UNIQUE`, but `UPSERT_SQL`'s `ON CONFLICT` clause names only
`yandex_player_id`. Two collision paths are unhandled and raise Postgres `23505`:
1. **Fresh insert:** `upsertProfile(Y2, P)` where `P` already belongs to row `Y1` — the
   `ON CONFLICT (yandex_player_id)` doesn't fire (no `Y2` row yet), so it's a plain INSERT that
   violates the `persistent_id` unique index.
2. **Relink:** `upsertProfile(Y1, P2)` where `Y1` exists and `P2` already belongs to row `Y3` —
   the `DO UPDATE SET persistent_id = P2` violates the unique index.

`upsertProfile` has no `23505` handling, so it propagates → the route logs a generic error and
returns **500**. Retries can't recover → the affected Yandex account never gets a profile or XP.

**Honest impact (verdict: CORRECT → medium; reviewers split, Codex high / Claude low).** The
scenario is plausible — a user switching Yandex accounts in the same browser, or a shared
computer — because `persistentId` is browser-scoped and `yandexPlayerId` is account-scoped, so
one persistentID legitimately appears under multiple accounts over time. It is **pre-existing**
(the constraint + SQL predate the round-2 upsert wiring; the wiring just made it reachable over
HTTP), and it is **not** the main flow. Codex's "no-ship/high" overstates an edge path that has
no *decided* policy; Claude's "low / the 500 is correct" relies on a "one persistentID per
account" invariant that **is not enforced anywhere**, so it understates a genuinely unrecoverable
failure. Net: a real defect worth resolving before this identity model goes live, gated on a
product decision — not a one-line bug.

**Recommended fix — pick ONE policy, then implement it transactionally and test it:**
- **(a) Transfer/detach** the persistentID from the prior owner to the new account (the browser
  "now belongs to" the new Yandex account). Implement as a single transaction: detach
  `persistent_id` from any other row (set it null / move it) then upsert. Matches a
  "latest-login-wins device linkage" model.
- **(b) Deliberate conflict response:** catch `23505` in `upsertProfile`, return a typed
  `"conflict"` status, and map it to **`409`** in the route so the caller (T6) can react instead
  of seeing an opaque 500. Lowest-risk; defers the linkage policy to the caller.
- **(c) Reconsider the `persistent_id UNIQUE` constraint** if a persistentID may legitimately map
  to many accounts — but then `persistent_id` loses its 1:1 linkage meaning; only choose this if
  the data model actually wants many-to-one.

Whichever is chosen, **add an integration test**: one persistentID presented with two distinct
Yandex IDs, asserting the chosen behavior (transfer succeeds / 409 returned / etc.) rather than a
500. Also consider logging `yandexPlayerId` + `persistentId` at the upsert call site so a
`23505` is traceable (Claude's valid sub-point).

---

### R2 — Upsert response: assert `citizenship_purchased_at` is stripped (test gap)

**File:** `tests/profile-server/Routes.test.ts` (upsert test, ~line 150-162).

**Problem & honest impact.** Not a production bug — `toPublicProfile` correctly strips
`citizenship_purchased_at`. But the upsert test asserts only `persistent_id` and
`is_paid_citizen` absent; it stops short of `citizenship_purchased_at` (the GET test does assert
it). A future regression that dropped the field from the destructure would slip through.

**Recommended fix.** Add `expect(res.body).not.toHaveProperty("citizenship_purchased_at");` to
the upsert success test (the `fullProfile()` fixture already sets the field).

---

### R3 — HTTP-layer no-op upsert test (test gap)

**File:** `tests/integration/Routes.it.test.ts`.

**Problem & honest impact.** The no-op path (upsert twice with the **same** `persistentId`, so
`DO UPDATE` is skipped and `upsertProfile` reads the row back via its `getProfile` fallback) is
covered at the repo layer (`PlayerProfileRepository.it.test.ts`) but not at the HTTP layer. The
HTTP integration test is meant to be the full-slice proof; if the fallback `getProfile` broke, it
wouldn't catch it. Low risk given repo coverage.

**Recommended fix.** Extend the HTTP integration test to POST the same `{yandexPlayerId,
persistentId}` twice and assert the second call returns 200 with the same row.

---

### R4 — Direct unit tests for `ProfileUpsertRequestSchema` (test gap)

**File:** `tests/core/profile/CreditContract.test.ts`.

**Problem & honest impact.** `CreditItemSchema` / `CreditBatchRequestSchema` have thorough unit
tests here, but the newly-added `ProfileUpsertRequestSchema` has none — its `.min(1)`/`.max(128)`
bounds are only exercised indirectly via the route's missing-field 400 case. Consistency gap.

**Recommended fix.** Add 2-3 cases: valid payload parses; empty-string field rejected; oversize
(>128) field rejected.

---

## Already done (round 1 → round 2, re-verified clean in round 3 — DO NOT re-do)

- **C1** — `POST /internal/v1/profile/upsert` added (service-authed via `internalAuth`, returns
  public projection). ✅
- **C2-residue** — `persistent_id` stripped from `toPublicProfile` (GET + upsert responses). ✅
- **Cl1** — `ROLLBACK` wrapped in try/catch in `creditMatchXp` + `migrate.ts`; original error
  preserved. ✅
- **Cl4** — dead `updated` count dropped from `CREDIT_SQL`'s final SELECT; `upd` CTE still runs. ✅

## Do NOT change (accepted residuals — re-introducing these is churn, not progress)

- **No client write path / migrate endpoint** (dropped 2026-06-13). **No XP clamp** (`xp`
  server-authoritative). **Read remains unauthenticated** beyond the `persistent_id`/paid strip
  (full Yandex-sig auth is the Payments task). **No FK-cascade index** (no delete path).
  **Explicit `BEGIN/COMMIT`** around the single-statement CTE (kept for the ROLLBACK path).
  **Unguarded `created_at`/`updated_at` cast** in `rowToProfile` (NOT NULL columns).
- The single-CTE `CREDIT_SQL` atomicity/idempotency, dual-layer paid invariants, and
  forward-version `schema_version` guard are correct — do not refactor.

## Validation + acceptance criteria

- `npm test -- tests/profile-server/Routes.test.ts tests/profile-server/InternalAuth.test.ts tests/core/profile/CreditContract.test.ts`
  — unit/route tests (mocked repo, no DB).
- `npm run lint` and `npm run format` clean; typecheck clean.
- Integration tests (`tests/integration/*.it.test.ts`) need a real Postgres and are gated by
  `RUN_DB_TESTS` (skipped by a plain `npm test`) — run them with the DB harness; the **R1
  cross-account test and the R3 no-op test live here**.
- Manual (R1): with `PROFILE_INTERNAL_TOKEN`, `curl` `POST /internal/v1/profile/upsert` for
  `(Y1, P)`, then for `(Y2, P)` — confirm the chosen policy (transfer / 409), **not** a 500.
