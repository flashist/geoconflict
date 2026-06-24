# Review ledger — s4-profile-05-backend-db-api

Task: ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md
File(s) under review: migrations/001_player_profiles.sql, src/profile-server/{Routes,PlayerProfileRepository,InternalAuth,Db,Server,migrate}.ts, src/core/profile/{Citizenship,CreditContract}.ts, tests/{profile-server,core/profile,integration}/*
Scope: branch diff vs `dev` (PR 126)
Status: **CLOSED (round 5).** R5-1 fixed (persistent_id no longer logged); all findings across rounds 1–5 implemented & verified. Zero open/actionable. Convergence reached.

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
| 3 | Round-2 fixes re-reviewed on the updated PR (Claude `code-reviewer` + Codex adversarial) — C1 / C2-residue / Cl1 / Cl4 | **VERIFIED CLEAN** | All four confirmed correct & regression-free by both reviewers + manual trace (auth applied, projection type matches destructure, original error preserved through ROLLBACK, `upd` data-modifying CTE still runs) |
| 3 | **R1** (raised by **both**; Codex **high/"no-ship"**, Claude **low**): `persistent_id` is `UNIQUE` but `upsertProfile`'s `ON CONFLICT` only covers `yandex_player_id` → a persistentID reused across Yandex accounts (account switch / shared browser) raises `23505` → unhandled → **permanent 500**; the relink `DO UPDATE` path collides identically | **CORRECT → medium.** Mechanics verified and **broader than Codex stated** (relink path also collides). **Pre-existing** — constraint + SQL existed in round 1; round-2 wiring made it reachable. Claude's "one persistentID per account" invariant is **not enforced** anywhere (persistentID is browser-scoped, predates Yandex auth), so its low rating is wrong; Codex's mechanics are right but "no-ship" overstates an edge path with no decided policy. | **Open/actionable — decide+fix policy in T5** (owner decision): implement a relink/conflict policy (transfer the persistentID / deliberate 409 / reconsider the UNIQUE) + cross-account integration test |
| 3 | **R2** (Claude, low): upsert unit test doesn't assert `citizenship_purchased_at` absent | CORRECT → low (test gap only — `toPublicProfile` strips it correctly) | **Open/actionable — strengthen tests** |
| 3 | **R3** (Claude, low): no HTTP-layer no-op upsert test (same `persistentId` twice) | CORRECT → low (repo-layer covered) | **Open/actionable — strengthen tests** |
| 3 | **R4** (Claude, low): `ProfileUpsertRequestSchema` has no direct unit tests | CORRECT → low (bounds only exercised indirectly) | **Open/actionable — strengthen tests** |
| 4 | R1 — re-verified CORRECT → **low-med** (Codex "no-ship/high" overstates: no live caller yet, edge population; Claude "low/500-correct" understates: opaque crash on an unenforced invariant). Both collision paths confirmed; nothing queries by `persistent_id`. | **DONE — owner chose "graceful 409" (minimal).** `upsertProfile` now catches `23505` → throws typed `PersistentIdConflictError`; route maps it to **409 `{error:"persistent_id_conflict"}`** (was opaque 500). Repo+HTTP+unit tests for both collision paths; live curl confirms 409 (Y1,P)→200, (Y2,P)→409, server stays alive. **Linkage POLICY (transfer vs reject UX) carried to T6.** |
| 4 | R2 / R3 / R4 — test gaps | **DONE.** R2: upsert unit test now asserts `citizenship_purchased_at` absent. R3: HTTP-layer same-`persistentId` no-op test added (`Routes.it.test.ts`). R4: direct `ProfileUpsertRequestSchema` bounds tests added (`CreditContract.test.ts`). 564 unit + 16 integration green; lint + typecheck clean. |
| 5 | Round-4 fixes re-reviewed on the updated PR (Claude `code-reviewer` **clean — 0 findings** + Codex adversarial) — R1 409 + R2/R3/R4 tests | **VERIFIED CLEAN** | Both collision paths covered by one `23505` check; the only other UNIQUE index (`display_name`) can't fire here; `isPgError` refactor no-regression to `23503`→`no_profile`; `instanceof` + 409-before-500 correct; 4 new tests meaningful & non-false-passing |
| 5 | **R5-1** (Codex, medium "no-ship"): the 409 path `log.warn(\`upsert conflict: ${formatError(error)}\`)` (Routes.ts:138) logs `persistent_id` **and** `yandexPlayerId` — the `PersistentIdConflictError` message + stack embed both — inconsistent with the deliberate strip of `persistent_id` from API responses | **CORRECT → low** (not "no-ship": the profile logger is **Console-only**, no OTEL/centralized export yet — so it's stdout, access-controlled; cross-account 409 is an edge; `yandexPlayerId` is already a public query param). **Loop-discipline:** a round-3 suggestion pushed traceability the other way, but a genuine **Pareto move exists** (keep `yandexPlayerId`, drop `persistentId`) → improvement, not oscillation. | **DONE — owner approved Pareto fix.** `PersistentIdConflictError` message no longer embeds `persistentId` (kept as a non-logged field); route logs `` `upsert conflict for yandex_player_id=${err.yandexPlayerId}` `` (no stack). New unit test asserts the message/stack exclude the raw `persistentId`. Live verify: grep of the full server log for the raw persistentId → **0**; 409 behavior unchanged. 567 unit + 16 integration green; lint + typecheck clean. |

Reviewers: round 1 — Claude `code-reviewer` (review-only) + Codex adversarial. Round 2 — implementation + a 5-dimension adversarial Workflow re-review (0 findings). Round 3 — stateful re-review on the updated PR: round-2 fixes verified clean; surfaced R1 (raised by both) — a **pre-existing** cross-account collision. Round 5 — stateful re-review of the round-4 fixes: R1 409 + R2/R3/R4 verified clean (Claude clean, 0 findings); Codex surfaced R5-1 (`persistent_id` in 409 logs), the one new item before closeout.
Both round-1 reviewers correctly did **not** re-raise the primed settled decisions (dropped migrate endpoint, removed XP clamp). No loop/oscillation: round-3 and round-5 findings are genuinely new, not a re-litigation of any accepted residual (R5-1 has a Pareto fix, so it's not a frontier bounce).

## Open / actionable

- **(none) — CLOSED.** All findings across rounds 1–5 (C1, C2-residue, Cl1, Cl4, R1→409,
  R2/R3/R4, R5-1) are implemented and verified. **Convergence reached; review loop closed.**
  Remaining items are accepted residuals (below) and T6 carry-forwards — not open defects.

## Accepted residual (added round 4)

- **R1 — cross-account `persistent_id` collision returns 409 (not transferred).** What: when a
  device's `persistentId` is presented under a second Yandex account, the upsert returns
  `409 persistent_id_conflict` and that account gets no profile until the conflict is resolved.
  Why (structural): the actual relink POLICY (transfer the device to the latest account vs reject
  vs drop the `UNIQUE`) is a T6 / identity-model decision; T5 deliberately only surfaces the
  conflict cleanly. `persistent_id` has no live consumer in Sprint 4 (nothing reads/queries by it;
  stripped from the API), so the edge has no further blast radius. Re-raise only if: T6 (or a
  later identity task) needs the account-switch case to actually create/transfer a profile — then
  implement the chosen relink policy here (or in T6).

## Carry-forward for T6 (not a T5 defect)

- **T6 must call `POST /internal/v1/profile/upsert` on first authenticated join, before any
  crediting.** T5 now provides the endpoint; T6's `ProfileApiClient` spec currently lists only
  `/internal/v1/credit`. Without the upsert call, `creditMatchXp` returns `no_profile` and XP
  never accrues. Also: T6 still owns the decision on **trusting the client-asserted
  `yandexPlayerId`** before crediting/upserting by it (raised in T6's own security note).
- **T6 owns the `409 persistent_id_conflict` UX/policy (from R1).** T5 returns a clean 409 on a
  cross-account device collision; T6 decides what to do with it — transfer the device to the new
  account, surface a "switch detected" message, or accept that the second account simply doesn't
  link the device. Whatever it picks, the T5 endpoint already fails cleanly (no 500, no crash).
