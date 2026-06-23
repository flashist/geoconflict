#!/bin/bash
# profile-deploy-hardening.test.sh — verifies T4g (s4-profile-04g) acceptance criteria for
# build-deploy-profile.sh: argv-safety (sshpass -f), the 0600 password file lifecycle, the
# mkdir mutex + atomic single-block deploy record, and the wrong-host preflight.
#
# Strategy: run the REAL build-deploy-profile.sh end-to-end with a stub PATH (docker/git/
# sshpass/ssh/scp/getent), so the integrated control flow is exercised — not extracted
# snippets. One proportionate harness (postmortem RC6: no test-apparatus sprawl).
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
    : > "$RUN/Dockerfile.profile"
    printf '#!/bin/bash\nexit 0\n' > "$RUN/scripts/check-docker-secret-boundary.sh"
    chmod +x "$RUN/scripts/check-docker-secret-boundary.sh"
    rm -f "$WORK/docker.argv" "$WORK/ssh.argv" "$WORK/scp.argv" "$WORK/sshpass.argv" \
          "$WORK/sshpass.filemode" "$WORK/scp.called"
    ( cd "$RUN"
      [ "$#" -gt 0 ] && export "$@"     # extra VAR=VAL (expansion words can't be inline assignments)
      export PATH="$BIN:$PATH" HOME="$WORK/home" \
        DOCKER_USERNAME=acme DOCKER_REPO=profile DOCKER_TOKEN=tok \
        POSTGRES_PASSWORD="db-pass-123" \
        PROFILE_SERVER_HOST="203.0.113.10" \
        PROFILE_SSH_PASSWORD="$SECRET_PW" ALLOW_PROFILE_SSH_PASSWORD_FALLBACK=1 \
        PROFILE_DEPLOY_LOCK="$WORK/lock.d" PROFILE_DEPLOY_RECORD="$RECORD"
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

echo
[ "$FAILED" -eq 0 ] && { echo "ALL PASS"; exit 0; } || { echo "SOME FAILED"; exit 1; }
