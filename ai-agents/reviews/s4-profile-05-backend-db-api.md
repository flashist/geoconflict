# Review ledger — s4-profile-05-backend-db-api

Task: ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md
File(s) under review: migrations/001_player_profiles.sql, src/profile-server/{Routes,PlayerProfileRepository,InternalAuth,Db,Server,migrate}.ts, src/core/profile/{Citizenship,CreditContract}.ts, tests/{profile-server,core/profile,integration}/*
Scope: branch diff vs `dev` (PR 126)
Status: round-1 findings resolved (round 2 applied + adversarially re-reviewed clean)

## Accepted residuals (do-not-re-litigate)

- **Unauthenticated `GET /v1/profile`** — What: the client read takes a caller-supplied
  `yandexPlayerId` query param with no Yandex-signature verification; it is per-IP
  rate-limited and the public projection omits paid-state fields (`is_paid_citizen`,
  `citizenship_purchased_at`). Why (structural): real per-caller auth requires Yandex
  `getPlayer({signed:true})` signature verification, whose machinery lands in the Yandex
  **Payments task** — it cannot be built in this slice (confirmed in T6 Part-A note and
  epic Part A: `yandexPlayerId` is untrusted, sig verification deferred). Rate-limit +
  paid-field omission are the in-slice mitigations. Re-raise only if: the Payments task
  ships signature verification (then wire it here) **or** a *new* sensitive field is added
  to the public projection. *(Note: the `persistent_id` exposure within this read is being
  hardened now — see Open/actionable; that is the one piece reachable without Payments.)*

- **No client write path / migrate endpoint dropped** — What: there is no
  `POST /v1/profile/migrate` and no client-uploadable profile. Why (structural): the
  guest-first story (T2 + T7) was cancelled 2026-06-13; XP/profile are server-authoritative.
  Re-raise only if: guest-XP is revived (T2 + T7) — then the migrate endpoint *and* its
  untrusted-body hardening must be re-added (they were removed, not deferred).

- **No XP clamp / oversized-XP defense** — What: `xp` is not validated against forged/
  oversized client input. Why (structural): `xp` is never client-supplied — only
  `creditMatchXp` (internal endpoint, `xpAwarded` bounded ≤10 000 in `CreditContract`)
  writes it. Re-raise only if: a client-facing XP write path is introduced.

- **Cl2 — unguarded `created_at`/`updated_at` cast in `rowToProfile`** — What:
  `(row.created_at as Date).toISOString()` (Repo.ts:100-101) is not defended like the
  nullable timestamps' `toIsoOrNull`. Why (structural): both columns are `NOT NULL DEFAULT now()`,
  so pg returns Date objects under the default type parser; a throw needs a type-parser
  override or PgBouncer. Low value vs. churn. Re-raise only if: a custom `pg.types` parser
  or PgBouncer text-mode is introduced.

- **Cl3 — no covering index for FK `ON DELETE CASCADE`** — What:
  `player_match_xp_credits(yandex_player_id)` (and the two future tables) have no index
  supporting cascade-delete lookups (the composite PK leads with `game_id`). Why (structural):
  tables are tiny and **no profile-delete path exists**, so the seq-scan never runs in
  practice. Re-raise only if: a profile-delete/GDPR-erase path is added, or the ledger grows
  large enough for cascade cost to matter.

- **Cl5 — explicit `BEGIN/COMMIT` around the single-statement CTE** — What: `creditMatchXp`
  wraps the one-statement `CREDIT_SQL` in an explicit transaction. Why (structural): a single
  statement is auto-atomic, but the explicit txn is kept deliberately for the `ROLLBACK`
  catch-path semantics. Frontier-move, not a defect. Re-raise only if: the catch-path is
  removed (then `pool.query()` would suffice).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | C1 (Codex, high): no API path invokes `upsertProfile` → profiles can't be created over HTTP; every credit returns `no_profile` | PARTIALLY CORRECT → medium. Factual claim **verified** (Routes has no upsert endpoint; credit contract has no `persistentId`; T6 spec only calls `/internal/v1/credit`; T7 cancelled). "Do not ship" overstates it for T5's *scoped* deliverable, but the slice's own Priority ("working backend, curl-exercisable") is unmet. | **Open/actionable — fix in T5** (owner decision): add an internal service-authed upsert endpoint. |
| 1 | C2 (Codex, high): `GET /v1/profile` unauthenticated & enumerable, leaks `persistent_id` | PARTIALLY CORRECT → low/med. Unauthenticated read is a **documented deferral** to the Payments task (paid fields stripped, rate-limited) → accepted residual. `persistent_id` leak is the reachable-now residue. | **Split:** read-auth → accepted residual (above); **strip `persistent_id` from `toPublicProfile` → Open/actionable.** |
| 1 | Cl1 (Claude, med): `ROLLBACK` in `creditMatchXp` catch can throw and mask the FK-violation → `no_profile` misreported as `error` | CORRECT → low/med. Standard-pg robustness gap. | **Open/actionable** — wrap ROLLBACK in try/catch. |
| 1 | Cl2 (Claude, med): unguarded `created_at`/`updated_at` cast | CORRECT → low | Accepted residual (needs type-parser override / PgBouncer to trigger). |
| 1 | Cl3 (Claude, med): missing FK-cascade index | CORRECT → low (negligible) | Accepted residual (no delete path, tiny tables). |
| 1 | Cl4 (Claude, low): dead `updated` count in `CREDIT_SQL` SELECT | CORRECT → low | Noted, not actioned (cosmetic). |
| 1 | Cl5 (Claude, low): redundant explicit transaction | PARTIALLY CORRECT → low | Accepted residual (intentional for ROLLBACK path). |
| 1 | Cl6 (Claude, low): no prefix-of-expected-token test in InternalAuth | CORRECT → low | Noted, not actioned (length guard already covers it; optional test). |
| 1 | Cl7 (Claude, low): `trust proxy 1` operational note | CORRECT → low | Noted, not actioned (doc suggestion). |
| 2 | C1 — **implemented** (owner-approved via /process-review): internal `POST /internal/v1/profile/upsert` (reuses `internalAuth`; under nginx `/internal/` allowlist; returns the public projection) | DONE | `Routes.ts` route + `ProfileRepo.upsertProfile` + `CreditContract.ProfileUpsertRequestSchema`; Routes unit tests (200/401/400/500) + new HTTP integration test proving upsert→credit→read with **no psql seeding** |
| 2 | C2-residue — **implemented**: `persistent_id` stripped from `toPublicProfile` | DONE | `Routes.ts`; applies to both `GET /v1/profile` and the upsert response; tests assert absence; `TODO(payments)` left to restore for the verified owner once sig-auth lands |
| 2 | Cl1 — **implemented**: `ROLLBACK` wrapped in try/catch in `creditMatchXp` (+ same guard in `migrate.ts`) | DONE | original error preserved → an FK-violation still classifies `no_profile` even if ROLLBACK throws; `client.release()` stays in `finally` |
| 2 | Cl4 — **actioned** (was "noted, not actioned"): dropped the dead `updated` count from `CREDIT_SQL`'s final SELECT | DONE | `upd` is a data-modifying CTE → still runs to completion; integration tests confirm xp increment + citizenship flip unchanged |
| 2 | Adversarial re-review — 5 independent dimensions (C1 correctness/security, C2 leak-completeness, Cl1 ROLLBACK, Cl4 CTE-semantics, regression/contract/tests), each finding verified by a refute-by-default skeptic | CLEAN | **0 new findings**; 559 unit + 13 integration tests green; lint + typecheck clean; live boot test of the full flow passes |

Reviewers: round 1 — Claude `code-reviewer` (review-only) + Codex adversarial. Round 2 — implementation + a 5-dimension adversarial Workflow re-review (0 findings).
Both round-1 reviewers correctly did **not** re-raise the primed settled decisions (dropped migrate endpoint, removed XP clamp).

## Open / actionable

- **(none)** — all round-1 actionable findings (C1, C2-residue, Cl1) were implemented and
  adversarially re-reviewed clean in round 2; Cl4 was actioned alongside them. See the
  Decision log round-2 rows.

## Carry-forward for T6 (not a T5 defect)

- **T6 must call `POST /internal/v1/profile/upsert` on first authenticated join, before any
  crediting.** T5 now provides the endpoint; T6's `ProfileApiClient` spec currently lists only
  `/internal/v1/credit`. Without the upsert call, `creditMatchXp` returns `no_profile` and XP
  never accrues. Also: T6 still owns the decision on **trusting the client-asserted
  `yandexPlayerId`** before crediting/upserting by it (raised in T6's own security note).
