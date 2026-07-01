#!/usr/bin/env bash
#
# tests/profile-backup-redeploy.sh — atomic backup-config install regression test (T8 / N5).
#
# Guards the N5 fix: on an already-working profile box, a REDEPLOY with bad creds must NOT
# clobber the last-known-good backup.sh/backup.env/cron before the new config is proven —
# otherwise the untouched old cron keeps running the just-overwritten bad env and the nightly
# backup breaks silently. setup-profile.sh stages the candidate under .new paths and promotes
# atomically via promote_offbox_backup(), which promotes ONLY on a passing deploy-time smoke.
#
# This test drives the REAL promote_offbox_backup() extracted from setup-profile.sh (so it can
# never drift from the shipped code) with stub candidate scripts. It needs NO Docker/age/rclone
# — just bash + coreutils — so it runs anywhere (including CI):
#
#   ./tests/profile-backup-redeploy.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SETUP="$REPO_ROOT/setup-profile.sh"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/profile-backup-redeploy.XXXXXX")"

pass=0; fail=0
ok() { echo "  ✅ $1"; pass=$((pass + 1)); }
no() { echo "  ❌ $1"; fail=$((fail + 1)); }
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

[ -f "$SETUP" ] || { echo "ERROR: $SETUP not found"; exit 1; }

# ── Load the REAL promote_offbox_backup() from setup-profile.sh (no reimplementation) ────
# awk grabs the function body from its `name() {` line to the first `}` at column 0. The
# function has no brace-at-column-0 internally, so this captures exactly the definition.
eval "$(awk '/^promote_offbox_backup\(\) \{/,/^\}/' "$SETUP")"
if ! declare -F promote_offbox_backup >/dev/null; then
  echo "ERROR: could not extract promote_offbox_backup() from setup-profile.sh"
  echo "       (its definition anchor changed — update this test's awk range)."
  exit 1
fi

# Write a stub candidate backup.sh that records which env-file the smoke was pointed at (proving
# the candidate env — not the live env — is exercised), then exits with $1 (0=good, 1=bad creds).
make_stub() {  # $1=dir  $2=exit-code
  cat > "$1/backup.sh.new" <<STUB
#!/usr/bin/env bash
echo "\$PROFILE_BACKUP_ENV_FILE" > "\$(dirname "\$0")/smoke-env-seen"
echo "\${PROFILE_BACKUP_MARKER_FILE:-}" > "\$(dirname "\$0")/smoke-marker-seen"
exit $2
STUB
  chmod +x "$1/backup.sh.new"
}

# ── TEST 1: bad-cred redeploy over a WORKING config → prior files preserved, non-zero ────
echo "=== TEST 1: bad-cred redeploy preserves the previous working backup.sh/backup.env ==="
D="$WORK/t1"; mkdir -p "$D"
printf 'GOOD-LIVE-SCRIPT\n' > "$D/backup.sh"
printf 'GOOD-LIVE-ENV\n'    > "$D/backup.env"
printf 'BAD-NEW-ENV\n'      > "$D/backup.env.new"
make_stub "$D" 1
rc=0
promote_offbox_backup "$D/backup.sh.new" "$D/backup.env.new" "$D/backup.sh" "$D/backup.env" || rc=$?
[ "$rc" -ne 0 ] && ok "promote returned non-zero on smoke failure ($rc)" || no "promote should have failed"
[ "$(cat "$D/backup.sh")"  = "GOOD-LIVE-SCRIPT" ] && ok "live backup.sh preserved"  || no "live backup.sh was clobbered"
[ "$(cat "$D/backup.env")" = "GOOD-LIVE-ENV"    ] && ok "live backup.env preserved" || no "live backup.env was clobbered"
[ ! -e "$D/backup.sh.new"  ] && ok "candidate backup.sh.new cleaned up"  || no "candidate backup.sh.new leaked"
[ ! -e "$D/backup.env.new" ] && ok "candidate backup.env.new cleaned up" || no "candidate backup.env.new leaked"
[ "$(cat "$D/smoke-env-seen")" = "$D/backup.env.new" ] && ok "smoke exercised the CANDIDATE env (not live)" || no "smoke did not use the candidate env"

# ── TEST 2: good-cred redeploy → candidate promoted atomically, non-zero-free ────────────
echo "=== TEST 2: good-cred redeploy promotes the candidate over the live files ==="
D="$WORK/t2"; mkdir -p "$D"
printf 'OLD-LIVE-SCRIPT\n' > "$D/backup.sh"
printf 'OLD-LIVE-ENV\n'    > "$D/backup.env"
printf 'NEW-GOOD-ENV\n'    > "$D/backup.env.new"
make_stub "$D" 0
rc=0
promote_offbox_backup "$D/backup.sh.new" "$D/backup.env.new" "$D/backup.sh" "$D/backup.env" || rc=$?
[ "$rc" -eq 0 ] && ok "promote returned zero on smoke pass" || no "promote should have succeeded ($rc)"
grep -q 'smoke-env-seen' "$D/backup.sh" 2>/dev/null && ok "live backup.sh replaced by candidate" || no "live backup.sh not promoted"
[ "$(cat "$D/backup.env")" = "NEW-GOOD-ENV" ] && ok "live backup.env replaced by candidate" || no "live backup.env not promoted"
[ ! -e "$D/backup.sh.new"  ] && ok "candidate backup.sh.new moved (gone from .new)"  || no "candidate backup.sh.new not moved"
[ ! -e "$D/backup.env.new" ] && ok "candidate backup.env.new moved (gone from .new)" || no "candidate backup.env.new not moved"
[ "$(cat "$D/smoke-env-seen")" = "$D/backup.env.new" ] && ok "smoke exercised the CANDIDATE env before promotion" || no "smoke did not use the candidate env"

# ── TEST 3: FIRST deploy (no prior config), bad creds → nothing activated, non-zero ──────
echo "=== TEST 3: first deploy with bad creds activates nothing (fail closed) ==="
D="$WORK/t3"; mkdir -p "$D"    # no live backup.sh / backup.env exist yet
printf 'FIRST-BAD-ENV\n' > "$D/backup.env.new"
make_stub "$D" 1
rc=0
promote_offbox_backup "$D/backup.sh.new" "$D/backup.env.new" "$D/backup.sh" "$D/backup.env" || rc=$?
[ "$rc" -ne 0 ] && ok "promote returned non-zero (fail closed)" || no "promote should have failed"
[ ! -e "$D/backup.sh"  ] && ok "no live backup.sh created on failure"  || no "live backup.sh was created"
[ ! -e "$D/backup.env" ] && ok "no live backup.env created on failure" || no "live backup.env was created"
[ ! -e "$D/backup.sh.new" ] && [ ! -e "$D/backup.env.new" ] && ok "candidates cleaned up" || no "candidates leaked"

# ── TEST 4 (structural): the SMOKE-FAILURE branch exits BEFORE the cron is (re)written ────
# Proves the caller-level cron-preservation invariant without re-implementing the caller: in
# setup-profile.sh's off-box branch, the smoke-FAILURE branch must `exit 1` before the
# `cat > "$CRON_FILE"` (re)write, so a failed redeploy never rewrites /etc/cron.d/profile-backups
# → the old cron survives. We anchor on that branch's distinctive error line (NOT merely "the first
# exit 1 after the if"), and match a real `exit 1` STATEMENT (whole line — so a comment that merely
# mentions "exit 1" cannot false-green). If the smoke-failure exit were ever removed, this exit
# would jump past the cron write (or vanish) and the assertion fails — i.e. it is bound to the
# failure path, not to any incidental exit.
echo "=== TEST 4: the smoke-FAILURE branch exits before the cron is (re)written ==="
fail_msg_ln="$(grep -n 'refusing to promote the new' "$SETUP" | head -1 | cut -d: -f1)"
fail_exit_ln="$(awk -v s="${fail_msg_ln:-0}" 'NR>=s && /^[[:space:]]*exit 1[[:space:]]*$/ {print NR; exit}' "$SETUP")"
cron_ln="$(grep -n 'cat > "\$CRON_FILE"' "$SETUP" | head -1 | cut -d: -f1)"
if [ -n "$fail_msg_ln" ] && [ -n "$fail_exit_ln" ] && [ -n "$cron_ln" ] \
   && [ "$fail_msg_ln" -lt "$fail_exit_ln" ] && [ "$fail_exit_ln" -lt "$cron_ln" ]; then
  ok "smoke-failure branch (line $fail_msg_ln) exits 1 (line $fail_exit_ln) before cron write (line $cron_ln)"
else
  no "could not confirm smoke-failure-exit-before-cron (msg=$fail_msg_ln exit=$fail_exit_ln cron=$cron_ln)"
fi

# ── TEST 5: a torn promotion (env mv fails after a passing smoke) fails LOUD, not silent ──
# The two promotion mv's are &&-chained so a promotion-mv failure returns non-zero → the caller
# exits 1, instead of reporting success with a half-promoted (new script / stale env) pair. We
# shadow `mv` to fail on the SECOND call (the env promotion) while the first (script) succeeds.
echo "=== TEST 5: a failed promotion mv returns non-zero (fail loud, no torn success) ==="
D="$WORK/t5"; mkdir -p "$D"
printf 'OLD-LIVE-SCRIPT\n' > "$D/backup.sh"
printf 'OLD-LIVE-ENV\n'    > "$D/backup.env"
printf 'NEW-GOOD-ENV\n'    > "$D/backup.env.new"
make_stub "$D" 0
_mvcount=0
mv() { _mvcount=$((_mvcount + 1)); [ "$_mvcount" -eq 2 ] && return 1; command mv "$@"; }
rc=0
promote_offbox_backup "$D/backup.sh.new" "$D/backup.env.new" "$D/backup.sh" "$D/backup.env" || rc=$?
unset -f mv
[ "$rc" -ne 0 ] && ok "promote returned non-zero when the env promotion mv failed" || no "torn promotion reported success ($rc)"
[ "$(cat "$D/backup.env")" = "OLD-LIVE-ENV" ] && ok "live backup.env not left half-promoted" || no "live backup.env torn"

# ── TEST 6: the deploy-smoke marker path (5th arg) is threaded to the candidate (N6) ─────
# promote_offbox_backup's optional 5th arg must reach the candidate as PROFILE_BACKUP_MARKER_FILE,
# so the deploy-time smoke writes last-smokecheck.json instead of the nightly last-backup.json.
echo "=== TEST 6: smoke marker (5th arg) is passed to the candidate as PROFILE_BACKUP_MARKER_FILE ==="
D="$WORK/t6"; mkdir -p "$D"
printf 'OLD-LIVE-SCRIPT\n' > "$D/backup.sh"
printf 'OLD-LIVE-ENV\n'    > "$D/backup.env"
printf 'NEW-GOOD-ENV\n'    > "$D/backup.env.new"
make_stub "$D" 0
SMK="$D/backups/last-smokecheck.json"
rc=0
promote_offbox_backup "$D/backup.sh.new" "$D/backup.env.new" "$D/backup.sh" "$D/backup.env" "$SMK" || rc=$?
[ "$rc" -eq 0 ] && ok "promote succeeded with a smoke-marker arg" || no "promote failed unexpectedly ($rc)"
[ "$(cat "$D/smoke-marker-seen")" = "$SMK" ] && ok "candidate saw PROFILE_BACKUP_MARKER_FILE=$SMK" \
  || no "smoke marker not threaded (got '$(cat "$D/smoke-marker-seen" 2>/dev/null)')"
# Back-compat: the existing 4-arg calls (TESTs 1-3,5) leave the override empty → script default.
[ -z "$(cat "$WORK/t2/smoke-marker-seen" 2>/dev/null)" ] && ok "4-arg call leaves marker override empty (default)" \
  || no "4-arg call unexpectedly set a marker override"

echo
echo "==================== RESULT: $pass passed, $fail failed ===================="
[ "$fail" -eq 0 ]
