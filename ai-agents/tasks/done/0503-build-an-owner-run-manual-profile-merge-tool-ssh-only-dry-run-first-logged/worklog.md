# 0503 — worklog

## 2026-10-27 — build (fkit-coder, Build worker)

Spawned by `fkit-lead` driving `/fkit-sprint-ship-loop` (Sprint 9, plan review OFF) under the ADR-055
declared-approval marker: approved plan = `plan.md` (git blob `271fda24`, carried verbatim), owner
approval quoted verbatim ("Approve, all 7 as recommended (Recommended)", 2026-10-27, `AskUserQuestion`
in the `fkit-lead` session), ADR-128 recorded and accepted before the build. Nothing committed or pushed.

### Change surface

- `migrations/012_player_merges.sql` (new) — audit table; uuid id (no new sequence), no foreign keys.
- `src/profile-server/PaymentsRepository.ts` — `transferPurchase`, `moveRemainingIntents`,
  `readHolderSightings`; header names the second writer of paid state from receipts.
- `src/profile-server/ProfileMergeRepository.ts` (new) — state read, pure `planMerge`, fingerprint SQL,
  the merge transaction, invariants, audit row.
- `src/profile-server/ProfileMergeCommand.ts` (new) — arguments, guard order, output, `MERGE` prompt,
  summary line.
- `src/profile-server/mergeProfiles.ts` (new) — entry point; no `Server`/`Routes`/`Telemetry` import.
- `src/profile-server/PlayerProfileRepository.ts` — the "insert-only" comment above
  `SELECT_BASE_CREDIT_SQL` rewritten.
- `package.json` (`merge-profiles` script), `scripts/config-parity-allowlist.json`
  (`PROFILE_MERGE_OPERATOR`, runtime-supplied).
- Restore drill: `tests/testdata/profile-restore-drill/verify.sql` (14 → 15 tables),
  `tests/profile-backup-dryrun.sh` text, `ai-agents/knowledge-base/profile-backup-restore-runbook.md`
  inventory (15 tables, `012` STOP note, expected counts, migration list).
- `tests/integration/support/db.ts` (truncate list, `countOrphanPlayers` comment),
  `tests/integration/Migration006.it.test.ts` (migration list).
- Junk cleanup: `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md` predicate gains a
  `not exists player_merges` clause; `tests/integration/JunkCleanup.it.test.ts` covers it.
- `ai-agents/knowledge-base/profile-merge-runbook.md` (new) — placeholders only.
- Tests: `tests/integration/ProfileMerge.it.test.ts` (new), `tests/integration/PaymentsRepository.it.test.ts`
  (extended), `tests/profile-server/ProfileMergeCommand.test.ts` (new).
- Not touched: `setup-profile.sh`, deploy scripts.

### Decision log (choices made inside the approved plan, without asking)

Each entry: what, and why it qualified as within the plan's intent (an obvious winner or a detail the
plan left open). No review findings were processed in this unit (Build worker), so no review-fix
entries.

1. **`xp_would_drop` added as a plan-time refusal.** The plan checks "KEEP's XP is never below the
   highest before" inside the transaction after the moves. `planMerge` now predicts the same check, so
   the dry run refuses what the real run would only roll back. The post-move invariant stays as well.
   Qualifies: same rule, same outcome (nothing written), earlier and visible; strictly within intent.
2. **Dry run with nothing to move exits `0`** with `NOTHING TO MOVE` and no fingerprint; a `commit`
   with nothing to move is refused (exit `1`). The plan lists "nothing to move" among refusals; a dry
   run writes nothing either way, and the required 24 h follow-up reads cleaner as "done" than as
   "refused". Qualifies: UX detail of a read-only path; the real run still refuses.
3. **A source's name history moves only when its name moves.** The plan says "move all of that
   source's history rows" in the name-move case and is silent otherwise. Moving a source's rejected or
   cleared rows onto KEEP could make one of them KEEP's newest row and show a stale notice on its card
   (the very thing architect item 3 guards against). A reserved name keeps its history beside it.
4. **Several sources with names, KEEP unnamed:** the first source in `--from` order moves its name; the
   others stay reserved (Q6). Deterministic, operator-controlled, and printed by the dry run.
5. **Tenure swap swaps the rows' contents, not their keys** (`UPDATE … FROM`), so the `(player_id,
   kind)` primary key is never clashed halfway and `granted_at` keeps its microseconds.
6. **Commit transaction is READ COMMITTED after locking**, the dry run REPEATABLE READ READ ONLY. Once
   the merge holds every involved `players` row `FOR UPDATE`, no child row with a foreign key to them
   can commit, and each later statement sees every row that already did; under REPEATABLE READ a row
   committed between the snapshot and the lock grant would be invisible and left behind.
7. **The fingerprint includes the `--into`/`--from` order**, so a fingerprint for one arrangement never
   validates another (tested).
8. **Durable item = any product that is not of kind `citizenship`** (unknown ids count as durable), for
   the "two receipts for the same durable product" refusal; several citizenship receipts on one source
   are allowed, as the plan's transfer test implies.
9. **`transferPurchase` locks both player rows in id order** itself, so it is safe standalone and is a
   no-op re-lock inside a merge; it refuses a receipt the source does not hold.
10. **Before-state** is the involved `players` rows minus `display_name`, as planned; moved counts are
    per source. No identity keys are stored in the audit row (ADR-113: no other table holds a platform id).
11. **`transferPurchase` tests live in `PaymentsRepository.it.test.ts`** as the plan names; the merge
    suite covers the end-to-end moves.

### Checks

All on 2026-10-27, local machine:

- `npx tsc --noEmit -p tsconfig.json` — clean.
- `npm run lint` — clean.
- `npm test -- tests/profile-server/ProfileMergeCommand.test.ts` — 46/46.
- `npm run test:integration` (local `gc-0012-it-pg`) — 15 suites, 235/235 (new `ProfileMerge.it.test.ts`
  23 tests, `transferPurchase` 3 tests).
- `npm run check:config-parity` — 0 REQUIRED on every pipeline.
- `npm run test:scripts:docker` — `RESULT: 55 passed, 0 failed`; "fingerprint IDENTICAL (15 tables, …)",
  `uncovered_tables: none`.
- One full `npm test` through the project lock — 242 suites, 5402/5402, exit 0 (no flake re-run needed).

Not verified: nothing has run on the profile box (not deployed; ships with a profile-image deploy).

## 2026-10-27 — review round 1 processed (fkit-coder, Process-review worker, spawned by fkit-lead)

Standing approval: the owner's round-1 rulings R1–R3 (AskUserQuestion in the fkit-lead session,
2026-10-27), relayed under the ADR-055 marker. No commit, no push.

### Decision log (applied without per-fix asking)

Each entry: finding answered · what changed · why it qualified.

1. **R1** · `profile-merge-runbook.md`: undo wording corrected (undo = restore from backup;
   `before_state` a guide only), new step 2 "confirm a backup from today" (health-marker read, else
   `/opt/profile/backup.sh` + re-read, as the junk-cleanup runbook § 3 does), a "to undo a merge"
   paragraph (restore into a throwaway DB, never in place, copy rows back by hand, owner OK per
   write); steps renumbered; audit-trail paragraph fixed. `migrations/012_player_merges.sql` header
   comment fixed (it claimed `before_state` is what a reversal starts from). · Qualified: verified
   CORRECT, doc + comment only, exactly the owner's R1 ruling. The "throwaway, never in place" line
   is an obvious winner inside that ruling: an in-place restore would roll back every other player's
   writes since the backup.
2. **R2** · `profile-junk-cleanup-runbook.md` § 4: one ⚠️ line above the `cleanup-sql:candidates`
   anchor — needs migration `012`; on an older box drop the last clause, keep the `;`. · Qualified:
   verified CORRECT, one doc line, the owner's R2 ruling; placed outside the fenced SQL so the tested
   block is byte-unchanged.
3. **R3** · `PaymentsRepository.ts`: target's `citizenship_purchased_at` = `least(own, this
   receipt's processed_at)`; source's = `min(processed_at)` of its remaining receipts (null if none);
   stale call-site comment deleted, doc comment rewritten; merge-runbook Purchases row updated; three
   new integration tests (move later / earlier of two dated receipts; target with an earlier own
   receipt keeps it). · Qualified: verified CORRECT (latent), localized to two SQL statements, the
   owner's R3 ruling. **Coder's call inside the ruling:** an earlier date already on the target wins
   (keep-earliest) — it is the first-purchase date the target's own receipt earned, and it matches
   `grantPaidPurchase`'s "never rewrite history" `coalesce`. **Known edge:** the source's date is now
   recomputed even when its earliest receipt stays; on data written by `grantPaidPurchase` the date
   already equals that receipt's `processed_at` (same transaction's `now()`), so no visible change.
4. **Reviewer suggestion — two named sources into an unnamed KEEP** · added one integration test in
   `ProfileMerge.it.test.ts`: `--from` order (later, earlier) → the later's name moves with its
   history plus a new approved row; the other stays reserved. · Qualified as an obvious winner: it
   locks the behaviour of Build decision-log entry 4, which had no test; test-only, existing file.
5. **Reviewer suggestion — concurrency test vs live writers** · not applied. · Not an obvious winner:
   a deterministic two-connection test needs new harness code and timing control, the reviewer's own
   probe already measured no deadlock, and the 24 h follow-up dry run is the designed mitigation.
   Left for the reviewer/owner to raise if wanted.

### Checks (2026-10-27, local)

- `npx tsc --noEmit -p tsconfig.json` — clean. `npm run lint` — clean. Prettier — clean after
  `--write` on `tests/integration/PaymentsRepository.it.test.ts` (my hunk only).
- `npm run test:integration` (local `gc-0012-it-pg`, started and stopped by me) — 15 suites,
  239/239 (was 235: +3 `transferPurchase` date tests, +1 two-named-sources test). Re-run of
  `PaymentsRepository.it.test.ts` after formatting — 32/32.
- One full `npm test` through the project lock — 242 suites, 5402/5402, exit 0.
- Not run: `npm run check:config-parity` (no env/config change), `npm run test:scripts:docker`
  (`verify.sql` untouched this round).

### Follow-ups flagged (not mine to write)

- ADR-128 §3 ("Its before-state makes a hand reversal possible") and Consequences ("reversal is by
  hand from the audit row") now contradict the runbook; §2.1 "`purchased_at` is kept" is imprecise
  for a partial transfer. Architect-owned — an append-only note via `fkit-architect`.
- `0504` (producer-owned) has no "confirm today's backup" step before its commit; the runbook now
  has one (step 2).

## 2026-10-27 — review round 2 processed (fkit-coder, Process-review worker, spawned by fkit-lead)

Standing approval: the owner's R4 ruling ("Add one line", AskUserQuestion in the fkit-lead session,
2026-10-27), relayed under the ADR-055 marker. No commit, no push. Reviewer confirmed R1–R3.

### Decision log (applied without per-fix asking)

1. **R4** · `profile-merge-runbook.md` step 2: one ⚠️ line — no second backup or profile deploy
   later the same UTC day; if one ran, undo from the previous day's backup — plus one sentence of
   why. · Qualified: verified CORRECT (`profile-backup.sh` names the daily object
   `profile-<UTC date>.dump.age`, a fixed key a same-day run replaces), one doc line, exactly the
   owner's R4 wording.

### Checks

- None run: docs only, per the coordinator's brief. Nothing in this change is read by a test (the
  merge runbook has no extracted SQL block).
