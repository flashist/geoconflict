# Review ledger — s4-profile-hash-player-ids

Task: ai-agents/tasks/backlog/s4-profile-hash-player-ids.md
File(s) under review: src/profile-server/YandexIdHash.ts, src/profile-server/Routes.ts,
  src/profile-server/PlayerProfileRepository.ts, src/profile-server/Server.ts,
  src/core/profile/CreditContract.ts, src/core/profile/PlayerProfile.ts,
  src/client/PlayerProfileView.ts, migrations/002_hash_yandex_player_id.sql,
  migrate-profile.sh, setup-profile.sh, package.json, and the profile test suites.
PR: #127 (branch s4-profile-hash-player-ids → dev)
Status: round-2 fixes applied (F1/F4/F6) — closeout; merge pending, go-live still gated on the brief's on-box validation
Reviewers (round 1): Claude code-reviewer + Codex adversarial (both completed — full coverage)
Round 2: process-review of the coder-handoff — all three open items verified CORRECT and applied (2026-06-26)

## Summary

152-ФЗ pseudonymization: the raw Yandex player ID is replaced everywhere at rest by a
keyed HMAC-SHA256 hash (`hashYandexId`, secret server-side pepper). Verified correct:
keyed (not bare sha256), fail-closed on unset/empty/<32-char pepper (asserted at boot),
raw ID never reaches the repo/DB layer, public profile strips `yandex_player_id_hash`,
migration is transaction-wrapped + idempotent, nginx disables access logging on
`/v1/profile`. 47/47 profile tests pass (known-answer HMAC vector confirmed green).

Decision verdict: **⚠️ Changes requested** — 2 confirmed defects (neither strictly
merge-blocking); pepper backup deferred to T8 by design; real go-live is gated on the
brief's on-box validation (dump DB + grep logs for any raw ID = zero).

## Accepted residuals (do-not-re-litigate)

- **Pepper not in the backup cron (DR gap) — deferred to T8** — What: `setup-profile.sh`'s
  cron only `pg_dump`s; the `.id_pepper` file is not backed up, and a fresh-host deploy
  *generates a new pepper* rather than failing closed, so a DB-only restore orphans every
  stored hash. Why (structural): the pepper is already persisted (0600) and **stable across
  redeploys** (env > persisted-file > generate-once), so the normal redeploy path is safe;
  the DR gap only bites on full-host-loss + restore-on-fresh-host. The backup cron is
  **explicitly a skeleton with a named owner** — its own comment says "T8 hardens this to
  nightly + ships to reg.ru S3 and adds a restore drill," and the manual-backup need is
  documented in three places (YandexIdHash.ts, setup-profile.sh, the task brief). Re-raise
  only if: T8 slips past the point where real profiles have accumulated, OR pepper backup is
  pulled into this task's scope. **T8 carry-forward note:** make a fresh-host deploy
  *fail closed* (require a supplied `PROFILE_ID_PEPPER`) when the restored DB has rows but
  no `.id_pepper`, instead of silently generating a new one. (Codex F2, high → assessed low/med.)

- **Credit response echoes the raw Yandex ID (transit-only)** — What: `POST /internal/v1/credit`
  returns `yandexPlayerId` (the raw value) in the HTTP response body so T6 can correlate
  per-item results. Why (structural): 152-ФЗ constrains data **at rest**, not **in transit**;
  the raw ID already transits client→server→profile-server over TLS, and the profile server
  hashes it at its boundary and persists only the hash. This asymmetry is **deliberate and
  documented** ("152-ФЗ NOTE — this is deliberate, do NOT 'fix' the asymmetry" in
  CreditContract.ts); the error path logs only `gameId`. Re-raise only if: the response body
  is ever persisted/logged at rest by a consumer (a T6 concern, not this code). (Claude F3, medium.)

- **`__resetPepperCacheForTests` exported unguarded from a prod module** — What: a test-only
  cache-reset helper is unconditionally exported from `YandexIdHash.ts`. Why (structural):
  server-side only, no HTTP endpoint reaches it, the `__` prefix signals intent; practical
  risk is zero and a `NODE_ENV`/typedoc guard adds ceremony for no behavior change. Re-raise
  only if: the module's export surface becomes security-relevant (e.g. bundled/tree-shaken to
  a reachable context). (Claude F5, low.)

- **`dotenv.config()` return value unchecked in `Server.ts`** — What: a failed `.env` load
  isn't distinguished from a missing var. Why (structural): matches the file's existing pattern
  for every other env var, and `assertPepperConfigured()` already fails closed with an
  actionable message at boot; the only loss is a slightly slower root-cause on misconfig.
  Re-raise only if: this becomes a recurring misconfiguration source on the box. (Claude F8, low.)

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | **F1** (both) — `002` `TRUNCATE … CASCADE` runs with no row-count guard; `apply -y`/CI bypass the only prompt | CORRECT → **medium** (Codex over-rated to critical: empty-DB precondition real, interactive path prompts) | **Defect → Open.** Truncate is the right frontier-move (can't rename raw→hash without leaking the pepper in SQL); the gap is the missing safety rail. Add a fail-closed row-count guard + loud per-migration data-loss warning before `002` runs against any non-empty env. |
| 1 | **F2** (Codex) — pepper absent from backup cron; fresh-host restore regenerates pepper, orphans hashes | CORRECT → low/med | **Accepted residual → deferred to T8** (backup hardening is explicitly that task's scope; pepper already persisted+stable for redeploys). |
| 1 | **F3** (Claude) — credit response echoes raw `yandexPlayerId` | CORRECT but **intentional** | **Accepted residual.** Transit-only, TLS-OK, documented "do NOT fix." |
| 1 | **F4** (Claude) — `Routes.test.ts:204` passes raw-looking `"yandex-2"` to `PersistentIdConflictError` where prod passes a hash | CORRECT → **low** | **Defect (test clarity) → Open.** Use a hash-shaped value (e.g. `"yandex-2-hash"`); leave the `.send({ yandexPlayerId: "yandex-2" })` as-is (route receives raw). |
| 1 | **F5** (Claude) — `__resetPepperCacheForTests` exported unguarded | CORRECT → low | **Accepted residual.** Risk zero; naming convention sufficient. |
| 1 | **F6** (Claude) — no 500-path test for `GET /v1/profile` when repo throws | CORRECT → **low** | **Defect (coverage gap) → Open.** Add a 500 test mirroring the upsert one. |
| 1 | **F7** (Claude) — verify the known-answer digest by running the test | **RESOLVED** | Ran `YandexIdHash.test.ts` → green; the pinned HMAC vector is correct. Closed. |
| 1 | **F8** (Claude) — `dotenv.config()` return unchecked | CORRECT → low | **Accepted residual.** Matches existing pattern; fail-closed boot check already covers the real risk. |
| 2 | **F1** — re-verified against committed code | CORRECT → **medium** (confirmed; defect = missing rail on a frontier-move truncate) | **APPLIED.** Added a fail-closed SQL row-count guard in `002` (`raise exception` when `player_profiles` has rows unless `app.allow_profile_purge='on'`). Chosen over a script-only guard because the **primary apply path is the deploy auto-migrate** (`setup-profile.sh` → `npm run migrate`), which never touches `migrate-profile.sh`'s prompt — only an SQL guard covers all paths. Empty-DB path unchanged (no friction). `migrate-profile.sh` warning judged redundant, not added. |
| 2 | **F4** — `Routes.test.ts:204` | CORRECT → low | **APPLIED.** Changed the `PersistentIdConflictError` mock to `"yandex-2-hash"` (+ clarifying comment); request body `.send({ yandexPlayerId: "yandex-2" })` left raw. (Handoff's "compare `PlayerProfileRepository.test.ts:282`" citation was bogus — that file is 26 lines — but the point held.) |
| 2 | **F6** — GET `/v1/profile` 500 test | CORRECT → low | **APPLIED.** Added `"GET /v1/profile is 500 when the repo throws (and leaks no identity)"` mirroring the upsert 500 test; asserts the body has no `yandex_player_id_hash`. |

## Open / actionable

- _None._ All three round-1 open items (F1/F4/F6) verified and applied in round 2. **577/577 tests pass** (was 576; +1 for the new 500-path test); lint + prettier clean.
- **Caveats carried forward (not open defects):**
  - The F1 SQL guard was **not executed against a live Postgres** in the applying session (Docker unavailable locally). It is exercised by the `RUN_DB_TESTS` integration tests (`tests/integration/*.it.test.ts` apply 001+002) and by the deploy itself. Validate on first apply.
  - The migration runner reads migrations **baked into the deployed image** — the F1 guard only takes effect on the box after `npm run deploy:profile`.
  - Real go-live gate unchanged: on-box, dump the profile DB + grep server/profile logs for any raw-ID pattern after a real login+match → expect **zero**.

Routed to a coder-agent handoff spec: ai-agents/reviews/s4-profile-hash-player-ids-coder-handoff.md (now applied)
