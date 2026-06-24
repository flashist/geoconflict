# Coder handoff — s4-profile-05-backend-db-api

> **Spec, not an applied change.** This file *describes* recommended fixes from a review of
> PR 126. It changes no code. A separate coder run decides and implements. Findings are
> recommendations — verify each against the code before acting (per CLAUDE.md Review Notes).

## Context

**What the code is.** Task **T5 — Player Profile: Backend DB + API**. It adds a
Postgres-backed profile backend that runs **only** on the dedicated profile server
(`api.geoconflict.ru`); the game server reaches it over HTTP and never touches Postgres
directly. The slice ships:

- `migrations/001_player_profiles.sql` — schema (Option B: typed columns + `extra jsonb`).
- `src/profile-server/PlayerProfileRepository.ts` — the only Postgres-touching code
  (`upsertProfile`, `creditMatchXp`, `getProfile`, `ping`).
- `src/profile-server/Routes.ts` — `createApp(repo)` factory wiring `GET /health`,
  `GET /ready`, `GET /v1/profile`, `POST /internal/v1/credit`.
- `src/profile-server/InternalAuth.ts` — service-token bearer auth for the internal route.
- `src/core/profile/CreditContract.ts` — the shared wire schema for crediting.

**In scope for this handoff:** the 3 actionable findings below, all in
`src/profile-server/`. **Out of scope:** the game-server `ProfileApiClient` and match-end
wiring (that is T6, `s4-profile-06-match-end-crediting.md`) — except that fix #1 below must
leave T6 a callable upsert endpoint.

**Settled context the reviewers confirmed is correct (do not "fix"):** the single-CTE
`CREDIT_SQL` is atomic/idempotent and correct; paid-citizenship invariants are enforced at
both the DB `CHECK` layer and the write path; the forward-version writeback guard
(`schema_version <= $3`) is correct; `InternalAuth` fails closed and uses `timingSafeEqual`.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| 1 | medium | yes | `src/profile-server/Routes.ts` (+ test) | Add an internal, service-authed **upsert** endpoint so profiles can be created over HTTP. |
| 2 | low/med | yes | `src/profile-server/Routes.ts:38-45` | Strip `persistent_id` from the public profile projection. |
| 3 | low/med | yes | `src/profile-server/PlayerProfileRepository.ts:160-165` | Wrap `ROLLBACK` in try/catch so an FK-violation is still classified `no_profile`. |

---

### 1 — Add an internal upsert endpoint (finding C1)

**File:** `src/profile-server/Routes.ts` (route), reusing `PlayerProfileRepository.upsertProfile`.

**Problem.** `upsertProfile(yandexPlayerId, persistentId)` exists in the repository and is
unit/integration-tested, but **no HTTP route calls it**. The only write route is
`POST /internal/v1/credit`, and `creditMatchXp` returns `"no_profile"` (writing nothing)
when no `player_profiles` row exists. The credit contract (`CreditContract.ts`) carries no
`persistentId`, so credit cannot create-on-the-fly. T7 (the login flow that would have
created profiles) was **cancelled 2026-06-13**, and T6's spec only calls `/internal/v1/credit`.

**Honest impact (carried from the review verdict — PARTIALLY CORRECT → medium).** This is
**not a bug in shipped T5 code** — T5 built exactly its three scoped endpoints and they are
correct and tested. It is a **cross-slice wiring gap**: as planned, no slice ever creates a
profile over HTTP, so every credit returns `no_profile` and the slice's own Priority line
("the working profile backend… independently exercisable via `curl`") is unmet. The code
comment at `PlayerProfileRepository.ts:19-20` ("T6 orders upsert before credit") encodes an
assumption T6's current spec does **not** fulfill. The owner chose to fix it here in T5
rather than push it to T6.

**Recommended fix.** Add a service-authenticated (reuse `internalAuth`) upsert route, e.g.
`POST /internal/v1/profile/upsert`, that validates `{ yandexPlayerId, persistentId }`
(add a small zod schema; mirror `CreditContract`'s camelCase + `min(1).max(128)` bounds —
consider colocating it in `CreditContract.ts` so T6's client serializes the same shape),
calls `repo.upsertProfile(...)`, and returns the public projection (after fix #2).
Map repository errors to `500 internal_error` like the existing routes. Extend the
`ProfileRepo` interface in `Routes.ts` to include `upsertProfile`.

**Acceptance.** A fresh `POST` creates a profile at `xp:0`; a follow-up `GET /v1/profile`
returns it; a second upsert with a changed `persistentId` relinks; unchanged is a no-op.
Add a Routes test (`tests/profile-server/Routes.test.ts`) with a mocked repo asserting the
route calls `upsertProfile` and rejects without the bearer token.

---

### 2 — Strip `persistent_id` from the public read (finding C2 residue)

**File:** `src/profile-server/Routes.ts:38-45` (`toPublicProfile`).

**Problem.** `GET /v1/profile` is unauthenticated (a documented, accepted deferral — full
Yandex-signature auth is blocked on the Payments task) and already omits the paid-state
fields. But the projection still returns `persistent_id`, the cross-device identity-linkage
token. Keyed by a (non-secret) `yandexPlayerId`, this lets any caller resolve a player's
`persistent_id`.

**Honest impact (PARTIALLY CORRECT → low/med).** Codex rated the parent finding `high`;
verified down because the unauthenticated read itself is an accepted, mitigated deferral.
The reachable-now residue is just the `persistent_id` exposure — cheap to close without the
Payments task.

**Recommended fix.** Add `persistent_id` to the `Omit`/destructure in `toPublicProfile`
(same treatment as `is_paid_citizen` / `citizenship_purchased_at`). Update the return type
and any Routes test asserting the response shape. Leave a `TODO(payments)` noting it can be
restored for the authenticated owner once Yandex-sig verification lands.

---

### 3 — Guard the `ROLLBACK` in `creditMatchXp` (finding Cl1)

**File:** `src/profile-server/PlayerProfileRepository.ts:160-165`.

**Problem.** In the catch block, `await client.query("ROLLBACK")` runs *before* the
`isForeignKeyViolation(error)` check. If the connection dropped, `ROLLBACK` throws, the
original `error` (pg code `23503`) is discarded, and the caller sees a generic error instead
of `"no_profile"`.

**Honest impact (CORRECT → low/med).** Degrades gracefully today (Routes returns
`status: "error"`, T6 retries), but it muddies the `no_profile` vs `error` distinction T6
relies on. Trivial, standard node-postgres fix.

**Recommended fix.**
```typescript
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // ROLLBACK failed (connection gone) — fall through with the original error.
  }
  if (isForeignKeyViolation(error)) {
    return "no_profile";
  }
  throw error;
}
```

## Do NOT change (accepted residuals — re-introducing these is churn, not progress)

- **No client write path / migrate endpoint** — deliberately dropped 2026-06-13. Do not add
  a client-facing profile-upload or migrate route.
- **No XP clamp** — `xp` is server-authoritative; do not add forged/oversized-XP validation.
- **Read remains unauthenticated beyond #2** — do not attempt full Yandex-signature auth here;
  it is blocked on the Payments task. Only the `persistent_id` strip (#2) is in scope.
- **Cl2** (unguarded `created_at`/`updated_at` cast), **Cl3** (FK-cascade index), **Cl5**
  (explicit `BEGIN/COMMIT` kept for the ROLLBACK path) — recorded as accepted residuals; leave
  as-is unless their re-raise conditions in the ledger are met.
- The single-CTE `CREDIT_SQL`, the dual-layer paid invariants, and the forward-version guard
  are correct — do not refactor.

## Validation + acceptance criteria

- `npm test -- tests/profile-server/Routes.test.ts tests/profile-server/InternalAuth.test.ts`
  — unit/route tests (mocked repo, no DB).
- `npm run lint` and `npm run format` clean.
- Integration tests touching the new upsert endpoint need a real Postgres and are gated by
  `RUN_DB_TESTS` (see `jest.integration.config.ts` / `PlayerProfileRepository.it.test.ts`),
  so they are skipped by a plain `npm test` — run them with the DB harness if you extend them.
- Manual: `curl` the new upsert endpoint (with the `PROFILE_INTERNAL_TOKEN` bearer) to create
  a profile, then `GET /v1/profile?yandexPlayerId=...` and confirm the response **no longer
  contains `persistent_id`** and the profile reads back at `xp:0`.
