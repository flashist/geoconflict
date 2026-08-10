# Profile DB Backup & Restore Runbook (T8)

Operational runbook for the **encrypted off-box daily backup** of the player-profile Postgres
DB on `api.geoconflict.ru`. Pairs with `ai-agents/tasks/backlog/s4-postgres-backup-routine.md`.

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

To restore into the **live** DB after a real loss, point the target URL at the live Postgres
(`postgresql://profile:…@postgres:5432/profile`) and set `PROFILE_RESTORE_CONFIRM_LIVE=$(date -u +%Y-%m-%d)`
to confirm the in-place recovery (default-deny refuses a live-DB target without it) — `pg_restore --clean
--if-exists` drops and recreates objects. Do this only during a genuine recovery:

```bash
PROFILE_RESTORE_CONFIRM_LIVE=$(date -u +%Y-%m-%d) \
/opt/profile/backup.sh restore \
  profiles/daily/profile-2026-06-29.dump.age \
  /root/profile-backup-identity.txt \
  'postgresql://profile:PASSWORD@postgres:5432/profile'
```

---

## Restore TEST drill (Part E — mandatory gate)

Run this against a **throwaway** Postgres, never prod. Record the wall-clock time as the RTO.

```bash
# 1) Throwaway target on the box (own volume, NOT the prod stack):
docker run -d --name restore-test --network opt_profile_default \
  -e POSTGRES_USER=profile -e POSTGRES_PASSWORD=test -e POSTGRES_DB=profile \
  postgres:16-alpine
#    (use the same docker network as the profile compose project so the postgres
#     container can reach `restore-test:5432`; check `docker network ls`.)

# 2) Restore the latest daily object into it.
#    DEFAULT-DENY: PROFILE_RESTORE_REMOTE_HOST must equal the target host (here: restore-test).
time PROFILE_RESTORE_REMOTE_HOST=restore-test \
  /opt/profile/backup.sh restore \
  profiles/daily/profile-$(date -u +%Y-%m-%d).dump.age \
  /root/profile-backup-identity.txt \
  'postgresql://profile:test@restore-test:5432/profile'

# 3) Verify integrity — row counts on the data-critical tables match the source:
cd /opt/profile
for t in player_profiles player_match_xp_credits; do
  echo -n "$t source="; docker compose exec -T postgres psql -U profile -d profile -tAc "select count(*) from $t"
  echo -n "$t restored="; docker exec -i restore-test psql -U profile -d profile -tAc "select count(*) from $t"
done

# 4) Known-profile round-trip — pick a real yandex_player_id and confirm fields match:
docker exec -i restore-test psql -U profile -d profile -tAc \
  "select xp, is_citizen, is_paid_citizen, display_name from player_profiles where yandex_player_id='<KNOWN_ID>'"

# 5) Tear down + remove the transient identity:
docker rm -f restore-test
shred -u /root/profile-backup-identity.txt
```

**Pass criteria:** counts match for `player_profiles` and `player_match_xp_credits`, and the known
profile's `xp` / `is_citizen` / `is_paid_citizen` / `display_name` round-trip exactly.

**Recorded RTO:** First drill 2026-07-01 (off-box, on a Mac): download + `age -d` + `pg_restore`
into a throwaway `postgres:16-alpine` — **restore ≈ 0.1s, whole drill < 1 min hands-on**. NOTE: the
prod DB was still **empty** (0 rows) at this point, so schema + decryption + the full pipeline were
verified, but a *non-empty* data round-trip was not. Re-run once real player/entitlement data exists
(before/after Paid Citizenship) and update this line with the real-data RTO. Re-run using the **exact
commands documented above** (with the `PROFILE_RESTORE_REMOTE_HOST=restore-test` override) — the first
drill predates the default-deny guard, so its command line differed from what is documented here now.

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
