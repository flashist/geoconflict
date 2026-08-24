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

## 2026-08-24 — Phase 2 (Docker verification; owner started Docker Desktop)

Note: the owner committed the Phase 1 work themselves in `e15bac7` ("Sprint push") before
this phase ran — no commit was made by the coder (rule intact).

### Command ledger

| # | Command / action | Outcome |
|---|---|---|
| 1 | `docker ps` + `docker run … postgres:16-alpine` (`gc-0017-it-pg`, port 5433) | Container started + `pg_isready` OK — real container start, not `docker info` exit code |
| 2 | `RUN_DB_TESTS=1 npx jest` (DB `gc_it`) — first run | 2/3 suites pass; **PaymentsRepository.it FAILED in beforeAll** — parallel suites racing migrations on a brand-new DB (pre-existing infra quirk: integration jest config sets no serialization). PlayerProfileRepository suite (all 0017 tests) PASSED even in this run |
| 3 | `RUN_DB_TESTS=1 npx jest tests/integration/PaymentsRepository.it.test.ts` | PASS 4/4 alone — confirms race, not a code defect |
| 4 | `RUN_DB_TESTS=1 npx jest` (schema now present) | **PASS 3 suites / 23 tests** |
| 5 | DROP/CREATE DB + `RUN_DB_TESTS=1 npx jest --runInBand` (cold start, serialized) | **PASS 3 suites / 23 tests** — deterministic cold-start green |
| 6 | `--verbose` on PlayerProfileRepository.it | All 14 pass, incl. `concurrent credits from two different games grant citizenship exactly once` (the race test) |
| 7 | Local stack: DB `gc_local` + `npm run migrate` + `npm run start:profile-server` (:8790, local token) | `/health` + `/ready` 200 |
| 8 | **V1**: upsert `yandex-local-test` → seed 990 XP (SQL) → POST `/internal/v1/credit` +10 (exact ProfileApiClient wire payload + bearer auth) | **PASS** — xp 1000, `is_citizen=t`, `citizenship_earned_at` stamped, paid fields untouched; public projection agrees; wire response status-only |
| 9 | **V2**: re-credit same game; then a later game | **PASS** — `duplicate` no-op (xp unchanged), later game credited, `is_citizen` stays true, `earned_at` byte-identical, ledger 2 rows |
| 10 | **V6**: forged `is_citizen`/`citizenship_earned_at`/`xp` in upsert body + credit item; POST to public route | **PASS** — row shows xp 10/false/null (award 10, not 999999); POST `/v1/profile` → 404 |
| 11 | **V4**: `npm run dev` (PROFILE_API_URL→:8790) + Playwright, `window.YaGames` stubbed (authorized player `yandex-ui-test`), temp local `CITIZENSHIP_CARD_ENABLED=true` | Card logged-in state `990 / 1,000`, detection armed (stored `""`); after +10 credit and the app's own navigation (`window.location.href = "/"` — exactly `changeHref`), card shows **State 3 ГРАЖДАНИН, 1,000/1,000, bar 100%** with no manual reload; `Citizenship:Earned:XP` console-logged **exactly once**; a third load fires nothing. Screenshot: `v4-card-state3.png` (task folder). Console errors: only the known-intentional `/flags/*.svg` 404s |
| 12 | Teardown | Browser closed; dev + profile servers stopped; **`CITIZENSHIP_CARD_ENABLED` reverted to `false`** — `git diff` vs HEAD for `FlashistFacade.ts` is EMPTY (HEAD value is `false`) |
| 13 | Final re-verify | `npm test` 709 PASS, `npm run lint` clean, `npx tsc --noEmit` exit 0 |

### Verification-method notes (honesty ledger)

- **V1 "play one qualifying match":** no live browser match was played. Credits were issued
  at the exact wire seam the game server uses (`/internal/v1/credit`, identical schema +
  auth). The GameServer→ProfileApiClient leg contains **zero 0017 changes** (T6 code,
  already unit-tested), and a live local match cannot credit anyway (no Yandex identity
  outside the platform). The real-match observation is by design the Deferred Live Tail
  (steps 2–3).
- **V4 browser run used a stubbed Yandex SDK** (`window.YaGames` injected; authorized test
  player) — unavoidable locally; everything downstream of the SDK (real client bundle, real
  profile server, real Postgres, real navigation) was genuine.
- **V3 (inbox):** deferred behind the 0012 no-op seam, per brief/plan.
- **V5 (never-spawned ⇒ no credit):** decided in `qualifiesForMatchXp`
  (`hasSpawned` required) — covered by `tests/core/profile/MatchQualification.test.ts`;
  a live local observation is vacuous (see V1 note), live leg lands with the Live Tail.
- **Pre-existing infra quirk (not 0017):** first-ever `RUN_DB_TESTS=1` run against a
  virgin DB can race concurrent migrations across suites; `--runInBand` (or a second run)
  is deterministic. Worth a config `maxWorkers: 1` some day — out of 0017 scope.
- Docker container `gc-0017-it-pg` (port 5433, DBs `gc_it`/`gc_local`) left RUNNING for
  reviewer re-runs; remove with `docker rm -f gc-0017-it-pg`.

## 2026-08-24 — Stateful review round 1 processed (fkit-process-stateful-review)

Owner dispositions relayed 2026-08-24 via the lead session: R1 accepted residual; R2 fix now.

| # | Verdict | Class | Outcome |
|---|---|---|---|
| R1 (unguarded post-COMMIT hook) | PARTIALLY CORRECT — verified at `PlayerProfileRepository.ts:271-274`; unreachable today (no-op body), latent once 0012 fills the seam; identical gap in the 0019 seam | Frontier | No code change. Accepted-residual entry added to review.md with re-raise condition "0012 fills either seam → harden BOTH (0017 + 0019) together". **0012-brief note NOT written** — task-brief edits are producer-owned; flagged back to the lead for the producer. |
| R2 (probabilistic race test) | CORRECT — `Promise.all` forces no lock-boundary overlap; serialized schedules pass without the contested path | Defect (test gap) | **Fixed (test-only, owner-approved):** race test rebuilt on the reviewer's held-lock barrier — third session `SELECT … FOR UPDATE`, both credits verified lock-blocked via `pg_stat_activity` poll (barrier THROWS if both never block ⇒ no vacuous pass), then release ⇒ both statements' READ COMMITTED snapshots predate the first commit ⇒ EPQ contested path every run. |

### Review-round command ledger

| Command | Outcome |
|---|---|
| `RUN_DB_TESTS=1 npx jest --runInBand --verbose tests/integration/PlayerProfileRepository.it.test.ts` (hardened) | PASS 14/14 incl. barrier test |
| **Mutation proof**: CREDIT_SQL temporarily reverted to the snapshot self-join shape → run barrier test | **FAILED deterministically** — both racers `citizenshipNewlyGranted: true` (Received length 2): the hardened test provably exercises the contested path and catches the double-grant defect |
| Mutation reverted | `git diff` vs HEAD on `PlayerProfileRepository.ts`: **0 lines** — production source untouched by this round |
| `RUN_DB_TESTS=1 npx jest --runInBand` (full) | PASS 3 suites / 23 tests |
| `npm test` / `npm run lint` / `npx tsc --noEmit` | 709 PASS / clean / clean |

review.md: Coder response rows R1+R2 written, R1 residual recorded, header **Status: closed-out**.
No commit made this round (per procedure; commit state of the tree not otherwise asserted).

## Open / pending

- ~~Phase 2~~ — DONE 2026-08-24 (ledger above). Ready for review.
- Deferred Live Tail (0062-gated) incl. flip-ON — NOT this build; task must not be
  closed until the tail runs (brief note, 2026-08-23). Live legs of V1/V5 land there.
