# Worklog — 0017 Citizenship Earned

## 2026-08-23 — Plan (fkit-coder, spawned by lead per ADR-031)

- Verified brief against code; wrote `plan.md`. Key findings: Part A's atomic threshold
  flip already existed in `CREDIT_SQL` (tested); Part C satisfied by the full-navigation
  exit architecture; brief path error (`src/profile-server/`, not `src/server/`).
- **Owner rulings (2026-08-23, via AskUserQuestion relayed through the lead session — plan APPROVED):**
  1. Wire `Citizenship:Earned:XP` now (the brief's stale "no event needed" Analytics
     section loses to the 2026-08-23 Dependencies re-scope + 0021 §6).
  2. Both client-side counting residuals **accepted for MVP** (recorded below).
  3. Keep the current stamp-on-crossing SQL behavior for paid citizens
     (`citizenship_earned_at` stamps; flag/inbox stay suppressed).

## 2026-08-23 — Build, Phase 1 (Docker-free; Phase 2 gated on owner starting Docker Desktop)

Implemented under the approved plan (standing approval, ADR-032 D3 / ADR-019 discipline):

- `src/profile-server/PlayerProfileRepository.ts` — `CreditOutcome` (`status` +
  `citizenshipNewlyGranted`); credit split into `CREDIT_SQL` (ledger insert + xp increment,
  RETURNING locked pre-grant citizenship state) + `GRANT_CITIZENSHIP_SQL` (same
  transaction, same locked row); post-commit no-op seam `afterCitizenshipEarned()`
  with `TODO(0012)` (0019-approved shape).
- `src/profile-server/Routes.ts` — `ProfileRepo` + handler on `CreditOutcome`; wire
  contract unchanged (status-only; flag has no game-server consumer).
- `src/client/flashist/FlashistFacade.ts` — `CITIZENSHIP_EARNED_XP` enum key only.
  **`CITIZENSHIP_CARD_ENABLED` untouched (`false`).**
- `src/client/PlayerProfileView.ts` — `reportEarnedCitizenshipTransition()`: fires the
  event when a fetched profile first shows `citizenship_earned_at` after a stored
  not-earned observation (localStorage per account; never throws).
- `resources/lang/en.json` + `ru.json` — `citizenship_earned.inbox_title/inbox_body`.
- `ai-agents/knowledge-base/analytics-event-reference.md` — event documented.
- Tests: `tests/profile-server/Routes.test.ts` (new outcome shape + 2 forged-body
  tests, verification 6); `tests/client/PlayerProfileView.test.ts` (6 detection tests);
  `tests/integration/PlayerProfileRepository.it.test.ts` extended (newly-granted flags,
  paid-crossing, seeded-past-threshold, concurrent-crossing exactly-once) — **written,
  NOT run: Phase-2-pending (needs Docker)**.

Verification: `npm test` 89 suites / 709 tests PASS; `npm run lint` clean;
`npx tsc --noEmit` exit 0. NOT run (Phase 2): `RUN_DB_TESTS=1 npm run test:integration`,
manual local-stack verifications V1–V6.

### Decision log (ADR-019 audit obligation)

- **Obvious-winner call (in-plan deviation, recorded per ADR-032 A4):** the plan
  sketched a snapshot self-join (`UPDATE … FROM player_profiles prev … RETURNING
  prev.is_citizen`) to detect the false→true flip. During implementation this was
  found unsound under concurrency: with READ COMMITTED, a blocked concurrent credit
  re-evaluates via EvalPlanQual, whose join re-reads the *original snapshot* — both
  racers would see `was_citizen = false` and BOTH report newly-granted (double inbox).
  Replaced with a two-statement same-transaction form: the increment UPDATE locks the
  row and RETURNs its (untouched ⇒ pre-grant, lock-stable) citizenship fields; the
  grant UPDATE then runs on the already-locked row. Exactly-once is what the approved
  plan's own edge-case section required ("exactly one newlyGranted / one inbox
  trigger"), so this stays within the plan's intent; observable behavior (flip, stamp,
  idempotency, paid-crossing stamp per ruling 3) is unchanged and pinned by the
  extended it-tests. New it-test covers the race (`race-1`/`race-2`).
- **Fixes applied without asking:** none (no review round processed this session).

### Accepted residuals (owner ruling 2, 2026-08-23)

1. **Fresh-device under-count:** a grant first observed on a device with no stored
   snapshot (new device / cleared storage) never fires `Citizenship:Earned:XP`.
2. **Paid-crossing over-count:** a paid citizen later crossing 1,000 XP fires the
   event (public projection strips `is_paid_citizen`, so the client cannot tell).

## Open / pending

- Phase 2: `RUN_DB_TESTS=1` integration run + manual local-stack V1–V6 (V3 deferred
  behind the 0012 seam) — blocked on the owner starting Docker Desktop.
- Deferred Live Tail (0062-gated) incl. flip-ON — NOT this build; task must not be
  closed until the tail runs (brief note, 2026-08-23).
