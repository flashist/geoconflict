#!/usr/bin/env bash
#
# profile-backup.sh — encrypted, off-box daily backup of the player-profile Postgres DB.
#
# Deployed THROUGH the profile deploy path (no parallel tooling): build-deploy-profile.sh
# SCPs this file to the VPS, setup-profile.sh installs it to /opt/profile/backup.sh (0700)
# and schedules it via /etc/cron.d/profile-backups. Do NOT edit the on-box copy in place —
# change this file (+ .env.profile/.secret) and redeploy.
#
# All config + secrets are sourced at runtime from $PROFILE_DIR/backup.env (0600), which
# setup-profile.sh writes from the threaded PROFILE_BACKUP_* deploy vars. Nothing secret is
# baked into this script, the image, or git.
#
# Why this design (see ai-agents/tasks/backlog/s4-postgres-backup-routine.md):
#   - pg_dump runs inside the postgres container over its local socket (trust auth) — the DB
#     is never exposed off-loopback and no password rides the wire.
#   - The dump is encrypted with an age RECIPIENT public key before it leaves the box. The box
#     never holds the private identity, so a stolen S3 object cannot be decrypted on the box.
#   - Upload is verified (object exists + size matches) BEFORE the local temp is deleted.
#   - A machine-readable marker (last-backup.json) is always written for the monitoring agent
#     (monitoring-alert-bot-phase2.md item 5); any failure exits non-zero (no silent failure).
#
# Usage:
#   profile-backup.sh                 # default: run the daily backup
#   profile-backup.sh backup          # same as above
#   profile-backup.sh restore <s3-key> <age-identity-file> <target-database-url>
#       Pull a dated object, decrypt with the OFF-BOX age identity, pg_restore into a target
#       DB (a throwaway/staging instance — never the live DB). Backs the restore drill (Part E).
#
set -euo pipefail

PROFILE_DIR="${PROFILE_DIR:-/opt/profile}"
BACKUP_DIR="${BACKUP_DIR:-$PROFILE_DIR/backups}"
ENV_FILE="${PROFILE_BACKUP_ENV_FILE:-$PROFILE_DIR/backup.env}"
# MARKER is overridable (PROFILE_BACKUP_MARKER_FILE) so the deploy-time smoke check can write its
# own marker (last-smokecheck.json) instead of clobbering the nightly cron's last-backup.json (N6).
MARKER="${PROFILE_BACKUP_MARKER_FILE:-$BACKUP_DIR/last-backup.json}"

# rclone is configured entirely via RCLONE_CONFIG_PROFILES_* env vars (from backup.env), so there
# is deliberately no rclone.conf. Point RCLONE_CONFIG at /dev/null so rclone doesn't emit a
# "config file not found" NOTICE on every call — keeps /var/log/profile-backup.log clean. The
# remote's RCLONE_CONFIG_PROFILES_* vars are read independently of the config-file path.
export RCLONE_CONFIG=/dev/null

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [profile-backup] $*"; }
now_iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# write_marker <exit_status> <object_key> <size_bytes> <error_msg>
# Always-valid JSON; the error string is escaped so quotes/newlines can't corrupt it.
write_marker() {
  local status="$1" key="${2:-}" size="${3:-0}" err="${4:-}" err_field
  if [ -n "$err" ]; then
    err="${err//\\/\\\\}"; err="${err//\"/\\\"}"; err="${err//$'\n'/ }"
    err_field="\"$err\""
  else
    err_field="null"
  fi
  ( umask 077; cat > "$MARKER" <<EOF
{
  "schema": 1,
  "started_at": "${STARTED_AT:-}",
  "finished_at": "$(now_iso)",
  "exit_status": $status,
  "object_key": "$key",
  "size_bytes": $size,
  "error": $err_field
}
EOF
  ) || true
  chmod 600 "$MARKER" 2>/dev/null || true
}

die() { log "ERROR: $1"; LAST_ERROR="$1"; exit 1; }

# Single failure-marker writer for the backup path. Armed (trap … EXIT) at the very top of
# do_backup so ANY early exit — set -e, die(), or even a missing config — leaves a failure
# marker the monitor can see, unless do_backup reached success and wrote its own. Defaults on
# every reference keep it safe under `set -u` if it fires before a var is assigned.
on_exit() {
  local rc=$?
  rm -f "${DUMP_TMP:-}" "${ENC_TMP:-}" 2>/dev/null || true
  if [ "${SUCCESS:-0}" != "1" ]; then
    write_marker "$rc" "" "${ENC_SIZE:-0}" "${LAST_ERROR:-unexpected failure (rc=$rc)}"
  fi
}

load_env() {
  [ -f "$ENV_FILE" ] || die "missing config $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  command -v rclone >/dev/null 2>&1 || die "rclone not installed"
  command -v age    >/dev/null 2>&1 || die "age not installed"
  : "${PROFILE_BACKUP_S3_BUCKET:?PROFILE_BACKUP_S3_BUCKET not set in $ENV_FILE}"
  S3_PREFIX="${PROFILE_BACKUP_S3_PREFIX:-profiles}"
  REMOTE_BASE="profiles:${PROFILE_BACKUP_S3_BUCKET}/${S3_PREFIX}"
}

# Bytes of a single remote object (empty string if it does not exist). The trailing `|| true`
# keeps a missing-object no-match from returning non-zero under `set -e`+`pipefail`, so the
# caller's explicit size check reaches its descriptive `die` instead of aborting early (B4).
remote_size() {
  rclone size --json "$1" 2>/dev/null \
    | grep -o '"bytes":[0-9]\+' | head -1 | cut -d: -f2 || true
}

do_backup() {
  # Init + arm the failure-marker trap BEFORE anything that can fail, so even a missing
  # backup.env leaves a marker (and exits non-zero) rather than failing silently.
  STARTED_AT="$(now_iso)"
  DUMP_TMP=""; ENC_TMP=""; ENC_SIZE=0; SUCCESS=0; LAST_ERROR=""
  mkdir -p "$BACKUP_DIR"
  trap on_exit EXIT

  load_env
  : "${POSTGRES_USER:?POSTGRES_USER not set in $ENV_FILE}"
  : "${POSTGRES_DB:?POSTGRES_DB not set in $ENV_FILE}"
  : "${PROFILE_BACKUP_AGE_RECIPIENT:?PROFILE_BACKUP_AGE_RECIPIENT not set in $ENV_FILE}"
  local retain_daily="${PROFILE_BACKUP_RETENTION_DAILY_DAYS:-14}"
  local retain_weekly="${PROFILE_BACKUP_RETENTION_WEEKLY_DAYS:-56}"
  # C-ret: retention MUST be a positive integer. `${VAR:-N}` defaults only on unset/empty, so a literal
  # `0` (a common but WRONG "keep forever" mental model — `--min-age 0d` means "older than 0 days" =
  # EVERYTHING, incl. the object uploaded seconds later) or a non-numeric typo would flow straight into
  # `rclone delete --min-age` (step 6) and delete the fresh backup while write_marker still records
  # success. Fail closed BEFORE any dump/upload/prune — the B2 deploy smoke exercises this, so a poison
  # value can't even ship; a directly-edited backup.env fails the nightly run loud without deleting anything.
  case "$retain_daily"  in ''|*[!0-9]*) die "PROFILE_BACKUP_RETENTION_DAILY_DAYS must be a positive integer number of days (got '$retain_daily')" ;; esac
  case "$retain_weekly" in ''|*[!0-9]*) die "PROFILE_BACKUP_RETENTION_WEEKLY_DAYS must be a positive integer number of days (got '$retain_weekly')" ;; esac
  [ "$retain_daily"  -ge 1 ] || die "PROFILE_BACKUP_RETENTION_DAILY_DAYS must be >= 1 (got '$retain_daily' — 0 would delete the just-uploaded backup)"
  [ "$retain_weekly" -ge 1 ] || die "PROFILE_BACKUP_RETENTION_WEEKLY_DAYS must be >= 1 (got '$retain_weekly' — 0 would delete the just-uploaded backup)"

  local today name daily_key
  today="$(date -u +%Y-%m-%d)"
  name="profile-${today}.dump.age"
  daily_key="${S3_PREFIX}/daily/${name}"

  cd "$PROFILE_DIR"

  DUMP_TMP="$(mktemp "$BACKUP_DIR/.dump.XXXXXX")"
  ENC_TMP="${DUMP_TMP}.age"

  # 1) Dump in custom/compressed format from the container's local socket (trust auth).
  #    stdin is /dev/null so `docker compose exec -T` can never drain the caller's stdin (harmless
  #    under cron, but keeps the script safe when invoked from a piped/heredoc wrapper).
  log "pg_dump -Fc of database '$POSTGRES_DB'"
  if ! docker compose exec -T postgres pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" < /dev/null > "$DUMP_TMP"; then
    die "pg_dump failed"
  fi
  [ -s "$DUMP_TMP" ] || die "pg_dump produced an empty file"

  # 2) Encrypt to the recipient public key, then drop the plaintext immediately.
  log "encrypting dump with age recipient"
  age -r "$PROFILE_BACKUP_AGE_RECIPIENT" -o "$ENC_TMP" "$DUMP_TMP" || die "age encryption failed"
  rm -f "$DUMP_TMP"; DUMP_TMP=""
  ENC_SIZE="$(wc -c < "$ENC_TMP" | tr -d ' ')"
  [ "${ENC_SIZE:-0}" -gt 0 ] || die "encrypted file is empty"

  # 3) Upload to daily/.
  log "uploading $daily_key (${ENC_SIZE} bytes)"
  rclone copyto "$ENC_TMP" "profiles:${PROFILE_BACKUP_S3_BUCKET}/${daily_key}" \
    || die "rclone upload failed"

  # 4) Verify the object landed (exists + size matches) BEFORE deleting the local temp.
  local rsize
  rsize="$(remote_size "profiles:${PROFILE_BACKUP_S3_BUCKET}/${daily_key}")"
  [ "${rsize:-0}" = "$ENC_SIZE" ] || die "upload verify failed (local=$ENC_SIZE remote=${rsize:-missing})"
  log "upload verified"

  # 5) On Sundays, also retain a weekly copy (server-side copy from the verified daily object).
  if [ "$(date -u +%u)" = "7" ]; then
    local weekly_key="${S3_PREFIX}/weekly/${name}"
    log "Sunday — copying to $weekly_key"
    rclone copyto "profiles:${PROFILE_BACKUP_S3_BUCKET}/${daily_key}" \
                  "profiles:${PROFILE_BACKUP_S3_BUCKET}/${weekly_key}" \
      || log "WARNING: weekly copy failed (daily backup already safe off-box)"
  fi

  rm -f "$ENC_TMP"; ENC_TMP=""

  # 6) Retention prune (reliable fallback to S3 lifecycle rules; safe to also run with them).
  log "pruning daily > ${retain_daily}d and weekly > ${retain_weekly}d"
  rclone delete --min-age "${retain_daily}d"  "${REMOTE_BASE}/daily/"  || log "WARNING: daily prune failed"
  rclone delete --min-age "${retain_weekly}d" "${REMOTE_BASE}/weekly/" || log "WARNING: weekly prune failed"

  # 7) Success.
  SUCCESS=1
  write_marker 0 "$daily_key" "$ENC_SIZE" ""
  log "backup OK: $daily_key (${ENC_SIZE} bytes)"
}

do_restore() {
  local key="${1:-}" identity="${2:-}" target="${3:-}"
  if [ -z "$key" ] || [ -z "$identity" ] || [ -z "$target" ]; then
    cat >&2 <<USAGE
Usage: profile-backup.sh restore <s3-key> <age-identity-file> <target-database-url>
  <s3-key>            object key relative to the bucket, e.g. profiles/daily/profile-2026-06-29.dump.age
  <age-identity-file> the OFF-BOX age private identity (age-keygen output). NEVER stored on the box.
  <target-database-url> a THROWAWAY/staging DB to restore into — never the live profile DB.

  DEFAULT-DENY: pg_restore runs INSIDE the postgres container, so ANY target that resolves back to it
  reaches the LIVE DB — not just empty-host/loopback but the compose service/container name, the
  container IP, and network aliases too (a blocklist can't enumerate them all). So EVERY target is
  refused unless you prove it is safe, one of two ways:
    • distinct throwaway REMOTE: set PROFILE_RESTORE_REMOTE_HOST=<the target's host> (must equal the
      host in <target-database-url>); or
    • real in-place recovery into the LIVE DB: set PROFILE_RESTORE_CONFIRM_LIVE=<today's UTC date, YYYY-MM-DD>.
USAGE
    exit 2
  fi
  load_env
  [ -f "$identity" ] || die "age identity file not found: $identity"

  # B1/N1/6a: `restore` is a manual drill; `pg_restore --clean --if-exists` DROPs objects in $target,
  # and pg_restore runs INSIDE the postgres container — so ANY target that resolves back to that
  # container reaches the LIVE DB: empty/omitted host (local Unix socket), loopback, the compose
  # service/container name, the container IP, a network alias. A blocklist can't enumerate every such
  # name (it lost that race over successive reviews), so this is DEFAULT-DENY: refuse EVERY target
  # unless it is proven safe — EITHER an operator-declared distinct remote (PROFILE_RESTORE_REMOTE_HOST
  # equal to the target host) OR an explicitly confirmed in-place recovery (PROFILE_RESTORE_CONFIRM_LIVE
  # = today UTC). Keyed on HOST not db name (a throwaway drill DB is legitimately also named "profile").
  # IPv6-aware extraction so [::1] isn't mangled to '['. Both tests are exact `[ ]` string matches.
  local tgt_host rest today_utc
  rest="${target#*://}"; rest="${rest#*@}"
  if [ "${rest#\[}" != "$rest" ]; then
    tgt_host="${rest#\[}"; tgt_host="${tgt_host%%\]*}"   # bracketed IPv6: [::1]:5432/db -> ::1
  else
    tgt_host="${rest%%[:/]*}"                            # host:port/db or host/db -> host
  fi
  today_utc="$(date -u +%Y-%m-%d)"
  if [ -n "$tgt_host" ] && [ -n "${PROFILE_RESTORE_REMOTE_HOST:-}" ] \
     && [ "$tgt_host" = "$PROFILE_RESTORE_REMOTE_HOST" ]; then
    log "target host '$tgt_host' matches PROFILE_RESTORE_REMOTE_HOST — proceeding with distinct-remote restore"
  elif [ "${PROFILE_RESTORE_CONFIRM_LIVE:-}" = "$today_utc" ]; then
    log "PROFILE_RESTORE_CONFIRM_LIVE matches $today_utc — proceeding with confirmed in-place restore into '${tgt_host:-<socket>}'"
  else
    die "refusing to restore into '${tgt_host:-<empty/socket>}' (default-deny) — pg_restore runs inside the postgres container, so any local/loopback/Docker-alias target (empty host, localhost, 127.x, ::1, the compose service/container name, the container IP, …) reaches the LIVE profile DB and --clean --if-exists would DROP its data. To restore into a DISTINCT THROWAWAY REMOTE set PROFILE_RESTORE_REMOTE_HOST=${tgt_host:-<host>} ; for a real in-place recovery re-run with PROFILE_RESTORE_CONFIRM_LIVE=$today_utc"
  fi

  # EXIT trap (global RESTORE_TMP) so the decrypted plaintext is removed even if a later step
  # dies — die() exits, which a RETURN trap would miss. restore writes no backup marker.
  RESTORE_TMP="$(mktemp "${TMPDIR:-/tmp}/profile-restore.XXXXXX")"
  trap 'rm -f "${RESTORE_TMP:-}" "${RESTORE_TMP:-}.age" 2>/dev/null || true' EXIT

  log "downloading $key"
  rclone copyto "profiles:${PROFILE_BACKUP_S3_BUCKET}/${key}" "$RESTORE_TMP.age" || die "download failed"
  log "decrypting with off-box identity"
  age -d -i "$identity" -o "$RESTORE_TMP" "$RESTORE_TMP.age" || die "decryption failed"

  # pg_restore runs from the postgres container (has the client tools) but connects to the
  # caller-supplied target URL. The B1 guard above already refused a live-DB host without the
  # dated confirm, so by here $target is either a throwaway or an explicitly-confirmed recovery.
  log "pg_restore into target"
  cd "$PROFILE_DIR"
  # 7b: --single-transaction (implies --exit-on-error) wraps the WHOLE restore — including the --clean
  # DROPs — in one transaction that rolls back on ANY error, leaving the target unchanged. Critical for a
  # confirmed in-place live recovery: a mid-restore failure must not half-drop the live profile DB. Safe
  # here — single pg_restore invocation, no --jobs parallel restore (which is the only incompatibility).
  docker compose exec -T postgres pg_restore --single-transaction --clean --if-exists --no-owner -d "$target" < "$RESTORE_TMP" \
    || die "pg_restore failed"
  log "restore complete"
}

case "${1:-backup}" in
  backup)  shift || true; do_backup ;;
  restore) shift; do_restore "$@" ;;
  -h|--help|help) sed -n '1,40p' "$0" ;;
  *) echo "Unknown subcommand: $1" >&2; exit 2 ;;
esac
