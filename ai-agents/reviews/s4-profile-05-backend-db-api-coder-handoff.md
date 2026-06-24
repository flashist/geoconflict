# Coder handoff — s4-profile-05-backend-db-api (round 5)

> **Spec, not an applied change.** This file *describes* a recommended fix from a review of
> PR 126. It changes no code. A separate coder run decides and implements. The finding is a
> recommendation — verify it against the code before acting (per CLAUDE.md Review Notes).

## Status (read first)

- **All findings from rounds 1–4 are ALREADY IMPLEMENTED and verified clean** (C1 upsert
  endpoint, C2-residue `persistent_id` strip, Cl1 ROLLBACK guard, Cl4 dead-column drop, **R1**
  cross-account collision → graceful **409**, and the R2/R3/R4 test additions). **Do not re-do
  them.**
- **This round has exactly ONE actionable item: R5-1** (a low/med data-hygiene fix). It is the
  only thing between this slice and closeout.

## Context

Task **T5 — Player Profile Backend DB + API** (profile server, Postgres-backed). In round 4 the
cross-account `persistent_id` collision (R1) was resolved by catching Postgres `23505` in
`upsertProfile` → throwing a typed `PersistentIdConflictError(yandexPlayerId, persistentId)`,
which the route maps to `409 {error:"persistent_id_conflict"}`. R5-1 is about how that conflict
is **logged**.

**Project stance to respect:** `persistent_id` is the internal cross-device identity-linkage
token; the code deliberately **strips it from API responses** (`toPublicProfile`). R5-1 closes
the gap that it still reaches the logs.

**In scope:** R5-1 only — `src/profile-server/PlayerProfileRepository.ts` (the error class) and
`src/profile-server/Routes.ts` (the conflict log line). **Out of scope:** everything else in the
slice (done + verified), and all accepted residuals below.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| R5-1 | low/med | yes | `Routes.ts:~138`, `PlayerProfileRepository.ts` (`PersistentIdConflictError`) | Stop logging `persistent_id` on the 409 conflict path; keep `yandexPlayerId` for traceability. |

---

### R5-1 — `persistent_id` leaks into conflict logs

**Files:** `src/profile-server/Routes.ts` (the `PersistentIdConflictError` branch, ~line 138) and
`src/profile-server/PlayerProfileRepository.ts` (the `PersistentIdConflictError` class message).

**Problem.** On a cross-account collision the route runs
`log.warn(\`upsert conflict: ${formatError(error)}\`)`. `formatError` returns
`error.stack ?? error.message`, and `PersistentIdConflictError`'s message is
`persistent_id "<pid>" is already linked to another account (upsert for "<yid>")` — so both
`persistentId` and `yandexPlayerId` (plus a stack trace) land in centralized telemetry. The
codebase otherwise treats `persistent_id` as sensitive and strips it from API responses, so it
shouldn't accumulate raw in logs.

**Honest impact (verdict: CORRECT → low/med; Codex rated it medium/"no-ship" — overstated).**
This is a modest data-hygiene inconsistency, **not** a blocker: logs are access-controlled
(unlike the public API), the cross-account 409 is an edge path (low volume), and `yandexPlayerId`
is non-secret (it's already a public query param on `GET /v1/profile`). It is genuinely worth
fixing because it contradicts the project's own deliberate decision to strip `persistent_id`.

**Note (avoid re-introducing a prior round's intent):** an earlier round suggested logging
identifiers *for traceability*. The fix below is the Pareto move that satisfies both goals —
**keep `yandexPlayerId` (traceability), drop/hash `persistentId` (minimization).** Do not swing
to "log nothing" (loses traceability) or "log both" (the current leak).

**Recommended fix.**
- Change `PersistentIdConflictError`'s message so it does **not** embed `persistentId` (e.g.
  `\`persistent_id is already linked to another yandex account (upsert for "${yandexPlayerId}")\``).
  Keep `persistentId` available as a (non-logged) field on the error if callers want it
  programmatically; just don't put it in the human/log string.
- At the route log site, log only `yandexPlayerId` (and, if you want the device dimension, a
  one-way hash of `persistentId`, never the raw value) — e.g.
  `log.warn(\`upsert conflict for yandex_player_id=${err.yandexPlayerId}\`)`.
- Prefer a `warn` with explicit fields over dumping the full stack for an expected/handled 409.

**Acceptance / test.** Add (or extend) a test asserting the conflict log line / error message
does **not** contain the raw `persistentId` while still surfacing `yandexPlayerId`. The existing
409 unit + integration tests (behavioral 409 + body) already pass and should stay green.

## Do NOT change (accepted residuals — re-introducing these is churn, not progress)

- **R1 returns 409, not a device transfer** — the transfer-vs-reject **relink policy is a T6 /
  identity-model decision**; T5 only surfaces the conflict cleanly. Do not implement a transfer here.
- **Unauthenticated `GET /v1/profile`** (deferred to the Payments task; paid fields + `persistent_id`
  stripped, rate-limited). **No client write path / migrate endpoint.** **No XP clamp.**
  **No FK-cascade index.** **Explicit `BEGIN/COMMIT`** around the single-statement CTE.
  **Unguarded `created_at`/`updated_at` cast** (NOT NULL columns).
- The single-CTE `CREDIT_SQL`, dual-layer paid invariants, forward-version `schema_version` guard,
  and the round-4 `23505`→409 handling are all correct — do not refactor.

## Validation + acceptance criteria

- `npm test -- tests/profile-server/Routes.test.ts` and the relevant `CreditContract.test.ts`
  (mocked repo / pure schema, no DB).
- `npm run lint` / `npm run format` / typecheck clean.
- Integration tests (`tests/integration/*.it.test.ts`) need a real Postgres (gated by
  `RUN_DB_TESTS`); the behavioral 409 paths live there and should remain green.
- Manual: trigger a cross-account collision (`curl` upsert `(Y1,P)` then `(Y2,P)`) and confirm the
  emitted log line contains `yandexPlayerId` but **not** the raw `persistentId`.
