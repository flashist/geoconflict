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
    # …and ./profile-checks.sh since task 0219 (same precondition, same reason).
    : > "$RUN/profile-checks.sh"; chmod +x "$RUN/profile-checks.sh"
    : > "$RUN/Dockerfile.profile"
    printf '#!/bin/bash\nexit 0\n' > "$RUN/scripts/check-docker-secret-boundary.sh"
    chmod +x "$RUN/scripts/check-docker-secret-boundary.sh"
    rm -f "$WORK/docker.argv" "$WORK/ssh.argv" "$WORK/scp.argv" "$WORK/sshpass.argv" \
          "$WORK/sshpass.filemode" "$WORK/scp.called" "$WORK/staged.env"
    # `env -i` + an explicit allow-list — deliberately NOT a list of secrets to clear.
    # The real deploy script forwards every variable in its export block from its environment into the staged
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

echo "== T11: profile-checks.sh is SCP'd and PROFILE_CHECKS_PING_URL round-trips (task 0219) =="
# The ping URL is a capability (whoever holds it silences the alert): same T10 standard — the
# REAL script is driven, and what the staged file actually carries is asserted.
SECRET_PING='https://ping.example.invalid/0219-fake uuid"$notreal'   # spaces + quote + $
NEW; echo profile > "$WORK/marker"
run_deploy PROFILE_CHECKS_PING_URL="$SECRET_PING"
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC (expected 0); see $WORK/out.log"
grep -q 'profile-checks.sh' "$WORK/scp.argv" 2>/dev/null && pass "profile-checks.sh was SCP'd to the box" \
  || fail "profile-checks.sh never reached scp"
n=$(grep -c '^export PROFILE_CHECKS_PING_URL=' "$WORK/staged.env" 2>/dev/null || true); n=${n:-0}
[ "$n" = "1" ] && pass "exactly one export PROFILE_CHECKS_PING_URL line" \
  || fail "expected 1 export PROFILE_CHECKS_PING_URL line, got $n"
got=$( . "$WORK/staged.env" >/dev/null 2>&1; printf '%s' "${PROFILE_CHECKS_PING_URL-}" )
if [ "$got" = "$SECRET_PING" ]; then pass "ping URL round-trips through sourcing (spaces/quotes/\$ intact)"; \
  else fail "staged ping URL did not round-trip (got ${#got} chars, expected ${#SECRET_PING})"; fi
if grep -rqF "$SECRET_PING" "$WORK"/*.argv 2>/dev/null; then fail "ping URL LEAKED into an argv"; \
  else pass "ping URL never appears in docker/ssh/scp/sshpass argv"; fi

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

# ── Structural: profile-box operability (task 0219) ───────────────────────────
# Same character as the 0060 block above: LINTS over setup-profile.sh, value-asserting and
# awk-scoped, catching the cheap regression (a dropped logging: block, a prune that would eat
# the rollback image, a lost cron line). The behaviour itself — rotation observed, rollback
# image surviving a prune, an alert arriving — is provable only on the box (0219 Part B).
# Same accepted residual: the heredoc extraction is coupled to formatting → a reformat reds
# this section (false RED, never false green).
echo "== Structural: profile-box log retention + image prune + checks wiring (0219) =="
P="$REPO_ROOT/setup-profile.sh"
B="$REPO_ROOT/build-deploy-profile.sh"
# The compose file heredoc, and only it.
COMPOSE_BLOCK=$(awk '/cat > "\$PROFILE_DIR\/docker-compose.yml" << EOF/{b=1; next} b && /^EOF$/{exit} b{print}' "$P")
[ -n "$COMPOSE_BLOCK" ] && pass "setup-profile.sh: located the docker-compose.yml heredoc" \
  || fail "setup-profile.sh: no docker-compose.yml heredoc found (the checks below would be vacuous)"
# Services = 2-space-indented keys under services: (before the top-level volumes: key).
n_services=$(printf '%s\n' "$COMPOSE_BLOCK" | awk '/^volumes:/{exit} /^  [a-z][a-z0-9-]*:$/{n++} END{print n+0}')
n_logging=$(printf '%s\n' "$COMPOSE_BLOCK" | grep -cE '^    logging:$' || true)
n_driver=$(printf '%s\n' "$COMPOSE_BLOCK" | grep -cE '^      driver: json-file$' || true)
[ "$n_services" -ge 2 ] && [ "$n_logging" = "$n_services" ] \
  && pass "compose: every service ($n_services) has a logging: block" \
  || fail "compose: $n_logging logging: block(s) for $n_services service(s) — an unlisted service is back on the unbounded default"
[ "$n_driver" = "$n_services" ] && pass "compose: every service pins driver: json-file" \
  || fail "compose: driver: json-file appears $n_driver time(s), expected $n_services"
# Values, not presence — and the SAME constants as update.sh (owner ruling 0219 Q3: one number
# project-wide). EXPECTED_MAX_SIZE / EXPECTED_MAX_FILE are defined in the 0060 block above.
sizes=$(printf '%s\n' "$COMPOSE_BLOCK" | sed -n 's/^        max-size: "\([^"]*\)".*/\1/p')
files=$(printf '%s\n' "$COMPOSE_BLOCK" | sed -n 's/^        max-file: "\([^"]*\)".*/\1/p')
[ "$(printf '%s\n' "$sizes" | grep -c .)" = "$n_services" ] && [ "$(printf '%s\n' "$files" | grep -c .)" = "$n_services" ] \
  && pass "compose: max-size + max-file set on every service" \
  || fail "compose: max-size/max-file missing on some service (sizes='$sizes' files='$files')"
printf '%s\n' "$sizes" | grep -vqE '^[0-9]+[kmg]$' \
  && fail "compose: a max-size value is malformed ('$sizes')" || pass "compose: every max-size is <number><unit>"
for v in $files; do printf '%s' "$v" | grep -qE '^[0-9]+$' && [ "$v" -ge 2 ] || { fail "compose: max-file '$v' must be an integer >= 2 (1 means no rotation)"; break; }; done
printf '%s\n' "$sizes" | grep -vqxF "$EXPECTED_MAX_SIZE" \
  && fail "compose: max-size is '$sizes', expected '$EXPECTED_MAX_SIZE' everywhere — a deliberate re-tune updates EXPECTED_MAX_SIZE here" \
  || pass "compose: max-size is the expected $EXPECTED_MAX_SIZE on every service"
printf '%s\n' "$files" | grep -vqxF "$EXPECTED_MAX_FILE" \
  && fail "compose: max-file is '$files', expected '$EXPECTED_MAX_FILE' everywhere — a deliberate re-tune updates EXPECTED_MAX_FILE here" \
  || pass "compose: max-file is the expected $EXPECTED_MAX_FILE on every service"
# Ownership decision: compose owns retention on this box; a host daemon config would be a
# second, conflicting layer. Comments may NAME the file (that is the decision record) — code may not.
grep -v '^[[:space:]]*#' "$P" | grep -q 'daemon\.json' \
  && fail "setup-profile.sh: code references daemon.json — retention has TWO owners on this box" \
  || pass "setup-profile.sh: no daemon.json in code (compose is the single owner)"
# Image prune: keep-list (references PREV_PROFILE_IMAGE), ordered AFTER the rollback branch and
# BEFORE the systemd section, and NEVER the game box's `prune -a` (which removes the rollback image).
awk '/Rolling back profile-api to the last known-good image/{r=NR} /print_header "PRUNING UNUSED IMAGES"/{p=NR} /print_header "CONFIGURING SYSTEMD AUTO-START"/{s=NR} END{exit !(r>0 && p>r && s>p)}' "$P" \
  && pass "setup-profile.sh: prune runs after the rollback branch and before systemd" \
  || fail "setup-profile.sh: prune section missing or mis-ordered vs rollback/systemd"
PRUNE_BLOCK=$(awk '/print_header "PRUNING UNUSED IMAGES"/{b=1} /print_header "CONFIGURING SYSTEMD AUTO-START"/{exit} b{print}' "$P")
printf '%s\n' "$PRUNE_BLOCK" | grep -q 'PREV_PROFILE_IMAGE' && printf '%s\n' "$PRUNE_BLOCK" | grep -q '"\$PROFILE_IMAGE"' \
  && pass "prune: keep-list names PROFILE_IMAGE and PREV_PROFILE_IMAGE" || fail "prune: keep-list does not protect the current/previous image"
printf '%s\n' "$PRUNE_BLOCK" | grep -q 'docker ps -aq' && pass "prune: keep-list covers every container (docker ps -a)" \
  || fail "prune: keep-list ignores stopped containers' images"
grep -v '^[[:space:]]*#' "$P" | grep -q 'docker image prune -a' \
  && fail "setup-profile.sh: 'docker image prune -a' present — that deletes the rollback image" \
  || pass "setup-profile.sh: no 'docker image prune -a' (keep-list prune only)"
# Checker wiring: installed, scheduled in the always-present cron header, carried by the deploy script.
grep -q 'install -m 700 "\$PROFILE_CHECKS_SRC" "\$PROFILE_DIR/checks.sh"' "$P" && pass "setup-profile.sh: installs checks.sh (0700)" \
  || fail "setup-profile.sh: checks.sh install line missing"
CRON_HEADER=$(awk '/^cat > "\$CRON_FILE" << EOF/{b=1; next} b && /^EOF$/{exit} b{print}' "$P")
printf '%s\n' "$CRON_HEADER" | grep -qE '^0 8 \* \* \* root \$PROFILE_DIR/checks\.sh >> /var/log/profile-checks\.log 2>&1$' \
  && pass "cron header: daily 08:00 checks.sh line present (both backup modes)" \
  || fail "cron header: checks.sh line missing or moved out of the always-present block"
grep -q 'printf .PROFILE_CHECKS_PING_URL=%q' "$P" && pass "setup-profile.sh: checks.env written with %q" \
  || fail "setup-profile.sh: checks.env not written with %q"
# certbot.timer (hookless second renewer) is disabled inside the PROFILE_DOMAIN-guarded HTTPS
# section — after certonly, before the renew cron — and can never fail the deploy (owner ruling,
# 0219 review R3). Line order: certonly < disable < the hooked renew cron line.
grep -qE '^\s*systemctl disable --now certbot\.timer .*\|\| true$' "$P" \
  && pass "setup-profile.sh: certbot.timer disabled (|| true-safe)" \
  || fail "setup-profile.sh: 'systemctl disable --now certbot.timer … || true' missing"
L_CERTONLY=$(grep -n 'certbot certonly --standalone' "$P" | head -1 | cut -d: -f1)
L_TIMER=$(grep -n 'systemctl disable --now certbot.timer' "$P" | head -1 | cut -d: -f1)
L_RENEWCRON=$(grep -n '^0 0,12 \* \* \* root certbot renew' "$P" | head -1 | cut -d: -f1)
[ -n "$L_CERTONLY" ] && [ -n "$L_TIMER" ] && [ -n "$L_RENEWCRON" ] \
  && [ "$L_CERTONLY" -lt "$L_TIMER" ] && [ "$L_TIMER" -lt "$L_RENEWCRON" ] \
  && pass "setup-profile.sh: certbot.timer disable sits after certonly and before the hooked renew cron" \
  || fail "setup-profile.sh: certbot.timer disable mis-ordered (certonly=$L_CERTONLY timer=$L_TIMER cron=$L_RENEWCRON)"
grep -q 'CHECKS_SCRIPT="./profile-checks.sh"' "$B" && grep -q 'REMOTE_CHECKS_SCRIPT' "$B" \
  && pass "build-deploy-profile.sh: carries profile-checks.sh" || fail "build-deploy-profile.sh: profile-checks.sh not carried"


# ── Behavioural + structural: on-box secret persistence + value parity (task 0220) ──
# 0195 recorded ONE variable with no on-box persistence; the real scope is FOUR (the three
# Telegram variables were verified by the architect 2026-09-04). The defect is a deploy that
# SUCCEEDS while silently blanking a value the box had. These tests drive the REAL functions
# extracted from setup-profile.sh (the tests/profile-backup-redeploy.sh awk+eval pattern —
# no reimplementation), one variable at a time, and were seen RED against the unfixed script
# first (negative control, the standard 0195 set with T10). Values below are visibly synthetic
# and carry spaces/quotes/$; the assertions check that NO value and NO length ever reaches the
# deploy output — names only.
P="$REPO_ROOT/setup-profile.sh"
mode_of() { stat -f '%Lp' "$1" 2>/dev/null || stat -c '%a' "$1" 2>/dev/null; }
# From `name() {` at column 0 to the first `}` at column 0 — the function has no brace at
# column 0 inside and no heredoc, so this is exactly the definition.
eval "$(awk '/^persist_or_reuse_secret\(\) \{/,/^\}/' "$P")"
eval "$(awk '/^report_config_values\(\) \{/,/^\}/' "$P")"
# ipv4_re/ipv6_re are the script's own (hoisted to column 0 so the report can reuse them).
eval "$(grep -E '^ipv[46]_re=' "$P")"
HAVE_PERSIST=0; HAVE_REPORT=0
declare -F persist_or_reuse_secret >/dev/null && HAVE_PERSIST=1
declare -F report_config_values >/dev/null && HAVE_REPORT=1
[ "$HAVE_PERSIST" = 1 ] && pass "setup-profile.sh: persist_or_reuse_secret() extracted" \
  || fail "setup-profile.sh: persist_or_reuse_secret() not found (its column-0 anchor changed, or the function is missing)"
[ "$HAVE_REPORT" = 1 ] && pass "setup-profile.sh: report_config_values() extracted" \
  || fail "setup-profile.sh: report_config_values() not found (its column-0 anchor changed, or the function is missing)"
PERSIST_SPECS="YANDEX_PAYMENTS_SECRET:.yandex_payments_secret \
FEEDBACK_TELEGRAM_TOKEN:.feedback_telegram_token \
FEEDBACK_TELEGRAM_CHAT_ID:.feedback_telegram_chat_id \
TELEGRAM_PROXY_URL:.telegram_proxy_url"

echo "== T12: persist_or_reuse_secret — env value persisted 0600, blank redeploy REUSES it, by name (0220) =="
if [ "$HAVE_PERSIST" = 1 ]; then
  PDIR=$(mktemp -d)
  for spec in $PERSIST_SPECS; do
    name=${spec%%:*}; file="$PDIR/${spec#*:}"
    val="0220-F@ke $name \"v1\"\$notreal"
    # Deploy 1: the value arrives from the environment → persisted, and said so by name.
    printf -v "$name" '%s' "$val"
    persist_or_reuse_secret "$name" "$file" > "$PDIR/out1.txt"
    [ -f "$file" ] && pass "$name: persist file written" || fail "$name: persist file not written"
    [ "$(mode_of "$file")" = "600" ] && pass "$name: persist file is mode 600" || fail "$name: persist file mode is '$(mode_of "$file")', expected 600"
    printf '%s' "$val" | cmp -s - "$file" && pass "$name: persisted bytes equal the value (spaces/quotes/\$ intact)" \
      || fail "$name: persisted bytes differ from the value"
    [ "$(cat "$PDIR/out1.txt")" = "Using $name from environment (persisted to $file)" ] \
      && pass "$name: deploy-1 output is the exact 'Using … from environment' line" \
      || fail "$name: deploy-1 output unexpected: $(cat "$PDIR/out1.txt" | grep -vF "$val" | head -1)"
    # Deploy 2: the deploy supplies NOTHING (the 0195 shape) → the box's value is KEPT, visibly.
    unset "$name"
    persist_or_reuse_secret "$name" "$file" > "$PDIR/out2.txt"
    [ "${!name-}" = "$val" ] && pass "$name: blank redeploy REUSED the persisted value (the defect is closed for this variable)" \
      || fail "$name: blank redeploy did NOT reuse the persisted value — the 0195 silent-blank shape is still open"
    [ "$(cat "$PDIR/out2.txt")" = "⚠️  Reusing persisted $name from $file — the deploy supplied no value" ] \
      && pass "$name: deploy-2 output is the exact 'Reusing persisted' line (name + file, nothing else)" \
      || fail "$name: deploy-2 output unexpected"
    if cat "$PDIR/out1.txt" "$PDIR/out2.txt" | grep -qF "$val"; then fail "$name: the VALUE leaked into deploy output"; \
      else pass "$name: value never appears in deploy output"; fi
    if cat "$PDIR/out1.txt" "$PDIR/out2.txt" | grep -qE "(^|[^0-9])${#val}([^0-9]|$)"; then fail "$name: the value's LENGTH (${#val}) appears in deploy output"; \
      else pass "$name: value length never appears in deploy output"; fi
  done
  rm -rf "$PDIR"
else
  fail "T12 skipped: persist_or_reuse_secret() absent"
fi

echo "== T13: rotation — a NEW value overwrites the persisted one; the other files are untouched (0220) =="
if [ "$HAVE_PERSIST" = 1 ]; then
  PDIR=$(mktemp -d)
  for spec in $PERSIST_SPECS; do
    name=${spec%%:*}; file="$PDIR/${spec#*:}"
    printf -v "$name" '%s' "0220-F@ke $name \"v1\"\$notreal"
    persist_or_reuse_secret "$name" "$file" > /dev/null
  done
  before=$(cksum "$PDIR"/.yandex_payments_secret "$PDIR"/.feedback_telegram_chat_id "$PDIR"/.telegram_proxy_url)
  ROT='0220-F@ke ROTATED "v2"$notreal'
  FEEDBACK_TELEGRAM_TOKEN="$ROT"
  persist_or_reuse_secret FEEDBACK_TELEGRAM_TOKEN "$PDIR/.feedback_telegram_token" > "$PDIR/out.txt"
  printf '%s' "$ROT" | cmp -s - "$PDIR/.feedback_telegram_token" && pass "rotation: persist file now holds the new value" \
    || fail "rotation: persist file was NOT overwritten — persistence became a trap"
  unset FEEDBACK_TELEGRAM_TOKEN
  persist_or_reuse_secret FEEDBACK_TELEGRAM_TOKEN "$PDIR/.feedback_telegram_token" > /dev/null
  [ "${FEEDBACK_TELEGRAM_TOKEN-}" = "$ROT" ] && pass "rotation: a following blank deploy reuses the NEW value" \
    || fail "rotation: a following blank deploy did not reuse the new value"
  after=$(cksum "$PDIR"/.yandex_payments_secret "$PDIR"/.feedback_telegram_chat_id "$PDIR"/.telegram_proxy_url)
  [ "$before" = "$after" ] && pass "rotation: the other three persist files are byte-unchanged" \
    || fail "rotation: rotating one variable touched another's persist file"
  grep -qF "$ROT" "$PDIR/out.txt" && fail "rotation: the rotated VALUE leaked into deploy output" \
    || pass "rotation: rotated value never appears in deploy output"
  rm -rf "$PDIR"
else
  fail "T13 skipped: persist_or_reuse_secret() absent"
fi

echo "== T14: neither supplied nor persisted → written EMPTY, said so; an EMPTY file is not a value (0220) =="
if [ "$HAVE_PERSIST" = 1 ]; then
  PDIR=$(mktemp -d)
  unset YANDEX_PAYMENTS_SECRET
  persist_or_reuse_secret YANDEX_PAYMENTS_SECRET "$PDIR/.yandex_payments_secret" > "$PDIR/out.txt"
  [ ! -e "$PDIR/.yandex_payments_secret" ] && pass "neither: no persist file is created" || fail "neither: a persist file appeared"
  [ -z "${YANDEX_PAYMENTS_SECRET-}" ] && pass "neither: variable stays empty (feature-off semantics unchanged)" || fail "neither: variable is non-empty"
  [ "$(cat "$PDIR/out.txt")" = "YANDEX_PAYMENTS_SECRET: not supplied and nothing persisted — written EMPTY (feature stays off)" ] \
    && pass "neither: output says 'written EMPTY' by name" || fail "neither: output unexpected: $(cat "$PDIR/out.txt")"
  : > "$PDIR/.telegram_proxy_url"   # an empty persist file must count as NOTHING persisted (-s, not -f)
  unset TELEGRAM_PROXY_URL
  persist_or_reuse_secret TELEGRAM_PROXY_URL "$PDIR/.telegram_proxy_url" > "$PDIR/out.txt"
  [ -z "${TELEGRAM_PROXY_URL-}" ] && grep -q 'written EMPTY' "$PDIR/out.txt" \
    && pass "neither: an EMPTY persist file is treated as nothing persisted (no silent empty reuse)" \
    || fail "neither: an empty persist file was 'reused' — a silent empty reuse"
  rm -rf "$PDIR"
else
  fail "T14 skipped: persist_or_reuse_secret() absent"
fi

echo "== T15: value parity report — findings FIRE on bad values, exit stays 0, no value in output (0220) =="
if [ "$HAVE_REPORT" = 1 ]; then
  RDIR=$(mktemp -d)
  # A helper that sets the whole checked surface, then lets each case override.
  clean_config() {
    PROFILE_DOMAIN='api.example.invalid'
    FEEDBACK_TELEGRAM_TOKEN='0220-F@ke tg "token"$notreal'
    FEEDBACK_TELEGRAM_CHAT_ID='0220-F@ke chat "id"$notreal'
    TELEGRAM_PROXY_URL='http://proxy.example.invalid:3128'
    YANDEX_PAYMENTS_SECRET='0220-F@ke yp "key"$notreal'
    PROFILE_INTERNAL_TOKEN='0220-F@ke internal "tok"$notreal'
    PROFILE_INTERNAL_TOKEN_SOURCE='environment'
    PROFILE_CHECKS_PING_URL='https://ping.example.invalid/0220-fake'
    PROFILE_BACKUP_S3_ENDPOINT='https://s3.example.invalid'
  }
  # (i) clean config → zero findings, returns 0.
  clean_config
  report_config_values > "$RDIR/clean.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "clean: report_config_values returned 0" || fail "clean: returned $rc"
  n=$(grep -c 'FINDING' "$RDIR/clean.txt" || true)
  [ "${n:-0}" = "0" ] && pass "clean: zero FINDING lines" || fail "clean: $n FINDING line(s) on a clean config: $(grep FINDING "$RDIR/clean.txt" | head -3)"
  grep -q '^Value parity: 0 finding(s),' "$RDIR/clean.txt" && pass "clean: summary line reports 0 findings" \
    || fail "clean: summary line missing or wrong: $(grep 'Value parity' "$RDIR/clean.txt")"
  grep -qE 'report-only, deploy continues' "$RDIR/clean.txt" && pass "clean: summary says report-only" || fail "clean: summary does not say report-only"
  # (ii) the 0063 class (scheme + IP literal in PROFILE_DOMAIN) and a proxy-less Telegram pair → both fire, exit still 0.
  clean_config
  PROFILE_DOMAIN='http://203.0.113.10'
  TELEGRAM_PROXY_URL=''
  report_config_values > "$RDIR/bad.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "bad: report_config_values STILL returned 0 (report-only)" || fail "bad: returned $rc — a non-zero here fails a deploy"
  grep -q 'FINDING.*PROFILE_DOMAIN' "$RDIR/bad.txt" && pass "bad: PROFILE_DOMAIN finding fired (scheme / IP literal)" || fail "bad: no PROFILE_DOMAIN finding"
  grep -q 'FINDING.*TELEGRAM_PROXY_URL' "$RDIR/bad.txt" && pass "bad: TELEGRAM_PROXY_URL finding fired (empty while token+chat set)" || fail "bad: no TELEGRAM_PROXY_URL finding"
  grep -q '^Value parity: 2 finding(s),' "$RDIR/bad.txt" && pass "bad: summary counts exactly 2 findings" \
    || fail "bad: summary line wrong: $(grep 'Value parity' "$RDIR/bad.txt")"
  # (iv) the 0062 class (empty token with the chat set), a non-https ping URL, a non-https S3
  #      endpoint, and a token the game server cannot know (source ≠ environment) → each fires.
  clean_config
  FEEDBACK_TELEGRAM_TOKEN=''
  PROFILE_CHECKS_PING_URL='http://ping.example.invalid/0220-fake'
  PROFILE_BACKUP_S3_ENDPOINT='http://203.0.113.11'
  PROFILE_INTERNAL_TOKEN_SOURCE='persisted'
  report_config_values > "$RDIR/bad2.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "bad2: report_config_values STILL returned 0" || fail "bad2: returned $rc"
  grep -q 'FINDING.*FEEDBACK_TELEGRAM_TOKEN' "$RDIR/bad2.txt" && pass "bad2: empty FEEDBACK_TELEGRAM_TOKEN with chat set → finding (half-configured pair)" \
    || fail "bad2: no finding for the half-configured Telegram pair"
  grep -q 'FINDING.*PROFILE_CHECKS_PING_URL' "$RDIR/bad2.txt" && pass "bad2: non-https PROFILE_CHECKS_PING_URL → finding" || fail "bad2: no PROFILE_CHECKS_PING_URL finding"
  grep -q 'FINDING.*PROFILE_BACKUP_S3_ENDPOINT' "$RDIR/bad2.txt" && pass "bad2: non-https / IP-literal PROFILE_BACKUP_S3_ENDPOINT → finding" || fail "bad2: no PROFILE_BACKUP_S3_ENDPOINT finding"
  grep -q 'FINDING.*PROFILE_INTERNAL_TOKEN' "$RDIR/bad2.txt" && pass "bad2: PROFILE_INTERNAL_TOKEN not from the environment → finding (the 0215 trap, visible)" \
    || fail "bad2: no PROFILE_INTERNAL_TOKEN source finding"
  # (v) optional rows are EXPLICIT, with a reason — never silent.
  clean_config
  YANDEX_PAYMENTS_SECRET=''; FEEDBACK_TELEGRAM_TOKEN=''; FEEDBACK_TELEGRAM_CHAT_ID=''; TELEGRAM_PROXY_URL=''; PROFILE_CHECKS_PING_URL=''
  report_config_values > "$RDIR/opt.txt"; rc=$?
  n=$(grep -c 'FINDING' "$RDIR/opt.txt" || true)
  [ "$rc" -eq 0 ] && [ "${n:-0}" = "0" ] && pass "optional: all-off Telegram + payments + ping is 0 findings (off by design)" \
    || fail "optional: rc=$rc findings=$n on an all-off config"
  grep -q 'OPTIONAL.*YANDEX_PAYMENTS_SECRET.*0014' "$RDIR/opt.txt" && pass "optional: YANDEX_PAYMENTS_SECRET row is explicit and cites 0014" \
    || fail "optional: YANDEX_PAYMENTS_SECRET optional row missing its reason"
  grep -q 'OPTIONAL.*FEEDBACK_TELEGRAM_TOKEN' "$RDIR/opt.txt" && pass "optional: Telegram pair row is explicit" || fail "optional: Telegram pair optional row missing"
  grep -q 'OPTIONAL.*PROFILE_CHECKS_PING_URL' "$RDIR/opt.txt" && pass "optional: PROFILE_CHECKS_PING_URL row is explicit (nobody paged)" || fail "optional: ping URL optional row missing"
  # (iii) canary: a synthetic secret in EVERY checked variable never appears in any report output.
  for v in '0220-F@ke tg "token"$notreal' '0220-F@ke chat "id"$notreal' '0220-F@ke yp "key"$notreal' '0220-F@ke internal "tok"$notreal' \
           'https://ping.example.invalid/0220-fake' 'http://ping.example.invalid/0220-fake' 'http://proxy.example.invalid:3128' \
           'http://203.0.113.10' 'http://203.0.113.11' 'https://s3.example.invalid'; do
    if cat "$RDIR"/*.txt | grep -qF "$v"; then fail "canary: a checked VALUE leaked into the value report"; break; fi
  done
  cat "$RDIR"/*.txt | grep -qF '0220-F@ke' || pass "canary: no checked value appears in any report output (names + verdicts only)"
  unset PROFILE_DOMAIN FEEDBACK_TELEGRAM_TOKEN FEEDBACK_TELEGRAM_CHAT_ID TELEGRAM_PROXY_URL YANDEX_PAYMENTS_SECRET \
        PROFILE_INTERNAL_TOKEN PROFILE_INTERNAL_TOKEN_SOURCE PROFILE_CHECKS_PING_URL PROFILE_BACKUP_S3_ENDPOINT
  rm -rf "$RDIR"
else
  fail "T15 skipped: report_config_values() absent"
fi

echo "== Structural: POSTGRES_PASSWORD still fails closed; persistence + report wiring in setup-profile.sh (0220) =="
# POSTGRES_PASSWORD is EXEMPT — required, fails closed — and must NEVER be pulled into persist-or-reuse.
awk '/Error: POSTGRES_PASSWORD is not set/{e=NR} e && NR==e+1 && /^[[:space:]]*exit 1[[:space:]]*$/{ok=1} END{exit !ok}' "$P" \
  && pass "setup-profile.sh: POSTGRES_PASSWORD fail-closed block intact (error line followed by exit 1)" \
  || fail "setup-profile.sh: POSTGRES_PASSWORD fail-closed block missing or no longer exits 1"
grep -v '^[[:space:]]*#' "$P" | grep -q 'persist_or_reuse_secret POSTGRES_PASSWORD' \
  && fail "setup-profile.sh: POSTGRES_PASSWORD was pulled into persist-or-reuse — it must fail closed" \
  || pass "setup-profile.sh: persist_or_reuse_secret is never applied to POSTGRES_PASSWORD"
# The four calls: present, after the token block, before the profile.env heredoc.
L_TOKEN=$(grep -n '^PROFILE_TOKEN_FILE=' "$P" | head -1 | cut -d: -f1)
L_ENV=$(grep -n 'cat > "\$PROFILE_DIR/profile.env" << EOF' "$P" | head -1 | cut -d: -f1)
for spec in $PERSIST_SPECS; do
  name=${spec%%:*}; dot=${spec#*:}
  L_CALL=$(grep -nE "^persist_or_reuse_secret[[:space:]]+$name[[:space:]]+\"\\\$PROFILE_DIR/$dot\"" "$P" | head -1 | cut -d: -f1)
  [ -n "$L_CALL" ] && [ -n "$L_TOKEN" ] && [ -n "$L_ENV" ] && [ "$L_CALL" -gt "$L_TOKEN" ] && [ "$L_CALL" -lt "$L_ENV" ] \
    && pass "setup-profile.sh: persist_or_reuse_secret $name → \$PROFILE_DIR/$dot, after the token block and before profile.env" \
    || fail "setup-profile.sh: persist_or_reuse_secret $name call missing or mis-ordered (call=$L_CALL token=$L_TOKEN env=$L_ENV)"
done
# PROFILE_INTERNAL_TOKEN write-through (0215 residual 1): the env branch also persists the value.
TOKEN_ENV_BRANCH=$(awk '/^if \[ -n "\$\{PROFILE_INTERNAL_TOKEN:-\}" \]; then/{b=1; next} b && /^elif/{exit} b{print}' "$P")
printf '%s\n' "$TOKEN_ENV_BRANCH" | grep -q '> "\$PROFILE_TOKEN_FILE"' \
  && pass "setup-profile.sh: an env-supplied PROFILE_INTERNAL_TOKEN is written through to .internal_token" \
  || fail "setup-profile.sh: env-supplied PROFILE_INTERNAL_TOKEN is NOT written through (a stale persisted token can be re-adopted by a later blank deploy)"
# profile.env still carries the four keys in column-0 KEY=${KEY:-} form (the parity checker's hop-2 parse).
ENV_BLOCK=$(awk '/cat > "\$PROFILE_DIR\/profile.env" << EOF/{b=1; next} b && /^EOF$/{exit} b{print}' "$P")
for spec in $PERSIST_SPECS; do
  name=${spec%%:*}
  printf '%s\n' "$ENV_BLOCK" | grep -qxF "$name=\${$name:-}" \
    && pass "profile.env heredoc: $name=\${$name:-} at column 0" || fail "profile.env heredoc: $name line missing or reshaped"
done
# The value report: header after 'Written: profile.env', before the stack starts; the function is called; no exit inside it.
L_WRITTEN=$(grep -n 'echo "Written: profile.env (0600)"' "$P" | head -1 | cut -d: -f1)
L_REPORT=$(grep -n 'print_header "CONFIG VALUE PARITY (report-only)"' "$P" | head -1 | cut -d: -f1)
L_CALLREPORT=$(grep -nE '^report_config_values$' "$P" | head -1 | cut -d: -f1)
L_START=$(grep -n 'print_header "STARTING PROFILE STACK"' "$P" | head -1 | cut -d: -f1)
[ -n "$L_WRITTEN" ] && [ -n "$L_REPORT" ] && [ -n "$L_CALLREPORT" ] && [ -n "$L_START" ] \
  && [ "$L_WRITTEN" -lt "$L_REPORT" ] && [ "$L_REPORT" -lt "$L_CALLREPORT" ] && [ "$L_CALLREPORT" -lt "$L_START" ] \
  && pass "setup-profile.sh: value report sits after profile.env is written and before the stack starts" \
  || fail "setup-profile.sh: value report missing or mis-ordered (written=$L_WRITTEN header=$L_REPORT call=$L_CALLREPORT start=$L_START)"
REPORT_BODY=$(awk '/^report_config_values\(\) \{/,/^\}/' "$P")
[ -n "$REPORT_BODY" ] && ! printf '%s\n' "$REPORT_BODY" | grep -v '^[[:space:]]*#' | grep -qE '(^|[^A-Za-z_])exit([^A-Za-z_]|$)' \
  && pass "setup-profile.sh: no exit inside report_config_values() (report-only by construction)" \
  || fail "setup-profile.sh: report_config_values() is missing or contains an exit — that would fail a deploy"
echo
[ "$FAILED" -eq 0 ] && { echo "ALL PASS"; exit 0; } || { echo "SOME FAILED"; exit 1; }
