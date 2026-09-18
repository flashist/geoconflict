#!/usr/bin/env bash
#
# tests/profile-checks.sh — off-box unit test for profile-checks.sh (task 0219).
#
# Drives the REAL profile-checks.sh with fixture dirs and a stub PATH (rclone / curl / openssl
# stubs that record their argv and return canned output), so every check's verdict, the ping
# it produces and what the ping body carries are asserted — not extracted snippets. Needs
# only bash + coreutils (runs on macOS and Linux), so it is in `npm test` via
# tests/scripts/ShellHarnesses.test.ts.
#
#   bash tests/profile-checks.sh
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$REPO_ROOT/profile-checks.sh"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/profile-checks.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

pass=0; fail=0
ok() { echo "  ✅ $1"; pass=$((pass + 1)); }
no() { echo "  ❌ $1"; fail=$((fail + 1)); }

[ -f "$SCRIPT" ] || { echo "ERROR: $SCRIPT not found"; exit 1; }

# Visibly synthetic secrets — the leak guard at the end greps for these.
FAKE_KEY='AKIAFAKEKEY0219NOTREAL'
FAKE_SECRET='fakeSecret0219/NotReal+xyz'
FAKE_BUCKET='bucket-0219-notreal'
FAKE_ENDPOINT_HOST='s3-0219.example.invalid'
FAKE_PING_URL='https://ping-0219.example.invalid/0219-uuid-notreal'

# ── Portable date helpers (GNU on Linux, BSD on macOS) ────────────────────────
NOW_EPOCH="$(date -u +%s)"
epoch_to_iso() { date -u -d "@$1" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -r "$1" +%Y-%m-%dT%H:%M:%SZ; }
epoch_to_day() { date -u -d "@$1" +%Y-%m-%d 2>/dev/null || date -u -r "$1" +%Y-%m-%d; }
iso_hours_ago() { epoch_to_iso "$((NOW_EPOCH - $1 * 3600))"; }
day_days_ago()  { epoch_to_day "$((NOW_EPOCH - $1 * 86400))"; }
# touch -t takes LOCAL time; the offsets used here (days) dwarf any timezone skew.
touch_hours_ago() {  # <file> <hours>
  local e=$((NOW_EPOCH - $2 * 3600)) ts
  ts="$(date -d "@$e" +%Y%m%d%H%M 2>/dev/null || date -r "$e" +%Y%m%d%H%M)"
  touch -t "$ts" "$1"
}

# ── Stubs ─────────────────────────────────────────────────────────────────────
BIN="$WORK/bin"; mkdir -p "$BIN"
cat > "$BIN/rclone" <<EOF
#!/bin/bash
echo "rclone \$*" >> "$WORK/rclone.argv"
case "\$*" in
  *"/weekly/"*) [ -f "$WORK/rclone.weekly.fail" ] && exit 3; cat "$WORK/rclone.weekly.json"; exit 0 ;;
  *) [ -f "$WORK/rclone.daily.missing" ] && exit 3; cat "$WORK/rclone.daily.json"; exit 0 ;;
esac
EOF
cat > "$BIN/curl" <<EOF
#!/bin/bash
echo "curl \$*" >> "$WORK/curl.argv"
echo "\${!#}" >> "$WORK/curl.urls"
prev=""; for a in "\$@"; do [ "\$prev" = "--data-raw" ] && printf '%s' "\$a" > "$WORK/curl.body"; prev="\$a"; done
[ -f "$WORK/curl.fail" ] && exit 7
exit 0
EOF
cat > "$BIN/openssl" <<EOF
#!/bin/bash
echo "openssl \$*" >> "$WORK/openssl.argv"
days="\$(cat "$WORK/cert.days" 2>/dev/null || echo 68)"
case "\$*" in
  *-enddate*) echo "notAfter=Nov 20 11:01:42 2026 GMT"; exit 0 ;;
  *-checkend*) n=""; prev=""; for a in "\$@"; do [ "\$prev" = "-checkend" ] && n="\$a"; prev="\$a"; done
               [ "\$((days * 86400))" -gt "\$n" ] && exit 0 || exit 1 ;;
esac
exit 0
EOF
# df stub (task 0274, check 9). Prints a `df -P` shaped table whose Capacity column is
# whatever $WORK/disk.pct says, so a full disk can be simulated without filling one.
cat > "$BIN/df" <<EOF
#!/bin/bash
echo "df \$*" >> "$WORK/df.argv"
[ -f "$WORK/df.fail" ] && exit 1
pct="\$(cat "$WORK/disk.pct" 2>/dev/null || echo 42)"
path=""; for a in "\$@"; do case "\$a" in -*) ;; *) path="\$a" ;; esac; done
echo "Filesystem 1024-blocks Used Available Capacity Mounted on"
echo "/dev/vda1 41152736 17283584 21752768 \${pct}% \${path:-/}"
EOF
# docker stub (task 0274, check 10). Returns the row count $WORK/players.sql.out holds.
cat > "$BIN/docker" <<EOF
#!/bin/bash
echo "docker \$*" >> "$WORK/docker.argv"
[ -f "$WORK/docker.fail" ] && { echo "Error: No such container" >&2; exit 1; }
cat "$WORK/players.sql.out" 2>/dev/null || echo 0
EOF
chmod +x "$BIN"/*

# ── Fixture: a healthy box ────────────────────────────────────────────────────
FIX="$WORK/fix"
TODAY="$(day_days_ago 0)"
write_marker() {  # <file> <exit_status> <finished_at_iso> [error]
  local err="null"; [ -n "${4:-}" ] && err="\"$4\""
  cat > "$1" <<EOF
{
  "schema": 1,
  "started_at": "$3",
  "finished_at": "$3",
  "exit_status": $2,
  "object_key": "profiles/daily/profile-${TODAY}.dump.age",
  "size_bytes": 19312,
  "error": $err
}
EOF
}
weekly_json() {  # <days-ago of the newest object> [more days-ago ...]
  local first=1 d
  printf '['
  for d in "$@"; do
    [ "$first" = 1 ] || printf ','
    first=0
    printf '{"Path":"profile-%s.dump.age","Name":"profile-%s.dump.age","Size":19312,"MimeType":"application/octet-stream","ModTime":"%sT02:30:05.000000000Z","IsDir":false}' \
      "$(day_days_ago "$d")" "$(day_days_ago "$d")" "$(day_days_ago "$d")"
  done
  printf ']\n'
}
# Task 0284: the shape src/profile-server/AlertRelay.ts writes — one key per line, key at
# the line start, seconds-precision ISO with a trailing Z. That shape is a contract between
# a TypeScript writer and this shell reader, and AlertRoutes.test.ts pins the other half.
write_probe_marker() {  # <file> <finished_at_iso>
  cat > "$1" <<EOF
{
  "schema": 1,
  "finished_at": "$2",
  "source": "alert-webhook-probe"
}
EOF
}
reset_fixture() {
  rm -rf "$FIX"; mkdir -p "$FIX/profile/backups" "$FIX/profile/alerts" "$FIX/le"
  rm -f "$WORK"/rclone.* "$WORK"/curl.* "$WORK"/openssl.argv "$WORK/cert.days" \
        "$WORK"/df.* "$WORK"/docker.* "$WORK/disk.pct" "$WORK/players.sql.out"
  echo 42 > "$WORK/disk.pct"
  echo 1000 > "$WORK/players.sql.out"
  # backup.env exactly as setup-profile.sh writes it (the real %q'd shape).
  cat > "$FIX/profile/backup.env" <<EOF
POSTGRES_USER=profile
POSTGRES_DB=profile
PROFILE_BACKUP_S3_BUCKET=$FAKE_BUCKET
PROFILE_BACKUP_S3_PREFIX=profiles
PROFILE_BACKUP_AGE_RECIPIENT=age1fakerecipient0219notreal
RCLONE_CONFIG_PROFILES_TYPE=s3
RCLONE_CONFIG_PROFILES_ENDPOINT=https://$FAKE_ENDPOINT_HOST
RCLONE_CONFIG_PROFILES_ACCESS_KEY_ID=$FAKE_KEY
RCLONE_CONFIG_PROFILES_SECRET_ACCESS_KEY=$FAKE_SECRET
EOF
  write_marker "$FIX/profile/backups/last-backup.json" 0 "$(iso_hours_ago 5)"
  printf '[{"Path":"profile-%s.dump.age","Name":"profile-%s.dump.age","Size":19312,"ModTime":"%sT02:30:02Z","IsDir":false}]\n' \
    "$TODAY" "$TODAY" "$TODAY" > "$WORK/rclone.daily.json"
  weekly_json 3 10 > "$WORK/rclone.weekly.json"
  echo "2026-09-13 00:00:02,110:DEBUG:certbot._internal.main:certbot version: 4.0.0" > "$FIX/le/letsencrypt.log"
  : > "$FIX/certbot-renew.log"
  echo "-----BEGIN CERTIFICATE-----fake-----END CERTIFICATE-----" > "$FIX/cert.pem"
  echo 68 > "$WORK/cert.days"
  # Fresh by default (task 0284) — without it EVERY case above would gain a second failure.
  write_probe_marker "$FIX/profile/alerts/last-alert-probe.json" "$(iso_hours_ago 1)"
}

# Run the REAL script under env -i (no ambient PROFILE_* from the operator's shell) + stub PATH.
run_checks() {  # extra VAR=VAL ... ; sets RC, OUT
  rm -f "$WORK/curl.urls" "$WORK/curl.body" "$WORK/curl.argv"
  env -i PATH="$BIN:/usr/bin:/bin" HOME="$WORK" \
    PROFILE_DIR="$FIX/profile" \
    POSTGRES_USER=profile POSTGRES_DB=profile \
    PROFILE_CHECKS_ENV_FILE="$FIX/absent-checks.env" \
    PROFILE_CHECKS_LE_LOG="$FIX/le/letsencrypt.log" \
    PROFILE_CHECKS_RENEW_LOG="$FIX/certbot-renew.log" \
    PROFILE_CHECKS_CERT_FILE="$FIX/cert.pem" \
    PROFILE_CHECKS_REBOOT_REQUIRED_FILE="$FIX/reboot-required" \
    PROFILE_CHECKS_PING_URL="$FAKE_PING_URL" \
    "$@" bash "$SCRIPT" > "$WORK/out.log" 2>&1
  RC=$?
  OUT="$(cat "$WORK/out.log")"
  cat "$WORK/out.log" >> "$WORK/all-runs.log"
  [ -f "$WORK/curl.body" ] && { cat "$WORK/curl.body" >> "$WORK/all-bodies.log"; echo >> "$WORK/all-bodies.log"; }
  return 0
}
# The growth check stores "<count> <epoch>" and compares against the STORED epoch, not the
# file's mtime — so ageing the window means rewriting that second field.
age_players_state() {  # <hours>
  local f="$FIX/profile/checks-state/players.count" c
  c="$(awk 'NR==1{print $1}' "$f")"
  printf '%s %s\n' "$c" "$((NOW_EPOCH - $1 * 3600))" > "$f"
}
pinged_success() { [ "$(tail -1 "$WORK/curl.urls" 2>/dev/null)" = "$FAKE_PING_URL" ]; }
pinged_fail()    { [ "$(tail -1 "$WORK/curl.urls" 2>/dev/null)" = "$FAKE_PING_URL/fail" ]; }
body() { cat "$WORK/curl.body" 2>/dev/null; }

# ══════════════════════════════════════════════════════════════════════════════
echo "=== C1: healthy box → 11 ok, success ping, exit 0 ==="
reset_fixture; run_checks
[ "$RC" -eq 0 ] && ok "exit 0" || no "exit $RC (expected 0):"$'\n'"$OUT"
grep -q 'RESULT: 11 ok, 0 failed' "$WORK/out.log" && ok "all 11 checks OK" || no "expected 11 ok / 0 failed:"$'\n'"$OUT"
pinged_success && ok "success ping sent to the bare URL" || no "success ping not sent (urls: $(cat "$WORK/curl.urls" 2>/dev/null))"
[ ! -f "$WORK/curl.body" ] && ok "success ping carries no body" || no "success ping carried a body"
grep -q -- '--retry 3' "$WORK/curl.argv" && grep -q -- '-m 10' "$WORK/curl.argv" && ok "ping uses a timeout + retries" || no "ping lacks -m 10 / --retry 3"

echo "=== C2: stale daily marker (30h) → FAIL names the age, /fail ping, exit 1 ==="
reset_fixture; write_marker "$FIX/profile/backups/last-backup.json" 0 "$(iso_hours_ago 30)"; run_checks
[ "$RC" -ne 0 ] && ok "exit non-zero" || no "exit 0 on a stale marker"
pinged_fail && ok "/fail ping sent" || no "/fail ping not sent"
body | grep -q 'daily-backup-marker: daily marker age 30h > 26h' && ok "body names the marker age" || no "body lacks the age: $(body)"
# Review R5 (owner ruling 2026-09-18: fix the pre-existing backup check too, not only the new
# probe one). A FUTURE-dated finished_at gives a NEGATIVE age, and `-gt` reads that as fresh —
# so the check would report green for as long as the clock skew lasts, however long ago the
# last backup actually ran. Container/host clock skew and a restored marker both produce it.
reset_fixture; write_marker "$FIX/profile/backups/last-backup.json" 0 "$(iso_hours_ago -50)"; run_checks
# The digit is loose: the script's clock is a second or two past the harness's NOW_EPOCH and the
# age is integer-divided, so a +50h stamp reads as 49h or 50h. The SIGN is what is asserted.
[ "$RC" -ne 0 ] && body | grep -qE "daily-backup-marker: the daily marker's finished_at is (49|50)h in the FUTURE" \
  && ok "a +50h marker → FAIL naming the skew (a negative age must never read GREEN)" || no "future daily marker not reported: rc=$RC $(body)"

echo "=== C3: marker exit_status=1 → FAIL carries the backup's error text ==="
reset_fixture; write_marker "$FIX/profile/backups/last-backup.json" 1 "$(iso_hours_ago 5)" "rclone upload failed"; run_checks
[ "$RC" -ne 0 ] && pinged_fail && ok "failed → /fail ping" || no "no /fail ping on exit_status=1"
body | grep -q 'last nightly backup FAILED (exit_status=1' && body | grep -q 'rclone upload failed' && ok "body carries exit_status + error" || no "body: $(body)"

echo "=== C4: no nightly marker yet but a FRESH successful deploy smoke → OK (0034 fresh-box rule) ==="
reset_fixture; rm "$FIX/profile/backups/last-backup.json"
write_marker "$FIX/profile/backups/last-smokecheck.json" 0 "$(iso_hours_ago 2)"; run_checks
[ "$RC" -eq 0 ] && pinged_success && ok "fresh smoke marker satisfies the daily check (exit 0, success ping)" || no "fresh-box rule broken (rc=$RC):"$'\n'"$OUT"
grep -q 'daily-backup-object: profile-.*exists off-box' "$WORK/out.log" && ok "object check used the smoke marker's object_key" || no "object check did not fall back to the smoke marker"

echo "=== C5: no nightly marker and no / stale smoke marker → FAIL ==="
reset_fixture; rm "$FIX/profile/backups/last-backup.json"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'last-backup.json is MISSING' && ok "missing marker, no smoke → FAIL" || no "missing marker not reported: $(body)"
reset_fixture; rm "$FIX/profile/backups/last-backup.json"
write_marker "$FIX/profile/backups/last-smokecheck.json" 0 "$(iso_hours_ago 40)"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'last-backup.json is MISSING' && ok "missing marker, STALE smoke (40h) → FAIL" || no "stale smoke marker wrongly satisfied the check: $(body)"
# Review R5, the same hole on the fresh-box path: a FUTURE-dated smoke marker must not stand in
# for a nightly backup that never ran.
reset_fixture; rm "$FIX/profile/backups/last-backup.json"
write_marker "$FIX/profile/backups/last-smokecheck.json" 0 "$(iso_hours_ago -50)"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'last-backup.json is MISSING' && ok "missing marker, FUTURE-dated smoke (+50h) → FAIL (a negative age is not freshness)" || no "future smoke marker wrongly satisfied the check: $(body)"

echo "=== C6: marker says uploaded but the daily object is NOT in the bucket → FAIL (0218 fact b) ==="
reset_fixture; : > "$WORK/rclone.daily.missing"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'daily-backup-object: profile-.*NOT found off-box' && ok "missing object reported" || no "missing object not reported: $(body)"
grep -q 'daily-backup-marker: last nightly backup OK' "$WORK/out.log" && ok "…while the marker check itself still passes (independent)" || no "marker check unexpectedly failed"
reset_fixture
printf '[{"Path":"profile-%s.dump.age","Name":"profile-%s.dump.age","Size":100,"ModTime":"%sT02:30:02Z","IsDir":false}]\n' \
  "$TODAY" "$TODAY" "$TODAY" > "$WORK/rclone.daily.json"
run_checks
[ "$RC" -ne 0 ] && body | grep -q 'daily-backup-object: profile-.*exists off-box but is 100 bytes while the marker says 19312' && ok "object exists but its size ≠ marker size_bytes → FAIL naming both (review R4)" || no "size mismatch not reported: $(body)"
reset_fixture; run_checks
grep -q 'daily-backup-object: profile-.*exists off-box (19312 bytes, matches the marker)' "$WORK/out.log" && ok "matching size → OK says it matches" || no "size match not reported: $OUT"

echo "=== C7: weekly/ EMPTY → FAIL ==="
reset_fixture; echo '[]' > "$WORK/rclone.weekly.json"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'weekly-backup-object: weekly/ is EMPTY' && ok "empty weekly/ reported" || no "empty weekly/ not reported: $(body)"

echo "=== C8: newest weekly 9d → FAIL; 6d → OK ==="
reset_fixture; weekly_json 9 16 > "$WORK/rclone.weekly.json"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'newest weekly copy is 9d old (> 8d; 2 object(s))' && ok "9-day-old weekly → FAIL with age + count" || no "9d weekly: $(body)"
reset_fixture; weekly_json 6 13 > "$WORK/rclone.weekly.json"; run_checks
[ "$RC" -eq 0 ] && grep -q 'weekly-backup-object: newest weekly copy 6d old' "$WORK/out.log" && ok "6-day-old weekly → OK" || no "6d weekly wrongly failed (rc=$RC)"
# Review R5, extended by owner ruling 2026-09-18 to every age in the file. A weekly object dated in
# the FUTURE (a skewed clock on whatever wrote it — not necessarily this box) gives a negative age,
# which `-gt` reads as fresh. The digit is loose for the same reason as the marker cases: the
# checker's clock runs seconds past the harness's and the age is integer-divided.
reset_fixture; weekly_json -5 9 > "$WORK/rclone.weekly.json"; run_checks
[ "$RC" -ne 0 ] && body | grep -qE 'weekly-backup-object: the newest weekly copy is dated [45]d in the FUTURE' \
  && ok "a weekly copy dated +5d → FAIL naming the skew (a negative age must never read GREEN)" || no "future weekly copy not reported: rc=$RC $(body)"
reset_fixture; weekly_json 12 > "$WORK/rclone.weekly.json"; : > "$WORK/rclone.weekly.fail"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'could not list weekly/' && ok "rclone listing error → FAIL (not silent)" || no "listing error swallowed: $(body)"

echo "=== C9: weekly FAILS while the daily marker AND object are OK ('backup OK' ≠ 'weekly present', 0241) ==="
reset_fixture; weekly_json 9 > "$WORK/rclone.weekly.json"; run_checks
[ "$RC" -ne 0 ] && pinged_fail && ok "/fail ping on a weekly-only failure" || no "weekly-only failure did not page"
body | grep -q 'weekly-backup-object' && ! body | grep -q 'daily-backup' && ok "body names ONLY the weekly check" || no "body: $(body)"
grep -q 'RESULT: 10 ok, 1 failed' "$WORK/out.log" && ok "10 ok / 1 failed" || no "expected 10 ok / 1 failed:"$'\n'"$OUT"

echo "=== C10: certbot log mtime 2 days → FAIL; empty log + fresh rotated .1.gz → OK (logrotate window) ==="
reset_fixture; touch_hours_ago "$FIX/le/letsencrypt.log" 48; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'cert-renewal-attempted: last certbot run 4[78]h ago (> 13h)' && ok "48h-old certbot log → FAIL" || no "stale certbot log not reported: $(body)"
reset_fixture; : > "$FIX/le/letsencrypt.log"; echo "rotated" > "$FIX/le/letsencrypt.log.1.gz"; run_checks
[ "$RC" -eq 0 ] && grep -q 'cert-renewal-attempted: certbot last ran 0h ago' "$WORK/out.log" && ok "empty live log + fresh .1.gz → OK (the state B1 observed)" || no "rotation window mis-handled (rc=$RC):"$'\n'"$OUT"
reset_fixture; : > "$FIX/le/letsencrypt.log"; echo "rotated" > "$FIX/le/letsencrypt.log.1.gz"; touch_hours_ago "$FIX/le/letsencrypt.log.1.gz" 48; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'cert-renewal-attempted: last certbot run 4[78]h' && ok "empty live log + STALE .1.gz → FAIL (empty file's mtime is ignored)" || no "empty live log wrongly counted as an attempt: $(body)"
reset_fixture; rm "$FIX/le/letsencrypt.log"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'no certbot log found' && ok "no certbot log at all → FAIL" || no "missing certbot log not reported: $(body)"
# Review R5, extended by owner ruling 2026-09-18. THE one that matters most: this check is what
# stands between a dead renew cron and a silently expired certificate. A future mtime must not be
# read as a recent attempt.
reset_fixture; touch_hours_ago "$FIX/le/letsencrypt.log" -30; run_checks
[ "$RC" -ne 0 ] && body | grep -qE 'cert-renewal-attempted: the newest certbot log mtime is (29|30)h in the FUTURE' \
  && ok "a +30h certbot log mtime → FAIL naming the skew (never 'certbot last ran' on a future file)" || no "future certbot mtime not reported: rc=$RC $(body)"
body | grep -q 'expires silently' && ok "…and the FAIL says what it costs (a certificate expiring silently)" || no "FAIL omits the consequence: $(body)"

echo "=== C11: certbot-renew.log grows with an error line → FAIL carrying the line; then quiet → OK ==="
reset_fixture; run_checks
[ "$RC" -eq 0 ] && ok "empty renew log → OK (baseline offset persisted)" || no "baseline run failed (rc=$RC)"
[ -f "$FIX/profile/checks-state/certbot-renew.offset" ] && ok "offset file written in the state dir" || no "no offset file"
echo "Failed to renew certificate <name> with error: Could not bind TCP port 80 because it is already in use" >> "$FIX/certbot-renew.log"
run_checks
[ "$RC" -ne 0 ] && pinged_fail && ok "grown renew log → /fail ping" || no "grown renew log did not page (rc=$RC)"
body | grep -q 'cert-renewal-errors: certbot-renew.log grew by' && body | grep -q 'Could not bind TCP port 80' && ok "body carries the certbot error line" || no "body lacks the error line: $(body)"
run_checks
[ "$RC" -eq 0 ] && grep -q 'cert-renewal-errors: certbot-renew.log unchanged' "$WORK/out.log" && ok "next run (no growth) → OK again — alerts once, not forever" || no "offset did not advance (rc=$RC)"
reset_fixture; echo "old error before the checker existed" > "$FIX/certbot-renew.log"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'old error before the checker existed' && ok "first run over a pre-existing error reports it once (never never)" || no "pre-existing error skipped: $(body)"

echo "=== C12: certificate 15 days left → FAIL; 68 → OK ==="
reset_fixture; echo 15 > "$WORK/cert.days"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'cert-days-remaining: certificate expires within 20 days (notAfter=Nov 20 11:01:42 2026 GMT)' && ok "15 days → FAIL naming notAfter" || no "15-day cert not reported: $(body)"
grep -q 'openssl x509 -checkend 1728000 -noout -in' "$WORK/openssl.argv" && ok "verdict via openssl -checkend 20d (no date parsing)" || no "unexpected openssl argv: $(cat "$WORK/openssl.argv")"
reset_fixture; echo 15 > "$WORK/cert.days"; run_checks PROFILE_CHECKS_CERT_MIN_DAYS=10
[ "$RC" -eq 0 ] && ok "threshold env-overridable (15d ≥ 10d → OK)" || no "override ignored (rc=$RC)"
reset_fixture; run_checks PROFILE_CHECKS_CERT_MIN_DAYS=90
[ "$RC" -ne 0 ] && body | grep -q 'expires within 90 days' && ok "operator force-fail (B7c): MIN_DAYS=90 → FAIL" || no "force-fail did not fire: $(body)"

echo "=== C13: no ping URL → 'ALERTING NOT CONFIGURED', exit non-zero, no curl ==="
reset_fixture; run_checks PROFILE_CHECKS_PING_URL=
[ "$RC" -ne 0 ] && ok "exit non-zero without a URL even though every check passed" || no "exit 0 with no alerting"
grep -q 'ALERTING NOT CONFIGURED' "$WORK/out.log" && ok "logged ALERTING NOT CONFIGURED" || no "no ALERTING NOT CONFIGURED line"
grep -q 'RESULT: 11 ok, 0 failed' "$WORK/out.log" && ok "checks still ran and were logged" || no "checks did not run"
[ ! -f "$WORK/curl.argv" ] && ok "curl never called" || no "curl was called without a URL"

echo "=== C14: URL comes from checks.env (the on-box shape) when the env is bare ==="
reset_fixture; printf 'PROFILE_CHECKS_PING_URL=%q\nPROFILE_DOMAIN=%q\n' "$FAKE_PING_URL" "api.example.invalid" > "$FIX/checks.env"
run_checks PROFILE_CHECKS_PING_URL= PROFILE_CHECKS_ENV_FILE="$FIX/checks.env"
[ "$RC" -eq 0 ] && pinged_success && ok "checks.env sourced → success ping" || no "checks.env not honoured (rc=$RC):"$'\n'"$OUT"

echo "=== C15: LOCAL backup mode (no backup.env) → FAIL loud (owner ruling Q6) ==="
reset_fixture; rm "$FIX/profile/backup.env"; run_checks
[ "$RC" -ne 0 ] && pinged_fail && ok "no backup.env → /fail ping" || no "local mode did not page (rc=$RC)"
body | grep -q 'offbox-backups-configured: off-box backups not configured' && ok "body says off-box backups not configured" || no "body: $(body)"
body | grep -q 'daily-backup-object: off-box backups not configured' && body | grep -q 'weekly-backup-object: off-box backups not configured' && ok "object checks fail too (nothing to verify), no rclone call" || no "object checks in local mode: $(body)"
[ ! -f "$WORK/rclone.argv" ] && ok "rclone never invoked without creds" || no "rclone invoked in local mode"

echo "=== C16: ping delivery fails → logged, exit non-zero (the dead-man's switch covers it) ==="
reset_fixture; : > "$WORK/curl.fail"; run_checks
[ "$RC" -ne 0 ] && grep -q 'success ping NOT delivered' "$WORK/out.log" && ok "undelivered success ping → exit non-zero + logged" || no "undelivered ping not surfaced (rc=$RC)"

echo "=== C18: junk threshold overrides → FAIL + default, never a silent OK or a pre-ping abort (review R1) ==="
reset_fixture; write_marker "$FIX/profile/backups/last-backup.json" 0 "$(iso_hours_ago 30)"; run_checks PROFILE_CHECKS_MAX_BACKUP_AGE_HOURS=abc
[ "$RC" -ne 0 ] && pinged_fail && body | grep -q "thresholds: PROFILE_CHECKS_MAX_BACKUP_AGE_HOURS='abc' is not a non-negative integer — default 26 used" && ok "MAX_BACKUP_AGE_HOURS=abc → FAIL names the variable + default" || no "junk backup-age threshold: rc=$RC body=$(body)"
body | grep -q 'daily-backup-marker: daily marker age 30h > 26h' && ok "…and the default 26h still catches the 30h-old marker (no silent OK)" || no "default not applied: $(body)"
grep -q 'RESULT: 10 ok, 2 failed' "$WORK/out.log" && ok "all 11 checks still ran" || no "checks did not all run:"$'\n'"$OUT"
reset_fixture; run_checks PROFILE_CHECKS_CERT_MIN_DAYS=1x
[ "$RC" -ne 0 ] && pinged_fail && body | grep -q "thresholds: PROFILE_CHECKS_CERT_MIN_DAYS='1x'" && ok "CERT_MIN_DAYS=1x → reaches the /fail ping (no set -u abort)" || no "junk cert threshold aborted before the ping: rc=$RC urls=$(cat "$WORK/curl.urls" 2>/dev/null)"
grep -q 'openssl x509 -checkend 1728000 -noout -in' "$WORK/openssl.argv" && ok "…and check 6 ran with the default 20d" || no "check 6 did not run with the default: $(cat "$WORK/openssl.argv" 2>/dev/null)"
reset_fixture; run_checks PROFILE_CHECKS_MAX_WEEKLY_AGE_DAYS=0
[ "$RC" -ne 0 ] && body | grep -q 'newest weekly copy is 3d old (> 0d' && ! body | grep -q 'thresholds:' && ok "0 is a valid threshold (B9 uses MAX_WEEKLY_AGE_DAYS=0)" || no "0 rejected or ignored: $(body)"
reset_fixture; run_checks PROFILE_CHECKS_CERT_MIN_DAYS=08
[ "$RC" -eq 0 ] && grep -q 'openssl x509 -checkend 691200 -noout -in' "$WORK/openssl.argv" && ok "leading zero (08) read as decimal 8, not octal" || no "08 mishandled: rc=$RC argv=$(cat "$WORK/openssl.argv" 2>/dev/null)"

echo "=== C19: /var/run/reboot-required present → FAIL names it (0221: auto-reboot is off, so this is the only signal) ==="
reset_fixture; : > "$FIX/reboot-required"; run_checks
[ "$RC" -ne 0 ] && pinged_fail && ok "pending reboot → /fail ping, exit non-zero" || no "pending reboot did not page (rc=$RC)"
body | grep -q 'reboot-required: reboot required' && ok "body names the pending reboot" || no "body lacks the reboot line: $(body)"
body | grep -q 'reboot-required' && ! body | grep -q 'daily-backup' && ok "body names ONLY the reboot check (everything else still OK)" || no "body: $(body)"
grep -q 'RESULT: 10 ok, 1 failed' "$WORK/out.log" && ok "10 ok / 1 failed" || no "expected 10 ok / 1 failed:"$'\n'"$OUT"
reset_fixture; run_checks
grep -q 'reboot-required: no pending reboot' "$WORK/out.log" && [ "$RC" -eq 0 ] && ok "no marker file → OK" || no "absent marker wrongly failed (rc=$RC)"

echo "=== C20: disk usage (task 0274, check 9) — the backstop for 'the box filled up' ==="
# The telemetry box has frozen on a full disk before; this box's runway is ~12–16 days
# and nothing watched it. The threshold is a > comparison: exactly at the limit is OK.
reset_fixture; echo 85 > "$WORK/disk.pct"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'disk-usage: / is 85% full (> 80%)' && ok "85% → FAIL naming the path and both numbers" || no "85% disk not reported: $(body)"
reset_fixture; echo 79 > "$WORK/disk.pct"; run_checks
[ "$RC" -eq 0 ] && grep -q 'disk-usage: / is 79% full' "$WORK/out.log" && ok "79% → OK" || no "79% disk wrongly failed (rc=$RC):"$'\n'"$OUT"
reset_fixture; echo 80 > "$WORK/disk.pct"; run_checks
[ "$RC" -eq 0 ] && ok "exactly at the threshold (80%) is OK — the comparison is >, not >=" || no "80% failed; the boundary moved (rc=$RC)"
reset_fixture; echo 85 > "$WORK/disk.pct"; run_checks PROFILE_CHECKS_DISK_MAX_PCT=90
[ "$RC" -eq 0 ] && ok "threshold env-overridable (85% ≤ 90% → OK)" || no "disk threshold override ignored (rc=$RC)"
reset_fixture; echo 85 > "$WORK/disk.pct"; run_checks PROFILE_CHECKS_DISK_MAX_PCT=abc
[ "$RC" -ne 0 ] && body | grep -q "thresholds: PROFILE_CHECKS_DISK_MAX_PCT='abc' is not a non-negative integer — default 80 used" \
  && body | grep -q 'disk-usage: / is 85% full (> 80%)' && ok "junk threshold → FAIL + the default 80 still catches 85% (no silent OK)" \
  || no "junk disk threshold: rc=$RC body=$(body)"
reset_fixture; : > "$WORK/df.fail"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'disk-usage: could not read disk usage' && ok "df failure → FAIL, never a silent OK" || no "df failure swallowed: $(body)"
reset_fixture; echo 91 > "$WORK/disk.pct"; run_checks PROFILE_CHECKS_DISK_PATHS="/ /var/lib/docker"
[ "$RC" -ne 0 ] && body | grep -q '/var/lib/docker is 91% full' && ok "every path in PROFILE_CHECKS_DISK_PATHS is checked" || no "second path not checked: $(body)"

echo "=== C21: players growth (task 0274, check 10) — the switch's trigger, on the box ==="
# A1 pages from Uptrace; this is the backstop for the day Uptrace itself is down. It
# compares against the PREVIOUS run's count, scaled to 24 h, so a 48-hour gap after a
# missed cron does not read as double the growth.
reset_fixture; run_checks
[ "$RC" -eq 0 ] && grep -q 'players-growth: baseline recorded (1000 players)' "$WORK/out.log" \
  && ok "first run records a baseline and is OK (nothing to compare against)" || no "first run not a baseline (rc=$RC):"$'\n'"$OUT"
[ -f "$FIX/profile/checks-state/players.count" ] && ok "baseline persisted in the state dir" || no "no players.count state file"
# Second run, same fixture (state survives): a huge jump must page.
echo 26000 > "$WORK/players.sql.out"
# Age the stored window so it is a real 24 h, not the few seconds since the last run.
age_players_state 24
run_checks
[ "$RC" -ne 0 ] && pinged_fail && body | grep -q 'players-growth: 25000 new players' && ok "+25000 in 24h → FAIL naming the count" || no "growth not reported: $(body)"
body | grep -q '20000' && ok "…and names the threshold it crossed" || no "body does not name the threshold: $(body)"
reset_fixture; run_checks
echo 6000 > "$WORK/players.sql.out"; age_players_state 24; run_checks
[ "$RC" -eq 0 ] && grep -q 'players-growth: 5000 new players' "$WORK/out.log" && ok "+5000 in 24h → OK" || no "+5000 wrongly failed (rc=$RC)"
reset_fixture; run_checks
echo 700 > "$WORK/players.sql.out"; age_players_state 24; run_checks
[ "$RC" -eq 0 ] && grep -q 'players-growth' "$WORK/out.log" && grep -q 'went down' "$WORK/out.log" \
  && ok "a count that went DOWN is OK (the cleanup runbook ran)" || no "a shrinking count failed (rc=$RC):"$'\n'"$OUT"
# Scaling: +25000 over 48 h is +12500/24h — under the threshold, so NOT a page.
reset_fixture; run_checks
echo 26000 > "$WORK/players.sql.out"; age_players_state 48; run_checks
[ "$RC" -eq 0 ] && ok "+25000 over 48h scales to 12500/24h → OK (a missed cron is not a false page)" || no "48h gap not scaled (rc=$RC):"$'\n'"$OUT"
# ~12500, not exactly: the script's own clock is a second or two past the harness's, and the
# scaling is integer division. The point asserted is that the rate is HALVED, not the digit.
grep -qE '= 12[45][0-9][0-9]/24h' "$WORK/out.log" && ok "…and the log shows the scaled rate (~12500/24h, not 25000)" || no "scaled rate not shown: $OUT"
reset_fixture; run_checks
echo 15000 > "$WORK/players.sql.out"; age_players_state 6; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'players-growth' && ok "+14000 over 6h scales to 56000/24h → FAIL (a short window still pages)" || no "short window not scaled up: rc=$RC $(body)"
# Review R4: a state file whose epoch is in the FUTURE (clock stepped back, an NTP
# correction after a wrong-clock first run, a restored state file) must not make the
# check report ok forever while never advancing the baseline again.
reset_fixture; run_checks
age_players_state -5   # prev_epoch 5 hours in the FUTURE
echo 99000 > "$WORK/players.sql.out"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'players-growth: the stored baseline is in the future' \
  && ok "a future baseline → FAIL naming it (never a silent ok)" || no "future baseline not reported: rc=$RC $(body)"
# ...and it self-heals: the baseline is rewritten, so the NEXT run works normally.
prev_epoch_after="$(awk 'NR==1{print $2}' "$FIX/profile/checks-state/players.count")"
# Compared against a FRESH now: the script's clock is a few seconds past the
# harness's NOW_EPOCH, so that constant would make this assertion flaky.
now_fresh="$(date -u +%s)"
[ -n "$prev_epoch_after" ] && [ "$prev_epoch_after" -le "$now_fresh" ] \
  && ok "…and the baseline is reset to now, so the stall cannot persist" || no "baseline not reset: '$prev_epoch_after' vs now '$now_fresh'"
age_players_state 24; echo 99500 > "$WORK/players.sql.out"; run_checks
[ "$RC" -eq 0 ] && grep -q 'players-growth: 500 new players' "$WORK/out.log" \
  && ok "the run after a future baseline evaluates growth normally again" || no "did not recover (rc=$RC):"$'\n'"$OUT"

reset_fixture; : > "$WORK/docker.fail"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'players-growth: could not count players' && ok "a psql/docker failure → FAIL, never a silent OK" || no "count failure swallowed: $(body)"
reset_fixture; echo "not a number" > "$WORK/players.sql.out"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'players-growth: could not count players' && ok "non-numeric psql output → FAIL" || no "non-numeric count accepted: $(body)"
# backup.env also carries POSTGRES_* and is sourced with `set -a`, so "missing" means
# missing from BOTH the env and every sourced file — the shape a box gets if checks.env
# was written before task 0274 and off-box backups are not configured either.
reset_fixture; rm "$FIX/profile/backup.env"; run_checks POSTGRES_USER= POSTGRES_DB=
[ "$RC" -ne 0 ] && body | grep -q 'players-growth: could not count players: POSTGRES_USER/POSTGRES_DB are not set' \
  && ok "missing POSTGRES_USER/DB → FAIL naming them (they cannot be guessed)" || no "missing POSTGRES_* not reported: $(body)"
reset_fixture; run_checks
grep -q 'docker compose' "$WORK/docker.argv" && grep -q 'select count(\*) from players' "$WORK/docker.argv" \
  && ok "counts through the compose postgres service, not a host psql" || no "unexpected docker argv: $(cat "$WORK/docker.argv" 2>/dev/null)"
reset_fixture; echo 26000 > "$WORK/players.sql.out"; run_checks
grep -q 'players-growth' "$WORK/out.log" && ! body 2>/dev/null | grep -q 'yandex' && ok "the growth check reports counts only — no ids" || no "an id reached the growth output"

echo "=== C22: alert-path probe marker (task 0284, check 11) — the ONLY guard over the alerting path ==="
# The failure it exists for: nginx's /internal/ allowlist answers 403 on a source-IP miss,
# and a 403 permanently disables the notification channel — silently, forever. Nothing else
# in this file can see that, because every other signal is produced on this box.
reset_fixture; run_checks
[ "$RC" -eq 0 ] && grep -q 'alert-path-probe: the monitoring box reached the alert webhook 1h ago' "$WORK/out.log" \
  && ok "a fresh probe marker → OK naming the age" || no "fresh probe marker not OK (rc=$RC):"$'\n'"$OUT"
grep -q 'alert-path-probe.*reachability only' "$WORK/out.log" \
  && ok "…and the OK line says reachability only, not proof a Telegram message arrived" || no "OK line over-claims: $OUT"

reset_fixture; write_probe_marker "$FIX/profile/alerts/last-alert-probe.json" "$(iso_hours_ago 27)"; run_checks
[ "$RC" -ne 0 ] && pinged_fail && body | grep -q 'alert-path-probe: no probe received for 27h (> 3h)' \
  && ok "a 27h-old marker → FAIL naming the age and the threshold" || no "stale probe marker not reported: rc=$RC $(body)"
body | grep -q 'PROFILE_INTERNAL_ALLOW_IPS' && ok "…and the FAIL names the variable to check" || no "FAIL does not name PROFILE_INTERNAL_ALLOW_IPS: $(body)"
body | grep -q 'must be re-enabled by hand' \
  && ok "…and says the channel must be re-enabled by hand (fixing the address does not undo a disable)" || no "FAIL omits the re-enable step: $(body)"
body | grep -q 'alert-path-probe' && ! body | grep -q 'daily-backup' \
  && ok "body names ONLY the probe check (everything else still OK)" || no "body: $(body)"
grep -q 'RESULT: 10 ok, 1 failed' "$WORK/out.log" && ok "10 ok / 1 failed" || no "expected 10 ok / 1 failed:"$'\n'"$OUT"

reset_fixture; rm "$FIX/profile/alerts/last-alert-probe.json"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'alert-path-probe: no alert-path probe marker at all' \
  && ok "no marker at all → FAIL (never run, or never arriving)" || no "missing probe marker not reported: rc=$RC $(body)"
# A rolled-back profile image predating 0284 writes no marker either, and that reads exactly
# like an allowlist fault unless the FAIL says so.
body | grep -q 'rolled-back profile image' && ok "…and the FAIL names the rolled-back-image case too" || no "FAIL omits the rollback case: $(body)"

# Review R5: a FUTURE-dated stamp gives a negative age, which `-gt` reads as fresh. For THIS
# check that is the worst possible failure — it is the only thing watching the alerting path, so
# a guard that goes green on clock skew is worse than no guard at all.
reset_fixture; write_probe_marker "$FIX/profile/alerts/last-alert-probe.json" "$(iso_hours_ago -50)"; run_checks
[ "$RC" -ne 0 ] && pinged_fail && body | grep -qE "alert-path-probe: the probe marker's finished_at is (49|50)h in the FUTURE" \
  && ok "a +50h probe marker → FAIL naming the skew (never a silent OK)" || no "future probe marker not reported: rc=$RC $(body)"
body | grep -q 'clock skew' && ok "…and the FAIL names clock skew as the cause to look for" || no "FAIL does not name clock skew: $(body)"
grep -q 'RESULT: 10 ok, 1 failed' "$WORK/out.log" && ok "10 ok / 1 failed" || no "expected 10 ok / 1 failed:"$'\n'"$OUT"

reset_fixture; printf '{\n  "schema": 1,\n  "finished_at": "not-a-date",\n  "source": "alert-webhook-probe"\n}\n' \
  > "$FIX/profile/alerts/last-alert-probe.json"; run_checks
[ "$RC" -ne 0 ] && body | grep -q "alert-path-probe: the probe marker's finished_at is unparseable ('not-a-date')" \
  && ok "an unparseable finished_at → FAIL, never a silent OK (a torn write is the realistic cause)" || no "unparseable marker not reported: rc=$RC $(body)"

reset_fixture; write_probe_marker "$FIX/profile/alerts/last-alert-probe.json" "$(iso_hours_ago 27)"
run_checks PROFILE_CHECKS_MAX_ALERT_PROBE_AGE_HOURS=48
[ "$RC" -eq 0 ] && grep -q 'alert-path-probe: the monitoring box reached the alert webhook 27h ago' "$WORK/out.log" \
  && ok "threshold env-overridable (27h ≤ 48h → OK)" || no "probe threshold override ignored (rc=$RC):"$'\n'"$OUT"

reset_fixture; write_probe_marker "$FIX/profile/alerts/last-alert-probe.json" "$(iso_hours_ago 27)"
run_checks PROFILE_CHECKS_MAX_ALERT_PROBE_AGE_HOURS=abc
[ "$RC" -ne 0 ] && body | grep -q "thresholds: PROFILE_CHECKS_MAX_ALERT_PROBE_AGE_HOURS='abc' is not a non-negative integer — default 3 used" \
  && body | grep -q 'alert-path-probe: no probe received for 27h (> 3h)' \
  && ok "junk threshold → FAIL + the default 3 still catches the 27h marker (no silent OK)" || no "junk probe threshold: rc=$RC body=$(body)"

reset_fixture; rm "$FIX/profile/alerts/last-alert-probe.json"
write_probe_marker "$FIX/elsewhere.json" "$(iso_hours_ago 1)"
run_checks PROFILE_CHECKS_ALERT_PROBE_MARKER_FILE="$FIX/elsewhere.json"
[ "$RC" -eq 0 ] && grep -q 'alert-path-probe: the monitoring box reached the alert webhook 1h ago' "$WORK/out.log" \
  && ok "marker path env-overridable (the off-box test seam)" || no "marker path override ignored (rc=$RC):"$'\n'"$OUT"

echo "=== C17: secret-leak guard across EVERY run above ==="
# Log and ping bodies must never carry the access key, secret, bucket, endpoint host or ping URL.
for needle in "$FAKE_KEY" "$FAKE_SECRET" "$FAKE_BUCKET" "$FAKE_ENDPOINT_HOST" "$FAKE_PING_URL"; do
  if grep -qF "$needle" "$WORK/all-runs.log"; then no "LEAK: '$needle' appears in the checker's log output"; else ok "log never carries '$needle'"; fi
  if [ -f "$WORK/all-bodies.log" ] && grep -qF "$needle" "$WORK/all-bodies.log"; then no "LEAK: '$needle' appears in a /fail ping body"; else ok "ping bodies never carry '$needle'"; fi
done
grep -q 'set -x' "$SCRIPT" && no "profile-checks.sh contains 'set -x' (would echo secrets)" || ok "no 'set -x' in profile-checks.sh"
[ -s "$WORK/all-bodies.log" ] && ok "guard was not vacuous ($(wc -l < "$WORK/all-bodies.log" | tr -d ' ') fail bodies inspected)" || no "no fail bodies captured — the leak guard checked nothing"

echo
echo "==== RESULT: $pass passed, $fail failed ===="
[ "$fail" -eq 0 ]
