# Worklog — 0275 Re-prove the profile backup restore on the `006` schema

## Part A — build (2026-09-15)

Run: spawned by `/fkit-sprint-ship-loop` (fkit-lead, Sprint 4) as the **Build worker**, Part A only, under
the approved `plan.md` (owner approval via `AskUserQuestion` in the lead session, rulings D1–D5). No SSH,
nothing written on the box, no commit, no index change, no `git stash`/`reset`, no task-file move, no wiki
write. S2 (`0271`)'s files not touched.

### Pre-flight
- `plan.md` re-hashed with `git hash-object`: `73c436c7…`, matches the carried hash.
- Docker daemon up (28.5.1). Tools present: age, age-keygen, rclone, curl, jq, node 24.13.0; `node_modules/ts-node` and `node_modules/pg` present. Host bash is 3.2 (`/bin/bash`). Port 55433 free.

### Change surface
New:
- `tests/testdata/profile-restore-drill/seed.sql` — 68 synthetic rows across the 9 data tables; refuses if any data table has a row.
- `tests/testdata/profile-restore-drill/verify.sql` — coverage line, 10-table counts + digests, 2 sequences, constraint/index definition digests, partial-index count, spot checks.
- `tests/testdata/profile-restore-drill/behaviour.sql` — (a), (a2), (a3), (b), (c), each printing an exact labelled line.
- `tests/testdata/profile-restore-drill/cleanup.sql` — deletes drill receipts + drill players (cascade), prints counts + `schema_migrations`.
- this `worklog.md`.

Modified:
- `tests/profile-backup-dryrun.sh` — schema built by the real runner (`npm run migrate`); shared seed; migration-list checks; TEST 2 rewritten (10-table count loop, `schema_migrations` equality, identity-join row check, Cyrillic check, `verify.sql` diff); new TEST 2b (behaviour) and TEST 2c (cleanup); TESTs 3, 4, 5, 6, 8 unchanged; header updated.
- `ai-agents/knowledge-base/profile-backup-restore-runbook.md` — §"Restore TEST drill" rewritten for `006` (steps 0–7, expected lines, new pass criteria); old pass criteria struck and kept; dated `006` note on the 2026-09-11 "eight tables" history line; residual-5 / deploy-smoke warning.

### Verification
- **Dry-run, run 1:** `RESULT: 50 passed, 3 failed`. All 3 failures were my fixture bug: `format('%s', <boolean>)` renders `t`, not `true`, in `behaviour.sql` lines `(b) before`, `(b) receipt kept`, `(c) non-colliding`. Fixed with `::text` casts.
- **Dry-run, run 2 (final):** `RESULT: 53 passed, 0 failed`, exit 0. Old N was 24.
  - Source built by the real runner: `applied: 001…004, 006`, `migrations up to date`. **Fallback not used.**
  - `schema_migrations` on source and restored: `001_player_profiles.sql,002_yandex_payments.sql,003_player_messages.sql,004_name_change.sql,006_player_identity.sql` (equals the repo listing; contains 006; no 005).
  - Counts matched on all 10 tables (players 8 · player_identities 9 · player_match_xp_credits 24 · player_name_history 6 · player_cosmetic_ownership 4 · purchase_intents 5 · processed_purchases 3 · player_messages 6 · player_xp_grants 3 · schema_migrations 5 — the harness's table order); `3000000000|true|true|DrillAlpha` for identity `drill0275-yg-01`; Cyrillic bytes > chars on source and restored; `verify.sql` diff empty (`fingerprint IDENTICAL`); `uncovered_tables: none`.
  - TEST 2b lines, as printed:
    ```
    (a) rejected: sqlstate=23505 constraint=player_name_history_one_pending_uq
    (a2) rejected: sqlstate=23505 constraint=player_match_xp_credits_pkey
    (a3) rejected: sqlstate=23505 constraint=player_identities_pkey
    (b) before: identities=1 credits=3 name_history=1 cosmetics=2 intents=1 messages=1 xp_grants=1 receipt_intent_set=true
    (b) left: identities=0 credits=0 name_history=0 cosmetics=0 intents=0 messages=0 xp_grants=0
    (b) receipt kept: rows=1 intent_id_null=true
    (b) rolled back: players=8
    (c) non-colliding next id: true
    (c) gap=2
    ```
  - TEST 2c: all 9 data tables 0; `schema_migrations` unchanged.
  - Dump size with seed: 24216 B encrypted (empty-DB runs afterwards: 22238 B locally).
- **Negative controls (one-off, scratch container, not in the harness):** on a runner-built + seeded DB, `verify.sql` output changed for each of: FK re-added without `on delete cascade` (constraint digest changed, count still 30); partial index re-created without `where` (index digest changed, partial count 3→2); `setval` lost (sequence line changed); a stray table (`uncovered_tables: stray_table`). `behaviour.sql` (b) with a non-cascading credits FK printed an ERROR and no `(b) left` / `(b) receipt kept` lines. Re-running `seed.sql` on the seeded DB: `ERROR: drill seed refused: players holds rows`. Container removed.
- **Local shape numbers (runner-built `006`):** 30 public constraints, 17 public indexes, 3 partial indexes; both sequences `6 | t` after seed.
- **Brief check 3:** `grep -n 'player_profiles\|yandex_player_id'` over the harness and the runbook → **no hits at all** (exit 1).
- **`npm test`:** exit 0 — 126 suites / 1495 tests passed (run against the working tree as it was, including S2's in-progress edits at that moment).
- **Fixture md5s at Part A hand-off** (superseded — see Review round 1 below for current values):
  `seed.sql 27d8534660a02d736669b68f0c47b46f` · `verify.sql 43c292c87115e59cb3f773f6e3f29427` · `behaviour.sql 0c6d7f836299a7cbf1d18e8f80f99bb9` · `cleanup.sql 1ec92668e1a3cec5589dcb744de84ef1`

### Decision log (calls made without asking, under the standing approval)
1. **Associative array → counts file** in the harness. Finding: `declare -A` fails on macOS bash 3.2. Changed: source counts written to `$WORK/source-counts.txt`, read by `src_count`. Why it qualified: mechanical, same checks, inside plan §3.6.
2. **Boolean `::text` casts in `behaviour.sql`.** Answers run 1's 3 failures. Changed: 3 `format()` arguments. Qualified: verified-CORRECT fix to my own fixture, localized, in plan §2.
3. **Behaviour checks via `DO` blocks + `get stacked diagnostics`**, printing `sqlstate` and `constraint` in one exact line (instead of relying on a raw psql ERROR). Added two lines beyond the plan's list: `(b) before: …` (proves the cascade counts are not trivially 0) and `(b) rolled back: players=8`; `(c)` prints `gap=N` separately. Qualified: plan §2 asks for "each check prints a labelled line"; this is the obvious way to make them exact; within intent. The harness asserts `gap=2`; the runbook marks gap as informational because a box sequence used earlier would give a larger gap.
4. **Cleanup pattern narrowed** from the plan's `id::text like '00000275-%'` to `'00000275-0000-4000-8000-%'`. Qualified: narrower, never wider (plan's own rule); matches exactly the seed's uuid block; obvious winner within intent.
5. **No automatic fallback coded** in the harness for the migration runner. The runner started locally, so plan §3.2's fallback was not needed; an automatic fallback would hide a broken runner, which is what ADR-113 wants tested. Qualified: in plan (fallback was conditional).
6. **`verify.sql` extras:** constraint digest keyed `table.conname:def` (not just `conname:def`, for deterministic order); an added `partial_indexes` count line. Qualified: strictly more detection, in plan §2 intent.
7. **Seed size 68 rows** vs the plan's "about 60"; row counts per table are exactly the plan's.
8. **Runbook drill restructured into steps 0–7** that include seed, backup, cleanup and the Q-style checks (not only the plan §4's edited steps 1–4), so the section can be followed end to end with the shared files. ⚠️ Flag for review: this is a wider rewrite of the section than §4's bullet list; content follows §4 + §5 exactly.
9. **Runbook `/ready` line** uses the loopback URL form already recorded in `0218`'s plan (`127.0.0.1:8080`). No box host, IP, bucket or endpoint written; scp uses `root@<box>` placeholder.
10. **Negative-control run** done ad hoc in a scratch container (no repo files), not added to the harness — not in the plan's change list.
11. **Timing-table `0275` row not added** — it needs Part B's `real` time.

### Residuals
- Dry-run stays out of `npm test` (by design; plan §3.10).
- Not proven locally: box network, reg.ru S3, real age key, the box's actual schema, restore timing on the box, `/ready` after the drill, cron.
- `CLAUDE.md`'s dry-run tool list is now further behind (also needs `node`, installed packages, free port 55433) — D4: producer fixes later.
- `minio/minio` image is unpinned (pre-existing).
- The migration runner prints a Node `ExperimentalWarning` / `DEP0180` in the harness output (noise, not failure).

### Part B readiness
- Ready once Part A is reviewed. The driver scps the four fixtures **from this working tree** (uncommitted) and records md5s on both sides (B0).
- Expected on the box after runbook steps 1–2: counts, in verify.sql's (alphabetical) output order, player_cosmetic_ownership 4 · player_identities 9 · player_match_xp_credits 24 · player_messages 6 · player_name_history 6 · player_xp_grants 3 · players 8 · processed_purchases 3 · purchase_intents 5 · schema_migrations 5; `uncovered_tables: none`; step 6 lines as above (gap may differ if the box sequence was ever used).
- Slot rules unchanged (D3): before S2's box deploy, 03:15–23:30 UTC, not a Sunday, no deploy, no S2 test login.

## Review round 1 — process-review (2026-09-15)

Run: spawned by `/fkit-sprint-ship-loop` as the **Process-review worker** for `review.md` R1–R7, with the owner's
rulings (R1, R2, R3, R5, R6 → fix; R4, R7 → accepted residuals). Only 0275's files touched. No box contact,
no commit, no stash.

### Verification of each finding (before fixing)
- **R1 — CORRECT.** Runbook step 4 said `decryption failed => STOP and escalate; delete nothing` above the only `shred -u`; `download failed`, `pg_restore failed` and a default-deny typo had no instruction. An aborted drill could leave the identity on the box.
- **R2 — CORRECT.** Only the mangled-text branch pointed at cleanup; every other STOP after seeding left 68 drill rows in the live DB, and a re-run would then be refused by `seed.sql`.
- **R3 — CORRECT, reproduced locally.** Two `verify.sql` runs cut short at the same statement (a renamed table) exit 3 and produce byte-identical files, so a plain `diff` says identical. A missing input file likewise gives two empty, identical outputs. The harness was already protected (it checks psql's exit status); the runbook was not.
- **R5 — PARTIALLY CORRECT.** Values were right; they had no table labels, and the order matched neither verify.sql's alphabetical output nor the worklog.
- **R6 — CORRECT.** Runbook pass criteria referred to "the `schema_migrations` list before the drill", but no step recorded it; plan §5's P-checks and `0218`'s safety rules lived only in plan.md; the identity step lacked "present/0600, never size".
- **R4, R7** — accepted residuals by owner ruling; not re-litigated, no change.

### Changes
- `verify.sql`: end-of-file sentinel `\echo 'verify_end: complete'` as the last output line, plus a header note (R3).
- `tests/profile-backup-dryrun.sh`: 2 new checks — the sentinel is present in the source and the restored output (R3; keeps the shared file's sentinel tested).
- Runbook §"Restore TEST drill":
  - New **Before you start**: whole-drill rules (root, one shell session, never CONFIRM_LIVE, never `env`/`set`/`cat backup.env`, redaction, identity reported only as "present, 0600", no in-place edits, `${PIPESTATUS[0]}`, any STOP after seeding → abort path, with its deadline) and read-only pre-drill captures P1–P5 (compose health + `/ready`, UTC time/weekday + no `restore-test`, network name + volume baseline, file copy + md5s, per-table counts + `schema_migrations` list + both sequences into `before.txt`) (R6).
  - Step 2: `SRC_EXIT=${PIPESTATUS[0]}` + sentinel check; counts labelled by table name in verify.sql's output order (R3, R5).
  - Step 4: identity copy with `chmod 600` + `stat -c '%a'` (reports 600 only); optional `grep -cxF "PROFILE_BACKUP_AGE_RECIPIENT=$(age-keygen -y …)"` count check, with a "command not found → skip" note; `RESTORE_EXIT` captured; **4b shreds unconditionally, before reading the outcome**; every failure shape → abort path; "delete nothing" scoped to backup objects and markers (R1).
  - Step 5: diff runs only if both exits are 0 and both outputs end in the sentinel; otherwise prints `INCOMPLETE` (R3).
  - New **Abort path** (also the normal step 7): A1 identity gone, A2 throwaway + volume gone, A3 `cleanup.sql` tee'd to `after.txt` with exit check, counts line, and `diff` of the `schema_migrations:` lines against `before.txt` → `MIGRATIONS UNCHANGED`, A4 `/ready`, A5 paste back + remove files. States the deadline and that backup objects/markers are never deleted (R2, R1).
  - Pass criteria updated to the sentinel/exit conditions and `MIGRATIONS UNCHANGED`.
- This worklog: counts relabelled (R5).

### Evidence
- **Rehearsal of the new shell steps, local scratch container** (`docker exec` in place of `compose exec`; box-only commands `stat -c`, `shred`, `age-keygen` against the real identity, `curl /ready` not rehearsed):
  - P5 query verbatim from the runbook: `exit=0`, `before counts: …=0` ×9, `schema_migrations: 001…,006_player_identity.sql`, `sequences: …=1/f …=1/f`.
  - Seed → `COMMIT`; step 2/5 capture: `verify_exit=0`, last line `verify_end: complete`, step 5 check → `IDENTICAL`.
  - Missing input file on both sides: exits 1/1 → `INCOMPLETE`.
  - Both runs cut short at the same statement: exits 3/3, plain `diff -q` reports no difference, step 5 check → `INCOMPLETE`; still `INCOMPLETE` with both exits forced to 0 (sentinel alone catches it).
  - A3: `exit=0`, counts all 0, `MIGRATIONS UNCHANGED`.
- **Dry-run:** `RESULT: 55 passed, 0 failed`, exit 0 (was 53; +2 sentinel checks).
- **Brief check 3 grep:** still no hits.
- **Fixture md5s now:** `seed.sql 27d8534660a02d736669b68f0c47b46f` (unchanged) · `verify.sql 7b86b0576eb97907992228f8e645f0cc` (changed) · `behaviour.sql 0c6d7f836299a7cbf1d18e8f80f99bb9` (unchanged) · `cleanup.sql 1ec92668e1a3cec5589dcb744de84ef1` (unchanged).
- `npm test` not re-run this round: no file it runs changed (the dry-run and fixtures are outside jest).

### Decision log (applied under the standing approval + owner rulings)
1. **R1** — answers R1. Changed: step 4/4b restructured; shred first on every outcome; A1 in the abort path. Qualified: owner ruling "Always delete the key"; documentation-only, localized to the drill section, inside plan §5 (B4/B7) intent. The `age-keygen -y` check is the ruling's optional element, written so it prints only a count.
2. **R2** — answers R2. Changed: new abort path with counts-back and `schema_migrations` checks and the deadline; each STOP now points to it. Qualified: owner ruling; mirrors plan §5 B10/B11/Q.
3. **R3** — answers R3. Changed: `verify.sql` sentinel; runbook exit + sentinel gate before diff; 2 harness checks. Qualified: owner ruling; mechanical; proven by the rehearsal above and the dry-run.
4. **R5** — answers R5. Changed: labelled counts in verify.sql order in the runbook and worklog. Qualified: owner ruling; mechanical.
5. **R6** — answers R6. Changed: "Before you start" block. Qualified: owner ruling; content is plan §5 P1–P9 + `0218` §1 rules.
6. **Obvious-winner calls inside those fixes:** (a) the step-7 content moved into the abort path so the normal end and the failure end are one procedure, not two copies that could drift; (b) `before.txt`/`after.txt` files so the `schema_migrations` comparison is a `diff`, not an eyeball; (c) step 6 failures continue into step 7 rather than stopping, since step 7 is the abort work anyway; (d) P9-style "no deploy in flight / S2 test-login status" stays in the **Slot** paragraph rather than as a command, since neither is checkable from the box.
7. **R4, R7:** none — accepted residuals.

## Review round 2 — process-review (2026-09-15)

Owner ruling R8 + R9 → "Fix now". Runbook-only; no fixture change, so no dry-run re-run; md5s unchanged. The owner was running Part B from the runbook at the time, so no command in P1–A3 was touched.
- **R8 — CORRECT, fixed.** The retention note claimed tonight's 02:30 run "replaces" today's object; `profile-backup.sh:134-136` keys by the run's UTC date, so that run writes the next date's key and only `last-backup.json` is replaced. Rewrote the note: drill rows stay for the full 14 days (D5); a same-date profile deploy's smoke backup would overwrite it.
- **R9 — CORRECT, fixed.** A4 gains `docker compose ps` and a `/health` curl (loopback form from `0218`'s plan) next to `/ready`.

### Decision log
1. R8 — answers R8; changed one prose paragraph; qualified: owner ruling, verified against the script, docs-only. Added the same-date-deploy caveat (obvious winner: it is the section's own top warning, restated so the corrected sentence is not wrong in the other direction).
2. R9 — answers R9; added two commands to A4 only; qualified: owner ruling, mechanical, mirrors `0218` E5/F2.

## Part B — the drill on the box (2026-09-16, OWNER-EXECUTED)

**Run by the owner on the live profile box, step by step, relayed live through the `fkit lead` session
(`/fkit-sprint-ship-loop`). The lead ran only read-only checks itself (SSH, no writes); every command that
wrote anything was executed by the owner.** Redaction rule held throughout: no bucket, endpoint, host or IP
in this record; the age identity is reported only as "present, 0600".

### RESULT: ✅ PASS — `IDENTICAL`. The restore path is proven for the first time on this project.

This closes the standing 🚨 in project memory and in `0218`: *"NOT proven — THE RESTORE PATH HAS NEVER BEEN
TESTED."* It is now tested, on the `006` schema, with non-empty data.

### Pre-drill state (P1–P5) — lead-run, read-only, 2026-09-16 ~12:17 UTC
- Both services healthy (postgres up 47 h, profile-api up 25 h); `/ready` **200**.
- Slot: Wednesday 12:17 UTC — inside 03:15–23:30 UTC, not a Sunday. No leftover `restore-test`.
- Compose network **`profile_default`** (measured, not assumed). Dangling-volume baseline **5**.
- All 9 data tables **0 rows**. `schema_migrations`: `001,002,003,004,006_player_identity.sql`. Both
  sequences `1/f`.
- ⚠️ **`before.txt` was not written during P5** — the lead ran that query read-only, without the `tee`. It
  was reconstructed from the captured output before step 7 and is byte-recorded below. A repeat of this
  drill should let the operator run P5 so the file is produced by the same command that produced the values.

### Fixture md5s — repo and box, compared both sides
`seed.sql 27d8534660a02d736669b68f0c47b46f` · `verify.sql 7b86b0576eb97907992228f8e645f0cc` ·
`behaviour.sql 0c6d7f836299a7cbf1d18e8f80f99bb9` · `cleanup.sql 1ec92668e1a3cec5589dcb744de84ef1` —
**all four identical on the Mac and on the box**, and unchanged from Part A's review-round-1 values.

### Steps 1–2 — seed + fingerprint + backup
- Seed committed. Cyrillic survived the INSERT: `Дрилл Чарли` 11 chars / **21 bytes**, `О'Дрилл-Тест`
  12 chars / **22 bytes** — bytes > chars on both.
- ⚠️ **The owner lost the terminal scrollback for steps 1–2.** Recovered without re-running anything that
  writes: `source.txt` had been `tee`'d to the box and was read back by the lead read-only, and the live
  row counts were re-queried and matched the fingerprint exactly. `SRC_EXIT` was re-established by re-running
  **step 2's verify command only** (never the backup), which the runbook names as the remedy for a lost
  `SRC_EXIT`; the re-run produced a byte-identical `source.txt`, which is itself evidence the source DB did
  not drift between the two runs.
- **Source fingerprint** (`source.txt`, 2836 bytes, md5 `db21effa1a99d9d061144bb28ba443c9`):
  `uncovered_tables: none`; counts `player_cosmetic_ownership 4 · player_identities 9 ·
  player_match_xp_credits 24 · player_messages 6 · player_name_history 6 · player_xp_grants 3 · players 8 ·
  processed_purchases 3 · purchase_intents 5 · schema_migrations 5`; sequences `player_messages_id_seq 6/t`,
  `player_name_history_id_seq 6/t`; **30** public constraints (digest `8e380343…`), **17** public indexes
  (digest `e1ab68b1…`), **3** partial indexes; spot checks incl. bigint xp `3000000000`, jsonb `значение`,
  2 NULL display names, 1 receipt without intent, 3 unread messages, moderation 3/2/1, the quote-heavy body,
  and 2 identities on player `…0001`; sentinel `verify_end: complete`; `verify_exit=0`.
- **Backup:** `backup OK`, exit 0, 12:58:02–12:58:04 UTC, 24 225 bytes, upload **verified**, prune ran.
  Marker `last-backup.json` `exit_status: 0`. Object key taken **from the marker**, not from `date`.

### Steps 3–4b — throwaway, identity, restore
- `restore-test` started on `profile_default`; `pg_isready` **accepting connections** (the owner's first
  attempt printed "no response" because it ran the instant the container started — retried by the lead).
- Throwaway confirmed **empty** (0 tables in `public`) before the restore, so the compare could not pass on
  pre-existing data.
- Prod container resolved `restore-test` by name — the P3 network value is correct in practice, not just on paper.
- Identity copied over transiently: **present, 0600**. Recipient check printed **`1`** — correct key for this
  box. (Three copies of that identity exist on the owner's Mac, all matching; flagged separately as a key-custody
  item, not part of this drill.)
- **Restore:** `target host 'restore-test' matches PROFILE_RESTORE_REMOTE_HOST — proceeding with
  distinct-remote restore` → download → decrypt → `pg_restore into target` → **`restore complete`**,
  `restore_exit=0`. **`real 0m1.252s`.**
- **Identity shredded immediately after 4a**, before reading its outcome: `No such file`. ✅

### Step 5 — the compare
`verify_exit=0` on the restored DB, sentinel `verify_end: complete`, and **`IDENTICAL`**.
`restored.txt` is 2836 bytes, md5 **`db21effa1a99d9d061144bb28ba443c9`** — **byte-identical to `source.txt`**,
re-confirmed off-box by the lead with its own `diff`. All 10 tables, both sequences, and the constraint- and
index-**definition** digests match.

### Step 6 — behavioural checks (restore-test only)
**All eight expected lines printed verbatim**, the three rejections included — the restored DB still enforces
its constraints:
```
(a)  rejected: sqlstate=23505 constraint=player_name_history_one_pending_uq
(a2) rejected: sqlstate=23505 constraint=player_match_xp_credits_pkey
(a3) rejected: sqlstate=23505 constraint=player_identities_pkey
(b) before: identities=1 credits=3 name_history=1 cosmetics=2 intents=1 messages=1 xp_grants=1 receipt_intent_set=true
(b) left: identities=0 credits=0 name_history=0 cosmetics=0 intents=0 messages=0 xp_grants=0
(b) receipt kept: rows=1 intent_id_null=true
(b) rolled back: players=8
(c) non-colliding next id: true
(c) gap=2
```
`gap=2` is the documented, correct value on a fresh sequence — the failed inserts in (a) consume sequence
values because sequences are non-transactional. Not an anomaly.

### Step 7 — teardown and live cleanup
- **A1** identity: `No such file`. ✅
- **A2** `restore-test` removed **with its volume**; no `/tmp/profile-restore.*` left; dangling volumes back
  to **5** — exactly the P3 baseline. ✅
- **A3** `cleanup.sql`: `DELETE 3` (receipts, which have no FK) + `DELETE 8` (players, cascading), `COMMIT`,
  `exit=0`. **All 9 data tables back to 0.** `MIGRATIONS UNCHANGED`. ✅
- **A4** both compose services **up (healthy)**; `health=200`, `ready=200`. ✅
- **Post-drill state re-verified by the lead, read-only, 13:19 UTC:** live `players=0`, 0 throwaway
  containers, 5 dangling volumes, identity **absent**, backup marker intact.
- Sequences remain advanced (gaps). Harmless by design; **not** reset, as the runbook requires.

### Recorded RTO — third drill, first on the `006` schema

| Drill | Data | Target | Wall clock |
|---|---|---|---|
| 2026-07-01 | empty (0 rows) | throwaway, off-box on a Mac | ≈ 0.1 s |
| 2026-09-11 | 76 synthetic rows / 7 tables | throwaway `restore-test` on the box | `real 0m0.374s` |
| 2026-09-11 | same | LIVE DB, in-place, socket target | `real 0m0.435s` |
| **2026-09-16** | **`006` schema, 68 synthetic rows / 10 tables, 24 225-byte object** | **throwaway `restore-test` on the box** | **`real 0m1.252s`** |

🚨 **Still NOT a usable RTO for a real outage.** This is a 24 KB dump. It proves the *path* works and is not
pathologically slow; it says nothing about restore time at real data volume. That caveat is unchanged from
`0218` and must not be dropped when this figure is quoted.

### Evidence files
Collected off-box by the lead, read-only, before deletion:
`before.txt` 403 B md5 `2962c617e505a889eba3f43ff8074572` · `source.txt` 2836 B md5 `db21effa1a99d9d061144bb28ba443c9` ·
`restored.txt` 2836 B md5 `db21effa1a99d9d061144bb28ba443c9` · `after.txt` 428 B md5 `2dd7be4e326e6e55e626a1f3d614fcf2`.

### Residuals from Part B
1. **The drill's synthetic rows are inside today's daily backup object** (`…/daily/profile-2026-09-16.dump.age`,
   24 225 bytes) and stay for its full **14-day** retention. Owner-accepted (D5). Tonight's 02:30 UTC run writes
   the **next** date's key and does not replace it. ⚠️ **A profile deploy on 2026-09-16 UTC would overwrite it via
   its smoke backup** — harmless now that the drill is finished, but it is why no deploy ran during the drill.
2. **`before.txt` was reconstructed, not produced by P5's own `tee`** (see above). A future drill should produce it
   in-line.
3. The RTO caveat in the table above.
4. **Key custody, outside this task:** three unencrypted copies of the age identity exist on the owner's Mac
   (`~/profile-backup-identity-2026-09.txt`, and two in `~/Downloads/`), all `0600` and all matching the box's
   configured recipient. The runbook asks for a password manager. Raised with the owner; to be filed separately.
