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
reset_fixture() {
  rm -rf "$FIX"; mkdir -p "$FIX/profile/backups" "$FIX/le"
  rm -f "$WORK"/rclone.* "$WORK"/curl.* "$WORK"/openssl.argv "$WORK/cert.days"
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
}

# Run the REAL script under env -i (no ambient PROFILE_* from the operator's shell) + stub PATH.
run_checks() {  # extra VAR=VAL ... ; sets RC, OUT
  rm -f "$WORK/curl.urls" "$WORK/curl.body" "$WORK/curl.argv"
  env -i PATH="$BIN:/usr/bin:/bin" HOME="$WORK" \
    PROFILE_DIR="$FIX/profile" \
    PROFILE_CHECKS_ENV_FILE="$FIX/absent-checks.env" \
    PROFILE_CHECKS_LE_LOG="$FIX/le/letsencrypt.log" \
    PROFILE_CHECKS_RENEW_LOG="$FIX/certbot-renew.log" \
    PROFILE_CHECKS_CERT_FILE="$FIX/cert.pem" \
    PROFILE_CHECKS_PING_URL="$FAKE_PING_URL" \
    "$@" bash "$SCRIPT" > "$WORK/out.log" 2>&1
  RC=$?
  OUT="$(cat "$WORK/out.log")"
  cat "$WORK/out.log" >> "$WORK/all-runs.log"
  [ -f "$WORK/curl.body" ] && { cat "$WORK/curl.body" >> "$WORK/all-bodies.log"; echo >> "$WORK/all-bodies.log"; }
  return 0
}
pinged_success() { [ "$(tail -1 "$WORK/curl.urls" 2>/dev/null)" = "$FAKE_PING_URL" ]; }
pinged_fail()    { [ "$(tail -1 "$WORK/curl.urls" 2>/dev/null)" = "$FAKE_PING_URL/fail" ]; }
body() { cat "$WORK/curl.body" 2>/dev/null; }

# ══════════════════════════════════════════════════════════════════════════════
echo "=== C1: healthy box → 7 ok, success ping, exit 0 ==="
reset_fixture; run_checks
[ "$RC" -eq 0 ] && ok "exit 0" || no "exit $RC (expected 0):"$'\n'"$OUT"
grep -q 'RESULT: 7 ok, 0 failed' "$WORK/out.log" && ok "all 7 checks OK" || no "expected 7 ok / 0 failed:"$'\n'"$OUT"
pinged_success && ok "success ping sent to the bare URL" || no "success ping not sent (urls: $(cat "$WORK/curl.urls" 2>/dev/null))"
[ ! -f "$WORK/curl.body" ] && ok "success ping carries no body" || no "success ping carried a body"
grep -q -- '--retry 3' "$WORK/curl.argv" && grep -q -- '-m 10' "$WORK/curl.argv" && ok "ping uses a timeout + retries" || no "ping lacks -m 10 / --retry 3"

echo "=== C2: stale daily marker (30h) → FAIL names the age, /fail ping, exit 1 ==="
reset_fixture; write_marker "$FIX/profile/backups/last-backup.json" 0 "$(iso_hours_ago 30)"; run_checks
[ "$RC" -ne 0 ] && ok "exit non-zero" || no "exit 0 on a stale marker"
pinged_fail && ok "/fail ping sent" || no "/fail ping not sent"
body | grep -q 'daily-backup-marker: daily marker age 30h > 26h' && ok "body names the marker age" || no "body lacks the age: $(body)"

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
reset_fixture; weekly_json 12 > "$WORK/rclone.weekly.json"; : > "$WORK/rclone.weekly.fail"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'could not list weekly/' && ok "rclone listing error → FAIL (not silent)" || no "listing error swallowed: $(body)"

echo "=== C9: weekly FAILS while the daily marker AND object are OK ('backup OK' ≠ 'weekly present', 0241) ==="
reset_fixture; weekly_json 9 > "$WORK/rclone.weekly.json"; run_checks
[ "$RC" -ne 0 ] && pinged_fail && ok "/fail ping on a weekly-only failure" || no "weekly-only failure did not page"
body | grep -q 'weekly-backup-object' && ! body | grep -q 'daily-backup' && ok "body names ONLY the weekly check" || no "body: $(body)"
grep -q 'RESULT: 6 ok, 1 failed' "$WORK/out.log" && ok "6 ok / 1 failed" || no "expected 6 ok / 1 failed:"$'\n'"$OUT"

echo "=== C10: certbot log mtime 2 days → FAIL; empty log + fresh rotated .1.gz → OK (logrotate window) ==="
reset_fixture; touch_hours_ago "$FIX/le/letsencrypt.log" 48; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'cert-renewal-attempted: last certbot run 4[78]h ago (> 13h)' && ok "48h-old certbot log → FAIL" || no "stale certbot log not reported: $(body)"
reset_fixture; : > "$FIX/le/letsencrypt.log"; echo "rotated" > "$FIX/le/letsencrypt.log.1.gz"; run_checks
[ "$RC" -eq 0 ] && grep -q 'cert-renewal-attempted: certbot last ran 0h ago' "$WORK/out.log" && ok "empty live log + fresh .1.gz → OK (the state B1 observed)" || no "rotation window mis-handled (rc=$RC):"$'\n'"$OUT"
reset_fixture; : > "$FIX/le/letsencrypt.log"; echo "rotated" > "$FIX/le/letsencrypt.log.1.gz"; touch_hours_ago "$FIX/le/letsencrypt.log.1.gz" 48; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'cert-renewal-attempted: last certbot run 4[78]h' && ok "empty live log + STALE .1.gz → FAIL (empty file's mtime is ignored)" || no "empty live log wrongly counted as an attempt: $(body)"
reset_fixture; rm "$FIX/le/letsencrypt.log"; run_checks
[ "$RC" -ne 0 ] && body | grep -q 'no certbot log found' && ok "no certbot log at all → FAIL" || no "missing certbot log not reported: $(body)"

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
grep -q 'RESULT: 7 ok, 0 failed' "$WORK/out.log" && ok "checks still ran and were logged" || no "checks did not run"
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
grep -q 'RESULT: 6 ok, 2 failed' "$WORK/out.log" && ok "all 7 checks still ran" || no "checks did not all run:"$'\n'"$OUT"
reset_fixture; run_checks PROFILE_CHECKS_CERT_MIN_DAYS=1x
[ "$RC" -ne 0 ] && pinged_fail && body | grep -q "thresholds: PROFILE_CHECKS_CERT_MIN_DAYS='1x'" && ok "CERT_MIN_DAYS=1x → reaches the /fail ping (no set -u abort)" || no "junk cert threshold aborted before the ping: rc=$RC urls=$(cat "$WORK/curl.urls" 2>/dev/null)"
grep -q 'openssl x509 -checkend 1728000 -noout -in' "$WORK/openssl.argv" && ok "…and check 6 ran with the default 20d" || no "check 6 did not run with the default: $(cat "$WORK/openssl.argv" 2>/dev/null)"
reset_fixture; run_checks PROFILE_CHECKS_MAX_WEEKLY_AGE_DAYS=0
[ "$RC" -ne 0 ] && body | grep -q 'newest weekly copy is 3d old (> 0d' && ! body | grep -q 'thresholds:' && ok "0 is a valid threshold (B9 uses MAX_WEEKLY_AGE_DAYS=0)" || no "0 rejected or ignored: $(body)"
reset_fixture; run_checks PROFILE_CHECKS_CERT_MIN_DAYS=08
[ "$RC" -eq 0 ] && grep -q 'openssl x509 -checkend 691200 -noout -in' "$WORK/openssl.argv" && ok "leading zero (08) read as decimal 8, not octal" || no "08 mishandled: rc=$RC argv=$(cat "$WORK/openssl.argv" 2>/dev/null)"

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
