#!/bin/bash
# profile-deploy-hardening.test.sh — verifies T4g (s4-profile-04g) acceptance criteria for
# build-deploy-profile.sh: argv-safety (sshpass -f), the 0600 password file lifecycle, the
# mkdir mutex + atomic single-block deploy record, and the wrong-host preflight.
#
# Strategy: run the REAL build-deploy-profile.sh end-to-end with a stub PATH (docker/git/
# sshpass/ssh/scp/getent), so the integrated control flow is exercised — not extracted
# snippets. One proportionate harness (postmortem RC6: no test-apparatus sprawl).
#
# The trailing "Structural" sections have since widened this file's scope beyond
# build-deploy-profile.sh: it is the home for grep-level structural assertions over
# the deploy-related files that HAVE them — currently setup-profile.sh,
# setup-telemetry.sh, build-deploy-telemetry.sh, and update.sh + nginx.conf for
# container log retention (task 0060). It is NOT complete coverage: deploy.sh,
# build.sh and build-deploy.sh have no assertions here at all. New structural checks
# belong here rather than in a second harness nothing runs.
#
# Run:  bash tests/scripts/profile-deploy-hardening.test.sh
# Exits non-zero on the first failed assertion.

set -u
REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SECRET_PW='S3cr3t-P@ss w0rd!#$'   # contains spaces/specials — must never reach any argv

FAILED=0
pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }

# ── Stub PATH builder ─────────────────────────────────────────────────────────
make_stubs() {
    BIN="$WORK/bin"; mkdir -p "$BIN"

    cat > "$BIN/docker" <<EOF
#!/bin/bash
echo "docker \$*" >> "$WORK/docker.argv"
case "\$1 \$2" in
  "buildx build")
    iid=""; for a in "\$@"; do [ "\$prev" = "--iidfile" ] && iid="\$a"; prev="\$a"; done
    [ -n "\$iid" ] && printf 'sha256:%064d' 1 > "\$iid"; exit 0 ;;
  "buildx imagetools") exit 0 ;;
esac
case "\$1" in
  info) exit 0 ;;
  login) cat >/dev/null; exit 0 ;;            # token on stdin — consumed, never echoed
  tag|push) exit 0 ;;
  inspect) printf '%s/%s@sha256:%064d\n' "\$DOCKER_USERNAME" "\$DOCKER_REPO" 1; exit 0 ;;
esac
exit 0
EOF

    cat > "$BIN/git" <<'EOF'
#!/bin/bash
case "$*" in
  "rev-parse --short HEAD") echo "abc1234" ;;
  "rev-parse HEAD") echo "abc1234000000000000000000000000000000000" ;;
  "status --porcelain --untracked-files=normal") : ;;   # clean tree (no -dirty)
  *) : ;;
esac
exit 0
EOF

    # sshpass stub: record argv + the mode of the -f file, then dispatch to scp/ssh stub.
    cat > "$BIN/sshpass" <<EOF
#!/bin/bash
echo "sshpass \$*" >> "$WORK/sshpass.argv"
if [ "\$1" = "-f" ] && [ -f "\$2" ]; then
    if stat -f '%Lp' "\$2" >/dev/null 2>&1; then m=\$(stat -f '%Lp' "\$2"); else m=\$(stat -c '%a' "\$2"); fi
    echo "\$2 \$m" >> "$WORK/sshpass.filemode"
    shift 2
fi
exec "\$@"
EOF

    cat > "$BIN/ssh" <<EOF
#!/bin/bash
echo "ssh \$*" >> "$WORK/ssh.argv"
last="\${!#}"
if printf '%s' "\$last" | grep -q 'geoconflict-deploy-role'; then
    [ -f "$WORK/ssh_unreachable" ] && exit 255          # simulate unreachable/auth-fail
    cat "$WORK/marker" 2>/dev/null || true               # emit the configured role marker
    exit 0
fi
[ -f "$WORK/fail_deploy" ] && exit 1                      # inject a mid-deploy failure
exit 0
EOF

    cat > "$BIN/scp" <<EOF
#!/bin/bash
echo "scp \$*" >> "$WORK/scp.argv"
touch "$WORK/scp.called"
# Capture the staged secrets file (the only upload whose destination is the
# .profile-deploy-env-<pid> path) so T10 can assert what actually reaches the box.
src=\${@: -2:1}; dst=\${!#}
case "\$dst" in
  *.profile-deploy-env-*) cp "\$src" "$WORK/staged.env" 2>/dev/null || true ;;
esac
exit 0
EOF

    # getent stub so DOMAIN_MATCH is deterministic cross-platform (resolve_ips prefers it).
    cat > "$BIN/getent" <<EOF
#!/bin/bash
# "getent ahosts <name>" → print the controlled IP for any name in \$WORK/resolve_map.
if [ "\$1" = "ahosts" ]; then
    ip=\$(grep " \$2\$" "$WORK/resolve_map" 2>/dev/null | awk '{print \$1}' | head -1)
    [ -n "\$ip" ] && echo "\$ip  \$2"
fi
exit 0
EOF

    chmod +x "$BIN"/*
}

# ── Run the real script in an isolated dir with the stub PATH ──────────────────
run_deploy() {  # extra env passed as VAR=VAL ... ; sets RC + populates $WORK logs
    RUN="$WORK/run"; rm -rf "$RUN"; mkdir -p "$RUN/scripts"
    cp "$REPO_ROOT/build-deploy-profile.sh" "$RUN/build-deploy-profile.sh"
    : > "$RUN/setup-profile.sh"; chmod +x "$RUN/setup-profile.sh"
    # build-deploy-profile.sh has required ./profile-backup.sh since the T8 backup work; without
    # this fixture every run_deploy aborts at that precondition, before the preflight it tests.
    : > "$RUN/profile-backup.sh"; chmod +x "$RUN/profile-backup.sh"
    : > "$RUN/Dockerfile.profile"
    printf '#!/bin/bash\nexit 0\n' > "$RUN/scripts/check-docker-secret-boundary.sh"
    chmod +x "$RUN/scripts/check-docker-secret-boundary.sh"
    rm -f "$WORK/docker.argv" "$WORK/ssh.argv" "$WORK/scp.argv" "$WORK/sshpass.argv" \
          "$WORK/sshpass.filemode" "$WORK/scp.called" "$WORK/staged.env"
    # `env -i` + an explicit allow-list — deliberately NOT a list of secrets to clear.
    # The real deploy script forwards 28 variables from its environment into the staged
    # secrets file, and the scp stub captures that file to $WORK/staged.env for T10. If
    # this subshell inherited the operator's shell, THEIR real PROFILE_INTERNAL_TOKEN /
    # DATABASE_URL / FEEDBACK_TELEGRAM_TOKEN / PROFILE_BACKUP_S3_* would be written to
    # disk in a temp dir the harness never cleans — by T1, T2, T4, T5, T8 and T10 alike,
    # not just T10. Naming what may enter is the only form that cannot go stale when a
    # new variable joins the staged-export block; a deny-list would have to be updated
    # in lockstep with that block, which is the exact coupling this whole task exists
    # because nobody maintained. It also makes the harness deterministic: an ambient
    # PROFILE_DEPLOY_ALLOW_UNVERIFIED or PROFILE_SSH_KEY would otherwise silently change
    # what T7 and T1 test. HOME and TMPDIR are the only two the script needs passed
    # through, and neither is a secret. Caller extras ("$@") come last so a test can
    # override a fixture.
    ( cd "$RUN"
      env -i \
        PATH="$BIN:$PATH" HOME="$WORK/home" TMPDIR="${TMPDIR:-/tmp}" \
        DOCKER_USERNAME=acme DOCKER_REPO=profile DOCKER_TOKEN=tok \
        POSTGRES_PASSWORD="db-pass-123" \
        PROFILE_SERVER_HOST="203.0.113.10" \
        PROFILE_SSH_PASSWORD="$SECRET_PW" ALLOW_PROFILE_SSH_PASSWORD_FALLBACK=1 \
        PROFILE_DEPLOY_LOCK="$WORK/lock.d" PROFILE_DEPLOY_RECORD="$RECORD" \
        "$@" \
        bash build-deploy-profile.sh > "$WORK/out.log" 2>&1 )
    RC=$?
}

NEW() { WORK=$(mktemp -d); make_stubs; mkdir -p "$WORK/home"; : > "$WORK/resolve_map"; \
        RECORD="$WORK/home/.geoconflict/profile-deploy.log"; }

# ══════════════════════════════════════════════════════════════════════════════
echo "== T1: happy path — argv-safety + sshpass -f 0600 file + record=ok =="
NEW; echo profile > "$WORK/marker"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC (expected 0); see $WORK/out.log"
if grep -rqF "$SECRET_PW" "$WORK"/*.argv 2>/dev/null; then fail "SSH password LEAKED into an argv"; \
  else pass "password never appears in docker/ssh/scp/sshpass argv"; fi
if grep -q 'sshpass -p' "$WORK/sshpass.argv" 2>/dev/null; then fail "sshpass invoked with -p"; \
  else pass "sshpass never used the vulnerable -p form"; fi
grep -q 'sshpass -f' "$WORK/sshpass.argv" && pass "sshpass used -f <file>" || fail "sshpass missing -f"
if [ -s "$WORK/sshpass.filemode" ] && awk '$2!="600"{bad=1} END{exit bad+0}' "$WORK/sshpass.filemode"; then
  pass "sshpass password file was mode 0600"; else fail "sshpass password file not 0600"; fi
grep -q 'validation_result=ok' "$RECORD" && pass "record has validation_result=ok" || fail "record missing ok result"

echo "== T2: injected mid-deploy failure — sshpass file removed, record=failed =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/fail_deploy"
run_deploy
[ "$RC" -ne 0 ] && pass "deploy failed closed (rc=$RC)" || fail "deploy should have failed"
pwfile=$(awk 'NR==1{print $1}' "$WORK/sshpass.filemode" 2>/dev/null)
if [ -n "$pwfile" ] && [ ! -f "$pwfile" ]; then pass "sshpass password file removed on failure"; \
  else fail "sshpass password file leaked after failure ($pwfile)"; fi
grep -q 'validation_result=failed' "$RECORD" && pass "record has validation_result=failed" || fail "record missing failed result"

echo "== T3: concurrency — second deploy fails closed, writes no record byte =="
NEW; echo profile > "$WORK/marker"; mkdir -p "$WORK/lock.d"   # pre-hold the lock
before=$( [ -f "$RECORD" ] && wc -c < "$RECORD" || echo 0 )
run_deploy
after=$( [ -f "$RECORD" ] && wc -c < "$RECORD" || echo 0 )
[ "$RC" -ne 0 ] && pass "second deploy failed closed (rc=$RC)" || fail "second deploy should fail closed"
grep -q 'already running' "$WORK/out.log" && pass "reported lock-held" || fail "no lock-held message"
[ "$before" = "$after" ] && pass "no record byte written ($after==$before)" || fail "record was written under held lock"
[ ! -f "$WORK/scp.called" ] && pass "no SCP under held lock" || fail "SCP ran under held lock"

echo "== T4: N serialized deploys → N contiguous blocks, no interleave =="
NEW; echo profile > "$WORK/marker"
for i in 1 2 3; do run_deploy; done
blocks=$(grep -c '^----' "$RECORD" 2>/dev/null || echo 0)
results=$(grep -c '^validation_result=' "$RECORD" 2>/dev/null || echo 0)
[ "$blocks" = "3" ] && pass "3 record blocks" || fail "expected 3 blocks, got $blocks"
[ "$results" = "3" ] && pass "3 validation_result lines" || fail "expected 3 results, got $results"
# contiguity: every block header is immediately preceded by start-or-a-result line
if awk '/^----/{ if(prev!="" && prev !~ /^validation_result=/){bad=1} } {prev=$0} END{exit bad?1:0}' "$RECORD"; then
  pass "blocks are contiguous (no interleave)"; else fail "record blocks interleaved"; fi

echo "== T5: record-append failure still releases the lock =="
NEW; echo profile > "$WORK/marker"
RECORD="/proc/geoconflict-nonexistent/rec"      # unwritable: dirname can't be created
run_deploy
grep -q 'could not write the deploy record' "$WORK/out.log" && pass "append failure warned" || fail "no append-failure warning"
[ ! -d "$WORK/lock.d" ] && pass "lock released despite append failure" || fail "lock STRANDED after append failure"

echo "== T6: preflight — wrong role marker aborts BEFORE any SCP =="
NEW; echo telemetry > "$WORK/marker"
run_deploy
[ "$RC" -ne 0 ] && pass "wrong-role deploy aborted (rc=$RC)" || fail "wrong-role should abort"
grep -q "provisioned as role 'telemetry'" "$WORK/out.log" && pass "named the wrong role" || fail "no wrong-role message"
[ ! -f "$WORK/scp.called" ] && pass "aborted before any SCP / secret-staging" || fail "SCP ran on wrong host"

echo "== T7: preflight — no marker + no domain match aborts =="
NEW; : > "$WORK/marker"          # empty marker; PROFILE_DOMAIN unset → DOMAIN_MATCH=0
run_deploy
[ "$RC" -ne 0 ] && pass "unverified deploy aborted (rc=$RC)" || fail "should abort when unverifiable"
[ ! -f "$WORK/scp.called" ] && pass "no SCP when target unverifiable" || fail "SCP ran on unverifiable host"
grep -q 'PROFILE_DEPLOY_ALLOW_UNVERIFIED' "$WORK/out.log" && pass "hinted the override env" || fail "no override hint"

echo "== T8: preflight — no marker but PROFILE_DOMAIN resolves to target → proceeds =="
NEW; : > "$WORK/marker"
echo "203.0.113.10 api.example.test" > "$WORK/resolve_map"   # domain + host resolve to same IP
run_deploy PROFILE_DOMAIN=api.example.test
[ "$RC" -eq 0 ] && pass "DNS-bootstrap deploy proceeded (rc=0)" || fail "DNS match should proceed (rc=$RC); see $WORK/out.log"
[ -f "$WORK/scp.called" ] && pass "SCP ran after DNS-confirmed identity" || fail "SCP did not run on DNS match"

echo "== T9: preflight — unreachable host aborts before SCP =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/ssh_unreachable"
run_deploy
[ "$RC" -ne 0 ] && pass "unreachable deploy aborted (rc=$RC)" || fail "unreachable should abort"
grep -q 'unreachable or key rejected' "$WORK/out.log" && pass "reported unreachable/auth-fail" || fail "no unreachable message"
[ ! -f "$WORK/scp.called" ] && pass "no SCP when unreachable" || fail "SCP ran on unreachable host"

echo "== T10: YANDEX_PAYMENTS_SECRET reaches the staged env, %q-quoted, exactly once =="
# Task 0195. Reading the deploy diff is NOT verification of this defect class — a variable
# that "looks forwarded" is exactly how it hid three times. This drives the REAL script and
# asserts what the staged file actually carries.
SECRET_YP='yp-F@ke Payments"Key$notreal'   # visibly synthetic; spaces + quotes + $
NEW; echo profile > "$WORK/marker"
run_deploy YANDEX_PAYMENTS_SECRET="$SECRET_YP"
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC (expected 0); see $WORK/out.log"
if [ -f "$WORK/staged.env" ]; then pass "staged env file was uploaded"; else fail "no staged env captured"; fi
n=$(grep -c '^export YANDEX_PAYMENTS_SECRET=' "$WORK/staged.env" 2>/dev/null || true); n=${n:-0}
[ "$n" = "1" ] && pass "exactly one export YANDEX_PAYMENTS_SECRET line" \
  || fail "expected 1 export YANDEX_PAYMENTS_SECRET line, got $n"
got=$( . "$WORK/staged.env" >/dev/null 2>&1; printf '%s' "${YANDEX_PAYMENTS_SECRET-}" )
if [ "$got" = "$SECRET_YP" ]; then pass "value round-trips through sourcing (spaces/quotes/\$ intact)"; \
  else fail "staged value did not round-trip (got ${#got} chars, expected ${#SECRET_YP})"; fi
if grep -rqF "$SECRET_YP" "$WORK"/*.argv 2>/dev/null; then fail "payments secret LEAKED into an argv"; \
  else pass "payments secret never appears in docker/ssh/scp/sshpass argv"; fi

# ── Structural parity checks (setup-* on-box halves + telemetry mirror) ────────
echo "== Structural: on-box flock/marker + telemetry mirror =="
P="$REPO_ROOT/setup-profile.sh"
awk '/flock -n 9/{f=NR} /apt-get update -y && apt-get upgrade -y/{u=NR} END{exit !(f>0 && f<u)}' "$P" \
  && pass "setup-profile.sh: flock acquired before first apt mutation" || fail "flock not before apt"
grep -q 'echo profile > /etc/geoconflict-deploy-role' "$P" && pass "setup-profile.sh writes role marker" || fail "no profile role marker"
grep -q 'echo telemetry > /etc/geoconflict-deploy-role' "$REPO_ROOT/setup-telemetry.sh" \
  && pass "setup-telemetry.sh writes role marker" || fail "no telemetry role marker"
T="$REPO_ROOT/build-deploy-telemetry.sh"
awk '/DEPLOY-TARGET PREFLIGHT/{p=NR} /UPLOADING SETUP SCRIPT/{u=NR} END{exit !(p>0 && p<u)}' "$T" \
  && pass "build-deploy-telemetry.sh: preflight before the SCP" || fail "telemetry preflight not before SCP"
grep -q 'sshpass -f "\$SSH_PASSWORD_FILE"' "$T" && pass "build-deploy-telemetry.sh uses sshpass -f" || fail "telemetry still on sshpass -p"

# ── Structural: game-container log retention (task 0060) ──────────────────────
# ⚠️ These are LINTS, not behavioural tests. The real behaviour — that a useful log
# window actually survives a container recreate — is observable only on the box, and
# is deferred to the owner's live verification. What these catch is the cheap, likely
# regression: a future edit dropping the flags or quietly shrinking the budget,
# putting us back on an invisible host-side default. Scoped with awk so they cannot
# pass on a stray match elsewhere in the file, and asserted on VALUES not just flag
# presence (the false-green class task 0202 is about).
#
# Known residual, accepted deliberately: the `docker run` extraction is coupled to the
# current line formatting, so a semantically identical reformat (collapsing it to one
# line, or indenting it inside an `if`) reds this section. That is a FALSE RED — it
# fails loud, which is the safe direction for a lint to be wrong in.
echo "== Structural: container log retention (0060) =="
U="$REPO_ROOT/update.sh"
N="$REPO_ROOT/nginx.conf"
# Extract ONLY the `docker run` invocation (up to its first non-continued line).
RUN_BLOCK=$(awk '/^docker run -d/{b=1} b{print} b && !/\\$/{exit}' "$U")
[ -n "$RUN_BLOCK" ] && pass "update.sh: located the docker run invocation" \
  || fail "update.sh: no docker run invocation found (the checks below would be vacuous)"
# Assert on VALUES, not just flag presence. Presence-only greps let
# `--log-opt max-size=1m --log-opt max-file=1` pass green — valid Docker that deploys
# cleanly and reinstates a 1 MB ring, i.e. a silent regression far worse than the state
# this task exists to fix. Expected values live here, once:
EXPECTED_MAX_SIZE="100m"     # ── if the owner re-tunes after measuring (D-L1/D-L2 in
EXPECTED_MAX_FILE="10"       #    0060's worklog), update these two DELIBERATELY.
got_size=$(printf '%s\n' "$RUN_BLOCK" | sed -n 's/^[[:space:]]*--log-opt max-size=\([^ \\]*\).*/\1/p')
got_file=$(printf '%s\n' "$RUN_BLOCK" | sed -n 's/^[[:space:]]*--log-opt max-file=\([^ \\]*\).*/\1/p')
# Shape checks first: these stay valid across any deliberate re-tune, and catch a
# corrupted value (max-size=banana, max-file=) that would fail loudly at docker run.
printf '%s' "$got_size" | grep -qE '^[0-9]+[kmg]$' \
  && pass "update.sh: --log-opt max-size has a valid <number><unit> value ($got_size)" \
  || fail "update.sh: --log-opt max-size value is missing or malformed (got '${got_size:-<none>}')"
printf '%s' "$got_file" | grep -qE '^[0-9]+$' && [ "${got_file:-0}" -ge 2 ] \
  && pass "update.sh: --log-opt max-file is an integer >= 2 ($got_file)" \
  || fail "update.sh: --log-opt max-file must be an integer >= 2 (got '${got_file:-<none>}'); 1 means no rotation"
# Then the exact expected values, so ANY change to the retention budget is conscious.
[ "$got_size" = "$EXPECTED_MAX_SIZE" ] \
  && pass "update.sh: --log-opt max-size is the expected $EXPECTED_MAX_SIZE" \
  || fail "update.sh: --log-opt max-size is '$got_size', expected '$EXPECTED_MAX_SIZE' — if this was a deliberate re-tune, update EXPECTED_MAX_SIZE here"
[ "$got_file" = "$EXPECTED_MAX_FILE" ] \
  && pass "update.sh: --log-opt max-file is the expected $EXPECTED_MAX_FILE" \
  || fail "update.sh: --log-opt max-file is '$got_file', expected '$EXPECTED_MAX_FILE' — if this was a deliberate re-tune, update EXPECTED_MAX_FILE here"
# max-file without max-size is unbounded per file — the exact failure mode this task exists to prevent.
printf '%s\n' "$RUN_BLOCK" | grep -qE '^[[:space:]]*--log-driver json-file' \
  && pass "update.sh: docker run pins --log-driver json-file" || fail "update.sh: docker run lost --log-driver json-file"
# Extract ONLY the /api/public_lobbies location block.
LOBBY_BLOCK=$(awk '/location = \/api\/public_lobbies \{/{b=1} b{print} b && /^    \}/{exit}' "$N")
[ -n "$LOBBY_BLOCK" ] && pass "nginx.conf: located the /api/public_lobbies block" \
  || fail "nginx.conf: no /api/public_lobbies block found (the check below would be vacuous)"
printf '%s\n' "$LOBBY_BLOCK" | grep -qE '^[[:space:]]*access_log off;' \
  && pass "nginx.conf: /api/public_lobbies has access_log off" || fail "nginx.conf: /api/public_lobbies lost access_log off"
# The silencing must stay scoped to that endpoint — never applied server-wide. A file-wide
# grep CANNOT check this: site-wide `access_log off;` plus any stray `access_log /dev/stdout;`
# left in a location block passes it green, which is the catastrophic direction. Extract the
# directives at server level ONLY (brace depth 1 inside `server {`, so nested location blocks
# are excluded) and assert against those.
SERVER_LEVEL=$(awk '
  /^server[[:space:]]*\{/ { ins=1; depth=1; next }
  ins {
    o = gsub(/\{/, "{"); c = gsub(/\}/, "}");
    if (depth == 1 && o == 0 && c == 0) print;
    depth += o - c;
    if (depth <= 0) exit;
  }' "$N")
[ -n "$SERVER_LEVEL" ] && pass "nginx.conf: extracted the server-level directives" \
  || fail "nginx.conf: could not extract server-level directives (the checks below would be vacuous)"
printf '%s\n' "$SERVER_LEVEL" | grep -qE '^[[:space:]]*access_log /dev/stdout;' \
  && pass "nginx.conf: server-level access_log still goes to stdout" || fail "nginx.conf: server-level access_log was disabled or moved off stdout"
printf '%s\n' "$SERVER_LEVEL" | grep -qE '^[[:space:]]*access_log[[:space:]]+off;' \
  && fail "nginx.conf: access_log is off at SERVER level — that silences the whole site, not one endpoint" \
  || pass "nginx.conf: access_log is not disabled site-wide"
printf '%s\n' "$SERVER_LEVEL" | grep -qE '^[[:space:]]*error_log /dev/stderr;' \
  && pass "nginx.conf: server-level error_log still goes to stderr" || fail "nginx.conf: server-level error_log was disabled or moved off stderr"

echo
[ "$FAILED" -eq 0 ] && { echo "ALL PASS"; exit 0; } || { echo "SOME FAILED"; exit 1; }
