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
| Health marker | `/opt/profile/backups/last-backup.json` (read by monitoring Phase 2) |
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

Run this against a **throwaway** Postgres, never prod. Record the wall-clock time as the RTO.

```bash
# 0) Confirm the compose network name — do NOT assume it.
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' \
  "$(cd /opt/profile && docker compose ps -q postgres)"
#    Observed 2026-09-11: `profile_default`.

# 1) Throwaway target on the box (own volume, NOT the prod stack):
docker run -d --name restore-test --network profile_default \
  -e POSTGRES_USER=profile -e POSTGRES_PASSWORD=test -e POSTGRES_DB=profile \
  postgres:16-alpine
#    (must be the same docker network as the profile compose project so the postgres
#     container can reach `restore-test:5432`.)
#    ⛔ This line used to read `--network opt_profile_default`. THAT NETWORK DOES NOT EXIST —
#    `docker run` fails outright. Compose v2 derives the project name from the directory basename
#    (/opt/profile -> `profile`), and setup-profile.sh sets no COMPOSE_PROJECT_NAME, passes no -p
#    and declares no `networks:` block. Corrected 2026-09-11 (task 0218) after it was found by
#    execution. Verify with step 0 anyway — a future project rename would move it again.

# 1b) Prove the prod container can actually reach the throwaway (this is what step 0 controls):
cd /opt/profile && docker compose exec -T postgres getent hosts restore-test

# 2) Restore the latest daily object into it.
#    DEFAULT-DENY: PROFILE_RESTORE_REMOTE_HOST must equal the target host (here: restore-test).
time PROFILE_RESTORE_REMOTE_HOST=restore-test \
  /opt/profile/backup.sh restore \
  profiles/daily/profile-$(date -u +%Y-%m-%d).dump.age \
  /root/profile-backup-identity.txt \
  'postgresql://profile:test@restore-test:5432/profile'

# 3) Verify integrity. ⛔ Two tables and an eyeballed row is NOT enough — there are EIGHT tables,
#    two bigserial sequences, two partial unique indexes and multibyte text, and a restore can lose
#    any of them while every visible row looks right. Write ONE verify script and run it against
#    BOTH databases, then diff the outputs:
#      - per-table row count AND an md5 content digest (string_agg of row_to_json, ordered);
#      - `last_value` + `is_called` of player_name_history_id_seq and player_messages_id_seq;
#      - count of public constraints, and count + digest of public indexes;
#      - spot checks: a bigint xp above int4 range, a jsonb path, char-vs-byte length on a
#        Cyrillic display_name, NULL counts, and a body containing ' " — & %.
#    🔴 Both sessions MUST set `client_encoding=UTF8`, `timezone='UTC'` and `datestyle='ISO, YMD'`.
#    row_to_json renders timestamptz in the SESSION timezone, so a mismatch makes two identical
#    databases produce different digests — a false alarm shaped exactly like a real defect.
#    A worked copy of the script is in task 0218's plan.md (step B3).
cd /opt/profile
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres \
  psql -U profile -d profile -f - < verify.sql | tee source.txt
docker exec -i -e PGCLIENTENCODING=UTF8 restore-test \
  psql -U profile -d profile -f - < verify.sql | tee restored.txt
diff source.txt restored.txt && echo "IDENTICAL"

# 4) Three behavioural checks the digests CANNOT make (run on restore-test only):
#    (a) a second 'pending' name-change for one player must be REJECTED — the ERROR is the pass:
docker exec -i restore-test psql -U profile -d profile -c \
  "insert into player_name_history (yandex_player_id,new_display_name,moderation_status)
   values ('<a player with a pending row>','Probe','pending');"     # expect 23505 on
                                                                   # player_name_history_one_pending_uq
#    (b) FK cascade + `on delete set null`, inside a transaction you ROLL BACK.
#    (c) the sequence hands out a NON-COLLIDING next id (insert ... returning id).
#        NOTE: (a)'s failed insert CONSUMES a sequence value — sequences are non-transactional —
#        so (c) legitimately returns max+2, not max+1. That is correct, not an anomaly.

# 5) Tear down + remove the transient identity:
docker rm -f restore-test
shred -u /root/profile-backup-identity.txt
ls -l /root/profile-backup-identity.txt /tmp/profile-restore.* 2>&1 | tail -2   # both must be gone
```

**Pass criteria:** `diff` reports **no differences** across all eight tables, both sequences and the
schema-shape lines; check (a) errors with `23505`; check (b)'s cascade counts are all 0 with the
receipt's `intent_id` null; check (c) returns a non-colliding id. **A lost `setval` is a
shipping-blocking defect even when every row is present** — the next insert collides.

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
- The **live in-place** branch (`PROFILE_RESTORE_CONFIRM_LIVE`) was rehearsed for the first time ever,
  and verified the same way.
- ~~*"the first drill predates the default-deny guard, so its command line differed from what is
  documented here now"*~~ — **the documented drill line above ran verbatim and worked**, guard
  override included. Struck as no longer actionable, kept so the history is legible. ⚠️ The *first*
  drill's line genuinely did differ; what is wrong is treating that as "the documented line is
  broken". Task `0218`'s brief overstated it that way; execution refuted it.

⚠️ **Two things the drill did NOT establish, stated so they are not assumed:**
1. **The weekly-copy path (`profile-backup.sh:171-177`) has never run against the current bucket** —
   `weekly/` was empty on 2026-09-11. It only triggers on a Sunday, and the current bucket was created
   after the last one.
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
