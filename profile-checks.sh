#!/usr/bin/env bash
#
# profile-checks.sh — daily operability checks for the player-profile box (task 0219).
#
# Deployed THROUGH the profile deploy path (no parallel tooling): build-deploy-profile.sh SCPs
# this file to the VPS, setup-profile.sh installs it to /opt/profile/checks.sh (0700) and
# schedules it daily at 08:00 UTC via /etc/cron.d/profile-backups. Do NOT edit the on-box copy
# in place — change this file and redeploy.
#
# What it reads — the two signals nobody read before 0219:
#   - the backup freshness marker /opt/profile/backups/last-backup.json AND the bucket itself:
#     the daily object the marker names must really exist off-box (a log line is not an object,
#     0218), and the newest object under weekly/ must be recent — the marker carries NO weekly
#     signal and a weekly-copy failure is exit 0 by design (0241), so "backup OK" ≠ "weekly present".
#   - the certbot renewal log: an attempt happened recently (certbot appends to letsencrypt.log
#     on EVERY run, including "not yet due" ones — the cron's own certbot-renew.log stays empty
#     under --quiet unless something errs), the attempt did not error (certbot-renew.log grew),
#     and the live certificate still has enough days left.
#
# How it reports: every check yields OK or a one-line reason; all lines go to stdout (cron
# appends them to /var/log/profile-checks.log). Then it pings an EXTERNAL dead-man's switch:
# all OK -> GET $PROFILE_CHECKS_PING_URL; any FAIL -> POST the reasons to $URL/fail. The service
# also turns a MISSING ping into an alert, so this script's own death (cron gone, box frozen,
# script broken, ping host unreachable) pages too. The ping body carries reasons, ages and
# counts only — never keys, endpoints, bucket names or tokens.
#
# Exit status: 0 iff every check is OK and the success ping was delivered. No ping URL is itself
# a failure ("ALERTING NOT CONFIGURED") — a log nobody reads must never look green.
#
# Every input is env-overridable so the script is unit-testable off-box (tests/profile-checks.sh)
# and so an operator can force a check to fail on purpose and watch the alert arrive, e.g.
#   PROFILE_CHECKS_CERT_MIN_DAYS=90 /opt/profile/checks.sh
#
set -euo pipefail

PROFILE_DIR="${PROFILE_DIR:-/opt/profile}"
BACKUP_DIR="${BACKUP_DIR:-$PROFILE_DIR/backups}"
CHECKS_ENV_FILE="${PROFILE_CHECKS_ENV_FILE:-$PROFILE_DIR/checks.env}"
BACKUP_ENV_FILE="${PROFILE_BACKUP_ENV_FILE:-$PROFILE_DIR/backup.env}"
STATE_DIR="${PROFILE_CHECKS_STATE_DIR:-$PROFILE_DIR/checks-state}"
MARKER="${PROFILE_CHECKS_MARKER_FILE:-$BACKUP_DIR/last-backup.json}"
SMOKE_MARKER="${PROFILE_CHECKS_SMOKE_MARKER_FILE:-$BACKUP_DIR/last-smokecheck.json}"
LE_LOG="${PROFILE_CHECKS_LE_LOG:-/var/log/letsencrypt/letsencrypt.log}"
RENEW_LOG="${PROFILE_CHECKS_RENEW_LOG:-/var/log/certbot-renew.log}"
REBOOT_REQUIRED_FILE="${PROFILE_CHECKS_REBOOT_REQUIRED_FILE:-/var/run/reboot-required}"

# checks.env (0600, written by setup-profile.sh) carries PROFILE_CHECKS_PING_URL + PROFILE_DOMAIN.
if [ -f "$CHECKS_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$CHECKS_ENV_FILE"
  set +a
fi
PING_URL="${PROFILE_CHECKS_PING_URL:-}"
PROFILE_DOMAIN="${PROFILE_DOMAIN:-}"
CERT_FILE="${PROFILE_CHECKS_CERT_FILE:-${PROFILE_DOMAIN:+/etc/letsencrypt/live/$PROFILE_DOMAIN/cert.pem}}"

# Thresholds (owner-confirmed, 0219 Q5). Cron: backup 02:30, certbot 00:00/12:00, checks 08:00.
MAX_BACKUP_AGE_HOURS="${PROFILE_CHECKS_MAX_BACKUP_AGE_HOURS:-26}"
MAX_WEEKLY_AGE_DAYS="${PROFILE_CHECKS_MAX_WEEKLY_AGE_DAYS:-8}"
MAX_RENEW_ATTEMPT_AGE_HOURS="${PROFILE_CHECKS_MAX_RENEW_ATTEMPT_AGE_HOURS:-13}"
CERT_MIN_DAYS="${PROFILE_CHECKS_CERT_MIN_DAYS:-20}"

# rclone is configured purely via the RCLONE_CONFIG_PROFILES_* vars in backup.env (same as
# profile-backup.sh); /dev/null silences the "config file not found" notice.
export RCLONE_CONFIG=/dev/null

NOW="$(date -u +%s)"
OK_COUNT=0
FAIL_COUNT=0
REASONS=""

log()  { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [profile-checks] $*"; }
ok()   { OK_COUNT=$((OK_COUNT + 1)); log "OK   $1: $2"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); REASONS="${REASONS}${REASONS:+$'\n'}$1: $2"; log "FAIL $1: $2"; }

# Portable helpers: GNU first (the box), BSD second (the off-box test harness runs on macOS).
file_mtime() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || true; }
file_size()  { wc -c < "$1" 2>/dev/null | tr -d ' ' || true; }
# ISO-8601 UTC ("2026-09-13T02:30:02Z", fractional seconds tolerated) -> epoch; empty on failure.
iso_to_epoch() {
  local s="${1%%.*}"; s="${s%Z}"
  date -u -d "${s}Z" +%s 2>/dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%S' "$s" +%s 2>/dev/null || true
}
hours_since() { local e; e="$(iso_to_epoch "$1")"; [ -n "$e" ] && echo $(( (NOW - e) / 3600 )) || true; }
# First top-level "key": value of a flat JSON marker (the shape profile-backup.sh writes) — no jq.
json_field() {
  sed -n "s/^[[:space:]]*\"$2\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^\",}]*\)\"\{0,1\}.*/\1/p" "$1" 2>/dev/null | head -1 || true
}

# Threshold overrides must be non-negative integers: `[ -gt junk ]` errors to FALSE (a silent OK)
# and `$(( junk ))` aborts under set -u BEFORE the ping. Junk is reported as a FAIL for this run
# and the default stands in, so the run still reaches the ping. Cron passes no overrides — this
# guards an operator's hand-typed run (B7/B9). Leading zeros are normalised (08 is not octal here).
int_or_default() {  # <var> <env-name> <default>
  local v="${!1}"
  case "$v" in
    ''|*[!0-9]*) fail "thresholds" "$2='${v}' is not a non-negative integer — default $3 used for this run"; v="$3" ;;
  esac
  printf -v "$1" '%s' "$((10#$v))"
}
int_or_default MAX_BACKUP_AGE_HOURS        PROFILE_CHECKS_MAX_BACKUP_AGE_HOURS        26
int_or_default MAX_WEEKLY_AGE_DAYS         PROFILE_CHECKS_MAX_WEEKLY_AGE_DAYS         8
int_or_default MAX_RENEW_ATTEMPT_AGE_HOURS PROFILE_CHECKS_MAX_RENEW_ATTEMPT_AGE_HOURS 13
int_or_default CERT_MIN_DAYS               PROFILE_CHECKS_CERT_MIN_DAYS               20

# ── Mode: is this box off-box-configured at all? ─────────────────────────────
OFFBOX=0
REMOTE_BASE=""
if [ -f "$BACKUP_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$BACKUP_ENV_FILE"
  set +a
  if [ -n "${PROFILE_BACKUP_S3_BUCKET:-}" ]; then
    OFFBOX=1
    REMOTE_BASE="profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX:-profiles}"
  fi
fi

# The marker the object check reads: the nightly one, or — on a box whose first nightly has not
# fired yet — the deploy smoke's (set by check_daily_marker).
ACTIVE_MARKER=""

# 1) Daily backup marker: exists, exit_status 0, finished_at fresh.
check_daily_marker() {
  local name="daily-backup-marker" status finished age_h err
  if [ ! -f "$MARKER" ]; then
    # 0034's fresh-box rule: there is no last-backup.json until the first 02:30 run; the deploy
    # smoke's own marker (last-smokecheck.json, N6) proves recoverability meanwhile — but only
    # while it is itself fresh, otherwise the first nightly simply never happened.
    if [ -f "$SMOKE_MARKER" ]; then
      status="$(json_field "$SMOKE_MARKER" exit_status)"
      finished="$(json_field "$SMOKE_MARKER" finished_at)"
      age_h="$(hours_since "$finished")"
      if [ "$status" = "0" ] && [ -n "$age_h" ] && [ "$age_h" -le "$MAX_BACKUP_AGE_HOURS" ]; then
        ACTIVE_MARKER="$SMOKE_MARKER"
        ok "$name" "no nightly marker yet; deploy smoke backup succeeded ${age_h}h ago (first nightly not yet due)"
        return 0
      fi
    fi
    fail "$name" "last-backup.json is MISSING and no fresh successful deploy smoke marker (max ${MAX_BACKUP_AGE_HOURS}h) — no nightly backup has run"
    return 0
  fi
  ACTIVE_MARKER="$MARKER"
  status="$(json_field "$MARKER" exit_status)"
  finished="$(json_field "$MARKER" finished_at)"
  age_h="$(hours_since "$finished")"
  if [ "$status" != "0" ]; then
    err="$(json_field "$MARKER" error | cut -c1-160)"
    fail "$name" "last nightly backup FAILED (exit_status=${status:-?}, ${age_h:-?}h ago): ${err:-no error text}"
  elif [ -z "$age_h" ]; then
    fail "$name" "finished_at is unparseable ('${finished}')"
  elif [ "$age_h" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
    fail "$name" "daily marker age ${age_h}h > ${MAX_BACKUP_AGE_HOURS}h — the nightly run was missed"
  else
    ok "$name" "last nightly backup OK ${age_h}h ago ($(json_field "$MARKER" size_bytes) bytes)"
  fi
}

# 2) The daily object the marker names really exists off-box (0218 fact b: a marker is not an object).
check_daily_object() {
  local name="daily-backup-object" key base out size want
  if [ "$OFFBOX" != "1" ]; then fail "$name" "off-box backups not configured — nothing to verify"; return 0; fi
  if ! command -v rclone >/dev/null 2>&1; then fail "$name" "rclone not installed"; return 0; fi
  if [ -z "$ACTIVE_MARKER" ]; then fail "$name" "no backup marker names an object to verify"; return 0; fi
  key="$(json_field "$ACTIVE_MARKER" object_key)"
  base="${key##*/}"
  if [ -z "$key" ]; then fail "$name" "marker carries no object_key"; return 0; fi
  want="$(json_field "$ACTIVE_MARKER" size_bytes)"
  if out="$(rclone lsjson --files-only "profiles:${PROFILE_BACKUP_S3_BUCKET}/${key}" 2>/dev/null)" \
     && size="$(printf '%s' "$out" | grep -o '"Size":[0-9]*' | head -1 | cut -d: -f2)" \
     && [ -n "$size" ]; then
    # Defence in depth: the upload already verified the size once (profile-backup.sh); a mismatch
    # now means the key was overwritten by something other than the backup the marker records.
    if [ -n "$want" ] && [ "$size" != "$want" ]; then
      fail "$name" "$base exists off-box but is ${size} bytes while the marker says ${want} — not the object the backup verified"
    else
      ok "$name" "$base exists off-box (${size} bytes, matches the marker)"
    fi
  else
    fail "$name" "$base NOT found off-box although the marker says it was uploaded"
  fi
}

# 3) A recent weekly copy exists — listed from the bucket, independent of check 1 (0241 facts i+ii).
check_weekly_object() {
  local name="weekly-backup-object" out newest_date newest_epoch age_d count
  if [ "$OFFBOX" != "1" ]; then fail "$name" "off-box backups not configured — no weekly/ to list"; return 0; fi
  if ! command -v rclone >/dev/null 2>&1; then fail "$name" "rclone not installed"; return 0; fi
  if ! out="$(rclone lsjson --files-only "${REMOTE_BASE}/weekly/" 2>/dev/null)"; then
    fail "$name" "could not list weekly/ (rclone error)"; return 0
  fi
  # Newest by the date in the object name (profile-YYYY-MM-DD.dump.age); ModTime as the fallback.
  newest_date="$(printf '%s' "$out" | grep -o '"Path":"profile-[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' | sed 's/.*profile-//' | sort | tail -1 || true)"
  if [ -z "$newest_date" ]; then
    newest_date="$(printf '%s' "$out" | grep -o '"ModTime":"[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' | sed 's/.*"//' | sort | tail -1 || true)"
  fi
  if [ -z "$newest_date" ]; then
    fail "$name" "weekly/ is EMPTY — no weekly copy exists off-box (the daily marker cannot show this)"; return 0
  fi
  newest_epoch="$(iso_to_epoch "${newest_date}T00:00:00Z")"
  if [ -z "$newest_epoch" ]; then fail "$name" "could not parse the newest weekly date '${newest_date}'"; return 0; fi
  age_d=$(( (NOW - newest_epoch) / 86400 ))
  count="$(printf '%s' "$out" | grep -o '"Path":' | wc -l | tr -d ' ' || true)"
  if [ "$age_d" -gt "$MAX_WEEKLY_AGE_DAYS" ]; then
    fail "$name" "newest weekly copy is ${age_d}d old (> ${MAX_WEEKLY_AGE_DAYS}d; ${count} object(s)) — the Sunday copy is failing (it is exit 0 by design, so the daily marker still says OK)"
  else
    ok "$name" "newest weekly copy ${age_d}d old (${count} object(s) in weekly/)"
  fi
}

# 4) A renewal attempt happened recently. certbot appends to letsencrypt.log on EVERY invocation,
#    "not yet due" runs included (confirmed on the box, 0219 B1). logrotate rotates it weekly and
#    creates an EMPTY file, so the last write is the newest mtime among the NON-EMPTY
#    letsencrypt.log* files (the rotated .1.gz keeps the original's mtime).
#    The hooked renew cron is the ONLY certbot invoker on the box: setup-profile.sh disables the
#    package's hookless certbot.timer (owner ruling, 0219 review R3), so a recent write here means
#    the cron ran. If the timer were ever re-enabled this check would count its runs too.
check_renewal_attempt() {
  local name="cert-renewal-attempted" f m newest=0 age_h
  if [ -z "$CERT_FILE" ]; then fail "$name" "no PROFILE_DOMAIN — TLS/certbot is not configured on this box"; return 0; fi
  for f in "$LE_LOG" "$LE_LOG".*; do
    [ -f "$f" ] || continue
    [ "$(file_size "$f")" -gt 0 ] || continue
    m="$(file_mtime "$f")"
    [ -n "$m" ] || continue
    if [ "$m" -gt "$newest" ]; then newest="$m"; fi
  done
  if [ "$newest" -eq 0 ]; then fail "$name" "no certbot log found (letsencrypt.log*) — has certbot ever run?"; return 0; fi
  age_h=$(( (NOW - newest) / 3600 ))
  if [ "$age_h" -gt "$MAX_RENEW_ATTEMPT_AGE_HOURS" ]; then
    fail "$name" "last certbot run ${age_h}h ago (> ${MAX_RENEW_ATTEMPT_AGE_HOURS}h) — the twice-daily hooked renew cron is NOT running"
  else
    ok "$name" "certbot last ran ${age_h}h ago (the hooked renew cron; certbot.timer is disabled by setup-profile.sh)"
  fi
}

# 5) The attempt did not error: under --quiet the cron's certbot-renew.log stays silent on success,
#    so ANY growth since the last check is an error to surface. The byte offset seen is persisted
#    in the state dir; a missing offset (first run) or a shrunk log (rotated) reads as "everything
#    is new", so a pre-existing error is reported once rather than never.
check_renewal_errors() {
  local name="cert-renewal-errors" state="$STATE_DIR/certbot-renew.offset" size prev new_lines
  if [ -z "$CERT_FILE" ]; then fail "$name" "no PROFILE_DOMAIN — TLS/certbot is not configured on this box"; return 0; fi
  if [ ! -f "$RENEW_LOG" ]; then ok "$name" "no certbot-renew.log yet (nothing has erred)"; return 0; fi
  size="$(file_size "$RENEW_LOG")"
  prev="$(cat "$state" 2>/dev/null || true)"
  case "$prev" in ''|*[!0-9]*) prev=0 ;; esac
  if [ "$prev" -gt "$size" ]; then prev=0; fi
  mkdir -p "$STATE_DIR" 2>/dev/null || true
  printf '%s\n' "$size" > "$state" 2>/dev/null || log "WARNING: could not persist ${state}"
  if [ "$size" -gt "$prev" ]; then
    new_lines="$(tail -c +"$((prev + 1))" "$RENEW_LOG" | grep -v '^[[:space:]]*$' | tail -n 3 | cut -c1-200 | tr '\n' ' ' || true)"
    fail "$name" "certbot-renew.log grew by $((size - prev)) bytes since the last check (--quiet prints only on error): ${new_lines}"
  else
    ok "$name" "certbot-renew.log unchanged (${size} bytes)"
  fi
}

# 6) The certificate is not sliding toward expiry. Renewal is due 30 days out, so fewer than
#    CERT_MIN_DAYS left means ~10 days (~20 attempts) of silent failure — or the fuse end to end.
check_cert_days() {
  local name="cert-days-remaining" enddate
  if [ -z "$CERT_FILE" ]; then fail "$name" "no PROFILE_DOMAIN — TLS/certbot is not configured on this box"; return 0; fi
  if ! command -v openssl >/dev/null 2>&1; then fail "$name" "openssl not installed"; return 0; fi
  if [ ! -r "$CERT_FILE" ]; then fail "$name" "certificate file not readable (PROFILE_CHECKS_CERT_FILE)"; return 0; fi
  enddate="$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | sed 's/^notAfter=//' || true)"
  if openssl x509 -checkend "$((CERT_MIN_DAYS * 86400))" -noout -in "$CERT_FILE" >/dev/null 2>&1; then
    ok "$name" "certificate valid for at least ${CERT_MIN_DAYS} more days (notAfter=${enddate:-?})"
  else
    fail "$name" "certificate expires within ${CERT_MIN_DAYS} days (notAfter=${enddate:-?}) — renewal is due at 30 days out, so attempts have been failing"
  fi
}

# 7) Mode sanity (owner ruling Q6: FAIL loud). A box in local skeleton mode has no real backup.
check_mode() {
  local name="offbox-backups-configured"
  if [ "$OFFBOX" = "1" ]; then
    ok "$name" "backup.env present (S3 + age configured)"
  else
    fail "$name" "off-box backups not configured (no backup.env) — this box has NO real backup"
  fi
}

# 8) A pending reboot (task 0221). unattended-upgrades applies security patches with Automatic-Reboot
#    OFF (owner ruling: one box, so an unattended reboot is an unattended outage), so a patch that
#    needs a reboot only leaves /var/run/reboot-required behind — and nothing read it. Names only:
#    the .pkgs list beside it is not reported.
check_reboot_required() {
  local name="reboot-required"
  if [ -e "$REBOOT_REQUIRED_FILE" ]; then
    fail "$name" "reboot required (unattended-upgrades applied a patch that needs one; automatic reboot is off — schedule it)"
  else
    ok "$name" "no pending reboot"
  fi
}

# ── Report: log summary, then ping the dead-man's switch ──────────────────────
# curl's stderr is discarded on purpose: its error text can carry the URL. The service alerts on
# a MISSING ping, so an undelivered ping is logged, exits non-zero, and still pages.
report() {
  log "RESULT: ${OK_COUNT} ok, ${FAIL_COUNT} failed"
  if [ -z "$PING_URL" ]; then
    log "ALERTING NOT CONFIGURED: PROFILE_CHECKS_PING_URL is empty — these results reach NOBODY. Set it in .env.profile.secret and redeploy."
    exit 1
  fi
  if ! command -v curl >/dev/null 2>&1; then log "ERROR: curl not installed — cannot ping"; exit 1; fi
  if [ "$FAIL_COUNT" -eq 0 ]; then
    if curl -fsS -m 10 --retry 3 -o /dev/null "$PING_URL" 2>/dev/null; then
      log "ping: success delivered"
      exit 0
    fi
    log "ERROR: success ping NOT delivered (the dead-man's switch alerts on the missing ping)"
    exit 1
  fi
  if curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "$REASONS" "${PING_URL}/fail" 2>/dev/null; then
    log "ping: /fail delivered with ${FAIL_COUNT} reason(s)"
  else
    log "ERROR: /fail ping NOT delivered (the dead-man's switch alerts on the missing ping)"
  fi
  exit 1
}

log "starting daily checks"
check_daily_marker
check_daily_object
check_weekly_object
check_renewal_attempt
check_renewal_errors
check_cert_days
check_mode
check_reboot_required
report
