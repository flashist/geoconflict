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
# Portable like the sshpass stub above: GNU `stat -f` is "file-system status" and prints multi-line
# output to stdout before failing, so branch on the exit status with stdout discarded (review R1).
mode_of() { if stat -f '%Lp' "$1" >/dev/null 2>&1; then stat -f '%Lp' "$1"; else stat -c '%a' "$1"; fi; }
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
    # The persist path (a random mktemp suffix, digits included on Linux) is part of the expected
    # line, never of the assertion — strip it literally before the LENGTH grep (review R6).
    out12="$(cat "$PDIR/out1.txt" "$PDIR/out2.txt")"; out12="${out12//"$file"/}"
    if printf '%s\n' "$out12" | grep -qE "(^|[^0-9])${#val}([^0-9]|$)"; then fail "$name: the value's LENGTH (${#val}) appears in deploy output"; \
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
  # An UNREADABLE persist file — a directory at its path: passes -s, cat fails, works as root too —
  # must ABORT the deploy (fail closed, as the token block's $(cat) does under set -e), never fall
  # through to an empty value with a 'Reusing persisted' claim (review R2). Subshell: it exits.
  mkdir "$PDIR/.feedback_telegram_chat_id"; : > "$PDIR/.feedback_telegram_chat_id/entry"
  unset FEEDBACK_TELEGRAM_CHAT_ID
  ( persist_or_reuse_secret FEEDBACK_TELEGRAM_CHAT_ID "$PDIR/.feedback_telegram_chat_id" ) > "$PDIR/out.txt" 2>&1; rc=$?
  [ "$rc" -ne 0 ] && pass "unreadable: an unreadable persist file ABORTS the deploy (rc=$rc) — never an empty value" \
    || fail "unreadable: rc 0 on an unreadable persist file — fell through to an empty value (the silent-blank shape)"
  grep -q 'Error: FEEDBACK_TELEGRAM_CHAT_ID: persist file' "$PDIR/out.txt" && grep -qF "$PDIR/.feedback_telegram_chat_id" "$PDIR/out.txt" \
    && pass "unreadable: the error names the variable and the file" || fail "unreadable: error line missing: $(head -2 "$PDIR/out.txt")"
  grep -q 'Reusing persisted' "$PDIR/out.txt" && fail "unreadable: claimed 'Reusing persisted' on a read failure" \
    || pass "unreadable: no 'Reusing persisted' claim on a read failure"
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
  # (vi) tightened rules (review R3–R5): trailing junk after a URL, userinfo hiding an IP literal,
  #      and a PROFILE_DOMAIN with a port or whitespace → each fires; exit still 0.
  clean_config
  TELEGRAM_PROXY_URL='http://proxy.example.invalid bad'
  PROFILE_CHECKS_PING_URL='https://ping.example.invalid bad'
  PROFILE_BACKUP_S3_ENDPOINT='https://user:pw@203.0.113.13/'
  PROFILE_DOMAIN='api.example.invalid:443'
  report_config_values > "$RDIR/bad3.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "bad3: report_config_values STILL returned 0" || fail "bad3: returned $rc"
  grep -q 'FINDING.*TELEGRAM_PROXY_URL' "$RDIR/bad3.txt" && pass "bad3: trailing junk after TELEGRAM_PROXY_URL → finding (URL regex is anchored)" \
    || fail "bad3: 'http://host bad' passed as a URL — url_re is not end-anchored"
  grep -q 'FINDING.*PROFILE_CHECKS_PING_URL' "$RDIR/bad3.txt" && pass "bad3: trailing junk after PROFILE_CHECKS_PING_URL → finding (https regex is anchored)" \
    || fail "bad3: 'https://host bad' passed as a URL — https_re is not end-anchored"
  grep -q 'FINDING.*PROFILE_BACKUP_S3_ENDPOINT.*IP literal' "$RDIR/bad3.txt" && pass "bad3: userinfo@IP-literal S3 endpoint → IP-literal finding (userinfo stripped)" \
    || fail "bad3: 'https://user:pw@203.0.113.13/' passed — host extraction keeps the userinfo"
  grep -q 'FINDING.*PROFILE_DOMAIN' "$RDIR/bad3.txt" && pass "bad3: PROFILE_DOMAIN with a port → finding (bare-hostname charset)" \
    || fail "bad3: 'host:443' passed as a bare hostname"
  grep -q '^Value parity: 4 finding(s),' "$RDIR/bad3.txt" && pass "bad3: summary counts exactly 4 findings" \
    || fail "bad3: summary line wrong: $(grep 'Value parity' "$RDIR/bad3.txt")"
  clean_config
  PROFILE_DOMAIN='bad host'
  PROFILE_CHECKS_PING_URL='https://user@203.0.113.12/x'
  report_config_values > "$RDIR/bad4.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "bad4: report_config_values STILL returned 0" || fail "bad4: returned $rc"
  grep -q 'FINDING.*PROFILE_DOMAIN' "$RDIR/bad4.txt" && pass "bad4: PROFILE_DOMAIN with whitespace → finding" || fail "bad4: 'bad host' passed as a bare hostname"
  grep -q 'FINDING.*PROFILE_CHECKS_PING_URL.*IP literal' "$RDIR/bad4.txt" && pass "bad4: userinfo@IP-literal ping URL → IP-literal finding" \
    || fail "bad4: 'https://user@203.0.113.12/x' passed — host extraction keeps the userinfo"
  grep -q '^Value parity: 2 finding(s),' "$RDIR/bad4.txt" && pass "bad4: summary counts exactly 2 findings" \
    || fail "bad4: summary line wrong: $(grep 'Value parity' "$RDIR/bad4.txt")"
  # (iii) canary: a synthetic secret in EVERY checked variable never appears in any report output.
  for v in '0220-F@ke tg "token"$notreal' '0220-F@ke chat "id"$notreal' '0220-F@ke yp "key"$notreal' '0220-F@ke internal "tok"$notreal' \
           'https://ping.example.invalid/0220-fake' 'http://ping.example.invalid/0220-fake' 'http://proxy.example.invalid:3128' \
           'http://203.0.113.10' 'http://203.0.113.11' 'https://s3.example.invalid' \
           'http://proxy.example.invalid bad' 'https://ping.example.invalid bad' 'https://user:pw@203.0.113.13/' \
           'api.example.invalid:443' 'bad host' 'https://user@203.0.113.12/x'; do
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

# ── Structural: OS baseline hardening, restart policy, SIGTERM shape (task 0221) ──
# Same character as the 0219/0220 blocks: LINTS, awk-scoped to the heredoc or section they
# assert on, VALUES not presence, false-RED-never-false-green. Seen RED first against the
# pre-0221 scripts (negative control, recorded in the task worklog). The behaviour itself —
# a ban observed, password auth refused from a NEW session, both containers back after a
# daemon restart, a clean SIGTERM drain in the logs — is provable only on the box (0221 Part B).
echo "== Structural: OS baseline hardening + restart policy + SIGTERM shape (0221) =="
P="$REPO_ROOT/setup-profile.sh"
B="$REPO_ROOT/build-deploy-profile.sh"
D="$REPO_ROOT/Dockerfile.profile"
C="$REPO_ROOT/profile-checks.sh"
# G7 — restart policy, inside the compose heredoc only. unless-stopped on EVERY service, and
# on-failure (the daemon-restart hole) nowhere. n_services comes from the 0219 block above.
COMPOSE_BLOCK=$(awk '/cat > "\$PROFILE_DIR\/docker-compose.yml" << EOF/{b=1; next} b && /^EOF$/{exit} b{print}' "$P")
n_unless=$(printf '%s\n' "$COMPOSE_BLOCK" | grep -cE '^    restart: unless-stopped$' || true)
n_onfail=$(printf '%s\n' "$COMPOSE_BLOCK" | grep -cE '^    restart: on-failure' || true)
[ "$n_services" -ge 2 ] && [ "$n_unless" = "$n_services" ] \
  && pass "compose: every service ($n_services) is restart: unless-stopped" \
  || fail "compose: restart: unless-stopped on $n_unless of $n_services service(s) — an unlisted service does not survive a daemon restart"
[ "${n_onfail:-0}" = "0" ] && pass "compose: no service is back on restart: on-failure" \
  || fail "compose: $n_onfail service(s) still restart: on-failure (G7 — dead after a Docker daemon restart)"
# G8 — init: true under profile-api (and only asserted there: the service block, not the file).
API_BLOCK=$(printf '%s\n' "$COMPOSE_BLOCK" | awk '/^  profile-api:$/{b=1; next} b && (/^  [a-z]/ || /^volumes:/){exit} b{print}')
[ -n "$API_BLOCK" ] && printf '%s\n' "$API_BLOCK" | grep -qE '^    init: true$' \
  && pass "compose: profile-api has init: true (PID 1 forwards SIGTERM to node)" \
  || fail "compose: profile-api lacks init: true — docker stop would not reach the shutdown handler"
# Dockerfile.profile: exec-form node CMD, never npm (npm swallows SIGTERM — 0221 probe), and the
# flags DUPLICATE package.json's start:profile-server on purpose: assert they are identical.
grep -qE '^CMD \["node", ' "$D" && ! grep -qE '^CMD \["npm"' "$D" \
  && pass "Dockerfile.profile: CMD is exec-form node (not npm run)" \
  || fail "Dockerfile.profile: CMD is not exec-form node — SIGTERM would never reach the handler"
if command -v node >/dev/null 2>&1; then
  ( cd "$REPO_ROOT" && node -e '
    const fs = require("fs");
    const m = fs.readFileSync(process.argv[1], "utf8").match(/^CMD (\[.*\])$/m);
    const cmd = m ? JSON.parse(m[1]).join(" ") : "";
    const script = require(process.argv[2]).scripts["start:profile-server"];
    process.exit(cmd === script ? 0 : 1);' "$D" "$REPO_ROOT/package.json" ) \
    && pass "Dockerfile.profile: CMD equals package.json start:profile-server (the deliberate duplication is in sync)" \
    || fail "Dockerfile.profile: CMD and package.json start:profile-server have drifted apart — keep them identical"
else
  fail "Dockerfile.profile: node not on PATH — cannot compare CMD with package.json (never a silent pass)"
fi
# unattended-upgrades: both apt.conf.d writes, security pocket only, NO automatic reboot (Q1).
AUTO_BLOCK=$(awk "/^cat > \/etc\/apt\/apt.conf.d\/20auto-upgrades << 'EOF'\$/{b=1; next} b && /^EOF\$/{exit} b{print}" "$P")
printf '%s\n' "$AUTO_BLOCK" | grep -qx 'APT::Periodic::Unattended-Upgrade "1";' && printf '%s\n' "$AUTO_BLOCK" | grep -qx 'APT::Periodic::Update-Package-Lists "1";' \
  && pass "setup-profile.sh: 20auto-upgrades enables list update + unattended upgrade" \
  || fail "setup-profile.sh: 20auto-upgrades heredoc missing or not enabling Unattended-Upgrade/Update-Package-Lists"
UU_BLOCK=$(awk "/^cat > \/etc\/apt\/apt.conf.d\/52geoconflict-unattended-upgrades << 'EOF'\$/{b=1; next} b && /^EOF\$/{exit} b{print}" "$P")
[ -n "$UU_BLOCK" ] && pass "setup-profile.sh: located the 52geoconflict-unattended-upgrades heredoc" \
  || fail "setup-profile.sh: no 52geoconflict-unattended-upgrades heredoc (the checks below would be vacuous)"
printf '%s\n' "$UU_BLOCK" | grep -qx 'Unattended-Upgrade::Automatic-Reboot "false";' \
  && pass "unattended-upgrades: Automatic-Reboot is \"false\" (owner ruling 0221 Q1 — one box, no unattended outage)" \
  || fail "unattended-upgrades: Automatic-Reboot is not \"false\" — a ruled value; change it DELIBERATELY with a ruling"
printf '%s\n' "$UU_BLOCK" | grep -qx '#clear Unattended-Upgrade::Allowed-Origins;' \
  && printf '%s\n' "$UU_BLOCK" | grep -qxF '    "${distro_id}:${distro_codename}-security";' \
  && pass "unattended-upgrades: Allowed-Origins cleared and set to the security pocket only" \
  || fail "unattended-upgrades: Allowed-Origins is not '#clear + <codename>-security' — updates pocket would auto-apply"
printf '%s\n' "$UU_BLOCK" | grep -qE '^    "\$\{distro_id\}:\$\{distro_codename\}(-updates|-proposed)?";' \
  && fail "unattended-upgrades: a non-security pocket is in Allowed-Origins" \
  || pass "unattended-upgrades: no non-security pocket in Allowed-Origins"
grep -q 'unattended-upgrades --dry-run --debug' "$P" && pass "setup-profile.sh: dry run printed into the deploy log (verification-1 evidence)" \
  || fail "setup-profile.sh: no unattended-upgrades --dry-run in the deploy log"
# R6: the dry run is captured to a file, never piped into a reader that can close early — a
# SIGPIPE mid-download would truncate the very evidence line the step prints.
grep -qE 'unattended-upgrades --dry-run --debug > "\$UU_DRYRUN_LOG" 2>&1' "$P" && ! grep -qE 'unattended-upgrades --dry-run[^|]*\|[^|]' "$P" \
  && pass "setup-profile.sh: dry run captured to a file, not piped (no SIGPIPE mid-download — R6)" \
  || fail "setup-profile.sh: unattended-upgrades --dry-run is piped, not captured — head/grep closing the pipe SIGPIPEs the dry run (R6)"
# fail2ban: the jail.d heredoc VALUES (the recorded policy, Q3) + enable + a fail-closed gate.
JAIL_BLOCK=$(awk '/^cat > \/etc\/fail2ban\/jail.d\/geoconflict-sshd.local << EOF$/{b=1; next} b && /^EOF$/{exit} b{print}' "$P")
[ -n "$JAIL_BLOCK" ] && pass "setup-profile.sh: located the fail2ban jail.d heredoc" \
  || fail "setup-profile.sh: no jail.d/geoconflict-sshd.local heredoc (the checks below would be vacuous)"
for kv in '[sshd]' 'enabled = true' 'backend = systemd' 'maxretry = 5' 'findtime = 10m' 'bantime = 1h' 'bantime.increment = true' 'bantime.maxtime = 1d' 'ignoreip = 127.0.0.1/8 ::1'; do
  printf '%s\n' "$JAIL_BLOCK" | grep -qxF "$kv" && pass "fail2ban jail: $kv" || fail "fail2ban jail: '$kv' missing or changed — a recorded policy value (0221 Q3)"
done
printf '%s\n' "$JAIL_BLOCK" | grep -qx 'port = ${SSH_PORTS_CSV}' && pass "fail2ban jail: port comes from the detected SSH ports (not hardcoded 22)" \
  || fail "fail2ban jail: port is not \${SSH_PORTS_CSV} — a non-standard SSH port would be unguarded"
F2B_SECTION=$(awk '/print_header "CONFIGURING FAIL2BAN/{b=1} /print_header "HARDENING SSHD"/{exit} b{print}' "$P")
printf '%s\n' "$F2B_SECTION" | grep -q 'systemctl enable --now fail2ban' && pass "fail2ban: enabled + started" || fail "fail2ban: no 'systemctl enable --now fail2ban'"
# The gate, tightly (R7a): the status probe must SET the flag (not be `|| true`d away), and the
# `exit 1` must sit inside the flag's own `if` block — not merely somewhere in the section.
printf '%s\n' "$F2B_SECTION" | grep -qE '^[[:space:]]*if fail2ban-client status sshd >/dev/null 2>&1; then F2B_JAIL_UP=1; break; fi$' \
  && printf '%s\n' "$F2B_SECTION" | awk '/^if \[ "\$F2B_JAIL_UP" != 1 \]; then$/{b=1; next} b && /^fi$/{exit} b && /^[[:space:]]*exit 1$/{ok=1} END{exit !ok}' \
  && pass "fail2ban: deploy gates on 'fail2ban-client status sshd' → F2B_JAIL_UP, and exits 1 inside that gate (Q6, fail closed)" \
  || fail "fail2ban: the sshd-jail gate is missing, its probe no longer sets F2B_JAIL_UP, or the exit 1 is not inside the gate's if-block"
# R5: neither systemd start is fatal on its own under set -e — the gate above must be reachable
# so its diagnostic is what the operator sees.
printf '%s\n' "$F2B_SECTION" | grep -qE '^systemctl enable --now fail2ban \|\| ' && printf '%s\n' "$F2B_SECTION" | grep -qE '^systemctl restart fail2ban \|\| ' \
  && pass "fail2ban: enable/restart are non-fatal so the jail gate (and its diagnostic) is always reached (R5)" \
  || fail "fail2ban: 'systemctl enable --now/restart fail2ban' is fatal under set -e — a failed restart aborts BEFORE the gate's diagnostic (R5)"
printf '%s\n' "$F2B_SECTION" | grep -q 'python3-systemd' && pass "fail2ban: python3-systemd installed for backend = systemd" \
  || fail "fail2ban: backend = systemd without python3-systemd — the jail would not start"
# sshd: the drop-in's values, the Match-all pin, the guard→test→reload→gate order, and placement.
SSHD_SECTION=$(awk '/print_header "HARDENING SSHD"/{b=1} /^# ── Directories/{exit} b{print}' "$P")
[ -n "$SSHD_SECTION" ] && pass "setup-profile.sh: located the HARDENING SSHD section" \
  || fail "setup-profile.sh: no HARDENING SSHD section (the checks below would be vacuous)"
grep -q '^SSHD_DROPIN=/etc/ssh/sshd_config.d/00-geoconflict-hardening.conf$' "$P" \
  && pass "sshd: drop-in path is sshd_config.d/00-… (first value wins; 00- sorts before cloud-init's 50-)" \
  || fail "sshd: drop-in is not /etc/ssh/sshd_config.d/00-geoconflict-hardening.conf — a later name loses to cloud-init"
DROPIN=$(awk "/^cat > \"\\\$SSHD_DROPIN\" << 'EOF'\$/{b=1; next} b && /^EOF\$/{exit} b{print}" "$P")
[ -n "$DROPIN" ] && pass "sshd: located the drop-in heredoc" || fail "sshd: no drop-in heredoc (the checks below would be vacuous)"
for kv in 'PasswordAuthentication no' 'KbdInteractiveAuthentication no' 'PermitEmptyPasswords no' 'PubkeyAuthentication yes' 'PermitRootLogin prohibit-password' 'X11Forwarding no'; do
  printf '%s\n' "$DROPIN" | grep -qx "$kv" && pass "sshd drop-in: $kv" || fail "sshd drop-in: '$kv' missing or changed (0221 Q2)"
done
printf '%s\n' "$DROPIN" | grep -qx 'PermitRootLogin no' \
  && fail "sshd drop-in: PermitRootLogin no — root is still the deploy user until the non-root user task lands (Q8 split)" \
  || pass "sshd drop-in: PermitRootLogin is not 'no' (root stays the deploy user — Q8 split)"
printf '%s\n' "$DROPIN" | grep -qiE '^(Ciphers|KexAlgorithms|MACs) ' \
  && fail "sshd drop-in: a custom cipher/KEX/MAC list — a lock-out vector; distro defaults were ruled (Q2)" \
  || pass "sshd drop-in: ciphers/KEX/MACs left at distro defaults"
# The Match-all pin: a `Match all` block re-stating the auth keywords, AFTER the globals (so the
# globals are not swallowed into it), because a lower-precedence Match block overrides globals.
printf '%s\n' "$DROPIN" | awk '/^Match all$/{m=NR} m && /^[[:space:]]+PasswordAuthentication no$/{p=1} m && /^[[:space:]]+PermitRootLogin prohibit-password$/{r=1} /^PasswordAuthentication no$/{g=NR} END{exit !(m && p && r && g && g<m)}' \
  && pass "sshd drop-in: 'Match all' block pins PasswordAuthentication no + PermitRootLogin prohibit-password after the globals" \
  || fail "sshd drop-in: no 'Match all' pin — a Match block in another file (cloud image 99-qemu.conf) would re-open root password auth"
# Order inside the section, on the CALL sites (the helper definitions sit above them):
# auth-mode guard (R1) < authorized_keys guard < backup of an existing drop-in (R3) < the write
# < sshd -t < reload < sshd -T -C gate.
printf '%s\n' "$SSHD_SECTION" | awk '
  /^if \[ "\$\{PROFILE_DEPLOY_SSH_AUTH:-\}" = "password" \]; then$/ && !a {a=NR}
  /authorized_keys/ && !g {g=NR}
  /^    cp -p "\$SSHD_DROPIN" "\$SSHD_DROPIN_BACKUP"$/ && !k {k=NR}
  /^cat > "\$SSHD_DROPIN" << .EOF.$/ && !w {w=NR}
  /^if ! sshd -t; then$/ && !t {t=NR}
  /^if ! sshd_reload; then$/ && !r {r=NR}
  /sshd -T -C user=root/ && !e {e=NR}
  END{exit !(a && g && k && w && t && r && e && a<g && g<k && k<w && w<t && t<r && r<e)}' \
  && pass "sshd: order is auth-mode guard < authorized_keys guard < backup < write < sshd -t < reload < effective-config gate" \
  || fail "sshd: auth-mode guard / authorized_keys guard / backup / write / sshd -t / reload / gate missing or mis-ordered"
printf '%s\n' "$SSHD_SECTION" | grep -q 'systemctl restart ssh' \
  && fail "sshd: 'systemctl restart ssh' — a restart can drop the deploy's own session; reload only" \
  || pass "sshd: reload only, never restart"
# R3: rollback RESTORES a previous drop-in (or removes the new one when there was none) — and every
# failure path goes through it. The backup lives OUTSIDE sshd_config.d/ so it is never Included.
grep -qE '^SSHD_DROPIN_BACKUP=/etc/ssh/[^/]+$' "$P" && ! grep -qE '^SSHD_DROPIN_BACKUP=/etc/ssh/sshd_config\.d/' "$P" \
  && pass "sshd: the drop-in backup path is outside sshd_config.d/ (a backup there would be Included as config)" \
  || fail "sshd: SSHD_DROPIN_BACKUP missing or inside sshd_config.d/ (R3)"
ROLLBACK_FN=$(printf '%s\n' "$SSHD_SECTION" | awk '/^sshd_rollback\(\) \{/{b=1} b{print} b && /^\}$/{exit}')
printf '%s\n' "$ROLLBACK_FN" | grep -qE '^        mv -f "\$SSHD_DROPIN_BACKUP" "\$SSHD_DROPIN"$' \
  && printf '%s\n' "$ROLLBACK_FN" | grep -qE '^        rm -f "\$SSHD_DROPIN"$' \
  && printf '%s\n' "$ROLLBACK_FN" | grep -qE '^    if \[ -f "\$SSHD_DROPIN_BACKUP" \]; then$' \
  && pass "sshd: sshd_rollback() moves the backup back when one exists, removes the new drop-in otherwise (R3)" \
  || fail "sshd: sshd_rollback() missing, or it does not restore-else-remove (R3)"
n_rm=$(printf '%s\n' "$SSHD_SECTION" | grep -cE '^[[:space:]]*rm -f "\$SSHD_DROPIN"$' || true)
[ "${n_rm:-0}" = "1" ] && pass "sshd: the only 'rm -f \$SSHD_DROPIN' is inside sshd_rollback (no failure path deletes a previous drop-in)" \
  || fail "sshd: $n_rm bare 'rm -f \$SSHD_DROPIN' lines in the section, expected exactly 1 (inside sshd_rollback) — a failure path still DELETES instead of restoring (R3)"
printf '%s\n' "$SSHD_SECTION" | awk '/^if ! sshd -t; then$/{t=NR} t && NR==t+1 && /^    sshd_rollback$/{ok=1} END{exit !ok}' \
  && pass "sshd: a rejected drop-in (sshd -t) is rolled back on the spot (never blocks the next sshd start)" \
  || fail "sshd: sshd -t failure does not roll the drop-in back — the next sshd start could be blocked"
# R4: a failed reload shows its stderr, rolls back, re-reloads, then aborts — the drop-in never
# outlives a deploy the gate never judged. No `2>/dev/null` may hide the reload error.
printf '%s\n' "$SSHD_SECTION" | awk '/^if ! sshd_reload; then$/{b=1; n=0; next} b{n++} b && n==1 && /^    sshd_rollback$/{rb=1} b && n==2 && /^    sshd_reload \|\| true$/{rl=1} b && /^    exit 1$/{ex=1} b && /^fi$/{exit} END{exit !(rb && rl && ex)}' \
  && pass "sshd: reload failure → rollback, re-reload, abort (R4)" \
  || fail "sshd: a failed reload does not roll back before aborting (R4)"
printf '%s\n' "$SSHD_SECTION" | grep -q 'systemctl reload ssh 2>/dev/null' \
  && fail "sshd: 'systemctl reload ssh 2>/dev/null' hides the real reload error (R4)" \
  || pass "sshd: the reload's stderr is not hidden (R4)"
# R7b: the effective-config gate's failure path rolls back (not deletes), reloads, then aborts —
# scoped to the gate's own if-block.
printf '%s\n' "$SSHD_SECTION" | awk '/^if \[ "\$SSHD_GATE_FAILED" != 0 \]; then$/{b=1; n=0; next} b{n++} b && n==1 && /^    sshd_rollback$/{rb=1} b && n==2 && /^    sshd_reload \|\| true$/{rl=1} b && /^    exit 1$/{ex=1} b && /^fi$/{exit} END{exit !(rb && rl && ex)}' \
  && pass "sshd: gate failure → rollback, reload, exit 1 inside the gate's if-block (R7b)" \
  || fail "sshd: the effective-config gate's failure path does not rollback→reload→exit 1 (R7b)"
printf '%s\n' "$SSHD_SECTION" | awk '/^if \[ "\$SSHD_GATE_FAILED" != 0 \]; then$/{g=NR} /^rm -f "\$SSHD_DROPIN_BACKUP"$/ && g && NR>g {ok=1} END{exit !ok}' \
  && pass "sshd: the backup is discarded only after the gate passes (R3)" \
  || fail "sshd: no 'rm -f \$SSHD_DROPIN_BACKUP' after the gate — a stale backup would be restored by a later failure (R3)"
# Placement: after `ufw --force enable`, before Directories and before the systemd section.
awk '/^ufw --force enable$/{u=NR} /print_header "HARDENING SSHD"/{s=NR} /^# ── Directories/{d=NR} /print_header "CONFIGURING SYSTEMD AUTO-START"/{y=NR} END{exit !(u && s && d && y && u<s && s<d && d<y)}' "$P" \
  && pass "setup-profile.sh: hardening sections sit after ufw enable and before Directories/systemd" \
  || fail "setup-profile.sh: hardening sections mis-placed vs ufw / Directories / systemd"
# The flock < apt anchor the 0219 block asserts must still hold (nothing inserted before it).
awk '/flock -n 9/{f=NR} /apt-get install -y unattended-upgrades/{u=NR} END{exit !(f>0 && f<u)}' "$P" \
  && pass "setup-profile.sh: unattended-upgrades install is under the deploy lock" || fail "setup-profile.sh: unattended-upgrades install precedes the flock"
# build-deploy-profile.sh: IdentitiesOnly on BOTH ssh and scp in the key branch (self-ban guard, Q7).
KEY_BRANCH=$(awk '/^if \[ -n "\$SSH_KEY_PATH" \]; then$/{b=1; next} b && /^elif/{exit} b{print}' "$B")
n_ido=$(printf '%s\n' "$KEY_BRANCH" | grep -c 'IdentitiesOnly=yes' || true)
[ "${n_ido:-0}" = "2" ] && pass "build-deploy-profile.sh: -o IdentitiesOnly=yes on both SCP_CMD and SSH_CMD in the key branch" \
  || fail "build-deploy-profile.sh: IdentitiesOnly=yes appears $n_ido time(s) in the key branch, expected 2 (a multi-key agent can self-ban)"
# checks.sh (0219's script, one added check per the Q1 ruling): reads the reboot-required marker.
grep -q 'REBOOT_REQUIRED_FILE="${PROFILE_CHECKS_REBOOT_REQUIRED_FILE:-/var/run/reboot-required}"' "$C" \
  && grep -q '^check_reboot_required$' "$C" \
  && pass "profile-checks.sh: reboot-required check present and wired (the only signal with auto-reboot off)" \
  || fail "profile-checks.sh: no reboot-required check — with Automatic-Reboot off nothing would surface a pending reboot"

echo "== T12: the deploy stages its own SSH auth mode, and the sshd section refuses a password-mode deploy (0221 R1) =="
# Behavioural, T10-style: the REAL build-deploy-profile.sh is driven in both auth modes and the
# staged file is asserted; then the sshd section's guard 0 (extracted up to guard 1, so the
# harness host's /root/.ssh is never consulted) is RUN with each staged value.
NEW; echo profile > "$WORK/marker"
run_deploy                                     # fixture = password fallback
[ "$RC" -eq 0 ] && pass "password-mode deploy exited 0 (stubbed box)" || fail "password-mode deploy exited $RC; see $WORK/out.log"
n=$(grep -c '^export PROFILE_DEPLOY_SSH_AUTH=' "$WORK/staged.env" 2>/dev/null || true); n=${n:-0}
got=$( . "$WORK/staged.env" >/dev/null 2>&1; printf '%s' "${PROFILE_DEPLOY_SSH_AUTH-}" )
[ "$n" = "1" ] && [ "$got" = "password" ] && pass "staged env carries PROFILE_DEPLOY_SSH_AUTH=password exactly once on the sshpass path" \
  || fail "staged env: expected one PROFILE_DEPLOY_SSH_AUTH=password line, got n=$n value='$got'"
NEW; echo profile > "$WORK/marker"; : > "$WORK/deploy_key"
run_deploy PROFILE_SSH_KEY="$WORK/deploy_key" PROFILE_SSH_PASSWORD=
[ "$RC" -eq 0 ] && pass "key-mode deploy exited 0 (stubbed box)" || fail "key-mode deploy exited $RC; see $WORK/out.log"
got=$( . "$WORK/staged.env" >/dev/null 2>&1; printf '%s' "${PROFILE_DEPLOY_SSH_AUTH-}" )
[ "$got" = "key" ] && pass "staged env carries PROFILE_DEPLOY_SSH_AUTH=key on the key path" \
  || fail "staged env: expected PROFILE_DEPLOY_SSH_AUTH=key, got '$got'"
grep -q 'IdentitiesOnly=yes' "$WORK/ssh.argv" 2>/dev/null && pass "key-mode ssh argv carries IdentitiesOnly=yes (Q7, driven not grepped)" \
  || fail "key-mode ssh argv lacks IdentitiesOnly=yes"
GUARD0=$(awk '/^print_header "HARDENING SSHD"$/{b=1; next} /^# Guard 1:/{exit} b{print}' "$P")
[ -n "$GUARD0" ] && printf '%s\n' "$GUARD0" | grep -q 'PROFILE_DEPLOY_SSH_AUTH' \
  && pass "sshd: guard 0 (auth mode) sits FIRST in the section, before the authorized_keys guard" \
  || fail "sshd: no auth-mode guard before '# Guard 1:' — extraction empty or guard missing (R1)"
{ echo 'set -e'; echo 'print_header() { :; }'; printf '%s\n' "$GUARD0"; } > "$WORK/guard0.sh"
if PROFILE_DEPLOY_SSH_AUTH=password bash "$WORK/guard0.sh" > "$WORK/guard0.password.log" 2>&1; then
  fail "sshd guard 0: a password-mode staged env did NOT make the section refuse (R1 — lock-out path open)"
else
  grep -q 'PASSWORD fallback' "$WORK/guard0.password.log" && grep -q 'Refusing to disable password authentication' "$WORK/guard0.password.log" \
    && pass "sshd guard 0: password-mode staged env → refuses with a clear message (R1)" \
    || fail "sshd guard 0: refused, but without the expected message; see $WORK/guard0.password.log"
fi
PROFILE_DEPLOY_SSH_AUTH=key bash "$WORK/guard0.sh" > "$WORK/guard0.key.log" 2>&1 \
  && pass "sshd guard 0: key-mode staged env passes through to the next guard" \
  || fail "sshd guard 0: key-mode staged env was refused; see $WORK/guard0.key.log"

# ── Structural: telemetry box certbot renewal shape (task 0257) ──────────────
# Mirror of the profile-box certbot block above, over setup-telemetry.sh. The seed cron there was
# `certbot renew --post-hook "systemctl reload nginx"`: the cert is issued --standalone (binds :80
# for HTTP-01) but nginx permanently owns :80, so that renew could never succeed and the cert
# expired 2026-09-04. Owner ruling 2026-09-14: converge on the profile box's pre/post hooks (not
# --webroot) and disable the hookless certbot.timer the same way. RED against the pre-0257 script
# (negative control, recorded in the task worklog).
echo "== Structural: telemetry certbot renewal — hooked cron + certbot.timer disabled (0257) =="
TS="$REPO_ROOT/setup-telemetry.sh"
grep -qE '^0 0,12 \* \* \* root certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx" >> /var/log/certbot-renew\.log 2>&1$' "$TS" \
  && pass "setup-telemetry.sh: renew cron carries the nginx stop pre-hook + start post-hook and keeps the renew log" \
  || fail "setup-telemetry.sh: hooked renew cron line missing (pre-hook stop / post-hook start / >> /var/log/certbot-renew.log)"
grep -v '^[[:space:]]*#' "$TS" | grep -q -- '--post-hook "systemctl reload nginx"' \
  && fail "setup-telemetry.sh: reload-only post-hook still present — that renew can never bind :80 behind nginx" \
  || pass "setup-telemetry.sh: no reload-only post-hook left (outside comments)"
grep -qE '^\s*systemctl disable --now certbot\.timer .*\|\| true$' "$TS" \
  && pass "setup-telemetry.sh: certbot.timer disabled (|| true-safe)" \
  || fail "setup-telemetry.sh: 'systemctl disable --now certbot.timer … || true' missing"
TL_CERTONLY=$(grep -n 'certbot certonly --standalone' "$TS" | head -1 | cut -d: -f1)
TL_TIMER=$(grep -n 'systemctl disable --now certbot.timer' "$TS" | head -1 | cut -d: -f1)
TL_RENEWCRON=$(grep -n '^0 0,12 \* \* \* root certbot renew' "$TS" | head -1 | cut -d: -f1)
[ -n "$TL_CERTONLY" ] && [ -n "$TL_TIMER" ] && [ -n "$TL_RENEWCRON" ] \
  && [ "$TL_CERTONLY" -lt "$TL_TIMER" ] && [ "$TL_TIMER" -lt "$TL_RENEWCRON" ] \
  && pass "setup-telemetry.sh: certbot.timer disable sits after certonly and before the hooked renew cron" \
  || fail "setup-telemetry.sh: certbot.timer disable mis-ordered (certonly=$TL_CERTONLY timer=$TL_TIMER cron=$TL_RENEWCRON)"
echo
[ "$FAILED" -eq 0 ] && { echo "ALL PASS"; exit 0; } || { echo "SOME FAILED"; exit 1; }
