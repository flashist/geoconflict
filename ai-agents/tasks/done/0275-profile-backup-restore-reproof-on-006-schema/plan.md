# Plan — 0275 · Re-prove the profile backup restore on the `006` schema (approved)

## Approval record

- Written by the driver (`fkit-lead`, `/fkit-sprint-ship-loop`) at approval, 2026-09-15, copied from the
  plan-only `fkit-coder` worker's return. Approved by the owner via `AskUserQuestion` in the lead session:
  **"Approve"** — including D2 (shared SQL files) and D4 (CLAUDE.md tool-list drift fixed later by the producer).
- Earlier owner rulings on the brief (2026-09-15): restore target "Throwaway database" (clarified by D1 below),
  "Manual backup is enough", "One task".
- Owner rulings on the plan's NEEDS-DECISION items (2026-09-15):
  - **D1 — "Separate container"** (option A): throwaway `restore-test` Postgres container on the box network;
    live Postgres gets no DDL; teardown `docker rm -f -v`.
  - **D2 — shared SQL files** in `tests/testdata/profile-restore-drill/` (option A).
  - **D3 — "Right after Part A, before S2 deploy"**: Part B runs as soon as Part A is green and reviewed, before
    S2 (0271)'s box deploy; no deploy and no S2 test login during the drill; 03:15–23:30 UTC; not a Sunday.
  - **D4 — CLAUDE.md** dry-run tool list drift (node + installed packages): not edited in this task; the
    producer fixes it later.
  - **D5 — "Accept"**: today's daily backup object keeps synthetic drill rows until it expires (14 days).

---

## Worker summary
- **The ruling's wording didn't match the documented drill** — resolved by D1 (container, not a second database).
- **Seeding the throwaway alone does not prove the backup.** `profile-backup.sh:147` only ever dumps the live compose database. So: seed live → fingerprint → back up → restore into the throwaway → compare → delete the seed rows. The seed file refuses to run if any data table already has rows.
- **Main design choice (D2):** one set of SQL files (seed, verify, behaviour checks, cleanup) is used both by the local dry-run and by the owner on the box, so every SQL step is tested locally before the owner runs it (`0218` found a broken plan step only while running it).
- **Local tools all present, checked read-only:** docker (daemon up, 28.5.1), age, age-keygen, rclone, curl, jq, node 24.13.0. `postgres:16-alpine` and `minio/minio` images are cached. No host psql or shred, and none is needed.
- **Sequencing:** Part B must not overlap any profile deploy (each deploy's smoke backup writes to the same daily object), S2's test-login check, or 02:00–03:15 UTC. It must finish before `0273` deploys. No edits to S2's files.
- **Effort:** Part A about 1 dev day. Part B about 1–1.5 h of guided owner time, plus about 0.25 d to write it up.

## 0. Inputs used
- **Brief:** `0275/brief.md`.
- **`0218`:** brief, `plan.md` (§1 safety rules, A2–A6, B1–B3, C1–C6, F1) and `worklog.md` (findings #1/#4, residuals 1, 2, 5).
- **Migrations:** `migrations/006_player_identity.sql`, `src/profile-server/Migrations.ts` and `migrate.ts`.
- **Scripts:** `profile-backup.sh` (guard at `:223-238`, dump at `:147`, restore at `:259`) and `tests/profile-backup-dryrun.sh`.
- **Runbook:** `profile-backup-restore-runbook.md`.
- **Other:** ADR-113 `:153`; `0271/plan.md` §10 (S2 box check: test login row plus delete); `setup-profile.sh:1011` (migrate on deploy) and `:1281` (smoke backup on deploy).

**The `006` tables** (10 base tables, counting `schema_migrations`):
- `players`, `player_identities`
- `player_match_xp_credits`, `player_name_history`, `player_cosmetic_ownership`
- `purchase_intents`, `processed_purchases`, `player_messages`
- `player_xp_grants`, `schema_migrations`

**Other shape the restore must keep:**
- Sequences: 2 (`player_name_history_id_seq`, `player_messages_id_seq`).
- Partial indexes: 3 (`players_display_name_uq`, `player_name_history_one_pending_uq`, `player_messages_unread_idx`).
- `processed_purchases.player_id` has **no foreign key**. Receipts outlive a deleted player, so cleanup must delete them explicitly.

## 1. Change surface
| File | Change |
|---|---|
| `tests/profile-backup-dryrun.sh` | edit: builds the schema with the real runner, new seed, new round-trip checks, cleanup check |
| `tests/testdata/profile-restore-drill/seed.sql` | **new** (D2) |
| `tests/testdata/profile-restore-drill/verify.sql` | **new** (D2) |
| `tests/testdata/profile-restore-drill/behaviour.sql` | **new** (D2) |
| `tests/testdata/profile-restore-drill/cleanup.sql` | **new** (D2) |
| `ai-agents/knowledge-base/profile-backup-restore-runbook.md` | edit: §"Restore TEST drill" and its pass criteria; new timing-table row after Part B |
| `0275/worklog.md` | new, during build and drill |

**Not touched:**
- `profile-backup.sh` (the brief says a defect there is raised as a finding first)
- `setup-profile.sh`, `build-deploy-profile.sh`, `example.env.profile`
- the hardening harness, `ShellHarnesses.test.ts`, `Routes.ts`
- `CLAUDE.md` (D4), `src/`, the wiki

## 2. Part A — shared SQL files (D2)

Text ids use the prefix `drill0275-`. UUIDs use the block `00000275-0000-4000-8000-0000000000NN`. Everything is synthetic.

**`seed.sql`**
- Starts with `\set ON_ERROR_STOP on`, `client_encoding UTF8`, `timezone UTC`, then `begin;`.
- Then a check block that raises `drill seed refused: <table> holds rows` if **any** of the 9 data tables has a row. This writes the "only free while the DB is empty" rule into the file itself, so nobody can run it after `0273` by mistake.
- About 60 rows:
  - **`players` (8):**
    - xp `3000000000` (above the 32-bit integer range)
    - 2 with NULL `display_name`
    - Cyrillic names `Дрилл Чарли` and `О'Дрилл-Тест` (includes an apostrophe)
    - paid, earned and plain citizen combinations covering all 3 CHECK rules
    - one nested `extra` jsonb value
    - `schema_version` 2 on one row
    - one timestamp written with a non-UTC offset
  - **`player_identities` (9):** one player has 2 identities (many-per-player).
  - **`player_match_xp_credits` (24):** 3 per player; every 4th row has a non-default `xp_awarded`.
  - **`player_name_history` (6):** 3 approved, 1 rejected (Cyrillic reason), 2 pending on 2 **different** players.
  - **`player_cosmetic_ownership` (4):** both `flag` and `pattern`.
  - **`player_messages` (6):** both content shapes (template and literal title+body), read and unread, and a body containing `' " — & %`.
  - **`purchase_intents` (5):** 4 with explicit uuids, 1 using the default.
  - **`processed_purchases` (3):** one linked to an intent, one with NULL intent, one whose intent belongs to a player the cascade check deletes.
  - **`player_xp_grants` (3):** one with `xp_awarded = 0`.
- Ends with `commit;`.

**`verify.sql`** (psql `-X -f`)
- Session settings: `ON_ERROR_STOP on`, `client_encoding UTF8`, `timezone 'UTC'`, `datestyle 'ISO, YMD'`. These are needed so identical databases give identical digests.
- **Coverage line:** `uncovered_tables: none`. Computed from `information_schema` minus the covered list. When a future `007` adds a table, the output shows its name instead of `none`, so a hard-coded list can't silently skip it again.
- For each of the 10 tables: row count and `md5(string_agg(row_to_json(t)::text,'|' order by <pk>))`.
- Both sequences: `last_value`, `is_called`.
- **Schema shape:**
  - constraint count plus `md5` of `conname:pg_get_constraintdef` — catches a lost `on delete cascade`, not just a lost name
  - index count plus `md5` of `indexname:indexdef` — catches a lost partial `where` clause, which `0218`'s name-only digest could not
- **Spot checks:** the bigint xp, a jsonb path, chars vs bytes on the Cyrillic names, NULL counts, moderation status counts, the quote-heavy body, identities-per-player.

**`behaviour.sql`** (run on the restored DB only; `ON_ERROR_STOP off`; each check prints a labelled line)
- **(a)** A second pending name change for a player who already has one → expect `23505` on `player_name_history_one_pending_uq`.
- **(a2)** A duplicate `(game_id, player_id)` credit → expect `player_match_xp_credits_pkey`.
- **(a3)** A duplicate `(platform, platform_user_id)` identity → expect `player_identities_pkey`.
- **(b)** Inside `begin … rollback`:
  - delete one player
  - `left_*` counts for identities, credits, name_history, cosmetics, intents, messages and xp_grants must all be `0`
  - that player's receipt must **still exist** with `intent_id` null
- **(c)** `insert … returning id` on `player_name_history`: the id must be greater than the max. Max+2 is correct, because (a)'s failed insert already used up one sequence value.

**`cleanup.sql`**
```
begin;
delete from processed_purchases where purchase_token like 'drill0275-%';
delete from players where id::text like '00000275-%';   -- cascades everything else
commit;
```
Then per-table counts plus the `schema_migrations` filename list. It only ever deletes drill rows. If a count isn't 0 afterwards, report it; never widen the pattern.

## 3. Part A — `tests/profile-backup-dryrun.sh`

1. **Setup.**
   - Replace `MIGRATION=…001…` with `MIGRATIONS_DIR` and remove `KNOWN_ID`.
   - Add `node` to the tool check. Add a check that `node_modules/ts-node` and `node_modules/pg` exist, with a clear `run npm install` error.
   - Publish the source Postgres on `127.0.0.1:55433` (avoids the integration DB on 5433).
2. **Build the schema with the real runner** (ADR-113 `:153`):
   - Run `DATABASE_URL=postgresql://profile:dryrun-pw@127.0.0.1:55433/profile npm run --silent migrate` from the repo root. This is the same entry point as `setup-profile.sh:1011`.
   - `dotenv` doesn't override an explicit env var, so a developer's `.env` can't redirect it.
   - Checked at planning time, read-only: Node 24 accepts `--experimental-specifier-resolution`.
   - **Fallback if ts-node won't start locally:** mirror what the runner records. For each `ls migrations/*.sql | sort`, pipe `begin; <file>; insert into schema_migrations(filename) …; commit;` through psql with `ON_ERROR_STOP`, after the same `create table` statement. Record in the worklog that the fallback was used.
3. **Check the migrations.**
   - Source `string_agg(filename order by filename)` must equal the repo's `migrations/*.sql` listing.
   - It must contain `006_player_identity.sql` and no `005`.
   - Print the list; this is brief check 1.
4. **Seed** with `seed.sql`, then check bytes > chars on the Cyrillic names.
5. **TEST 1** (backup) stays as it is.
6. **TEST 2** (restore round-trip):
   - The restore command stays as it is.
   - `verify.sql` runs on source and restored; `diff` must be empty → `ok "fingerprint IDENTICAL"`. The source output must also contain `uncovered_tables: none`.
   - Separate, readable checks too:
     - a count loop over all 10 tables
     - restored `schema_migrations` list equals source
     - one row's content via the identity join: `xp|is_citizen|is_paid_citizen|display_name` for identity `drill0275-yg-01`
     - Cyrillic bytes > chars on the restored DB, **without** `tr -d '[:space:]'` (the names contain spaces)
7. **TEST 2b** (behaviour): run `behaviour.sql` on `restore-target` and grep the exact expected lines for (a), (a2), (a3), (b) and (c). This is brief check 2.
8. **TEST 2c** (cleanup): run `cleanup.sql` on the source. The 9 data tables must be 0 and `schema_migrations` unchanged. This exercises Part B's cleanup step. Later tests back up an empty DB, which they don't mind.
9. **TESTs 3, 4, 5, 6 and 8** stay unchanged: forced failure, weekly copy, default-deny guard, marker override, retention.
10. The success marker `RESULT: N passed, 0 failed` stays. N goes up; record the new N. The script is not in `ShellHarnesses.test.ts`, and stays out.
11. Update the header comment (runner, fixtures, node requirement).

**How it's run:** `npm run test:scripts:docker`, with the Docker daemon up. If it goes down, ask the owner to start it (it can't be started headlessly).

**What this proves without the box:**
- the real `profile-backup.sh` dump → age encryption → upload (MinIO) → download → decrypt → `pg_restore`, on the `006` schema built by the real runner
- the shared SQL files are correct: seed applies, verify covers every table, behaviour checks pass, cleanup returns counts to 0
- `pg_restore` keeps the constraint definitions, partial indexes and sequences

**What it doesn't prove:**
- the box's Docker network, reg.ru S3, the real age key, and the box's copy of the schema
- restore timing on the box
- `/ready` after the drill
- anything about cron

## 4. Part A — runbook §"Restore TEST drill"
- **Step 1:** use `docker run -d … postgres:16-alpine` as now (D1: container). Change teardown to **`docker rm -f -v restore-test`**. The postgres image declares a volume, so a plain `rm -f` leaves an unnamed volume behind; `0218`'s teardown probably did (not checked).
- **Step 2:** take the object key from `last-backup.json` (`sed -n 's/.*"object_key": "\(.*\)".*/\1/p'`) instead of `$(date -u …)`. The date version picks the wrong object if the drill crosses UTC midnight.
- **Step 2b (new):** shred the identity **right after** `restore complete`. Verifying doesn't need it, so this shortens the time it sits on the box.
- **Step 3:** replace "EIGHT tables / two partial unique indexes" with the `006` inventory. Point to `tests/testdata/profile-restore-drill/verify.sql`, copied to the box with scp. Keep the three session-setting lines and the timezone false-alarm warning.
- **Step 4:** replace `yandex_player_id` with the `behaviour.sql` checks and their expected lines; keep the max+2 note.
- **Pass criteria:** `IDENTICAL` across all 10 tables, both sequences, and the constraint/index definition digests; `uncovered_tables: none`; the expected lines for (a)–(c).
- **History:** lines `:198` and `:216` about "eight tables" stay as history with a dated `006` note (brief check 3 allows history). Add a `0275` row to the timing table after Part B, and keep "does not extrapolate".
- **Add a line on `0218` residual 5:** a manual `backup.sh` run, *and every profile deploy's smoke backup*, overwrites that day's object.

## 5. Part B — the drill on the box

Rules carried over from `0218` §1:
- Never set `PROFILE_RESTORE_CONFIRM_LIVE`.
- Never run `env`, `set` or `cat backup.env`.
- Redact bucket, endpoint, host and IP from anything pasted back.
- Run as root.
- Don't edit `/opt/profile/*` in place.
- Use `${PIPESTATUS[0]}` after a pipe.

**Slot (D3):**
- Right after Part A is green and reviewed, **before S2 (0271)'s box deploy**.
- 03:15–23:30 UTC, not a Sunday. A Sunday run makes a weekly copy that keeps the drill rows for about 56 days.
- No profile deploy in the same window (deploys run a migration, a smoke backup to the same daily object, and an API restart).
- Not during S2's §10 test-login check.
- Before `0273` deploys.

### P — preconditions (read-only)
An agent with box access runs these itself; otherwise the owner runs them.
- **P1:** `docker compose ps` → both services healthy.
- **P2:** per-table counts → all 9 data tables are 0. Record the full `schema_migrations` list (expect 001–004 and 006). Record the table inventory (expect the 10 tables; anything else is a finding).
- **P3:** both sequences' `last_value` / `is_called`.
- **P4:** the `docker inspect` network name (expect `profile_default`).
- **P5:** cron header says `Mode: offbox`. Record `last-backup.json`.
- **P6:** `postgres:16-alpine` present; `df -h /`; `swapon --show`.
- **P7:** `/ready` returns 200 over loopback.
- **P8:** `docker ps -a --filter name=restore-test` is empty. Record `docker volume ls -qf dangling=true | wc -l` as the baseline.
- **P9:** UTC time and weekday are inside the slot; no deploy in flight; S2 box-check status known.

**Any failure → STOP and report.**

### B — owner writes, in order

**B0 — copy files.** On the Mac: `scp tests/testdata/profile-restore-drill/*.sql` to `/root/drill0275/` on the box. Run `md5sum` on both sides; record the fixture md5s (not secret).

**B1 — seed:**
```
cd /opt/profile
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres psql -U profile -d profile -v ON_ERROR_STOP=1 -f - < /root/drill0275/seed.sql
```
- Expect `INSERT` lines ending in `COMMIT`.
- Then run the encoding query → bytes > chars on each Cyrillic row. **Mangled text → STOP, run B11 cleanup.**
- If the seed's check block refuses → STOP (live isn't empty).

**B2 — source fingerprint:**
```
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres psql -X -U profile -d profile -f - < /root/drill0275/verify.sql | tee /root/drill0275/source.txt
```
Must show `uncovered_tables: none` and the expected counts. Paste back.

**B3 — backup:**
```
/opt/profile/backup.sh 2>&1 | tail -20; echo "exit=${PIPESTATUS[0]}"
cat /opt/profile/backups/last-backup.json
KEY="$(sed -n 's/.*"object_key": "\(.*\)".*/\1/p' /opt/profile/backups/last-backup.json)"; echo "$KEY"
```
- Expect `backup OK`, exit 0, and a size larger than today's empty-DB object (a signal, not proof).
- This **overwrites today's cron object and the marker** (residual 5). That's harmless while the DB is empty.
- A failure writes a failure marker, and `checks.sh` will genuinely alert at 08:00.

**B4 — identity onto the box:** scp the identity to `/root/profile-backup-identity.txt`, `chmod 600`, and report only "present, 0600". Never its size.

**B5 — throwaway container (D1):**
```
docker run -d --name restore-test --network <P4> -e POSTGRES_USER=profile -e POSTGRES_PASSWORD=test -e POSTGRES_DB=profile postgres:16-alpine
```
Then `pg_isready` (retry for up to 30 s), then `docker compose exec -T postgres getent hosts restore-test`.

**B6 — restore, timed:**
```
time PROFILE_RESTORE_REMOTE_HOST=restore-test /opt/profile/backup.sh restore "$KEY" /root/profile-backup-identity.txt 'postgresql://profile:test@restore-test:5432/profile'
```
- Expect the guard's "distinct-remote" line, then `restore complete`. Record `real`.
- Failure shapes, same as `0218` C4:
  - `default-deny` → typo in the host
  - `download failed` → wrong key
  - **`decryption failed` → STOP and escalate; delete nothing**
  - `pg_restore failed` → the target rolled back; capture stderr (a real finding)

**B7 — shred at once:** `shred -u /root/profile-backup-identity.txt`, then `ls` must say "No such file". Fallback: `dd` over it, then `rm`.

**B8 — compare:**
```
docker exec -i -e PGCLIENTENCODING=UTF8 restore-test psql -X -U profile -d profile -f - < /root/drill0275/verify.sql | tee /root/drill0275/restored.txt
diff /root/drill0275/source.txt /root/drill0275/restored.txt && echo IDENTICAL
```
If they differ: interpret as in `0218` C5 (a count, digest, sequence or shape line), and check both sides used the session settings.

**B9 — behaviour checks:** `docker exec -i restore-test psql -U profile -d profile -f - < /root/drill0275/behaviour.sql 2>&1`. Paste back; compare with the expected lines.

**B10 — tear down:** `docker rm -f -v restore-test`. Then `ls /tmp/profile-restore.*` must be gone, and the unnamed-volume count must equal the P8 baseline.

**B11 — clean live:** run `cleanup.sql` through `docker compose exec -T postgres psql … -v ON_ERROR_STOP=1`.
- Expect the 9 data tables at **0**, and `schema_migrations` **identical to P2**.
- If rows remain: **do not widen the pattern**; report them (something else wrote rows).
- Sequences stay advanced (roughly 7 and 6). Gaps are harmless; record it, don't reset.
- Paste back `source.txt` and `restored.txt`, then `rm -rf /root/drill0275`.

### Q — post-checks (read-only)
- counts back to 0
- `schema_migrations` unchanged
- no `restore-test` container
- identity file absent
- volume count at baseline
- `/ready` 200

**Deadline:** B11 must finish before the next 02:30 UTC run, and in all cases before `0273` deploys.

**Outputs stay clean:** only the throwaway's literal password `test` ever appears on a command line. The live DB is reached only through `compose exec` over the local socket.

**What stays behind (D5, accepted):** today's daily object holds synthetic drill rows until it expires (14 days).

## 6. Verification, mapped to the brief
| Brief | Evidence |
|---|---|
| 1 | dry-run output: migration list on source and restored, plus the `RESULT … 0 failed` marker |
| 2 | TEST 2 counts, row content, `IDENTICAL`; TEST 2b's (a) and (a2) rejections |
| 3 | `grep -n 'player_profiles\|yandex_player_id'` over the script and runbook drill section → only history lines |
| 4 | worklog: P2, B2 fingerprint, B3 marker, B6 `restore complete` plus `real`, B8 `IDENTICAL` |
| 5 | worklog: B9 output as-is |
| 6 | worklog: B10, B11, Q (throwaway gone, identity shredded, 0 rows, `/ready` 200, `schema_migrations` unchanged) |
| 7 | redaction review of the worklog and runbook before hand-off |

The `real` restore time gets recorded with "does not extrapolate" attached (`0218` residual 2).

Order: Part A green, then the runbook edit, then Part B.

## 7. Risks
- **Backup-window collision:** a 02:30 cron (plus a weekly copy on Sunday) between B1 and B11 captures drill rows. The slot rule prevents it; if it happens anyway it's harmless (synthetic data) but must be recorded.
- **Deploy collision:** a profile deploy's smoke backup overwrites `$KEY` between B3 and B6. B6 would then restore a different dump and B8 would show a diff that looks like a defect. Hence no deploy in the window.
- **S2 test-login overlap:** its row breaks P2 and B11's counts-back check, and ours breaks its check.
- **A real row appears mid-drill:** the 0-rows precondition, the seed's check block, and cleanup deleting only drill rows cover it. It becomes a finding, never a wider delete.
- **Disk:** dump about 25 KB; throwaway container plus volume about 60 MB; image cached. `0218` saw 43 G free. Unnamed-volume leak is covered by `-v` and the baseline count.
- **Leftover throwaway container or identity:** covered by the B7/B10 checks and Q.
- **Timezone or date-rollover false alarms:** the session settings and the marker-derived key cover these.
- **The box's schema differs from the repo:** P2's inventory plus `uncovered_tables` catch it.
- **Dry-run:** port 55433 might be taken; ts-node on Node 24 (fallback in §3.2); `minio:latest` drifts (existing risk).
- **Fixtures are uncommitted when scp'd:** covered by the md5s recorded in B0.

## 8. Effort
- **Part A:** about 1 dev day (harness 0.5, SQL files 0.25, runbook 0.25).
- **Part B:** about 1–1.5 h of guided owner time, plus about 0.25 d for the worklog, timing row and redaction pass.
