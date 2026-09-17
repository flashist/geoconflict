#!/usr/bin/env bash
#
# tests/profile-backup-dryrun.sh — local dockerized dry-run for profile-backup.sh (T8).
#
# Proves the REAL profile-backup.sh end-to-end WITHOUT the VPS:
#   dump (-Fc) -> age-encrypt -> rclone upload -> verify -> prune -> restore -> fingerprint
#   round-trip, plus a forced-failure case (non-zero exit + failure marker).
#
# Schema (task 0275): the source DB is built by the REAL migration runner (`npm run migrate`, the same
# entry point setup-profile.sh runs on deploy), so it holds every migrations/*.sql file and the
# schema_migrations bookkeeping exactly as a box DB does (ADR-113). Seeding, fingerprinting, the
# behavioural checks and cleanup use the SQL files in tests/testdata/profile-restore-drill/ — the very
# files the owner runs on the box in the runbook's restore drill, so every drill SQL step runs here
# first.
#
# Faithful to production: profile-backup.sh runs on the HOST using host docker/age/rclone
# against a containerized Postgres + MinIO — the same shape as the box (host tools, Postgres
# in a container). NOT part of the Jest suite (needs Docker + age + rclone); run manually:
#
#   ./tests/profile-backup-dryrun.sh
#
# Requirements: a running Docker daemon, and `age`, `age-keygen`, `rclone`, `curl`, `jq`, `node`,
# plus installed node packages (`npm install` — the migration runner needs ts-node and pg).
# Host port 55433 must be free (source Postgres, published on loopback for the runner).
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_SCRIPT="$REPO_ROOT/profile-backup.sh"
MIGRATIONS_DIR="$REPO_ROOT/migrations"
DRILL_SQL="$REPO_ROOT/tests/testdata/profile-restore-drill"
SOURCE_PORT=55433
WORK="$(mktemp -d "${TMPDIR:-/tmp}/profile-backup-dryrun.XXXXXX")"
PGPASS="dryrun-pw"
MINIO_KEY="minioadmin"
MINIO_SECRET="minioadmin"
BUCKET="profile-backups-test"

pass=0; fail=0
ok() { echo "  ✅ $1"; pass=$((pass + 1)); }
no() { echo "  ❌ $1"; fail=$((fail + 1)); }
dc() { ( cd "$WORK" && docker compose "$@" ); }

cleanup() {
  echo "--- cleanup ---"
  dc down -v >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

for t in docker age age-keygen rclone curl jq node; do
  command -v "$t" >/dev/null 2>&1 || { echo "ERROR: missing required tool: $t"; exit 1; }
done
docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon not running"; exit 1; }
[ -f "$BACKUP_SCRIPT" ] || { echo "ERROR: $BACKUP_SCRIPT not found"; exit 1; }
[ -d "$MIGRATIONS_DIR" ] || { echo "ERROR: $MIGRATIONS_DIR not found"; exit 1; }
for f in seed.sql verify.sql behaviour.sql cleanup.sql; do
  [ -f "$DRILL_SQL/$f" ] || { echo "ERROR: $DRILL_SQL/$f not found"; exit 1; }
done
for m in ts-node pg; do
  [ -d "$REPO_ROOT/node_modules/$m" ] || { echo "ERROR: node_modules/$m missing — run npm install"; exit 1; }
done

mkdir -p "$WORK/backups"

# ── compose project: source Postgres + restore-target Postgres + MinIO ───────────
cat > "$WORK/docker-compose.yml" <<YAML
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: profile
      POSTGRES_PASSWORD: $PGPASS
      POSTGRES_DB: profile
    ports:
      - "127.0.0.1:$SOURCE_PORT:5432"
  restore-target:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: profile
      POSTGRES_PASSWORD: $PGPASS
      POSTGRES_DB: profile
  minio:
    image: minio/minio
    command: server /data --address ':9000'
    environment:
      MINIO_ROOT_USER: $MINIO_KEY
      MINIO_ROOT_PASSWORD: $MINIO_SECRET
    ports:
      - "127.0.0.1:59000:9000"
YAML

echo "--- starting containers (postgres + restore-target + minio) ---"
dc up -d

wait_for() { # <desc> <cmd...>
  local desc="$1"; shift
  for _ in $(seq 1 60); do "$@" >/dev/null 2>&1 && { echo "  ready: $desc"; return 0; }; sleep 1; done
  echo "ERROR: timed out waiting for $desc"; dc logs --tail 30 || true; exit 1
}
wait_for "postgres"       bash -c 'cd "'"$WORK"'" && docker compose exec -T postgres pg_isready -U profile -d profile'
wait_for "restore-target" bash -c 'cd "'"$WORK"'" && docker compose exec -T restore-target pg_isready -U profile -d profile'
wait_for "minio"          curl -fsS "http://127.0.0.1:59000/minio/health/live"

# ── source DB schema: the REAL migration runner (ADR-113) ────────────────────────
echo "--- building source schema with the real migration runner (npm run migrate) ---"
# dotenv never overrides an explicit env var, so a developer's .env cannot redirect this.
( cd "$REPO_ROOT" && DATABASE_URL="postgresql://profile:$PGPASS@127.0.0.1:$SOURCE_PORT/profile" \
    npm run --silent migrate ) || { echo "ERROR: migration runner failed"; exit 1; }

psql_src() { dc exec -T -e PGCLIENTENCODING=UTF8 postgres psql -X -U profile -d profile "$@"; }
psql_dst() { dc exec -T -e PGCLIENTENCODING=UTF8 restore-target psql -X -U profile -d profile "$@"; }

REPO_MIGRATIONS="$(cd "$MIGRATIONS_DIR" && ls -1 *.sql | LC_ALL=C sort | paste -sd, -)"
SRC_MIGRATIONS="$(psql_src -tAc "select string_agg(filename, ',' order by filename) from schema_migrations")"
echo "  repo migrations:              $REPO_MIGRATIONS"
echo "  source schema_migrations:     $SRC_MIGRATIONS"
[ -n "$SRC_MIGRATIONS" ] && [ "$SRC_MIGRATIONS" = "$REPO_MIGRATIONS" ] \
  && ok "source schema_migrations equals the repo's migrations/*.sql list" \
  || no "source schema_migrations differs from migrations/*.sql"
case ",$SRC_MIGRATIONS," in
  *,006_player_identity.sql,*) ok "source schema includes 006_player_identity.sql" ;;
  *) no "source schema is missing 006_player_identity.sql" ;;
esac
case ",$SRC_MIGRATIONS," in
  *,005_*) no "source schema carries a 005 migration (it was never deployed)" ;;
  *) ok "source schema carries no 005 migration" ;;
esac

# ── seed source DB: the shared drill seed ────────────────────────────────────────
echo "--- seeding source DB (tests/testdata/profile-restore-drill/seed.sql) ---"
psql_src -v ON_ERROR_STOP=1 -f - < "$DRILL_SQL/seed.sql" >/dev/null

# Multibyte text must survive the INSERT itself — a mangled value would round-trip just as faithfully.
cyrillic_ok() { # <psql function>
  "$1" -tAc "select count(*) || '|' || bool_and(octet_length(display_name) > length(display_name))
               from players where id in ('00000275-0000-4000-8000-000000000003','00000275-0000-4000-8000-000000000004')"
}
[ "$(cyrillic_ok psql_src)" = "2|true" ] && ok "source Cyrillic names stored multibyte (bytes > chars)" \
  || no "source Cyrillic names NOT multibyte (got '$(cyrillic_ok psql_src)')"

TABLES="players player_identities player_match_xp_credits player_name_history player_cosmetic_ownership purchase_intents processed_purchases player_messages player_xp_grants schema_migrations"
# bash 3.2 (macOS /bin/bash) has no associative arrays, so source counts go to a file: "<table> <n>".
: > "$WORK/source-counts.txt"
for t in $TABLES; do
  echo "$t $(psql_src -tAc "select count(*) from $t")" >> "$WORK/source-counts.txt"
done
src_count() { awk -v t="$1" '$1 == t { print $2 }' "$WORK/source-counts.txt"; }
echo "  source counts: $(tr '\n' ' ' < "$WORK/source-counts.txt")"

# Source fingerprint, taken before the backup (the box drill does the same, step B2).
if psql_src -f - < "$DRILL_SQL/verify.sql" > "$WORK/source.txt" 2>&1; then
  ok "verify.sql ran on the source"
else
  no "verify.sql failed on the source"; cat "$WORK/source.txt"
fi
grep -qx 'verify_end: complete' "$WORK/source.txt" && ok "verify.sql ran to its end-of-file sentinel on the source" \
  || no "verify.sql source output lacks the 'verify_end: complete' sentinel"
grep -q 'uncovered_tables: none' "$WORK/source.txt" && ok "verify.sql covers every source table (uncovered_tables: none)" \
  || no "verify.sql does not cover every table: $(grep 'uncovered_tables' "$WORK/source.txt")"

# ── age key + backup.env (MinIO standing in for reg.ru S3) ───────────────────────
age-keygen -o "$WORK/identity.txt" 2>/dev/null
RECIP="$(grep -i 'public key' "$WORK/identity.txt" | grep -o 'age1[0-9a-z]*' | head -1)"
[ -n "$RECIP" ] || { echo "ERROR: could not derive age recipient"; exit 1; }

write_env() { # <out-file> <secret-key-value>
  cat > "$1" <<ENV
POSTGRES_USER=profile
POSTGRES_DB=profile
PROFILE_BACKUP_S3_BUCKET=$BUCKET
PROFILE_BACKUP_S3_PREFIX=profiles
PROFILE_BACKUP_AGE_RECIPIENT=$RECIP
PROFILE_BACKUP_RETENTION_DAILY_DAYS=14
PROFILE_BACKUP_RETENTION_WEEKLY_DAYS=56
RCLONE_CONFIG_PROFILES_TYPE=s3
RCLONE_CONFIG_PROFILES_PROVIDER=Minio
RCLONE_CONFIG_PROFILES_ENV_AUTH=false
RCLONE_CONFIG_PROFILES_ENDPOINT=http://127.0.0.1:59000
RCLONE_CONFIG_PROFILES_REGION=us-east-1
RCLONE_CONFIG_PROFILES_ACCESS_KEY_ID=$MINIO_KEY
RCLONE_CONFIG_PROFILES_SECRET_ACCESS_KEY=$2
RCLONE_CONFIG_PROFILES_ACL=private
ENV
  chmod 600 "$1"
}
write_env "$WORK/backup.env" "$MINIO_SECRET"

# create the bucket
( set -a; . "$WORK/backup.env"; set +a; rclone mkdir "profiles:$BUCKET" )

run_backup() { # <env-file>
  ( cd "$REPO_ROOT" && PROFILE_DIR="$WORK" BACKUP_DIR="$WORK/backups" \
      PROFILE_BACKUP_ENV_FILE="$1" bash "$BACKUP_SCRIPT" backup )
}

echo
echo "=== TEST 1: backup (dump -> encrypt -> upload -> verify -> prune) ==="
run_backup "$WORK/backup.env"

MARKER="$WORK/backups/last-backup.json"
[ -f "$MARKER" ] && jq -e '.exit_status == 0' "$MARKER" >/dev/null \
  && ok "success marker written (exit_status 0)" || no "success marker missing/non-zero"

OBJ="$( set -a; . "$WORK/backup.env"; set +a; rclone lsf "profiles:$BUCKET/profiles/daily/" )"
[ -n "$OBJ" ] && ok "encrypted object in bucket: $OBJ" || no "no object uploaded to daily/"

# object is real age ciphertext (header 'age-encryption.org'), not plaintext
( set -a; . "$WORK/backup.env"; set +a; rclone cat "profiles:$BUCKET/profiles/daily/$OBJ" 2>/dev/null | head -c 64 ) \
  | grep -q 'age-encryption.org' && ok "uploaded object is age-encrypted (not plaintext)" \
  || no "uploaded object does not look age-encrypted"

# local temp cleaned up
if ls "$WORK/backups"/.dump.* >/dev/null 2>&1; then no "local temp dump left behind"; else ok "local temp cleaned up"; fi

echo
echo "=== TEST 2: restore + fingerprint round-trip ==="
FULLKEY="profiles/daily/$OBJ"
# Default-deny (6a): a legit distinct-remote drill target must be declared via PROFILE_RESTORE_REMOTE_HOST
# (matching the URL host) to proceed without the dated live-DB confirm. This is the positive/allow path.
( cd "$REPO_ROOT" && PROFILE_DIR="$WORK" BACKUP_DIR="$WORK/backups" \
    PROFILE_RESTORE_REMOTE_HOST="restore-target" \
    bash "$BACKUP_SCRIPT" restore "$FULLKEY" "$WORK/identity.txt" \
    "postgresql://profile:$PGPASS@restore-target:5432/profile" )

for t in $TABLES; do
  src="$(src_count "$t")"
  dst="$(psql_dst -tAc "select count(*) from $t")"
  [ -n "$src" ] && [ "$src" = "$dst" ] && ok "$t count matches ($dst)" \
    || no "$t count mismatch (src=$src dst=$dst)"
done

DST_MIGRATIONS="$(psql_dst -tAc "select string_agg(filename, ',' order by filename) from schema_migrations")"
echo "  restored schema_migrations:   $DST_MIGRATIONS"
[ "$DST_MIGRATIONS" = "$SRC_MIGRATIONS" ] && ok "restored schema_migrations equals source" \
  || no "restored schema_migrations differs (src='$SRC_MIGRATIONS' dst='$DST_MIGRATIONS')"

ROW="$(psql_dst -tAc "select p.xp||'|'||p.is_citizen||'|'||p.is_paid_citizen||'|'||coalesce(p.display_name,'')
                        from players p join player_identities i on i.player_id = p.id
                       where i.platform = 'yandex_games' and i.platform_user_id = 'drill0275-yg-01'")"
# psql renders booleans as true/false (not t/f) when concatenated to text.
[ "$ROW" = "3000000000|true|true|DrillAlpha" ] && ok "identity drill0275-yg-01's player round-trips ($ROW)" \
  || no "identity drill0275-yg-01's player mismatch (got '$ROW')"

# No `tr -d '[:space:]'` here — the names contain spaces.
[ "$(cyrillic_ok psql_dst)" = "2|true" ] && ok "restored Cyrillic names still multibyte (bytes > chars)" \
  || no "restored Cyrillic names NOT multibyte (got '$(cyrillic_ok psql_dst)')"

if psql_dst -f - < "$DRILL_SQL/verify.sql" > "$WORK/restored.txt" 2>&1; then
  ok "verify.sql ran on the restored DB"
else
  no "verify.sql failed on the restored DB"; cat "$WORK/restored.txt"
fi
grep -qx 'verify_end: complete' "$WORK/restored.txt" && ok "verify.sql ran to its end-of-file sentinel on the restored DB" \
  || no "verify.sql restored output lacks the 'verify_end: complete' sentinel"
if diff "$WORK/source.txt" "$WORK/restored.txt"; then
  ok "fingerprint IDENTICAL (10 tables, sequences, constraint/index definitions, spot checks)"
else
  no "fingerprint differs between source and restored (diff above)"
fi

echo
echo "=== TEST 2b: behavioural checks on the restored DB (behaviour.sql) ==="
BEHAVIOUR="$(psql_dst -f - < "$DRILL_SQL/behaviour.sql" 2>&1 || true)"
printf '%s\n' "$BEHAVIOUR" | grep -F '(' | sed 's/^/    /'
expect_line() { # <label> <exact expected text>
  printf '%s\n' "$BEHAVIOUR" | grep -qF -- "$2" && ok "$1: $2" || no "$1: expected '$2'"
}
expect_line "(a) second pending name change" "(a) rejected: sqlstate=23505 constraint=player_name_history_one_pending_uq"
expect_line "(a2) duplicate credit"          "(a2) rejected: sqlstate=23505 constraint=player_match_xp_credits_pkey"
expect_line "(a3) duplicate identity"        "(a3) rejected: sqlstate=23505 constraint=player_identities_pkey"
expect_line "(b) child rows present first"   "(b) before: identities=1 credits=3 name_history=1 cosmetics=2 intents=1 messages=1 xp_grants=1 receipt_intent_set=true"
expect_line "(b) cascade"                    "(b) left: identities=0 credits=0 name_history=0 cosmetics=0 intents=0 messages=0 xp_grants=0"
expect_line "(b) receipt survives, set null" "(b) receipt kept: rows=1 intent_id_null=true"
expect_line "(b) rollback"                   "(b) rolled back: players=8"
expect_line "(c) sequence"                   "(c) non-colliding next id: true"
expect_line "(c) gap after (a)'s used value" "(c) gap=2"

echo
echo "=== TEST 2c: drill cleanup on the source (cleanup.sql) ==="
CLEANUP="$(psql_src -f - < "$DRILL_SQL/cleanup.sql" 2>&1)" || no "cleanup.sql failed"
printf '%s\n' "$CLEANUP" | grep -E '^(drill cleanup counts|schema_migrations):' | sed 's/^/    /'
printf '%s\n' "$CLEANUP" | grep -qxF "drill cleanup counts: players=0 player_identities=0 player_match_xp_credits=0 player_name_history=0 player_cosmetic_ownership=0 purchase_intents=0 processed_purchases=0 player_messages=0 player_xp_grants=0" \
  && ok "cleanup returned all 9 data tables to 0 rows" || no "cleanup left rows behind"
printf '%s\n' "$CLEANUP" | grep -qxF "schema_migrations: $SRC_MIGRATIONS" \
  && ok "cleanup left schema_migrations unchanged" || no "schema_migrations changed by cleanup"

echo
echo "=== TEST 3: forced failure (bad S3 secret) -> non-zero + failure marker ==="
write_env "$WORK/backup-bad.env" "wrong-secret-key"
set +e
run_backup "$WORK/backup-bad.env"
rc=$?
set -e
[ "$rc" -ne 0 ] && ok "forced failure exits non-zero (rc=$rc)" || no "forced failure should exit non-zero"
jq -e '.exit_status != 0 and .error != null' "$MARKER" >/dev/null \
  && ok "failure marker written (exit_status!=0, error set)" || no "failure marker not updated"

echo
echo "=== TEST 4: Sunday weekly-copy branch (force date +%u -> 7 via a PATH shim) ==="
mkdir -p "$WORK/bin"
REAL_DATE="$(command -v date)"   # resolve now, before $WORK/bin shadows date on PATH (N3)
cat > "$WORK/bin/date" <<SHIM
#!/usr/bin/env bash
# Test shim: pretend it's Sunday for the weekday check; pass every other date call through to the
# REAL date (absolute path baked in — a "command -v date" here would just re-resolve to this shim).
for a in "\$@"; do [ "\$a" = "+%u" ] && { echo 7; exit 0; }; done
exec "$REAL_DATE" "\$@"
SHIM
chmod +x "$WORK/bin/date"
# Clear weekly/ first so the assertion proves TEST 4's shim created the object — otherwise, if
# the harness happens to run on a real Sunday, TEST 1 already made it and this would tautologize.
( set -a; . "$WORK/backup.env"; set +a; rclone purge "profiles:$BUCKET/profiles/weekly/" 2>/dev/null || true )
( cd "$REPO_ROOT" && PATH="$WORK/bin:$PATH" PROFILE_DIR="$WORK" BACKUP_DIR="$WORK/backups" \
    PROFILE_BACKUP_ENV_FILE="$WORK/backup.env" bash "$BACKUP_SCRIPT" backup )
WEEKLY="$( set -a; . "$WORK/backup.env"; set +a; rclone lsf "profiles:$BUCKET/profiles/weekly/" )"
[ -n "$WEEKLY" ] && ok "Sunday branch wrote a weekly/ object: $WEEKLY" \
  || no "no weekly/ object created on the forced-Sunday run"

echo
echo "=== TEST 5: restore guard is DEFAULT-DENY — refuses live/loopback/Docker-alias targets (6a) ==="
# The guard runs after load_env + the identity check but BEFORE any download/pg_restore, so a
# refused target exits non-zero WITH the guard's message and never touches a DB. Under default-deny
# EVERY non-allowlisted target is refused — including the compose container NAME and container IP
# that the old blocklist missed (the 6a regression). The allowlisted-remote PROCEED path is covered
# end-to-end by TEST 2 (which sets PROFILE_RESTORE_REMOTE_HOST=restore-target and round-trips).
guard_refuses() { # <label> <target-url>
  local out rc
  set +e
  out="$( cd "$REPO_ROOT" && PROFILE_DIR="$WORK" BACKUP_DIR="$WORK/backups" \
      bash "$BACKUP_SCRIPT" restore "profiles/daily/$OBJ" "$WORK/identity.txt" "$2" 2>&1 )"
  rc=$?
  set -e
  if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -q 'default-deny'; then
    ok "guard refuses $1"
  else
    no "guard FAILED to refuse $1 (rc=$rc)"
  fi
}
guard_refuses "empty-host / Unix socket (postgresql:///profile)" "postgresql:///profile"
guard_refuses "IPv6 loopback [::1]"                              "postgresql://profile:test@[::1]:5432/profile"
guard_refuses "localhost"                                        "postgresql://profile:test@localhost:5432/profile"
guard_refuses "compose container name (profile-postgres-1)"      "postgresql://profile:test@profile-postgres-1:5432/profile"
guard_refuses "container IP (172.18.0.2)"                        "postgresql://profile:test@172.18.0.2:5432/profile"
guard_refuses "non-allowlisted host (evil.example)"              "postgresql://profile:test@evil.example:5432/profile"
# Guard/executor parse-divergence forms — libpq's ?host= override / multi-host list / key=value
# conninfo can connect to a different host than a textual parse sees. Under default-deny these are
# all REFUSED on the naive path (a bypass needs the operator to self-allowlist the exact extracted
# string — a deliberate act, equivalent to the dated confirm). Documented as residual [R9].
guard_refuses "?host= query override"                            "postgresql://remote-good/profile?host=postgres"
guard_refuses "multi-host list (a,postgres)"                     "postgresql://a,postgres/profile"
guard_refuses "key=value conninfo (no scheme)"                   "host=postgres dbname=profile"

echo
echo "=== TEST 6: PROFILE_BACKUP_MARKER_FILE isolates the smoke marker from last-backup.json (N6) ==="
# A backup run with the marker override must write its marker to the override path and leave the
# nightly cron's last-backup.json untouched — this is how the deploy-time smoke stops polluting it.
SMOKE_MARKER="$WORK/backups/last-smokecheck.json"
rm -f "$SMOKE_MARKER"
BEFORE="$(cksum < "$MARKER")"   # snapshot last-backup.json (a prior test left a marker here)
( cd "$REPO_ROOT" && PROFILE_DIR="$WORK" BACKUP_DIR="$WORK/backups" \
    PROFILE_BACKUP_ENV_FILE="$WORK/backup.env" PROFILE_BACKUP_MARKER_FILE="$SMOKE_MARKER" \
    bash "$BACKUP_SCRIPT" backup )
[ -f "$SMOKE_MARKER" ] && jq -e '.exit_status == 0' "$SMOKE_MARKER" >/dev/null \
  && ok "override run wrote last-smokecheck.json (exit_status 0)" || no "override marker missing/non-zero"
[ "$(cksum < "$MARKER")" = "$BEFORE" ] && ok "nightly last-backup.json left untouched by the override run" \
  || no "override run clobbered last-backup.json"

echo
echo "=== TEST 8: retention=0 is rejected BEFORE any prune (C-ret) ==="
# A literal PROFILE_BACKUP_RETENTION_DAILY_DAYS=0 would make `rclone delete --min-age 0d` wipe the
# just-uploaded object. The fix validates retention as a positive integer and dies BEFORE the
# dump/upload/prune — so the run fails closed and any pre-existing daily object is untouched. (Marker
# override keeps this probe off the shared last-backup.json.)
DAILY_BEFORE="$( set -a; . "$WORK/backup.env"; set +a; rclone lsf "profiles:$BUCKET/profiles/daily/" )"
cp "$WORK/backup.env" "$WORK/backup-ret0.env"
printf 'PROFILE_BACKUP_RETENTION_DAILY_DAYS=0\n' >> "$WORK/backup-ret0.env"   # last assignment wins on source
RET0_MARKER="$WORK/backups/last-ret0.json"
set +e
out="$( cd "$REPO_ROOT" && PROFILE_DIR="$WORK" BACKUP_DIR="$WORK/backups" \
    PROFILE_BACKUP_ENV_FILE="$WORK/backup-ret0.env" PROFILE_BACKUP_MARKER_FILE="$RET0_MARKER" \
    bash "$BACKUP_SCRIPT" backup 2>&1 )"
rc=$?
set -e
[ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qi 'RETENTION_DAILY_DAYS' \
  && ok "retention=0 fails closed with a retention error (rc=$rc)" || no "retention=0 not rejected (rc=$rc)"
[ -f "$RET0_MARKER" ] && jq -e '.exit_status != 0' "$RET0_MARKER" >/dev/null \
  && ok "failure marker written for retention=0" || no "no failure marker for retention=0"
DAILY_AFTER="$( set -a; . "$WORK/backup.env"; set +a; rclone lsf "profiles:$BUCKET/profiles/daily/" )"
[ -n "$DAILY_AFTER" ] && [ "$DAILY_BEFORE" = "$DAILY_AFTER" ] \
  && ok "pre-existing daily backup survived (died before the prune)" \
  || no "daily backup changed (before='$DAILY_BEFORE' after='$DAILY_AFTER')"

echo
echo "==================== RESULT: $pass passed, $fail failed ===================="
[ "$fail" -eq 0 ]
