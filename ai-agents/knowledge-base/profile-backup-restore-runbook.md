# Profile DB Backup & Restore Runbook (T8)

Operational runbook for the **encrypted off-box daily backup** of the player-profile Postgres
DB on `api.geoconflict.ru`. Pairs with `ai-agents/tasks/done/0189-postgres-backup-routine/brief.md`.

> A backup that has never been restored is not a backup. **Part E (restore test) is the real
> shipping gate** and must be green *before Paid Citizenship ships.*

---

## What the backup is

| Property | Value |
|---|---|
| Source DB | `profile` (user `profile`) on the profile VPS, Postgres `127.0.0.1:5432` (loopback only) |
| Script (on box) | `/opt/profile/backup.sh` (installed from repo `profile-backup.sh` via the deploy path) |
| Config (on box) | `/opt/profile/backup.env` (0600) — S3 + age recipient + retention; sourced at runtime |
| Format | `pg_dump -Fc` (custom/compressed) |
| Encryption | **age, asymmetric.** Encrypted to a recipient public key; the box never holds the private identity, so a stolen S3 object cannot be decrypted on the box |
| Destination | RU-resident S3 (reg.ru Object Storage or fallback), bucket private, key `…/daily/profile-YYYY-MM-DD.dump.age` (+ `…/weekly/` on Sundays) |
| Schedule | Daily 02:30 box time (cron `/etc/cron.d/profile-backups`) |
| Retention | 14 daily + ~8 weekly (`PROFILE_BACKUP_RETENTION_*_DAYS`, default 14 / 56) |
| Health marker | `/opt/profile/backups/last-backup.json` — read daily (08:00 UTC) by `/opt/profile/checks.sh` (task `0219`, repo `profile-checks.sh`): marker `exit_status` 0 and `finished_at` ≤ 26 h, the **daily object it names really exists** in the bucket, and the **newest `weekly/` object is ≤ 8 days old** (listed from the bucket — the marker carries no weekly signal, and a weekly-copy failure is exit 0 by design). Reports to an external dead-man's-switch ping; a missing run alerts too. |
| Log | `/var/log/profile-backup.log` |

---

## One-time setup

### 1. Provision the S3 target (Part A — owner)
Create a **private** bucket on **RU-resident** S3 (reg.ru Object Storage tentative; any RU S3 is a
drop-in — the pipeline is endpoint-agnostic). Create access keys **scoped to that bucket only**.
Verify upload/list/download from the box (e.g. `rclone lsd profiles:`). Confirm lifecycle-rule
support (optional — the script prunes regardless).

### 2. Generate the age key pair (do this on a trusted machine, NOT the box)
```bash
age-keygen -o profile-backup-identity.txt
# Output includes "Public key: age1...."
```
- **Public key** → `PROFILE_BACKUP_AGE_RECIPIENT` in `.env.profile`. (Safe to commit to your
  config; it can only encrypt.)
- **Private identity** (`profile-backup-identity.txt`) → store **off the box** (password manager
  / secrets vault). It is required **only** to restore. If you lose it, every backup is
  unrecoverable — treat it like the master key it is.

### 3. Fill in deploy config and deploy
In `.env.profile`: `PROFILE_BACKUP_S3_ENDPOINT`, `_REGION`, `_BUCKET`, `_PREFIX`,
`PROFILE_BACKUP_AGE_RECIPIENT`, retention.
In `.env.profile.secret`: `PROFILE_BACKUP_S3_ACCESS_KEY`, `PROFILE_BACKUP_S3_SECRET_KEY`.
Then:
```bash
./build-deploy-profile.sh
```
`setup-profile.sh` installs `age` + `rclone`, writes `/opt/profile/backup.sh` + `backup.env`, and
schedules the daily cron. (If the `PROFILE_BACKUP_*` set is incomplete, it keeps the interim
weekly LOCAL dump instead and says so — no off-box protection until all five are present.)

---

## Restore procedure

`backup.sh restore` pulls an object, decrypts it with the **off-box** identity, and `pg_restore`s
into a **target you specify** (never the live DB by default). `pg_restore` runs from the postgres
container, so no host pg client is needed.

> **DEFAULT-DENY (important).** Because `pg_restore` runs *inside* the postgres container, the guard
> refuses **every** restore target unless you prove it is safe, one of two ways:
> - **Distinct throwaway/remote target** → set `PROFILE_RESTORE_REMOTE_HOST=<the host in the target URL>`
>   (must match the URL host exactly).
> - **Real in-place recovery into the LIVE DB** → set `PROFILE_RESTORE_CONFIRM_LIVE=$(date -u +%Y-%m-%d)`.
>
> Omitting both is refused with a self-documenting error naming the exact var to set. The examples below
> already include the required override — don't drop it.

```bash
# On the box. Copy your OFF-BOX identity over transiently (e.g. scp) — do NOT leave it there.
# List available backups:
cd /opt/profile && set -a && . ./backup.env && set +a
rclone lsf "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX}/daily/"

# Restore a chosen object into a TARGET database URL (throwaway/staging — never prod).
# DEFAULT-DENY: PROFILE_RESTORE_REMOTE_HOST must equal the target URL's host (here: restore-target).
PROFILE_RESTORE_REMOTE_HOST=restore-target \
/opt/profile/backup.sh restore \
  profiles/daily/profile-2026-06-29.dump.age \
  /root/profile-backup-identity.txt \
  'postgresql://profile:PASSWORD@restore-target:5432/profile'

shred -u /root/profile-backup-identity.txt   # remove the transient identity when done
```

To restore into the **live** DB after a real loss, set `PROFILE_RESTORE_CONFIRM_LIVE=$(date -u +%Y-%m-%d)`
to confirm the in-place recovery (default-deny refuses a live-DB target without it) — `pg_restore --clean
--if-exists` drops and recreates objects. Do this only during a genuine recovery:

> 🔒 **Use the LOCAL SOCKET target — `postgresql://profile@/profile` — NOT a `postgres:5432` URL.**
> `pg_restore` runs *inside* the postgres container, whose socket accepts `trust` auth, so the socket
> form needs **no password at all**. A `postgresql://profile:PASSWORD@postgres:5432/profile` URL puts
> the real `POSTGRES_PASSWORD` into root's shell history (persists on disk), the `backup.sh` argv and
> the `docker` client argv — all readable via `/proc/*/cmdline`. Rotating it afterwards is expensive:
> the Postgres image applies `POSTGRES_PASSWORD` only at `initdb`, so rotation means destroying the
> data volume and redeploying.
>
> The default-deny guard **accepts** the empty-host form: it extracts an empty host and takes the
> `PROFILE_RESTORE_CONFIRM_LIVE` branch, logging `… into '<socket>'`. **Verified end to end on the box
> 2026-09-11** (task `0218`) — `psql -d 'postgresql://profile@/profile' -tAc "select 1"` returns `1`,
> and a full in-place restore through this target completed in `real 0m0.435s`.
>
> ~~`'postgresql://profile:PASSWORD@postgres:5432/profile'`~~ — struck, not deleted, so nobody
> reinstates it from memory.

```bash
PROFILE_RESTORE_CONFIRM_LIVE=$(date -u +%Y-%m-%d) \
/opt/profile/backup.sh restore \
  profiles/daily/profile-2026-06-29.dump.age \
  /root/profile-backup-identity.txt \
  'postgresql://profile@/profile'
```

⚠️ **Do NOT stop `profile-api` first, even though instinct says to.** The `profile` systemd unit
carries `Restart=always`, which will fight you (trap T11, `0215`). Expect `/ready` to blip while
`pg_restore` holds locks; confirm 200 afterwards. Observed 2026-09-11: services stayed healthy
throughout and the unit never interfered.

---

## Restore TEST drill (Part E — mandatory gate)

Run this against a **throwaway** Postgres container, never prod. Record the wall-clock time as the RTO.

> **Rewritten 2026-09-15 for the `006` schema (task `0275`).** Migration `006` (task `0270`, ADR-113)
> dropped every Yandex-keyed table and re-keyed the schema to an internal `player_id`. The drill SQL now
> lives in the repo, in **`tests/testdata/profile-restore-drill/`** — `seed.sql`, `verify.sql`,
> `behaviour.sql`, `cleanup.sql` — and the local dry-run (`npm run test:scripts:docker`) runs **the same
> files** against a runner-built `006` database before anyone runs them here. Copy them to the box; do
> not retype them.

> ⚠️ **A backup run overwrites that day's object.** The daily key is `…/daily/profile-<UTC date>.dump.age`
> (`profile-backup.sh:134-136`), so a hand-run `backup.sh` — **and every profile deploy's smoke backup**
> (`setup-profile.sh`, which only redirects the *marker* to `last-smokecheck.json`, not the object) —
> replaces that day's cron object in place (`0218` residual 5). Never deploy the profile box during a
> drill: its smoke backup would swap the object between the backup and the restore steps, and the
> compare would show a diff that looks like a restore defect.

> ⚠️ **Seeding the live DB is only free while it holds no real rows.** `seed.sql` refuses (and changes
> nothing) if any data table already has a row. Once real players exist, re-plan the drill; never bypass
> the refusal.

**`006` inventory the drill must preserve** — 10 base tables: `players`, `player_identities`,
`player_match_xp_credits`, `player_name_history`, `player_cosmetic_ownership`, `purchase_intents`,
`processed_purchases`, `player_messages`, `player_xp_grants`, `schema_migrations`. Two sequences
(`player_name_history_id_seq`, `player_messages_id_seq`). Three partial indexes
(`players_display_name_uq`, `player_name_history_one_pending_uq`, `player_messages_unread_idx`).
`processed_purchases.player_id` has **no** foreign key (a receipt outlives a deleted player), so cleanup
deletes receipts explicitly. Measured **locally** on a runner-built `006` DB (2026-09-15, not yet on the
box): **30** public constraints, **17** public indexes.

**Slot.** 03:15–23:30 UTC (clear of the 02:30 cron), **not a Sunday** (a Sunday backup also writes a
`weekly/` copy, kept ~56 days), no profile deploy in flight, and nothing else writing profile rows.

### Before you start

**Rules for the whole drill** (carried from `0218`; they do not relax on a failure branch):
- Run as **root**, in **one shell session** — later steps reuse shell variables (`SRC_EXIT`, `KEY`). If the
  session drops, re-run the step that set a variable before relying on it.
- **Never** set `PROFILE_RESTORE_CONFIRM_LIVE`. This drill never restores into the live DB.
- **Never** run `env`, `set`, or `cat /opt/profile/backup.env` — they print credentials.
- **Redact** bucket, endpoint, host and IP from anything pasted back.
- Report the identity file only as **"present, 0600"** — never its size, never its contents.
- Do not edit `/opt/profile/*` in place. After every pipe, read `${PIPESTATUS[0]}`, never `$?`.
- **Any STOP after step 1 printed `COMMIT` → run the [abort path](#abort-path--any-stop-after-seeding)**
  before walking away. **Deadline: before the next 02:30 UTC backup, and before any profile deploy** —
  whichever comes first.

**Record the pre-drill state** (read-only). Any surprise here → STOP; nothing has been written yet.

```bash
# P1) Both services healthy; /ready 200 (loopback, as 0218).
cd /opt/profile && docker compose ps
curl -sS -o /dev/null -w 'ready=%{http_code}\n' http://127.0.0.1:8080/ready   # must be ready=200

# P2) UTC time + weekday inside the slot (not Sunday = 7), and no leftover throwaway.
date -u '+%F %T weekday=%u'
docker ps -a --filter name=restore-test --format '{{.Names}}'   # must print nothing

# P3) Compose network name — do NOT assume it — and the unnamed-volume baseline for teardown.
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' \
  "$(cd /opt/profile && docker compose ps -q postgres)"
#    Observed 2026-09-11: `profile_default`.
docker volume ls -qf dangling=true | wc -l

# P4) Copy the drill SQL files over, then compare md5s on both sides (`md5 -r` on the Mac).
mkdir -p /root/drill0275
#     From the Mac: scp tests/testdata/profile-restore-drill/*.sql root@<box>:/root/drill0275/
md5sum /root/drill0275/*.sql

# P5) Per-table counts (all 9 data tables must be 0), the schema_migrations list, both sequences.
#     Kept in before.txt: step 7 compares schema_migrations against it.
cd /opt/profile
docker compose exec -T postgres psql -X -U profile -d profile -tA -c "
select format('before counts: players=%s player_identities=%s player_match_xp_credits=%s player_name_history=%s player_cosmetic_ownership=%s purchase_intents=%s processed_purchases=%s player_messages=%s player_xp_grants=%s',
  (select count(*) from players), (select count(*) from player_identities),
  (select count(*) from player_match_xp_credits), (select count(*) from player_name_history),
  (select count(*) from player_cosmetic_ownership), (select count(*) from purchase_intents),
  (select count(*) from processed_purchases), (select count(*) from player_messages),
  (select count(*) from player_xp_grants))
union all
select 'schema_migrations: ' || string_agg(filename, ',' order by filename) from schema_migrations
union all
select format('sequences: player_messages_id_seq=%s/%s player_name_history_id_seq=%s/%s',
  (select last_value from player_messages_id_seq), (select is_called from player_messages_id_seq),
  (select last_value from player_name_history_id_seq), (select is_called from player_name_history_id_seq));" \
  | tee /root/drill0275/before.txt; echo "exit=${PIPESTATUS[0]}"
#    Expect exit=0, every count 0, and schema_migrations: 001_…,002_…,003_…,004_…,006_player_identity.sql.
#    A table missing (psql ERROR) or an extra migration is a schema-drift finding → STOP.
```

### Drill

```bash
# 1) Seed synthetic rows into the LIVE DB (one transaction; refuses if any data table has rows).
cd /opt/profile
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres \
  psql -U profile -d profile -v ON_ERROR_STOP=1 -f - < /root/drill0275/seed.sql
#    Expect INSERT lines ending in COMMIT. `drill seed refused` → STOP (no rows were written; nothing to
#    clean up) and report which table held rows.
#    ⛔ From here on, ANY stop → the abort path below, before walking away.
#    Prove the Cyrillic survived the INSERT itself:
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres psql -U profile -d profile -c \
  "select display_name, length(display_name) as chars, octet_length(display_name) as bytes
     from players where id in ('00000275-0000-4000-8000-000000000003','00000275-0000-4000-8000-000000000004') order by 1;"
#    bytes > chars on each row. Mangled text → STOP → abort path: a corrupted value round-trips just as
#    faithfully as a good one, so the compare would "pass" while proving nothing.

# 2) Source fingerprint — capture psql's exit status and check the end-of-file sentinel — then the backup.
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres \
  psql -X -U profile -d profile -f - < /root/drill0275/verify.sql | tee /root/drill0275/source.txt
SRC_EXIT=${PIPESTATUS[0]}; echo "verify_exit=$SRC_EXIT"                 # must be 0
tail -1 /root/drill0275/source.txt                                     # must be: verify_end: complete
#    Must also show `uncovered_tables: none`, and these counts in verify.sql's own (alphabetical) order:
#      player_cosmetic_ownership 4 · player_identities 9 · player_match_xp_credits 24 ·
#      player_messages 6 · player_name_history 6 · player_xp_grants 3 · players 8 ·
#      processed_purchases 3 · purchase_intents 5 · schema_migrations 5
#    Non-zero exit, a missing sentinel or a wrong count → STOP → abort path.
/opt/profile/backup.sh 2>&1 | tail -20; echo "exit=${PIPESTATUS[0]}"   # PIPESTATUS, not $? (0218)
cat /opt/profile/backups/last-backup.json
#    Expect `backup OK` and exit=0. A failure writes a failure marker (checks.sh will alert at 08:00) →
#    STOP → abort path.
#    Take the object key FROM THE MARKER, not from `date` — a drill that crosses UTC midnight would
#    otherwise restore the wrong day's object:
KEY="$(sed -n 's/.*"object_key": "\(.*\)".*/\1/p' /opt/profile/backups/last-backup.json)"; echo "$KEY"

# 3) Throwaway target on the box (own container + volume, NOT the prod stack):
docker run -d --name restore-test --network profile_default \
  -e POSTGRES_USER=profile -e POSTGRES_PASSWORD=test -e POSTGRES_DB=profile \
  postgres:16-alpine
#    (must be the same docker network as the profile compose project — the P3 value — so the postgres
#     container can reach `restore-test:5432`.)
#    ⛔ This line used to read `--network opt_profile_default`. THAT NETWORK DOES NOT EXIST —
#    `docker run` fails outright. Compose v2 derives the project name from the directory basename
#    (/opt/profile -> `profile`), and setup-profile.sh sets no COMPOSE_PROJECT_NAME, passes no -p
#    and declares no `networks:` block. Corrected 2026-09-11 (task 0218) after it was found by
#    execution. Verify with P3 anyway — a future project rename would move it again.
docker exec restore-test pg_isready -U profile -d profile   # retry for up to ~30 s
# 3b) Prove the prod container can actually reach the throwaway (this is what P3 controls):
cd /opt/profile && docker compose exec -T postgres getent hosts restore-test

# 4) Copy the OFF-BOX identity over, lock it down, report only "present, 0600".
#    From the Mac: scp <identity> root@<box>:/root/profile-backup-identity.txt
chmod 600 /root/profile-backup-identity.txt
stat -c '%a' /root/profile-backup-identity.txt                          # must print 600 — paste only that
#    Optional: confirm it is the identity for this box's recipient. Prints ONLY a count (1 = match); it
#    shows no key material. 0 → shred at once (4b) and STOP → abort path. If it prints
#    `age-keygen: command not found`, skip this check — the count would be a meaningless 0.
grep -cxF "PROFILE_BACKUP_AGE_RECIPIENT=$(age-keygen -y /root/profile-backup-identity.txt)" /opt/profile/backup.env

# 4a) Restore the object from step 2 into the throwaway.
#     DEFAULT-DENY: PROFILE_RESTORE_REMOTE_HOST must equal the target host (here: restore-test).
time PROFILE_RESTORE_REMOTE_HOST=restore-test \
  /opt/profile/backup.sh restore \
  "$KEY" \
  /root/profile-backup-identity.txt \
  'postgresql://profile:test@restore-test:5432/profile'
RESTORE_EXIT=$?; echo "restore_exit=$RESTORE_EXIT"
#    Expect the "distinct-remote" line, then `restore complete`, restore_exit=0. Record `real`.

# 4b) Shred the identity NOW — WHATEVER 4a printed, success or failure. Verifying does not need it.
shred -u /root/profile-backup-identity.txt || { dd if=/dev/urandom of=/root/profile-backup-identity.txt bs=1k count=4 conv=notrunc; rm -f /root/profile-backup-identity.txt; }
ls /root/profile-backup-identity.txt 2>&1   # must say: No such file
#    Only now read 4a's outcome. Every failure below → STOP → abort path:
#      `default-deny`       → typo in PROFILE_RESTORE_REMOTE_HOST or the URL host.
#      `download failed`    → wrong $KEY.
#      `decryption failed`  → wrong identity or a damaged object: ESCALATE. "Delete nothing" means no
#                             backup object and no marker — the identity is already shredded, and the
#                             abort path still runs.
#      `pg_restore failed`  → the target rolled back; capture the stderr (a real finding).

# 5) Verify integrity: the SAME verify.sql on the restored DB, then diff — only if BOTH runs completed.
docker exec -i -e PGCLIENTENCODING=UTF8 restore-test \
  psql -X -U profile -d profile -f - < /root/drill0275/verify.sql | tee /root/drill0275/restored.txt
DST_EXIT=${PIPESTATUS[0]}; echo "verify_exit=$DST_EXIT"                 # must be 0
if [ "${SRC_EXIT:-unset}" = 0 ] && [ "$DST_EXIT" = 0 ] \
   && [ "$(tail -1 /root/drill0275/source.txt)" = 'verify_end: complete' ] \
   && [ "$(tail -1 /root/drill0275/restored.txt)" = 'verify_end: complete' ]; then
  diff /root/drill0275/source.txt /root/drill0275/restored.txt && echo "IDENTICAL"
else
  echo "INCOMPLETE: verify.sql did not run to the end on one side (or SRC_EXIT was lost) — no compare made"
fi
#    INCOMPLETE is NOT a pass: two outputs cut short at the same statement diff as "identical". If only
#    SRC_EXIT was lost with the shell, re-run step 2's verify command (not the backup) and repeat step 5.
#    A diff → STOP → abort path (interpret it as 0218 C5: count, digest, sequence or shape line).
#    verify.sql fingerprints: a coverage line (`uncovered_tables: none` — a table added by a future
#    migration shows up here by name); per-table row count + md5 content digest for all 10 tables;
#    `last_value` + `is_called` of both sequences; constraint count + digest of every constraint
#    DEFINITION (catches a lost `on delete cascade`, not just a lost name); index count + digest of
#    every index DEFINITION (catches a lost partial `where`); spot checks — bigint xp above int4,
#    a jsonb path, chars vs bytes on the Cyrillic names, NULL counts, moderation status counts, the
#    body containing ' " — & %, and identities per player; and the `verify_end: complete` sentinel.
#    🔴 Both sessions MUST set `client_encoding=UTF8`, `timezone='UTC'` and `datestyle='ISO, YMD'`
#    (verify.sql does). row_to_json renders timestamptz in the SESSION timezone, so a mismatch makes two
#    identical databases produce different digests — a false alarm shaped exactly like a real defect.

# 6) Behavioural checks the digests CANNOT make (restore-test ONLY — never the live DB):
docker exec -i restore-test psql -U profile -d profile -f - < /root/drill0275/behaviour.sql 2>&1
#    Expected lines, verbatim (the rejections ARE the pass):
#      (a) rejected: sqlstate=23505 constraint=player_name_history_one_pending_uq
#      (a2) rejected: sqlstate=23505 constraint=player_match_xp_credits_pkey
#      (a3) rejected: sqlstate=23505 constraint=player_identities_pkey
#      (b) before: identities=1 credits=3 name_history=1 cosmetics=2 intents=1 messages=1 xp_grants=1 receipt_intent_set=true
#      (b) left: identities=0 credits=0 name_history=0 cosmetics=0 intents=0 messages=0 xp_grants=0
#      (b) receipt kept: rows=1 intent_id_null=true
#      (b) rolled back: players=8
#      (c) non-colliding next id: true
#    (b) deletes one player inside a transaction it ROLLS BACK: every child table cascades to 0 and the
#    receipt survives with `intent_id` null (`on delete set null`).
#    NOTE on (c): (a)'s failed insert CONSUMES a sequence value — sequences are non-transactional — so
#    the informational `(c) gap=N` line reads 2 on a fresh sequence (max+2), not 1. Correct, not an anomaly.
#    A missing or different line → record it, then continue with step 7 (it IS the abort path's work).

# 7) Tear down + clean the live DB. This is the same work as the abort path — see it for the checks.
```

### Abort path — any STOP after seeding

Also the normal end of the drill (step 7). Run it **in order**, even when the drill failed, and **before the
next 02:30 UTC backup and before any profile deploy**. It deletes only the identity, the throwaway, the
drill rows and the drill files — **never a backup object or a marker**.

```bash
# A1) Identity gone (a no-op if 4b already ran).
[ -e /root/profile-backup-identity.txt ] && shred -u /root/profile-backup-identity.txt
ls /root/profile-backup-identity.txt 2>&1                              # must say: No such file

# A2) Throwaway gone, WITH its volume (the postgres image declares one; a plain `rm -f` leaves an unnamed
#     volume behind). "No such container" is fine if the drill stopped before step 3.
docker rm -f -v restore-test
ls -l /tmp/profile-restore.* 2>&1 | tail -1                            # must be gone
docker volume ls -qf dangling=true | wc -l                             # must equal the P3 baseline

# A3) Delete the drill rows from the LIVE DB, then prove counts are back and schema_migrations is unchanged.
cd /opt/profile
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres \
  psql -U profile -d profile -v ON_ERROR_STOP=1 -f - < /root/drill0275/cleanup.sql \
  | tee /root/drill0275/after.txt; echo "exit=${PIPESTATUS[0]}"         # must be exit=0
grep '^drill cleanup counts:' /root/drill0275/after.txt                # all 9 data tables must be 0
diff <(grep '^schema_migrations:' /root/drill0275/before.txt) \
     <(grep '^schema_migrations:' /root/drill0275/after.txt) && echo "MIGRATIONS UNCHANGED"
#    Rows left → something else wrote rows: REPORT, never widen the patterns. Sequences stay advanced —
#    gaps are harmless; record them, do not reset.

# A4) Service still healthy: both compose services up, liveness AND readiness (as 0218 E5/F2).
cd /opt/profile && docker compose ps                                          # both services up/healthy
curl -sS -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:8080/health  # must be health=200
curl -sS -o /dev/null -w 'ready=%{http_code}\n' http://127.0.0.1:8080/ready   # must be ready=200

# A5) Paste back before.txt, source.txt, restored.txt and after.txt (whichever exist), then remove the files.
rm -rf /root/drill0275
```

The daily object from step 2 (`…/daily/profile-<drill UTC date>.dump.age`) keeps the synthetic drill rows
for its full **14-day** retention — accepted (task `0275`, D5). Tonight's 02:30 UTC run does **not** replace
it: that run falls on the next UTC date and writes the next date's key (`profile-backup.sh:134-136`); only
`last-backup.json` is replaced. (A profile deploy later on the drill's UTC date would overwrite it, via its
smoke backup — see the warning at the top of this section.) Leave it.

**Pass criteria (`006` schema):** step 5 printed `IDENTICAL` — both `verify_exit=0`, both outputs ending in
`verify_end: complete`, and **no differences** across all **10** tables, **both** sequences and the
constraint- and index-**definition** digests; the fingerprint shows `uncovered_tables: none`;
`behaviour.sql` prints every expected line above. After the abort path/step 7: the live data tables are back
to 0 rows, `MIGRATIONS UNCHANGED`, the throwaway and its volume are gone, the identity is shredded, and
`/ready` is 200. **A lost `setval` is a shipping-blocking defect even when every row is present** — the
next insert collides.

~~**Pass criteria:** `diff` reports **no differences** across all eight tables, both sequences and the
schema-shape lines; check (a) errors with `23505`; check (b)'s cascade counts are all 0 with the
receipt's `intent_id` null; check (c) returns a non-colliding id.~~ — the **pre-`006`** criteria (`0218`,
2026-09-11), struck 2026-09-15 by task `0275`, kept so the history stays legible. Those eight tables no
longer exist.

**Recorded RTO — ✅ SECOND DRILL, 2026-09-11, NON-EMPTY DATA (task `0218`).**

| Drill | Data | Target | Wall clock |
|---|---|---|---|
| 2026-07-01 | **empty (0 rows)** | throwaway, off-box on a Mac | ≈ 0.1 s |
| **2026-09-11** | **76 synthetic rows across 7 tables** | throwaway `restore-test` on the box | **`real 0m0.374s`** |
| **2026-09-11** | same | **LIVE DB, in-place**, via the socket target | **`real 0m0.435s`** |

🚨 **These numbers are NOT a usable RTO for a real outage.** 76 rows is a ~21 KB dump. The figures
prove the *path* works and is not pathologically slow; they say nothing about restore time at real
citizen volume. **Re-measure once real data exists — the number will not extrapolate from here.**

✅ **What the 2026-09-11 drill settled:**
- A **non-empty** round-trip is now verified — `IDENTICAL` on all eight tables, both sequences and the
  schema-shape lines, plus the three behavioural checks. The 2026-07-01 gap is closed.
  ⚠️ **Pre-`006` schema (dated note, 2026-09-15):** those eight tables were dropped by migration `006`
  (task `0270`). This proof does not carry over to the current schema on its own — task `0275` re-proves
  the restore on `006`.
- The **live in-place** branch (`PROFILE_RESTORE_CONFIRM_LIVE`) was rehearsed for the first time ever,
  and verified the same way.
- ~~*"the first drill predates the default-deny guard, so its command line differed from what is
  documented here now"*~~ — **the documented drill line above ran verbatim and worked**, guard
  override included. Struck as no longer actionable, kept so the history is legible. ⚠️ The *first*
  drill's line genuinely did differ; what is wrong is treating that as "the documented line is
  broken". Task `0218`'s brief overstated it that way; execution refuted it.

⚠️ **Two things the drill did NOT establish, stated so they are not assumed:**
1. ~~**The weekly-copy path (`profile-backup.sh:171-177`) has never run against the current bucket** —
   `weekly/` was empty on 2026-09-11.~~ It only triggers on a Sunday, and the current bucket was created
   after the last one. **2026-09-13 (task `0241`): the weekly path ran on schedule and the object
   was observed** — `profiles/weekly/profile-2026-09-13.dump.age`, 19312 bytes, the same size as that
   day's daily object and as `last-backup.json`'s `size_bytes` (19312 B each; byte identity **not
   checked** — no hash or ETag compared), tied to the 02:30:01 UTC CRON record. Struck, not deleted, so
   the history stays legible. ⚠️ Still true: the marker carries **no weekly signal** and a weekly-copy
   failure is **exit 0** (`:176`) — only a bucket listing proves the weekly copy.
2. **Backup history in the current bucket starts 2026-09-10** and, before the drill, consisted of two
   objects — one from the deploy smoke check, one from a cron run — **both dumps of an empty
   database**. Earlier runs went to the old, now-deleted bucket. ⛔ Do not read the nightly log's
   five-day history as five days of retrievable backups.

---

## Monitoring & failure

- After each run the script writes `/opt/profile/backups/last-backup.json`:
  `{schema, started_at, finished_at, exit_status, object_key, size_bytes, error}`.
- The Phase-2 monitor (`0034-monitoring-alert-bot-phase2` item 5) alerts when `exit_status != 0`
  or `finished_at` is older than ~26–30h.
- The script exits **non-zero** on any failure (dump/encrypt/upload/verify), so cron + monitoring
  both notice. Upload is verified (object exists + size matches) **before** the local temp is
  deleted, so a failed upload never silently discards the only copy.

## Force-failure check (Verification item 3)
Temporarily set a bad `PROFILE_BACKUP_S3_SECRET_KEY` (or unreachable endpoint) in
`.env.profile.secret`, redeploy, run `/opt/profile/backup.sh` manually → confirm it exits
non-zero and writes a failure marker (`exit_status: 1`, populated `error`). Restore the real key
and redeploy afterwards.

## Security invariants
- No credentials/keys in git, the Docker image, logs, or the marker file.
- The dump is age-encrypted at rest off-box; the private identity never touches the box except
  transiently during a deliberate restore (and is shredded after).
