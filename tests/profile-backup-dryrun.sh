#!/usr/bin/env bash
#
# tests/profile-backup-dryrun.sh — local dockerized dry-run for profile-backup.sh (T8).
#
# Proves the REAL profile-backup.sh end-to-end WITHOUT the VPS:
#   dump (-Fc) -> age-encrypt -> rclone upload -> verify -> prune -> restore -> row-count
#   round-trip, plus a forced-failure case (non-zero exit + failure marker).
#
# Faithful to production: profile-backup.sh runs on the HOST using host docker/age/rclone
# against a containerized Postgres + MinIO — the same shape as the box (host tools, Postgres
# in a container). NOT part of the Jest suite (needs Docker + age + rclone); run manually:
#
#   ./tests/profile-backup-dryrun.sh
#
# Requirements: a running Docker daemon, and `age`, `age-keygen`, `rclone`, `curl`, `jq`.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_SCRIPT="$REPO_ROOT/profile-backup.sh"
MIGRATION="$REPO_ROOT/migrations/001_player_profiles.sql"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/profile-backup-dryrun.XXXXXX")"
PGPASS="dryrun-pw"
MINIO_KEY="minioadmin"
MINIO_SECRET="minioadmin"
BUCKET="profile-backups-test"
KNOWN_ID="dryrun-yandex-123"

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

for t in docker age age-keygen rclone curl jq; do
  command -v "$t" >/dev/null 2>&1 || { echo "ERROR: missing required tool: $t"; exit 1; }
done
docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon not running"; exit 1; }
[ -f "$BACKUP_SCRIPT" ] || { echo "ERROR: $BACKUP_SCRIPT not found"; exit 1; }
[ -f "$MIGRATION" ] || { echo "ERROR: $MIGRATION not found"; exit 1; }

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

# ── seed source DB: schema + known rows ──────────────────────────────────────────
echo "--- seeding source DB ---"
dc exec -T postgres psql -v ON_ERROR_STOP=1 -U profile -d profile < "$MIGRATION" >/dev/null
dc exec -T postgres psql -v ON_ERROR_STOP=1 -U profile -d profile >/dev/null <<SQL
INSERT INTO player_profiles
  (yandex_player_id, persistent_id, xp, is_citizen, is_paid_citizen, citizenship_earned_at, citizenship_purchased_at, display_name)
VALUES ('$KNOWN_ID', 'persist-1', 4242, true, true, now(), now(), 'DryRunHero');
INSERT INTO player_profiles (yandex_player_id, persistent_id, xp) VALUES ('other-1', 'persist-2', 10);
INSERT INTO player_match_xp_credits (game_id, yandex_player_id, xp_awarded)
VALUES ('game-1', '$KNOWN_ID', 10), ('game-2', '$KNOWN_ID', 10), ('game-1', 'other-1', 10);
SQL

count() { dc exec -T postgres psql -U profile -d profile -tAc "select count(*) from $1" | tr -d '[:space:]'; }
SRC_PROFILES="$(count player_profiles)"
SRC_CREDITS="$(count player_match_xp_credits)"
echo "  source: player_profiles=$SRC_PROFILES player_match_xp_credits=$SRC_CREDITS"

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
echo "=== TEST 2: restore + row-count round-trip ==="
FULLKEY="profiles/daily/$OBJ"
# Default-deny (6a): a legit distinct-remote drill target must be declared via PROFILE_RESTORE_REMOTE_HOST
# (matching the URL host) to proceed without the dated live-DB confirm. This is the positive/allow path.
( cd "$REPO_ROOT" && PROFILE_DIR="$WORK" BACKUP_DIR="$WORK/backups" \
    PROFILE_RESTORE_REMOTE_HOST="restore-target" \
    bash "$BACKUP_SCRIPT" restore "$FULLKEY" "$WORK/identity.txt" \
    "postgresql://profile:$PGPASS@restore-target:5432/profile" )

dcount() { dc exec -T restore-target psql -U profile -d profile -tAc "select count(*) from $1" | tr -d '[:space:]'; }
DST_PROFILES="$(dcount player_profiles)"
DST_CREDITS="$(dcount player_match_xp_credits)"
[ "$SRC_PROFILES" = "$DST_PROFILES" ] && ok "player_profiles count matches ($DST_PROFILES)" \
  || no "player_profiles mismatch (src=$SRC_PROFILES dst=$DST_PROFILES)"
[ "$SRC_CREDITS" = "$DST_CREDITS" ] && ok "player_match_xp_credits count matches ($DST_CREDITS)" \
  || no "player_match_xp_credits mismatch (src=$SRC_CREDITS dst=$DST_CREDITS)"

ROW="$(dc exec -T restore-target psql -U profile -d profile -tAc \
  "select xp||'|'||is_citizen||'|'||is_paid_citizen||'|'||coalesce(display_name,'') from player_profiles where yandex_player_id='$KNOWN_ID'" | tr -d '[:space:]')"
# psql renders booleans as true/false (not t/f) when concatenated to text.
[ "$ROW" = "4242|true|true|DryRunHero" ] && ok "known profile round-trips ($ROW)" \
  || no "known profile mismatch (got '$ROW')"

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
echo "==================== RESULT: $pass passed, $fail failed ===================="
[ "$fail" -eq 0 ]
