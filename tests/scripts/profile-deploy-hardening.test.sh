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
# setup-telemetry.sh, build-deploy-telemetry.sh, setup.sh (unattended-apt ordering
# only, task 0286), and update.sh + nginx.conf for container log retention
# (task 0060). It is NOT complete coverage: deploy.sh, build.sh and build-deploy.sh
# have no assertions here at all. New structural checks belong here rather than in a
# second harness nothing runs.
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
echo "docker \$*" >> "$WORK/calls.log"
case "\$1 \$2" in
  "buildx build")
    iid=""; for a in "\$@"; do [ "\$prev" = "--iidfile" ] && iid="\$a"; prev="\$a"; done
    [ -n "\$iid" ] && printf 'sha256:%064d' 1 > "\$iid"; exit 0 ;;
  "buildx imagetools")
    # "imagetools inspect <ref>" — a fake REGISTRY (task 0355). A by-DIGEST ref (has '@')
    # always resolves. A by-TAG ref answers like the real tool (output shapes measured
    # 2026-09-30 against Docker Hub, read-only):
    #   pushed by this fixture (\$WORK/registry_pushed) → Digest 1, or 2 if imagetools_mismatch;
    #   listed in \$WORK/registry_tags (another image's name)        → Digest 3;
    #   named in \$WORK/registry_taken_on_recheck → free on its FIRST look-up, taken after;
    #   named in \$WORK/registry_unknown_on_recheck → free on its FIRST look-up, then
    #     "pull access denied …" (cannot tell) — 0355 review R6;
    #   \$WORK/registry_all_taken exists → every by-tag name not pushed here is taken (R7);
    #   \$WORK/registry_unknown exists → "pull access denied …", exit 1 (cannot tell);
    #   otherwise → "ERROR: <ref>: not found", exit 1 (the name is free).
    ref="\$4"
    case "\$ref" in
      *@*) d=1 ;;
      *)
        if grep -qxF "\$ref" "$WORK/registry_pushed" 2>/dev/null; then
          d=1; [ -f "$WORK/imagetools_mismatch" ] && d=2
        elif grep -qxF "\$ref" "$WORK/registry_tags" 2>/dev/null; then
          d=3
        elif [ -f "$WORK/registry_all_taken" ]; then
          d=3
        elif grep -qxF "\$ref" "$WORK/registry_taken_on_recheck" 2>/dev/null && [ -f "$WORK/recheck_seen" ]; then
          d=3
        else
          grep -qxF "\$ref" "$WORK/registry_taken_on_recheck" 2>/dev/null && : > "$WORK/recheck_seen"
          unknown_now=0
          if grep -qxF "\$ref" "$WORK/registry_unknown_on_recheck" 2>/dev/null; then
            [ -f "$WORK/unknown_recheck_seen" ] && unknown_now=1
            : > "$WORK/unknown_recheck_seen"
          fi
          if [ -f "$WORK/registry_unknown" ] || [ "\$unknown_now" = "1" ]; then
            echo "ERROR: pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed" >&2
          else
            echo "ERROR: docker.io/\$ref: not found" >&2
          fi
          exit 1
        fi ;;
    esac
    echo "Name:      \$ref"
    echo "MediaType: application/vnd.docker.distribution.manifest.v2+json"
    printf 'Digest:    sha256:%064d\n' "\$d"
    exit 0 ;;
esac
case "\$1" in
  info) exit 0 ;;
  login) cat > "$WORK/login.stdin"; exit 0 ;;  # token on stdin — kept (synthetic) so T39 can prove it came that way
  tag) exit 0 ;;
  push) echo "\$2" >> "$WORK/registry_pushed"; exit 0 ;;   # the fake registry now holds it
  inspect) printf '%s/%s@sha256:%064d\n' "\$DOCKER_USERNAME" "\$DOCKER_REPO" 1; exit 0 ;;
esac
exit 0
EOF

    # git stub (task 0355 widened it). Every argv is logged %q-quoted, one call per line, to
    # git.argv and to the shared calls.log (ordering). Anything it does not answer prints
    # UNSTUBBED, lands in unstubbed.log and EXITS 97 — and run_deploy fails on that log after
    # EVERY run (0355 review R4), not just the happy path: a silent success for an unknown git
    # call would let a new, untested git operation slip into any deploy path unseen.
    # Fixture knobs, all under $WORK: dirty (porcelain lines; the pathspec after "--" is
    # honoured), status_fail (git status errors), local_tags, remote_tags (raw ls-remote
    # lines), ls_remote_fail, tag_fail, push_fail, commit_unpushed, no_git_head, pkg_version
    # (also answers `git show <sha>:package.json`, task 0356).
    cat > "$BIN/git" <<EOF
#!/bin/bash
line="git \$(printf '%q ' "\$@")"
echo "\$line" >> "$WORK/git.argv"
echo "\$line" >> "$WORK/calls.log"
case "\$*" in
  "rev-parse --short HEAD"|"rev-parse HEAD")
    [ -f "$WORK/no_git_head" ] && { echo "fatal: not a git repository" >&2; exit 128; }
    [ "\$2" = "--short" ] && echo "abc1234" || echo "abc1234000000000000000000000000000000000"
    exit 0 ;;
esac
case "\$1" in
  status)
    if [ "\$2 \$3" = "--porcelain --untracked-files=normal" ]; then
      [ -f "$WORK/status_fail" ] && { echo "fatal: not a git repository" >&2; exit 128; }
      shift 3; [ "\${1:-}" = "--" ] && shift
      [ -f "$WORK/dirty" ] || exit 0
      while IFS= read -r entry; do
        path="\${entry:3}"
        if [ \$# -eq 0 ]; then echo "\$entry"; continue; fi
        for spec in "\$@"; do
          case "\$path" in "\$spec"|"\$spec"/*) echo "\$entry"; break ;; esac
        done
      done < "$WORK/dirty"
      exit 0
    fi ;;
  tag)
    if [ "\$2" = "-l" ]; then
      [ -f "$WORK/local_tags" ] || exit 0
      while IFS= read -r t; do case "\$t" in \$3) echo "\$t" ;; esac; done < "$WORK/local_tags"
      exit 0
    fi
    if [ "\$2" = "-a" ]; then
      [ -f "$WORK/tag_fail" ] && { echo "fatal: tag '\$3' already exists" >&2; exit 128; }
      grep -qxF "\$3" "$WORK/local_tags" 2>/dev/null && { echo "fatal: tag '\$3' already exists" >&2; exit 128; }
      echo "\$3" >> "$WORK/local_tags"; exit 0
    fi ;;
  show)
    # Task 0356: the telemetry deploy reads package.json AT the deployed commit
    # ("git show <sha>:package.json"), never the working tree. Answers from \$WORK/pkg_version.
    case "\$2" in
      *:package.json)
        printf '{\n  "name": "fixture",\n  "version": "%s"\n}\n' "\$(cat "$WORK/pkg_version" 2>/dev/null || echo 0.0.155)"
        exit 0 ;;
    esac ;;
  ls-remote)
    [ -f "$WORK/ls_remote_fail" ] && { echo "fatal: could not read from remote repository" >&2; exit 128; }
    [ -f "$WORK/remote_tags" ] && cat "$WORK/remote_tags"
    exit 0 ;;
  push)
    [ -f "$WORK/push_fail" ] && { echo "error: failed to push some refs" >&2; exit 1; }
    exit 0 ;;
  branch)
    if [ "\$2 \$3" = "-r --contains" ]; then
      [ -f "$WORK/commit_unpushed" ] || echo "  origin/dev"
      exit 0
    fi ;;
esac
echo "UNSTUBBED \$line"
echo "UNSTUBBED \$line" >> "$WORK/unstubbed.log"
exit 97
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
echo "ssh \$*" >> "$WORK/calls.log"
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
  # Task 0356: the telemetry deploy's staged env. scp_env_fail makes THIS upload fail, so a
  # test can prove the local 0600 staged file is still removed on that path.
  *.uptrace-deploy-env-*)
    [ -f "$WORK/scp_env_fail" ] && exit 1
    cp "\$src" "$WORK/staged.env" 2>/dev/null || true ;;
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
    # Task 0355: the version-name helper the script sources, and a package.json carrying the
    # game version it reads (read-only). HELPER_STUB=absent (a caller shell variable, like
    # PARITY_STUB) leaves the helper out; $WORK/pkg_version overrides the version.
    if [ "${HELPER_STUB:-}" != "absent" ] && [ -f "$REPO_ROOT/scripts/deploy-version-tag.sh" ]; then
        cp "$REPO_ROOT/scripts/deploy-version-tag.sh" "$RUN/scripts/deploy-version-tag.sh"
    fi
    printf '{\n  "name": "fixture",\n  "version": "%s"\n}\n' "$(cat "$WORK/pkg_version" 2>/dev/null || echo 0.0.155)" \
        > "$RUN/package.json"
    # Logs to calls.log so T20 can assert the byte scan runs BEFORE any push (task 0355).
    printf '#!/bin/bash\necho "secret-scan $*" >> "%s"\nexit 0\n' "$WORK/calls.log" > "$RUN/scripts/check-docker-secret-boundary.sh"
    chmod +x "$RUN/scripts/check-docker-secret-boundary.sh"
    # Task 0298: the config parity guard is ARMED — a missing checker stops the deploy — so
    # the fixture carries a stub checker, like the secret-boundary stub above. It records its
    # argv and exits $STUB_PARITY_RC (default 0). PARITY_STUB=absent (a shell variable of
    # the caller, never passed into the script's env) leaves it out, for T19.
    if [ "${PARITY_STUB:-}" != "absent" ]; then
        printf '%s\n' \
            'import fs from "node:fs";' \
            "fs.appendFileSync(\"$WORK/parity.argv\", process.argv.slice(2).join(\" \") + \"\\n\");" \
            "process.exit(Number(\"${STUB_PARITY_RC:-0}\"));" \
            > "$RUN/scripts/check-config-parity.mjs"
    fi
    rm -f "$WORK/docker.argv" "$WORK/ssh.argv" "$WORK/scp.argv" "$WORK/sshpass.argv" \
          "$WORK/sshpass.filemode" "$WORK/scp.called" "$WORK/staged.env" "$WORK/parity.argv" \
          "$WORK/git.argv" "$WORK/calls.log" "$WORK/unstubbed.log"
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
    # Every run, every path (0355 review R4): a git call the stub does not know is a failure
    # wherever it happens — the push-failed or tag-failed branch as much as the happy path.
    RUN_DEPLOY_COUNT=$((RUN_DEPLOY_COUNT + 1))
    if [ -s "$WORK/unstubbed.log" ]; then
        UNSTUBBED_RUNS=$((UNSTUBBED_RUNS + 1))
        fail "run_deploy made a git call the stub does not know: $(head -1 "$WORK/unstubbed.log") (see $WORK/out.log)"
    fi
}
RUN_DEPLOY_COUNT=0
UNSTUBBED_RUNS=0

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

echo "== T19: the config parity guard is ARMED — it runs first and fails closed (0298) =="
# Owner rulings 2026-09-23 (0203 R4b, R14) and 2026-09-28 (0298 plan: a missing node stops it
# too). The real checker is tested end to end in tests/scripts/ConfigParityCallSites.test.ts;
# here the REAL build-deploy-profile.sh is driven with a stub checker, so what is proven is
# the call site: it passes the armed flags, and a non-zero or missing checker stops it
# before any docker call, lock, record or transport.
NEW; echo profile > "$WORK/marker"
run_deploy
[ "$RC" -eq 0 ] && pass "stub checker exit 0 → deploy proceeds (rc=0)" || fail "deploy exited $RC with a passing checker; see $WORK/out.log"
[ "$(cat "$WORK/parity.argv" 2>/dev/null)" = "--pipeline=all --enforce --block-on=profile" ] \
  && pass "checker ran once, with --pipeline=all --enforce --block-on=profile" \
  || fail "checker argv was '$(cat "$WORK/parity.argv" 2>/dev/null)' — expected exactly one run with --pipeline=all --enforce --block-on=profile"
NEW; echo profile > "$WORK/marker"
STUB_PARITY_RC=1 run_deploy
[ "$RC" -ne 0 ] && pass "stub checker exit 1 → deploy failed closed (rc=$RC)" || fail "a failing checker did NOT stop the deploy"
grep -q 'config parity guard failed' "$WORK/out.log" && pass "…and said why" || fail "no 'config parity guard failed' message"
[ ! -f "$WORK/docker.argv" ] && pass "…before any docker call" || fail "docker ran after a failing parity guard"
[ ! -f "$WORK/scp.called" ] && [ ! -f "$RECORD" ] && [ ! -d "$WORK/lock.d" ] \
  && pass "…with no SCP, no deploy record, no lock" || fail "a blocked deploy still transported, recorded or locked"
NEW; echo profile > "$WORK/marker"
PARITY_STUB=absent run_deploy
[ "$RC" -ne 0 ] && pass "missing checker → deploy failed closed (rc=$RC)" || fail "a MISSING checker did not stop the deploy (0203 R4b)"
grep -q 'config parity guard not found' "$WORK/out.log" && pass "…and said why" || fail "no 'config parity guard not found' message"
[ ! -f "$WORK/docker.argv" ] && [ ! -f "$WORK/scp.called" ] && pass "…before any docker call or SCP" || fail "docker/SCP ran with no parity guard"
B="$REPO_ROOT/build-deploy-profile.sh"
CALL=$(grep -nE '^if ! node "\$PARITY_CHECKER" --pipeline=all --enforce --block-on=profile; then$' "$B" | head -1 | cut -d: -f1)
[ -n "$CALL" ] && pass "build-deploy-profile.sh: the call site passes --enforce --block-on=profile" \
  || fail "build-deploy-profile.sh: no 'if ! node \"\$PARITY_CHECKER\" --pipeline=all --enforce --block-on=profile; then' line"
# Any non-comment line naming the checker — by its variable (the call site spells it
# "$PARITY_CHECKER") or by its filename — must not swallow it (0298 review R1: the old
# pattern keyed on the filename alone and could never match the call line).
grep -nE '^[^#]*(PARITY_CHECKER|check-config-parity\.mjs)[^#]*(\|\| *true|--report-only)' "$B" >/dev/null \
  && fail "build-deploy-profile.sh: the parity guard is swallowed again (|| true / --report-only)" \
  || pass "build-deploy-profile.sh: no '|| true' and no --report-only on the parity guard"
FIRST_LOAD=$(grep -n '^load_env_file ' "$B" | head -1 | cut -d: -f1)
[ -n "$CALL" ] && [ -n "$FIRST_LOAD" ] && [ "$CALL" -lt "$FIRST_LOAD" ] \
  && pass "build-deploy-profile.sh: the guard runs before the first load_env_file (no secret in the shell)" \
  || fail "build-deploy-profile.sh: the parity guard is not above the first load_env_file"

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

echo "== T17: PROFILE_SESSION_SECRET reaches the staged env, %q-quoted, exactly once; blank stays blank (0271) =="
# Same T10 standard: drive the REAL script and assert what the staged file carries. Blank is a
# supported value here — it means "the box reuses its persisted key, or generates one".
SECRET_SS='0271-F@ke session "secret"$notreal with spaces'
NEW; echo profile > "$WORK/marker"
run_deploy PROFILE_SESSION_SECRET="$SECRET_SS"
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC (expected 0); see $WORK/out.log"
n=$(grep -c '^export PROFILE_SESSION_SECRET=' "$WORK/staged.env" 2>/dev/null || true); n=${n:-0}
[ "$n" = "1" ] && pass "exactly one export PROFILE_SESSION_SECRET line" \
  || fail "expected 1 export PROFILE_SESSION_SECRET line, got $n"
got=$( . "$WORK/staged.env" >/dev/null 2>&1; printf '%s' "${PROFILE_SESSION_SECRET-}" )
if [ "$got" = "$SECRET_SS" ]; then pass "session secret round-trips through sourcing (spaces/quotes/\$ intact)"; \
  else fail "staged session secret did not round-trip"; fi
if grep -rqF "$SECRET_SS" "$WORK"/*.argv 2>/dev/null; then fail "session secret LEAKED into an argv"; \
  else pass "session secret never appears in docker/ssh/scp/sshpass argv"; fi
NEW; echo profile > "$WORK/marker"
run_deploy
n=$(grep -c '^export PROFILE_SESSION_SECRET=' "$WORK/staged.env" 2>/dev/null || true); n=${n:-0}
got=$( . "$WORK/staged.env" >/dev/null 2>&1; printf '%s' "${PROFILE_SESSION_SECRET-unset}" )
[ "$n" = "1" ] && [ -z "$got" ] && pass "blank deploy stages exactly one EMPTY PROFILE_SESSION_SECRET (the box reuses or generates)" \
  || fail "blank deploy: expected one empty export line, got n=$n value-empty=$([ -z "$got" ] && echo yes || echo no)"

# ══ Task 0355: version-tagged profile deploys ════════════════════════════════
# Name = <package.json X.Y.Z, any -dev.N/-staging.N removed>-profile.<N>, e.g. 0.0.155-profile.3
# (owner ruling at the plan gate, 2026-09-30). N = 1 + the highest N across local tags,
# remote tags and the deploy record's version= lines. A deploy with uncommitted SHIPPED files
# is refused before anything is built (owner ruling, same gate). The tag is annotated, made
# only AFTER the deploy succeeds, on the captured full commit, and every tag/push failure is
# warn-only. All of it is driven through the REAL script with the stubs above.
T_SHA=abc1234000000000000000000000000000000000
last_result_line() { grep '^validation_result=' "$RECORD" 2>/dev/null | tail -1; }
no_unstubbed() { [ ! -s "$WORK/unstubbed.log" ] && pass "$1: no unstubbed git call" \
  || fail "$1: the script made a git call the stub does not know: $(head -1 "$WORK/unstubbed.log")"; }

echo "== T20: tagged deploy — name, build args, annotated tag AFTER the deploy, image tag, record (0355) =="
NEW; echo profile > "$WORK/marker"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC (expected 0); see $WORK/out.log"
grep -q -- '--build-arg PROFILE_BUILD_VERSION=0.0.155-profile.1' "$WORK/docker.argv" 2>/dev/null \
  && pass "build arg PROFILE_BUILD_VERSION=0.0.155-profile.1" || fail "no --build-arg PROFILE_BUILD_VERSION=0.0.155-profile.1 on the build"
grep -q -- "--build-arg PROFILE_BUILD_COMMIT=$T_SHA" "$WORK/docker.argv" 2>/dev/null \
  && pass "build arg PROFILE_BUILD_COMMIT=<full sha>" || fail "no --build-arg PROFILE_BUILD_COMMIT=<full 40-char sha> on the build"
TAGLINE=$(grep '^git tag -a ' "$WORK/git.argv" 2>/dev/null | head -1)
printf '%s' "$TAGLINE" | grep -qE "^git tag -a 0\.0\.155-profile\.1 -m .* $T_SHA \$" \
  && pass "annotated tag 0.0.155-profile.1 on the captured full commit" || fail "no 'git tag -a 0.0.155-profile.1 -m … $T_SHA' (got: ${TAGLINE:-none})"
printf '%s' "$TAGLINE" | grep -q 'sha256:0000' && printf '%s' "$TAGLINE" | grep -q 'package_version' \
  && pass "tag message carries the digest and package_version" || fail "tag message lacks the sha256 digest or package_version"
printf '%s' "$TAGLINE" | grep -qE '203\.0\.113\.10|acme/profile' \
  && fail "tag message carries the host or the registry repo" || pass "tag message carries no host and no registry repo"
grep -qx 'git push origin refs/tags/0.0.155-profile.1 ' "$WORK/git.argv" 2>/dev/null \
  && pass "pushed exactly refs/tags/0.0.155-profile.1" || fail "no 'git push origin refs/tags/0.0.155-profile.1'"
L_DEPLOY=$(grep -n '^ssh .*setup-profile\.sh' "$WORK/calls.log" 2>/dev/null | tail -1 | cut -d: -f1)
L_TAG=$(grep -n '^git tag -a ' "$WORK/calls.log" 2>/dev/null | head -1 | cut -d: -f1)
[ -n "$L_DEPLOY" ] && [ -n "$L_TAG" ] && [ "$L_TAG" -gt "$L_DEPLOY" ] \
  && pass "the git tag comes AFTER the deploy ssh" || fail "git tag not after the deploy ssh (deploy line ${L_DEPLOY:-none}, tag line ${L_TAG:-none})"
grep -qx 'docker tag sha256:0000000000000000000000000000000000000000000000000000000000000001 acme/profile:0.0.155-profile.1' "$WORK/docker.argv" 2>/dev/null \
  && grep -qx 'docker push acme/profile:0.0.155-profile.1' "$WORK/docker.argv" \
  && pass "image tagged + pushed as acme/profile:0.0.155-profile.1 (from the built image id)" || fail "no docker tag/push of acme/profile:0.0.155-profile.1"
grep -q 'acme/profile:profile-' "$WORK/docker.argv" 2>/dev/null \
  && fail "a profile-<commit> image tag is still used (dropped by owner ruling, 0355 review R2)" \
  || pass "no profile-<commit> image tag anywhere (owner ruling, 0355 review R2)"
# Order (0355 review R1/R2): login → registry says the name is free → build → scan → free AGAIN →
# push → deploy (ssh) → git tag. Line numbers in the shared calls.log.
L_LOGIN=$(grep -n '^docker login' "$WORK/calls.log" 2>/dev/null | head -1 | cut -d: -f1)
L_CHECK1=$(grep -n '^docker buildx imagetools inspect acme/profile:0.0.155-profile.1$' "$WORK/calls.log" 2>/dev/null | head -1 | cut -d: -f1)
L_BUILD=$(grep -n '^docker buildx build' "$WORK/calls.log" 2>/dev/null | head -1 | cut -d: -f1)
L_PUSH=$(grep -n '^docker push acme/profile:0.0.155-profile.1$' "$WORK/calls.log" 2>/dev/null | head -1 | cut -d: -f1)
L_CHECK2=$(awk -v b="${L_BUILD:-0}" -v p="${L_PUSH:-0}" 'NR>b && NR<p && $0=="docker buildx imagetools inspect acme/profile:0.0.155-profile.1"{n=NR} END{print n+0}' "$WORK/calls.log" 2>/dev/null)
[ -n "$L_LOGIN" ] && [ -n "$L_CHECK1" ] && [ -n "$L_BUILD" ] && [ "$L_LOGIN" -lt "$L_CHECK1" ] && [ "$L_CHECK1" -lt "$L_BUILD" ] \
  && pass "registry login, then the version name is checked free, BEFORE the build" \
  || fail "expected login < registry check < build (login ${L_LOGIN:-none}, check ${L_CHECK1:-none}, build ${L_BUILD:-none})"
[ -n "$L_PUSH" ] && [ "${L_CHECK2:-0}" -gt 0 ] \
  && pass "the name is checked free AGAIN between the build and the push" \
  || fail "no registry re-check between the build and the push (push ${L_PUSH:-none})"
L_SCAN=$(grep -n '^secret-scan --inspect-image ' "$WORK/calls.log" 2>/dev/null | head -1 | cut -d: -f1)
L_FIRST_PUSH=$(grep -n '^docker push ' "$WORK/calls.log" 2>/dev/null | head -1 | cut -d: -f1)
[ -n "$L_SCAN" ] && [ -n "$L_FIRST_PUSH" ] && [ "$L_BUILD" -lt "$L_SCAN" ] && [ "$L_SCAN" -lt "$L_FIRST_PUSH" ] \
  && pass "the secret byte scan runs on the built image AFTER the build and BEFORE any push" \
  || fail "expected build < secret scan < first push (build ${L_BUILD:-none}, scan ${L_SCAN:-none}, push ${L_FIRST_PUSH:-none})"
[ -n "$L_PUSH" ] && [ -n "$L_DEPLOY" ] && [ "$L_PUSH" -lt "$L_DEPLOY" ] \
  && pass "the version-named image is pushed BEFORE the deploy (the box pulls it by digest)" \
  || fail "the version image push is not before the deploy ssh (push ${L_PUSH:-none}, deploy ${L_DEPLOY:-none})"
[ "$(grep -c '^docker push ' "$WORK/docker.argv" 2>/dev/null)" = "1" ] \
  && pass "exactly one docker push per deploy (the version name) — nothing pushed after the deploy" \
  || fail "expected exactly one docker push, got: $(grep '^docker push ' "$WORK/docker.argv" 2>/dev/null | tr '\n' ';')"
grep -qx 'version=0.0.155-profile.1' "$RECORD" && grep -qx 'package_version=0.0.155' "$RECORD" \
  && pass "record has version= and package_version=" || fail "record lacks version=0.0.155-profile.1 / package_version=0.0.155"
last_result_line | grep -qE '^validation_result=ok digest=\S+ git_tag=pushed$' \
  && pass "record's last line: validation_result=ok … git_tag=pushed" || fail "record's last line is '$(last_result_line)'"
[ "$(tail -1 "$RECORD")" = "$(last_result_line)" ] && pass "the validation_result= line is still the block's LAST line" \
  || fail "something was written after validation_result= (T4's layout)"
no_unstubbed T20
grep -q 'not on any remote branch' "$WORK/out.log" && fail "warned 'not on any remote branch' for a pushed commit" \
  || pass "no unpushed-commit warning when a remote branch contains the commit"

echo "== T21: counter = 1 + max over local tags, remote tags and the record; numeric, anchored (0355) =="
NEW; echo profile > "$WORK/marker"
printf '%s\n' 0.0.155-profile.1 0.0.155-profile.2 0.0.154-profile.40 0.0.155-profile.x pre-t4-profile-backend-infra > "$WORK/local_tags"
printf '%s\trefs/tags/%s\n' \
  1111111111111111111111111111111111111111 0.0.155-profile.9 \
  2222222222222222222222222222222222222222 0.0.155-profile.10 \
  3333333333333333333333333333333333333333 '0.0.155-profile.10^{}' \
  4444444444444444444444444444444444444444 0.0.154-profile.40 \
  5555555555555555555555555555555555555555 x0.0.155-profile.50 \
  6666666666666666666666666666666666666666 0.0.1550-profile.60 > "$WORK/remote_tags"
mkdir -p "$(dirname "$RECORD")"
printf '%s\n' ---- version=0.0.155-profile.11 version=0.0.154-profile.30 'version=0.0.155-profile.70x' \
  'validation_result=failed digest=unknown git_tag=skipped:deploy-not-completed' > "$RECORD"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
grep -q -- '--build-arg PROFILE_BUILD_VERSION=0.0.155-profile.12 ' "$WORK/docker.argv" 2>/dev/null \
  && pass "next name is 0.0.155-profile.12 (.10 beats .9; other bases, junk and ^{} ignored)" \
  || fail "expected 0.0.155-profile.12, build args were: $(grep -o 'PROFILE_BUILD_VERSION=[^ ]*' "$WORK/docker.argv" 2>/dev/null)"
grep -q "^git ls-remote --tags origin refs/tags/0.0.155-profile.\\\\\\*" "$WORK/git.argv" 2>/dev/null \
  && pass "remote tags read with git ls-remote --tags origin" || fail "no 'git ls-remote --tags origin refs/tags/0.0.155-profile.*'"

echo "== T22: a -dev.N package version names the base; package.json is never written (0355) =="
NEW; echo profile > "$WORK/marker"; echo 0.0.155-dev.2 > "$WORK/pkg_version"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
grep -q -- '--build-arg PROFILE_BUILD_VERSION=0.0.155-profile.1 ' "$WORK/docker.argv" 2>/dev/null \
  && pass "0.0.155-dev.2 → 0.0.155-profile.1" || fail "0.0.155-dev.2 did not name 0.0.155-profile.1"
grep -qx 'package_version=0.0.155-dev.2' "$RECORD" && pass "record keeps the raw package_version" || fail "record lacks package_version=0.0.155-dev.2"
[ "$(cat "$RUN/package.json")" = "$(printf '{\n  "name": "fixture",\n  "version": "0.0.155-dev.2"\n}')" ] \
  && pass "package.json byte-identical afterwards" || fail "package.json was modified by the deploy"

echo "== T23: an unreadable/odd package version, or a missing helper, stops before the build (0355) =="
NEW; echo profile > "$WORK/marker"; echo 1.2 > "$WORK/pkg_version"
run_deploy
[ "$RC" -ne 0 ] && pass "version '1.2' → deploy refused (rc=$RC)" || fail "version '1.2' did not stop the deploy"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && fail "…but docker buildx ran" || pass "…before any docker buildx"
[ ! -f "$WORK/scp.called" ] && [ ! -f "$RECORD" ] && pass "…with no SCP and no record" || fail "a refused deploy transported or recorded"
grep -q 'Nothing was built' "$WORK/out.log" && pass "…and said nothing was built" || fail "no 'Nothing was built' message"
NEW; echo profile > "$WORK/marker"
HELPER_STUB=absent run_deploy
[ "$RC" -ne 0 ] && pass "missing scripts/deploy-version-tag.sh → deploy refused (rc=$RC)" || fail "a missing helper did not stop the deploy"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && fail "…but docker buildx ran" || pass "…before any docker buildx"

echo "== T24: uncommitted SHIPPED files, or no git, refuse the deploy before the build (owner ruling, 0355) =="
NEW; echo profile > "$WORK/marker"; printf ' M src/profile-server/Server.ts\n?? migrations/099_new.sql\n' > "$WORK/dirty"
run_deploy
[ "$RC" -ne 0 ] && pass "dirty src/ → deploy refused (rc=$RC)" || fail "a dirty shipped file did not stop the deploy"
grep -q 'src/profile-server/Server.ts' "$WORK/out.log" && grep -q 'migrations/099_new.sql' "$WORK/out.log" \
  && pass "…listing the dirty paths" || fail "the refusal does not list the dirty paths"
grep -qi 'commit.*redeploy\|commit, then' "$WORK/out.log" && pass "…and saying commit, then redeploy" || fail "no 'commit, then redeploy' hint"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && fail "…but docker buildx ran" || pass "…before any docker buildx"
[ ! -f "$WORK/scp.called" ] && [ ! -f "$WORK/ssh.argv" ] && pass "…no SCP and no SSH" || fail "a refused deploy reached the box"
grep -qE '^git (tag -a|push)' "$WORK/git.argv" 2>/dev/null && fail "…but it tagged or pushed" || pass "…no git tag and no git push"
[ ! -f "$RECORD" ] && pass "…and no record block" || fail "a refused deploy wrote a record block"
NEW; echo profile > "$WORK/marker"; : > "$WORK/no_git_head"
run_deploy
[ "$RC" -ne 0 ] && pass "no git (rev-parse fails) → deploy refused (rc=$RC)" || fail "a deploy with no git commit was not refused"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && fail "…but docker buildx ran" || pass "…before any docker buildx"

echo "== T25: an uncommitted change OUTSIDE the shipped files (a doc) still deploys and tags (0355) =="
NEW; echo profile > "$WORK/marker"; printf ' M ai-agents/tasks/backlog/notes.md\n?? scratch.txt\n' > "$WORK/dirty"
run_deploy
[ "$RC" -eq 0 ] && pass "doc-only change → deploy proceeds (rc=0)" || fail "a doc-only change stopped the deploy (rc=$RC); see $WORK/out.log"
last_result_line | grep -q 'git_tag=pushed$' && pass "…and it is tagged" || fail "doc-only deploy not tagged: '$(last_result_line)'"
grep -qE '^git status --porcelain --untracked-files=normal -- .*src .*migrations' "$WORK/git.argv" 2>/dev/null \
  && pass "the dirty check passes the shipped-files pathspec" || fail "git status was not scoped with a pathspec"

echo "== T26: a failed deploy does not tag, records its name, and uses up its number (0355) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/fail_deploy"
run_deploy
[ "$RC" -ne 0 ] && pass "deploy failed (rc=$RC)" || fail "fail_deploy did not fail the deploy"
grep -qE '^git (tag -a|push)' "$WORK/git.argv" 2>/dev/null && fail "a FAILED deploy was tagged or pushed" || pass "no git tag/push on a failed deploy"
grep -qx 'docker push acme/profile:0.0.155-profile.1' "$WORK/docker.argv" 2>/dev/null \
  && pass "the attempt's image is in the registry as 0.0.155-profile.1 (a registry name = built and pushed, not deployed)" \
  || fail "the attempt was not pushed as acme/profile:0.0.155-profile.1"
grep -qx 'version=0.0.155-profile.1' "$RECORD" && pass "record names the attempt 0.0.155-profile.1" || fail "record lacks version=0.0.155-profile.1"
last_result_line | grep -qE '^validation_result=failed .*git_tag=skipped:deploy-not-completed$' \
  && pass "record: validation_result=failed … git_tag=skipped:deploy-not-completed" || fail "record's last line is '$(last_result_line)'"
rm -f "$WORK/fail_deploy"
run_deploy
[ "$RC" -eq 0 ] && pass "the retry deploy exited 0" || fail "retry exited $RC; see $WORK/out.log"
grep -q -- '--build-arg PROFILE_BUILD_VERSION=0.0.155-profile.2 ' "$WORK/docker.argv" 2>/dev/null \
  && pass "the retry is 0.0.155-profile.2 (the failed attempt used up .1)" || fail "the retry did not get 0.0.155-profile.2"
grep -qx 'docker push acme/profile:0.0.155-profile.1' "$WORK/docker.argv" 2>/dev/null \
  && fail "the retry pushed over the failed attempt's registry name .1" || pass "the retry never pushed to .1 again"

echo "== T27: the tag cannot be created (already exists / git error) → warned, nothing pushed, never forced (0355) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/tag_fail"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy still exits 0" || fail "a tag failure changed the exit code ($RC)"
grep -q 'WARNING' "$WORK/out.log" && pass "…with a WARNING" || fail "no WARNING for a failed tag"
grep -q '^git push' "$WORK/git.argv" 2>/dev/null && fail "…but it pushed anyway" || pass "…and no git push"
L_D=$(grep -n '^ssh .*setup-profile\.sh' "$WORK/calls.log" 2>/dev/null | tail -1 | cut -d: -f1)
awk -v d="${L_D:-999999}" 'NR>d && /^docker (push|tag) /{f=1} END{exit !f}' "$WORK/calls.log" 2>/dev/null \
  && fail "…but a docker tag/push ran after the deploy" || pass "…and no docker tag/push after the deploy"
grep -q 'docker push' "$WORK/out.log" && fail "…but it printed a docker push retry (could overwrite another image's name — 0355 review R1)" \
  || pass "…and no docker push retry printed (0355 review R1)"
last_result_line | grep -q 'git_tag=tag-failed$' && pass "record: git_tag=tag-failed" || fail "record's last line is '$(last_result_line)'"

echo "== T28: the tag push fails → warned with the exact retry, deploy stays ok (0355) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/push_fail"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy still exits 0" || fail "a push failure changed the exit code ($RC)"
grep -q 'WARNING' "$WORK/out.log" && pass "…with a WARNING" || fail "no WARNING for a failed push"
grep -qF 'git push origin refs/tags/0.0.155-profile.1' "$WORK/out.log" && pass "…carrying the retry command" || fail "no retry command in the output"
last_result_line | grep -q 'validation_result=ok .*git_tag=push-failed$' && pass "record: ok … git_tag=push-failed" || fail "record's last line is '$(last_result_line)'"
grep -q 'docker push' "$WORK/out.log" && fail "…but it printed a docker push retry (the image is already in the registry — 0355 review R1)" \
  || pass "…and no docker push retry printed (0355 review R1)"

echo "== T29: git ls-remote fails → warned; the counter uses local tags + the record (0355) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/ls_remote_fail"; echo 0.0.155-profile.3 > "$WORK/local_tags"
mkdir -p "$(dirname "$RECORD")"; printf '%s\n' ---- version=0.0.155-profile.5 'validation_result=failed digest=unknown' > "$RECORD"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
grep -qi 'remote tags' "$WORK/out.log" && pass "warned that remote tags could not be read" || fail "no warning about the unreadable remote tags"
grep -q -- '--build-arg PROFILE_BUILD_VERSION=0.0.155-profile.6 ' "$WORK/docker.argv" 2>/dev/null \
  && pass "counter from local .3 + record .5 → .6" || fail "expected 0.0.155-profile.6"

echo "== T30: never a forced/bulk tag push; the box still deploys by digest (0355) =="
NEW; echo profile > "$WORK/marker"
run_deploy
: > "$WORK/push_fail"; cp "$WORK/git.argv" "$WORK/git.argv.1" 2>/dev/null
run_deploy
cat "$WORK/git.argv.1" "$WORK/git.argv" 2>/dev/null > "$WORK/git.argv.all"
grep -E '^git push ' "$WORK/git.argv.all" | grep -qE ' (-f|--force|--force-with-lease|--tags|--follow-tags|--mirror|--all|--delete|-d) ' \
  && fail "a git push carried a force/bulk/delete flag" || pass "no git push used -f/--force/--tags/--follow-tags/--mirror/--all/--delete"
grep -E '^git tag ' "$WORK/git.argv.all" | grep -qE ' (-f|--force|-d|--delete) ' \
  && fail "a git tag call forced or deleted" || pass "no git tag -f / -d"
grep -qE '^export PROFILE_IMAGE=acme/profile@sha256:[0-9a-f]{64}$' "$WORK/staged.env" 2>/dev/null \
  && pass "staged PROFILE_IMAGE is still the @sha256 digest" || fail "staged PROFILE_IMAGE is not the @sha256 digest"

echo "== T31: the commit is on no remote branch → warned, still tagged (0355) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/commit_unpushed"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
grep -q 'not on any remote branch' "$WORK/out.log" && pass "warned the commit is on no remote branch" || fail "no unpushed-commit warning"
last_result_line | grep -q 'git_tag=pushed$' && pass "…and still tagged" || fail "record's last line is '$(last_result_line)'"

echo "== T32: the version image tag resolves to another digest → WARNING, deploy stays ok (0355) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/imagetools_mismatch"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
grep -q 'WARNING.*0.0.155-profile.1' "$WORK/out.log" && pass "warned the version tag does not resolve to the deployed digest" \
  || fail "no WARNING when the version tag resolved to a different digest"

echo "== T33: git status itself fails → treated as dirty: the deploy is refused before the build (0355 review R5) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/status_fail"
run_deploy
[ "$RC" -ne 0 ] && pass "git status error → deploy refused (rc=$RC) — fails closed" || fail "a failing git status did not stop the deploy (fail-OPEN)"
grep -q 'git status failed' "$WORK/out.log" && pass "…saying git status failed" || fail "the refusal does not say git status failed"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && fail "…but docker buildx ran" || pass "…before any docker buildx"
[ ! -f "$WORK/scp.called" ] && [ ! -f "$WORK/ssh.argv" ] && [ ! -f "$RECORD" ] && pass "…no SCP, no SSH, no record" || fail "a refused deploy reached the box or recorded"

echo "== T34: the version name is already in the registry → skip to the next free number, never overwrite (0355 review R1/R2) =="
NEW; echo profile > "$WORK/marker"; printf '%s\n' acme/profile:0.0.155-profile.1 acme/profile:0.0.155-profile.2 > "$WORK/registry_tags"
run_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
grep -q -- '--build-arg PROFILE_BUILD_VERSION=0.0.155-profile.3 ' "$WORK/docker.argv" 2>/dev/null \
  && pass "registry holds .1 and .2 → this deploy is 0.0.155-profile.3" \
  || fail "expected 0.0.155-profile.3, build args were: $(grep -o 'PROFILE_BUILD_VERSION=[^ ]*' "$WORK/docker.argv" 2>/dev/null)"
grep -qE '^docker (tag|push) .*acme/profile:0\.0\.155-profile\.[12]$' "$WORK/docker.argv" 2>/dev/null \
  && fail "a docker tag/push targeted a name the registry already held" || pass "never tagged or pushed .1 or .2 (another image's names)"
grep -qx 'docker push acme/profile:0.0.155-profile.3' "$WORK/docker.argv" 2>/dev/null && pass "pushed as .3" || fail "not pushed as acme/profile:0.0.155-profile.3"
grep -qx 'git push origin refs/tags/0.0.155-profile.3 ' "$WORK/git.argv" 2>/dev/null && pass "git tag .3 after the deploy" || fail "no git push of refs/tags/0.0.155-profile.3"
grep -q 'already in the registry' "$WORK/out.log" && pass "said why it skipped" || fail "no note about skipping a registry-held name"

echo "== T35: the name is taken while the image builds → stop before the push, push nothing (0355 review R1/R2) =="
NEW; echo profile > "$WORK/marker"; echo acme/profile:0.0.155-profile.1 > "$WORK/registry_taken_on_recheck"
run_deploy
[ "$RC" -ne 0 ] && pass "name taken at push time → deploy stopped (rc=$RC)" || fail "a name taken at push time did not stop the deploy"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && pass "…after the build (the first check said free)" || fail "the build never ran — the test did not reach the push-time check"
grep -q '^docker push' "$WORK/docker.argv" 2>/dev/null && fail "…but it pushed (overwrote another image's name)" || pass "…and pushed nothing"
[ ! -f "$WORK/scp.called" ] && [ ! -f "$WORK/ssh.argv" ] && [ ! -f "$RECORD" ] && pass "…no SCP, no SSH, no record" || fail "a stopped deploy reached the box or recorded"
grep -q 'overwrite' "$WORK/out.log" && pass "…saying it refuses to overwrite" || fail "no refuse-to-overwrite message"
rm -f "$WORK/registry_taken_on_recheck"; echo acme/profile:0.0.155-profile.1 > "$WORK/registry_tags"
run_deploy
grep -q -- '--build-arg PROFILE_BUILD_VERSION=0.0.155-profile.2 ' "$WORK/docker.argv" 2>/dev/null \
  && pass "a re-run skips the taken name and deploys as .2" || fail "the re-run did not move on to 0.0.155-profile.2"

echo "== T36: the registry cannot be read → stop before the build (never guess a name is free) (0355 review R1/R2) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/registry_unknown"
run_deploy
[ "$RC" -ne 0 ] && pass "unreadable registry → deploy refused (rc=$RC)" || fail "an unreadable registry did not stop the deploy"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && fail "…but docker buildx ran" || pass "…before any docker buildx"
grep -q '^docker push' "$WORK/docker.argv" 2>/dev/null && fail "…but it pushed" || pass "…and pushed nothing"
grep -q 'Nothing was built' "$WORK/out.log" && pass "…and said nothing was built" || fail "no 'Nothing was built' message"
grep -q 'insufficient_scope' "$WORK/out.log" && pass "…showing the registry's own error" || fail "the registry's error was not shown"

echo "== T37: the registry cannot be read at the push-time re-check → stop, push nothing (0355 review R6) =="
NEW; echo profile > "$WORK/marker"; echo acme/profile:0.0.155-profile.1 > "$WORK/registry_unknown_on_recheck"
run_deploy
[ "$RC" -ne 0 ] && pass "unreadable registry at the re-check → deploy stopped (rc=$RC)" || fail "an unreadable registry at the re-check did not stop the deploy (fail-OPEN)"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && pass "…after the build (the first look-up said free)" || fail "the build never ran — the test did not reach the push-time re-check"
grep -qE '^docker (tag|push) ' "$WORK/docker.argv" 2>/dev/null && fail "…but it tagged/pushed a name the registry could not confirm free" || pass "…no docker tag and no docker push"
[ ! -f "$WORK/scp.called" ] && [ ! -f "$WORK/ssh.argv" ] && [ ! -f "$RECORD" ] && pass "…no SCP, no SSH, no record" || fail "a stopped deploy reached the box or recorded"
grep -q 'cannot read the registry to confirm .* is still free' "$WORK/out.log" && pass "…saying it cannot confirm the name is still free" || fail "no 'cannot read the registry … still free' message"
grep -q 'insufficient_scope' "$WORK/out.log" && pass "…showing the registry's own error" || fail "the registry's error was not shown"

echo "== T38: 20 names in a row are held → stop before the build; never hand back an unchecked 21st name (0355 review R7) =="
NEW; echo profile > "$WORK/marker"; : > "$WORK/registry_all_taken"
run_deploy
[ "$RC" -ne 0 ] && pass "every name held → deploy refused (rc=$RC)" || fail "an all-taken registry did not stop the deploy (the cap handed back a name)"
n=$(grep -c '^docker buildx imagetools inspect acme/profile:0\.0\.155-profile\.[0-9]*$' "$WORK/docker.argv" 2>/dev/null); n=${n:-0}
[ "$n" = "20" ] && pass "exactly 20 names checked (.1 … .20), then it stopped" || fail "expected 20 registry look-ups, got $n"
grep -q '20 version names in a row' "$WORK/out.log" && pass "…saying 20 names in a row are held" || fail "no '20 version names in a row' message"
grep -q 'buildx build' "$WORK/docker.argv" 2>/dev/null && fail "…but docker buildx ran" || pass "…before any docker buildx"
grep -qE '^docker (tag|push) ' "$WORK/docker.argv" 2>/dev/null && fail "…but it tagged or pushed" || pass "…no docker tag and no docker push"

echo "== T39: the registry token goes on stdin only — never in any argv (0355 review R8, owner ruling 2026-09-30) =="
# Synthetic value only — never a real token. Spaces and quotes, like T1's SSH password.
SYNTH_REG_TOKEN='synthetic-0355 registry "token" not-real'
NEW; echo profile > "$WORK/marker"
run_deploy DOCKER_TOKEN="$SYNTH_REG_TOKEN"
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
LOGIN_LINE=$(grep '^docker login' "$WORK/docker.argv" 2>/dev/null | head -1)
[ -n "$LOGIN_LINE" ] && pass "a registry login happened (the check below is not vacuous)" || fail "no docker login call at all (the checks below would be vacuous)"
printf '%s' "$LOGIN_LINE" | grep -q -- '--password-stdin' && pass "the login uses --password-stdin" || fail "the login does not use --password-stdin: $LOGIN_LINE"
if grep -rqF "$SYNTH_REG_TOKEN" "$WORK"/*.argv "$WORK/calls.log" 2>/dev/null \
   || grep -rqF 'synthetic-0355' "$WORK"/*.argv "$WORK/calls.log" 2>/dev/null; then
  fail "the registry token LEAKED into an argv (visible in ps)"
else
  pass "the registry token never appears in any docker/git/ssh/scp/sshpass argv"
fi
[ "$(cat "$WORK/login.stdin" 2>/dev/null)" = "$SYNTH_REG_TOKEN" ] && pass "…and it reached docker login on stdin, intact" \
  || fail "docker login did not receive the token on stdin"
rm -f "$WORK/login.stdin"
# Structural, for the other login on the path (the box pulls a private image with it).
for f in "$REPO_ROOT/build-deploy-profile.sh" "$REPO_ROOT/setup-profile.sh"; do
  n=$(basename "$f")
  LOGINS=$(grep -nE '^[^#]*docker +login' "$f")
  [ -n "$LOGINS" ] || { fail "$n: no docker login line found (the check would be vacuous)"; continue; }
  printf '%s\n' "$LOGINS" | grep -v -- '--password-stdin' | grep -q . \
    && fail "$n: a docker login without --password-stdin" || pass "$n: every docker login uses --password-stdin"
  printf '%s\n' "$LOGINS" | grep -qE -- '(^|[[:space:]])(-p|--password)([[:space:]=]|$)' \
    && fail "$n: docker login passes the password on the command line" || pass "$n: no docker login -p/--password"
done

# ── Structural parity checks (setup-* on-box halves + telemetry mirror) ────────
echo "== Structural: on-box flock/marker + telemetry mirror =="
P="$REPO_ROOT/setup-profile.sh"
awk '/flock -n 9/{f=NR} /apt-get update -y && apt-get upgrade -y/{u=NR} END{exit !(f>0 && f<u)}' "$P" \
  && pass "setup-profile.sh: flock acquired before first apt mutation" || fail "flock not before apt"
# ── Unattended apt: DEBIAN_FRONTEND exported ABOVE the FIRST apt call (task 0286) ──
# These are LINTS over ordering, not behavioural tests: a real prompt-free deploy is only
# observable on the box. What they catch is the cheap regression — the export deleted, or
# "tidied" to somewhere below the first apt call, which silently reopens the hang.
# Anchored on `^[[:space:]]*apt` so the prose in each script's own explanatory comment
# cannot satisfy them.
#
# ⚠️ The anchor is DELIBERATELY GENERIC — `apt` or `apt-get`, any subcommand — and both
# line numbers are FIRST-match (`if(!e)`/`if(!u)`), not last. That is what makes these
# assert what their name and CLAUDE.md both claim: "above the script's FIRST apt call".
# An earlier, hard-coded per-script anchor (0286 review round 1, finding R1) asserted only
# "above THIS named line", and was wrong three ways, each reproduced before this change:
#   (a) an apt call added ABOVE the export passed GREEN — the named anchor still sat below
#       the export, so the very hang these exist to prevent reopened silently;
#   (b) a second, redundant export added below the anchor flipped last-match `e` past `u`
#       and failed claiming NO export existed when one did;
#   (c) merely rewording the named apt line set `u=0` and failed with that same wrong text.
# ⚠️ setup-profile.sh's first apt call is the PRE-FLOCK `apt-get install -y util-linux` —
# the call that installs flock itself. Anchoring on the post-flock `apt-get upgrade` would
# pass green with the export moved under the lock, leaving that first call exposed. "First"
# is the property that matters, which is why the anchor no longer names a line at all.
# ⚠️ Known limitation of a generic anchor: it matches on TEXT, so an apt line inside a
# heredoc that merely GENERATES an on-box script would count as this script's first apt
# call. None of the three files has one today (every match is a real invocation — checked
# by enumeration). If one is ever added above the export, this fails as a false positive:
# move the export above it rather than re-narrowing the anchor.
FRONTEND_ORDER='/^export DEBIAN_FRONTEND=noninteractive$/{if(!e)e=NR} /^[[:space:]]*apt(-get)?[[:space:]]/{if(!u)u=NR} END{exit !(e>0 && u>0 && e<u)}'
awk "$FRONTEND_ORDER" "$P" \
  && pass "setup-profile.sh: DEBIAN_FRONTEND exported above its first apt call (the pre-flock util-linux install)" \
  || fail "setup-profile.sh: 'export DEBIAN_FRONTEND=noninteractive' is missing, or does not precede this script's first apt call (today the pre-flock util-linux install) — an unattended deploy can block on a debconf prompt (task 0286)"
TEL="$REPO_ROOT/setup-telemetry.sh"
awk "$FRONTEND_ORDER" "$TEL" \
  && pass "setup-telemetry.sh: DEBIAN_FRONTEND exported above its first apt call" \
  || fail "setup-telemetry.sh: 'export DEBIAN_FRONTEND=noninteractive' is missing, or does not precede this script's first apt call — this is the script that actually prompted the owner three times (task 0286)"
GAME="$REPO_ROOT/setup.sh"
awk "$FRONTEND_ORDER" "$GAME" \
  && pass "setup.sh: DEBIAN_FRONTEND exported above its first apt call" \
  || fail "setup.sh: 'export DEBIAN_FRONTEND=noninteractive' is missing, or does not precede this script's first apt call — and this script's nginx install redirects stdout, so a prompt there hangs printing no prompt (task 0286)"
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
# The anchor deliberately stops at "<< " and does NOT name the delimiter: the delimiter is
# quoted ('EOF') since 0282, and an anchor spelling one form would go silently VACUOUS if the
# other were used. N1 below asserts the quoting explicitly instead.
COMPOSE_BLOCK=$(awk '/cat > "\$PROFILE_DIR\/docker-compose.yml" << /{b=1; next} b && /^EOF$/{exit} b{print}' "$P")
[ -n "$COMPOSE_BLOCK" ] && pass "setup-profile.sh: located the docker-compose.yml heredoc" \
  || fail "setup-profile.sh: no docker-compose.yml heredoc found (the checks below would be vacuous)"
# ── Task 0282: the compose heredoc must not be able to EXECUTE anything ───────────────────
# The defect: an UNQUOTED delimiter expands the body, so a backtick in a YAML COMMENT became a
# command substitution that ran AS ROOT at deploy time (one of them was 'docker compose stop').
# N1 locks the quoting; N2/N3 ban the two substitution syntaxes outright (a rule that had to
# tell ` from \` would be the brittle one); N4 gates the FIX's own failure mode.
grep -qF "cat > \"\$PROFILE_DIR/docker-compose.yml\" << 'EOF'" "$P" \
  && pass "compose heredoc: delimiter is quoted ('EOF') — the body cannot expand (0282)" \
  || fail "compose heredoc: delimiter is NOT quoted — a backtick or \$( ) in a COMMENT executes as root at deploy time (task 0282)"
printf '%s\n' "$COMPOSE_BLOCK" | grep -q '`' \
  && fail "compose heredoc: a backtick appears in the block — use single quotes in comments (0282)" \
  || pass "compose heredoc: no backticks (0282)"
printf '%s\n' "$COMPOSE_BLOCK" | grep -qF '$(' \
  && fail "compose heredoc: a \$( ) command substitution appears in the block (0282)" \
  || pass "compose heredoc: no \$( ) command substitution (0282)"
# Every ${NAME} left in the template must have an explicit substitution line after the heredoc.
# Without this, a newly added placeholder reaches the box unexpanded and Docker interpolates it
# from the box environment (or to empty) — a silent wrong port/healthcheck.
for v in $(printf '%s\n' "$COMPOSE_BLOCK" \
            | grep -oE '\$\{[A-Za-z_][A-Za-z0-9_]*\}' | tr -d '${}' | sort -u); do
  grep -qF "compose_rendered//'\${$v}'" "$P" \
    && pass "compose heredoc: \${$v} has an explicit substitution line (0282)" \
    || fail "compose heredoc: \${$v} is in the template but never substituted — it would reach the box unexpanded (0282)"
done
# N5 (review 0282 R2): the UNBRACED $NAME form is banned outright. Only ${NAME} is substituted,
# but Compose interpolates BOTH — so an unbraced placeholder would reach the box, be replaced
# with a blank string (an error in ports:, silently wrong in a healthcheck), and be caught by
# neither N4's braced-only regex nor the old braced-only runtime guard. $$ is Compose's escape
# for a literal dollar and is legitimate, so the pairs are stripped before the scan.
printf '%s\n' "$COMPOSE_BLOCK" | sed 's/\$\$//g' | grep -qE '\$[A-Za-z_]' \
  && fail "compose heredoc: an UNBRACED \$NAME appears in the block — only \${NAME} is substituted, so Compose would interpolate it on the box (0282)" \
  || pass "compose heredoc: no unbraced \$NAME placeholders (0282)"
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
TELEGRAM_PROXY_URL:.telegram_proxy_url \
PROFILE_SESSION_SECRET:.session_secret"
# The four OPTIONAL secrets (0220): blank + nothing persisted = written EMPTY, feature off.
# They must NEVER be called in generate mode — a minted value would switch a feature "on" with
# a key nobody else holds. PROFILE_SESSION_SECRET (0271) is the one generated secret.
OPTIONAL_SECRET_NAMES="YANDEX_PAYMENTS_SECRET FEEDBACK_TELEGRAM_TOKEN FEEDBACK_TELEGRAM_CHAT_ID TELEGRAM_PROXY_URL"

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
    PROFILE_SESSION_SECRET='0271-F@ke session "secret"$notreal-0123456789'
    # Task 0274 (S5): the OTLP endpoint and the login-creation switch.
    OTEL_EXPORTER_OTLP_ENDPOINT='https://otel-0274.example.invalid'
    PROFILE_LOGIN_CREATE_ENABLED='true'
    # Task 0277 (review R8): the alert webhook secret. A fully-configured box HAS one —
    # without it the relay delivers nothing, so it belongs in the clean surface.
    # ⛔ The TELEGRAM_TOPIC_* pair is deliberately NOT set here: blank is a supported
    # state meaning the General topic, so they must read OPTIONAL even on a clean box.
    PROFILE_ALERT_WEBHOOK_TOKEN='0277-F@ke alert "token"$notreal'
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
  # (iv-b) Task 0277, review R8 — the relay secret. Its empty state means every alert is
  #        silently DROPPED, so it must not be left to persist_or_reuse_secret's generic
  #        "feature stays off" line. Behavioural, like everything else in this block: the
  #        function is RUN, so this cannot pass on a comment.
  clean_config
  PROFILE_ALERT_WEBHOOK_TOKEN=''
  report_config_values > "$RDIR/alert_tok.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "alert-token: report_config_values STILL returned 0 (report-only)" \
    || fail "alert-token: returned $rc"
  n=$(grep -c 'FINDING' "$RDIR/alert_tok.txt" || true)
  [ "${n:-0}" = "1" ] && pass "alert-token: an empty PROFILE_ALERT_WEBHOOK_TOKEN is exactly 1 finding" \
    || fail "alert-token: expected exactly 1 finding, got ${n:-0}: $(grep FINDING "$RDIR/alert_tok.txt" | head -3)"
  grep -q 'FINDING.*PROFILE_ALERT_WEBHOOK_TOKEN' "$RDIR/alert_tok.txt" \
    && pass "alert-token: the finding names PROFILE_ALERT_WEBHOOK_TOKEN" \
    || fail "alert-token: empty relay secret is not reported — an operator would scroll past the one state that means every alert is silently dropped"
  clean_config
  grep -q 'OK.*PROFILE_ALERT_WEBHOOK_TOKEN' "$RDIR/clean.txt" \
    && pass "clean: PROFILE_ALERT_WEBHOOK_TOKEN row reports OK when set" \
    || fail "clean: no OK row for PROFILE_ALERT_WEBHOOK_TOKEN — the check cannot tell configured from not"
  grep -qF '0277-F@ke alert' "$RDIR/clean.txt" \
    && fail "clean: PROFILE_ALERT_WEBHOOK_TOKEN's VALUE is echoed into the deploy output" \
    || pass "clean: PROFILE_ALERT_WEBHOOK_TOKEN's value is never echoed (presence only)"
  # Blank topics are SUPPORTED — General, the pre-0277 behaviour — so they must read as
  # OPTIONAL with a reason, never as a finding and never silently.
  for v in TELEGRAM_TOPIC_ALERTS TELEGRAM_TOPIC_NAME_CHANGES; do
    grep -qE "OPTIONAL.*${v}.*General" "$RDIR/clean.txt" \
      && pass "clean: a blank $v reads as OPTIONAL and says it means the General topic" \
      || fail "clean: a blank $v has no explicit OPTIONAL row — blank is supported, and silence is what 0220 exists to stop"
  done

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
  # (vii) PROFILE_SESSION_SECRET (0271): empty or shorter than 32 characters is a FINDING — the
  #       server treats both as unset and answers 503 on login and every Bearer request.
  clean_config
  PROFILE_SESSION_SECRET=''
  report_config_values > "$RDIR/sess_empty.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "session-empty: report_config_values STILL returned 0" || fail "session-empty: returned $rc"
  grep -q 'FINDING.*PROFILE_SESSION_SECRET' "$RDIR/sess_empty.txt" && pass "session-empty: empty PROFILE_SESSION_SECRET → finding" \
    || fail "session-empty: no PROFILE_SESSION_SECRET finding for an empty value"
  grep -q '^Value parity: 1 finding(s),' "$RDIR/sess_empty.txt" && pass "session-empty: summary counts exactly 1 finding" \
    || fail "session-empty: summary line wrong: $(grep 'Value parity' "$RDIR/sess_empty.txt")"
  clean_config
  PROFILE_SESSION_SECRET='0271-F@ke short "s"$x'
  report_config_values > "$RDIR/sess_short.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "session-short: report_config_values STILL returned 0" || fail "session-short: returned $rc"
  grep -q 'FINDING.*PROFILE_SESSION_SECRET' "$RDIR/sess_short.txt" && pass "session-short: a <32-character PROFILE_SESSION_SECRET → finding" \
    || fail "session-short: no PROFILE_SESSION_SECRET finding for a too-short value"
  grep -q '^Value parity: 1 finding(s),' "$RDIR/sess_short.txt" && pass "session-short: summary counts exactly 1 finding" \
    || fail "session-short: summary line wrong: $(grep 'Value parity' "$RDIR/sess_short.txt")"
  grep -q 'OK.*PROFILE_SESSION_SECRET' "$RDIR/clean.txt" && pass "clean: PROFILE_SESSION_SECRET row reports OK" \
    || fail "clean: no OK row for PROFILE_SESSION_SECRET"
  # (viii) OTEL_EXPORTER_OTLP_ENDPOINT (0274, owner ruling D4): https + hostname, or an
  #        EXPLICIT optional row saying no metrics means no alerts. Empty must never be
  #        silent — a box with no endpoint is a box nothing can page about.
  grep -q 'OK.*OTEL_EXPORTER_OTLP_ENDPOINT' "$RDIR/clean.txt" && pass "clean: OTEL_EXPORTER_OTLP_ENDPOINT row reports OK" \
    || fail "clean: no OK row for OTEL_EXPORTER_OTLP_ENDPOINT"
  grep -q 'PROFILE_LOGIN_CREATE_ENABLED' "$RDIR/clean.txt" && pass "clean: PROFILE_LOGIN_CREATE_ENABLED row is present" \
    || fail "clean: the login-creation switch has no row at all — its state would be invisible"
  for bad in 'http://otel-0274.example.invalid' 'https://203.0.113.14' 'https://otel-0274.example.invalid junk' 'otel-0274.example.invalid'; do
    clean_config
    OTEL_EXPORTER_OTLP_ENDPOINT="$bad"
    report_config_values > "$RDIR/otel_bad.txt"; rc=$?
    [ "$rc" -eq 0 ] || fail "otel-bad: report_config_values returned $rc for '$bad'"
    grep -q 'FINDING.*OTEL_EXPORTER_OTLP_ENDPOINT' "$RDIR/otel_bad.txt" \
      && pass "otel-bad: '$bad' → finding" || fail "otel-bad: '$bad' passed as a usable OTLP endpoint"
    cp "$RDIR/otel_bad.txt" "$RDIR/otel_bad_$(echo "$bad" | tr -c 'a-zA-Z0-9' '_').txt"
  done
  clean_config
  OTEL_EXPORTER_OTLP_ENDPOINT=''
  report_config_values > "$RDIR/otel_empty.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "otel-empty: report_config_values STILL returned 0" || fail "otel-empty: returned $rc"
  grep -q 'OPTIONAL.*OTEL_EXPORTER_OTLP_ENDPOINT' "$RDIR/otel_empty.txt" \
    && pass "otel-empty: empty endpoint is an EXPLICIT optional row, not a finding" \
    || fail "otel-empty: an empty OTLP endpoint produced no OPTIONAL row"
  grep -qi 'OPTIONAL.*OTEL_EXPORTER_OTLP_ENDPOINT.*alert' "$RDIR/otel_empty.txt" \
    && pass "otel-empty: the row says what it costs (no metrics ⇒ no alerts)" \
    || fail "otel-empty: the optional row does not say that no alert can fire"
  # The switch (owner ruling D3): 'false' is a LOUD, visible state; an unrecognised
  # value is a FINDING, because the server will leave creation ON despite the operator.
  clean_config
  PROFILE_LOGIN_CREATE_ENABLED='false'
  report_config_values > "$RDIR/switch_off.txt"; rc=$?
  [ "$rc" -eq 0 ] && pass "switch-off: report_config_values STILL returned 0" || fail "switch-off: returned $rc"
  grep -q 'PAUSED.*PROFILE_LOGIN_CREATE_ENABLED' "$RDIR/switch_off.txt" \
    && pass "switch-off: 'false' prints a loud PAUSED row (no new player can be created)" \
    || fail "switch-off: 'false' did not produce a PAUSED row: $(grep 'LOGIN_CREATE' "$RDIR/switch_off.txt")"
  n=$(grep -c 'FINDING' "$RDIR/switch_off.txt" || true)
  [ "${n:-0}" = "0" ] && pass "switch-off: a deliberately paused box is not a FINDING" || fail "switch-off: $n finding(s) on a deliberately paused box"
  clean_config
  PROFILE_LOGIN_CREATE_ENABLED='flase'
  report_config_values > "$RDIR/switch_junk.txt"; rc=$?
  grep -q 'FINDING.*PROFILE_LOGIN_CREATE_ENABLED' "$RDIR/switch_junk.txt" \
    && pass "switch-junk: an unrecognised value → finding (the server leaves creation ON — D3)" \
    || fail "switch-junk: 'flase' passed silently, so a typo would look like a pause"
  grep -qi 'FINDING.*PROFILE_LOGIN_CREATE_ENABLED.*ENABLED' "$RDIR/switch_junk.txt" \
    && pass "switch-junk: the finding says creation stays ENABLED" \
    || fail "switch-junk: the finding does not say what the server will actually do"
  # (iii) canary: a synthetic secret in EVERY checked variable never appears in any report output.
  for v in '0220-F@ke tg "token"$notreal' '0220-F@ke chat "id"$notreal' '0220-F@ke yp "key"$notreal' '0220-F@ke internal "tok"$notreal' \
           'https://ping.example.invalid/0220-fake' 'http://ping.example.invalid/0220-fake' 'http://proxy.example.invalid:3128' \
           'http://203.0.113.10' 'http://203.0.113.11' 'https://s3.example.invalid' \
           'http://proxy.example.invalid bad' 'https://ping.example.invalid bad' 'https://user:pw@203.0.113.13/' \
           'api.example.invalid:443' 'bad host' 'https://user@203.0.113.12/x' \
           '0271-F@ke session "secret"$notreal-0123456789' '0271-F@ke short "s"$x' \
           'https://otel-0274.example.invalid'; do
    if cat "$RDIR"/*.txt | grep -qF "$v"; then fail "canary: a checked VALUE leaked into the value report"; break; fi
  done
  cat "$RDIR"/*.txt | grep -qF '0220-F@ke' || pass "canary: no checked value appears in any report output (names + verdicts only)"
  cat "$RDIR"/*.txt | grep -qF '0271-F@ke' && fail "canary: a PROFILE_SESSION_SECRET value leaked into the value report" \
    || pass "canary: no PROFILE_SESSION_SECRET value appears in any report output"
  unset PROFILE_DOMAIN FEEDBACK_TELEGRAM_TOKEN FEEDBACK_TELEGRAM_CHAT_ID TELEGRAM_PROXY_URL YANDEX_PAYMENTS_SECRET \
        PROFILE_INTERNAL_TOKEN PROFILE_INTERNAL_TOKEN_SOURCE PROFILE_CHECKS_PING_URL PROFILE_BACKUP_S3_ENDPOINT \
        PROFILE_SESSION_SECRET OTEL_EXPORTER_OTLP_ENDPOINT PROFILE_LOGIN_CREATE_ENABLED
  rm -rf "$RDIR"
else
  fail "T15 skipped: report_config_values() absent"
fi

echo "== T16: persist_or_reuse_secret generate mode — PROFILE_SESSION_SECRET minted once, 0600, then reused (0271) =="
# Owner ruling D7: persist-or-reuse with generate-if-absent. A key regenerated on every deploy
# would only force a silent re-login, but it must be DECIDED, not accidental: the first deploy
# mints it, every later blank deploy reuses it, and a supplied value rotates it. Driven through
# the REAL function; no value and no length may reach the output.
if [ "$HAVE_PERSIST" = 1 ]; then
  PDIR=$(mktemp -d)
  file="$PDIR/.session_secret"
  unset PROFILE_SESSION_SECRET
  persist_or_reuse_secret PROFILE_SESSION_SECRET "$file" generate > "$PDIR/out1.txt"
  [ -f "$file" ] && [ "$(mode_of "$file")" = "600" ] && pass "generate: persist file created, mode 600" \
    || fail "generate: persist file missing or mode '$( [ -f "$file" ] && mode_of "$file")', expected 600"
  gen=$(cat "$file" 2>/dev/null)
  printf '%s' "$gen" | grep -qE '^[0-9a-f]{64}$' && pass "generate: persisted value is 64 lowercase hex characters (openssl rand -hex 32)" \
    || fail "generate: persisted value is not 64 hex characters"
  [ -n "$gen" ] && [ "${PROFILE_SESSION_SECRET-}" = "$gen" ] && pass "generate: the variable is set to the generated value (reaches the profile.env heredoc)" \
    || fail "generate: the variable was not set to the generated value"
  [ "$(cat "$PDIR/out1.txt")" = "Generated and persisted PROFILE_SESSION_SECRET to $file" ] \
    && pass "generate: output is the exact 'Generated and persisted' line" \
    || fail "generate: output unexpected: $(grep -vF "${gen:-no-value}" "$PDIR/out1.txt" | head -1)"
  out1="$(cat "$PDIR/out1.txt")"; out1="${out1//"$file"/}"
  { [ -n "$gen" ] && printf '%s' "$out1" | grep -qF "$gen"; } && fail "generate: the generated VALUE leaked into deploy output" \
    || pass "generate: generated value never appears in deploy output"
  printf '%s\n' "$out1" | grep -qE '(^|[^0-9])64([^0-9]|$)' && fail "generate: the value's LENGTH (64) appears in deploy output" \
    || pass "generate: value length never appears in deploy output"
  # The next blank deploy REUSES the key — tokens survive a redeploy.
  unset PROFILE_SESSION_SECRET
  persist_or_reuse_secret PROFILE_SESSION_SECRET "$file" generate > "$PDIR/out2.txt"
  [ -n "$gen" ] && [ "${PROFILE_SESSION_SECRET-}" = "$gen" ] && [ "$(cat "$file")" = "$gen" ] \
    && pass "generate: a following blank deploy reuses the persisted key (no regeneration)" \
    || fail "generate: a following blank deploy did NOT reuse the key — every deploy would log everyone out"
  grep -q '^⚠️  Reusing persisted PROFILE_SESSION_SECRET from ' "$PDIR/out2.txt" && ! grep -q 'Generated' "$PDIR/out2.txt" \
    && pass "generate: the reuse is said by name, and nothing is generated" || fail "generate: reuse output unexpected: $(cat "$PDIR/out2.txt")"
  # A supplied value rotates the key (written through).
  ROT_SS='0271-F@ke rotated "session"$notreal-0123456789'
  PROFILE_SESSION_SECRET="$ROT_SS"
  persist_or_reuse_secret PROFILE_SESSION_SECRET "$file" generate > "$PDIR/out3.txt"
  printf '%s' "$ROT_SS" | cmp -s - "$file" && grep -q '^Using PROFILE_SESSION_SECRET from environment' "$PDIR/out3.txt" \
    && pass "generate: a supplied value wins and is written through (deliberate rotation)" \
    || fail "generate: a supplied value did not rotate the persisted key"
  grep -qF "$ROT_SS" "$PDIR/out3.txt" && fail "generate: the rotated VALUE leaked into deploy output" \
    || pass "generate: rotated value never appears in deploy output"
  # A supplied value UNDER 32 characters is REFUSED before anything is written (review 0271 R2):
  # the server would treat it as unset (503 on login + every Bearer call), so persisting it would
  # destroy a working key. The deploy aborts; the persisted key survives byte-for-byte; neither the
  # value nor its length reaches the output.
  good_ss=$(cat "$file")
  SHORT_SS='0271-F@ke short "k"$x'
  PROFILE_SESSION_SECRET="$SHORT_SS"
  ( persist_or_reuse_secret PROFILE_SESSION_SECRET "$file" generate ) > "$PDIR/out6.txt" 2>&1; rc=$?
  [ "$rc" -ne 0 ] && pass "short: a supplied value under 32 characters ABORTS the deploy (rc=$rc)" \
    || fail "short: rc 0 — a too-short supplied PROFILE_SESSION_SECRET was accepted"
  printf '%s' "$good_ss" | cmp -s - "$file" && pass "short: the persisted key is byte-unchanged (never overwritten by the short value)" \
    || fail "short: the persisted key was OVERWRITTEN by a too-short value — login + Bearer would 503"
  grep -q '^Error: PROFILE_SESSION_SECRET: the supplied value is shorter than the 32-character minimum' "$PDIR/out6.txt" \
    && ! grep -q '^Using PROFILE_SESSION_SECRET' "$PDIR/out6.txt" \
    && pass "short: the error names the variable and the minimum; no 'Using … from environment' claim" \
    || fail "short: error line missing or a 'Using' claim printed: $(grep -vF "$SHORT_SS" "$PDIR/out6.txt" | head -2)"
  out6="$(cat "$PDIR/out6.txt")"; out6="${out6//"$file"/}"
  printf '%s' "$out6" | grep -qF "$SHORT_SS" && fail "short: the refused VALUE leaked into deploy output" \
    || pass "short: refused value never appears in deploy output"
  printf '%s\n' "$out6" | grep -qE "(^|[^0-9])${#SHORT_SS}([^0-9]|$)" && fail "short: the refused value's LENGTH appears in deploy output" \
    || pass "short: refused value length never appears in deploy output"
  ( persist_or_reuse_secret PROFILE_SESSION_SECRET "$PDIR/.session_secret_short_new" generate ) > "$PDIR/out7.txt" 2>&1; rc=$?
  [ "$rc" -ne 0 ] && [ ! -e "$PDIR/.session_secret_short_new" ] \
    && pass "short: with nothing persisted, a too-short value still aborts and creates no persist file" \
    || fail "short: nothing persisted + too-short value → rc=$rc, file $( [ -e "$PDIR/.session_secret_short_new" ] && echo created || echo absent)"
  unset PROFILE_SESSION_SECRET
  # The four OPTIONAL secrets are untouched by the minimum (no generate mode): a short value is still
  # written through exactly as 0220 specifies.
  YANDEX_PAYMENTS_SECRET="$SHORT_SS"
  persist_or_reuse_secret YANDEX_PAYMENTS_SECRET "$PDIR/.yandex_payments_secret_short" > "$PDIR/out8.txt"
  printf '%s' "$SHORT_SS" | cmp -s - "$PDIR/.yandex_payments_secret_short" \
    && [ "$(cat "$PDIR/out8.txt")" = "Using YANDEX_PAYMENTS_SECRET from environment (persisted to $PDIR/.yandex_payments_secret_short)" ] \
    && pass "short: an optional secret (no generate) with a short value is persisted as before (0220 unchanged)" \
    || fail "short: the 32-character minimum leaked into the optional secrets' behaviour"
  unset YANDEX_PAYMENTS_SECRET
  # An EMPTY persist file is nothing persisted → generate, never an empty reuse.
  : > "$PDIR/.session_secret_empty"
  unset PROFILE_SESSION_SECRET
  persist_or_reuse_secret PROFILE_SESSION_SECRET "$PDIR/.session_secret_empty" generate > "$PDIR/out4.txt"
  grep -qE '^[0-9a-f]{64}$' "$PDIR/.session_secret_empty" && [ -n "${PROFILE_SESSION_SECRET-}" ] && grep -q '^Generated and persisted' "$PDIR/out4.txt" \
    && pass "generate: an EMPTY persist file triggers generation (no silent empty reuse)" \
    || fail "generate: an empty persist file did not trigger generation"
  # An UNREADABLE persist file aborts — never a fresh key that silently logs everyone out.
  mkdir "$PDIR/.session_secret_dir"; : > "$PDIR/.session_secret_dir/entry"
  unset PROFILE_SESSION_SECRET
  ( persist_or_reuse_secret PROFILE_SESSION_SECRET "$PDIR/.session_secret_dir" generate ) > "$PDIR/out5.txt" 2>&1; rc=$?
  [ "$rc" -ne 0 ] && ! grep -q 'Generated' "$PDIR/out5.txt" && grep -q 'Error: PROFILE_SESSION_SECRET: persist file' "$PDIR/out5.txt" \
    && pass "generate: an unreadable persist file ABORTS (rc=$rc), with no generation" \
    || fail "generate: rc=$rc on an unreadable persist file, or it generated a replacement key: $(head -2 "$PDIR/out5.txt")"
  unset PROFILE_SESSION_SECRET
  rm -rf "$PDIR"
else
  fail "T16 skipped: persist_or_reuse_secret() absent"
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
# Generate mode (0271): exactly the session secret, and never one of the four optional secrets.
grep -qE '^persist_or_reuse_secret[[:space:]]+PROFILE_SESSION_SECRET[[:space:]]+"\$PROFILE_DIR/\.session_secret"[[:space:]]+generate[[:space:]]*$' "$P" \
  && pass "setup-profile.sh: PROFILE_SESSION_SECRET is persisted in generate mode (owner ruling D7)" \
  || fail "setup-profile.sh: PROFILE_SESSION_SECRET is not called with 'generate' — a first deploy would write it EMPTY and 503 every login"
for name in $OPTIONAL_SECRET_NAMES; do
  grep -qE "^persist_or_reuse_secret[[:space:]]+$name[[:space:]].*generate" "$P" \
    && fail "setup-profile.sh: $name is called with 'generate' — an optional secret must stay EMPTY when not supplied" \
    || pass "setup-profile.sh: $name is never generated (stays EMPTY / feature off when not supplied)"
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
# The anchor deliberately stops at "<< " and does NOT name the delimiter: the delimiter is
# quoted ('EOF') since 0282, and an anchor spelling one form would go silently VACUOUS if the
# other were used. N1 below asserts the quoting explicitly instead.
COMPOSE_BLOCK=$(awk '/cat > "\$PROFILE_DIR\/docker-compose.yml" << /{b=1; next} b && /^EOF$/{exit} b{print}' "$P")
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

# ── Behavioural + structural: monitoring + the creation switch (task 0274, S5) ──
# Same T10 standard: drive the REAL deploy script and assert what the staged file
# actually carries. Both values are non-secret, but the endpoint is a HOST, so it
# rides the same 0600-staged channel and must never reach an argv.
echo "== T18: OTEL_EXPORTER_OTLP_ENDPOINT + PROFILE_LOGIN_CREATE_ENABLED reach the staged env (0274) =="
OTEL_EP='https://otel-0274.example.invalid/base with space"$notreal'
NEW; echo profile > "$WORK/marker"
run_deploy OTEL_EXPORTER_OTLP_ENDPOINT="$OTEL_EP" PROFILE_LOGIN_CREATE_ENABLED=false
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC (expected 0); see $WORK/out.log"
for v in OTEL_EXPORTER_OTLP_ENDPOINT PROFILE_LOGIN_CREATE_ENABLED; do
  n=$(grep -c "^export ${v}=" "$WORK/staged.env" 2>/dev/null || true); n=${n:-0}
  [ "$n" = "1" ] && pass "exactly one export $v line" || fail "expected 1 export $v line, got $n"
done
got=$( . "$WORK/staged.env" >/dev/null 2>&1; printf '%s' "${OTEL_EXPORTER_OTLP_ENDPOINT-}" )
[ "$got" = "$OTEL_EP" ] && pass "OTLP endpoint round-trips through sourcing (spaces/quotes/\$ intact)" \
  || fail "staged OTLP endpoint did not round-trip (got ${#got} chars, expected ${#OTEL_EP})"
got=$( . "$WORK/staged.env" >/dev/null 2>&1; printf '%s' "${PROFILE_LOGIN_CREATE_ENABLED-}" )
[ "$got" = "false" ] && pass "the switch round-trips as the literal 'false'" || fail "staged switch value is '$got'"
if grep -rqF "$OTEL_EP" "$WORK"/*.argv 2>/dev/null; then fail "OTLP endpoint LEAKED into an argv"; \
  else pass "OTLP endpoint never appears in docker/ssh/scp/sshpass argv"; fi
NEW; echo profile > "$WORK/marker"
run_deploy
for v in OTEL_EXPORTER_OTLP_ENDPOINT PROFILE_LOGIN_CREATE_ENABLED; do
  n=$(grep -c "^export ${v}=" "$WORK/staged.env" 2>/dev/null || true); n=${n:-0}
  got=$( . "$WORK/staged.env" >/dev/null 2>&1; eval "printf '%s' \"\${$v-unset}\"" )
  [ "$n" = "1" ] && [ -z "$got" ] && pass "blank deploy stages exactly one EMPTY $v (the box reuses its persisted value)" \
    || fail "blank deploy: expected one empty export $v line, got n=$n value-empty=$([ -z "$got" ] && echo yes || echo no)"
done

echo "== Structural: 0274 persistence, profile.env keys, OTLP probe, checks.env POSTGRES_* =="
# Persist-or-reuse for BOTH: a deploy from a machine that does not carry the value must
# not silently turn metrics off or the switch back on — that is the 0195/0220 defect,
# and for the switch it would mean a redeploy mid-incident quietly resumes creating
# players. NEITHER may be in `generate` mode: an endpoint or a boolean cannot be minted.
for spec in "OTEL_EXPORTER_OTLP_ENDPOINT:.otel_endpoint" "PROFILE_LOGIN_CREATE_ENABLED:.login_create_enabled"; do
  name=${spec%%:*}; file=${spec#*:}
  line=$(grep -E "^persist_or_reuse_secret[[:space:]]+${name}[[:space:]]" "$P" | head -1)
  [ -n "$line" ] && pass "setup-profile.sh: $name goes through persist_or_reuse_secret" \
    || fail "setup-profile.sh: no persist_or_reuse_secret line for $name — a blank redeploy would silently drop it"
  printf '%s\n' "$line" | grep -qF "\$PROFILE_DIR/$file" \
    && pass "setup-profile.sh: $name persists to $file" || fail "setup-profile.sh: $name persist path is not $file: $line"
  printf '%s\n' "$line" | grep -qE 'generate[[:space:]]*$' \
    && fail "setup-profile.sh: $name is in generate mode — a minted value here is meaningless" \
    || pass "setup-profile.sh: $name is NOT in generate mode"
done

echo "== Structural: 0277 alert relay + topic routing config =="
# 🚨 THE ONE THAT MATTERS MOST. PROFILE_ALERT_WEBHOOK_TOKEN must NEVER be in generate
# mode. A box-minted secret is a value the alert SENDER does not know, so every call
# fails its secret check and every alert is dropped — silently, forever. This is the
# PROFILE_INTERNAL_TOKEN trap (0182) exactly, and nothing else in this repository
# would catch it. The topic ids cannot be minted either: they are properties of a
# chat that already exists.
for spec in "TELEGRAM_TOPIC_ALERTS:.telegram_topic_alerts" \
            "TELEGRAM_TOPIC_NAME_CHANGES:.telegram_topic_name_changes" \
            "PROFILE_ALERT_WEBHOOK_TOKEN:.alert_webhook_token"; do
  name=${spec%%:*}; file=${spec#*:}
  line=$(grep -E "^persist_or_reuse_secret[[:space:]]+${name}[[:space:]]" "$P" | head -1)
  [ -n "$line" ] && pass "setup-profile.sh: $name goes through persist_or_reuse_secret" \
    || fail "setup-profile.sh: no persist_or_reuse_secret line for $name — a blank redeploy would silently drop it"
  printf '%s\n' "$line" | grep -qF "\$PROFILE_DIR/$file" \
    && pass "setup-profile.sh: $name persists to $file" || fail "setup-profile.sh: $name persist path is not $file: $line"
  printf '%s\n' "$line" | grep -qE 'generate[[:space:]]*$' \
    && fail "setup-profile.sh: $name is in GENERATE mode — a box-minted alert secret means every alert 401s/drops forever, silently" \
    || pass "setup-profile.sh: $name is NOT in generate mode"
done
# Dead config guard: feedback is sent by the GAME server, so a feedback topic on THIS
# pipeline is config that nothing reads — and a later reader would take its presence
# as evidence the feedback-topic move had already shipped.
# ⚠️ Comment lines are stripped first: a COMMENT naming the variable is the useful
# documentation of why it is absent, and asserting on a bare grep would forbid exactly
# the note that keeps the next reader from re-adding it.
for spec in "setup-profile.sh:$P" "build-deploy-profile.sh:$B"; do
  label=${spec%%:*}; path=${spec#*:}
  grep -v '^[[:space:]]*#' "$path" | grep -q 'TELEGRAM_TOPIC_FEEDBACK' \
    && fail "$label: TELEGRAM_TOPIC_FEEDBACK is live config on the PROFILE pipeline — feedback is sent by the GAME server, so nothing here reads it, and its presence would read as evidence the feedback-topic move had shipped" \
    || pass "$label: TELEGRAM_TOPIC_FEEDBACK is not live config (it belongs to the game pipeline)"
done
for v in TELEGRAM_TOPIC_ALERTS TELEGRAM_TOPIC_NAME_CHANGES PROFILE_ALERT_WEBHOOK_TOKEN; do
  grep -qE "^[[:space:]]*printf \"export ${v}=%q" "$B" \
    && pass "build-deploy-profile.sh: $v is staged to the box" \
    || fail "build-deploy-profile.sh: $v is never exported — hop 1 drops it and the box sees nothing"
done
# ⚠️ A5: an EMPTY allowlist renders as a bare 'deny all', which answers 403 — and a
# 403 makes the alert sender permanently disable its channel. The deploy already
# prints the list (0276); this asserts it is LOUD when the list is empty, which is
# the case that silently breaks alerting.
ALLOWLIST_ECHO=$(grep -n 'internal/ nginx allowlist laid down' "$P" | head -1)
[ -n "$ALLOWLIST_ECHO" ] && pass "setup-profile.sh: the deploy prints the /internal/ allowlist" \
  || fail "setup-profile.sh: the /internal/ allowlist is never printed at deploy"
# ⚠️ BEHAVIOURAL, not a grep (review R5). The first version of this assertion was a
# file-wide string grep, and it stayed GREEN with the guard's condition inverted
# (-z→-n, so the warning could never fire) and with the echo demoted to a comment
# carrying the same words. That is exactly the "a guard that cannot fail for the
# reason you built it" shape the plan's own A5 names — inside the standing gate for
# these scripts. So: EXTRACT the render loop and the warning from the script and RUN
# them, and assert the warning fires exactly when zero allow directives are rendered.
ALLOWLIST_RENDER=$(awk '/^    ALLOW_DIRECTIVES=""$/{b=1} b{print} b && /^    fi$/{exit}' "$P")
ALLOWLIST_WARN=$(awk '/internal\/ nginx allowlist laid down/{b=1} b{print} b && /^fi$/{exit}' "$P")
[ -n "$ALLOWLIST_RENDER" ] && [ -n "$ALLOWLIST_WARN" ] \
  && pass "setup-profile.sh: located the allowlist render loop and its warning block" \
  || fail "setup-profile.sh: could not extract the allowlist render/warning blocks — the checks below would be vacuous"
# ⚠️ The render loop lives INSIDE setup-profile.sh's `if [ -n "$PROFILE_DOMAIN" ]`
# branch, so the probe reproduces that enclosing condition — without it the probe is
# blind to the case where nginx is skipped entirely and ALLOW_DIRECTIVES is never set
# (review R11, which this probe did NOT catch in its first form).
# 🚨 Honest limit, stated rather than papered over: this MODELS the enclosing branch,
# it does not read it. Moving the render loop out of that branch would still slip past.
{ echo 'if [ -n "${PROFILE_DOMAIN:-}" ]; then'
  printf '%s\n' "$ALLOWLIST_RENDER"
  echo 'fi'
  printf '%s\n' "$ALLOWLIST_WARN"
  # The rendered directive count, which is what actually decides `deny all`.
  echo 'printf "RENDERED=%s\n" "$(printf "%s" "${ALLOW_DIRECTIVES:-}" | grep -c "allow " || true)"'
} > "$WORK/allowlist_probe.sh"
# domain | value | expected directives | must the warning fire?
#   A whitespace-only or comma-only value renders ZERO directives — a bare `deny all`,
#   i.e. 403 for everyone, i.e. the alert channel permanently disabled — so it MUST warn.
#   With NO domain nginx is never configured, so there is no /internal/ to be denied and
#   the warning must stay silent however the allowlist looks.
while IFS='|' read -r domain value want_rendered want_warn; do
  [ -z "${domain:-}" ] && continue
  dom=""; [ "$domain" = "yes" ] && dom="api.example.invalid"
  out=$(PROFILE_DOMAIN="$dom" PROFILE_INTERNAL_ALLOW_IPS="$value" bash "$WORK/allowlist_probe.sh" 2>&1)
  got_rendered=$(printf '%s\n' "$out" | sed -n 's/^RENDERED=//p')
  printf '%s\n' "$out" | grep -q 'WARNING: PROFILE_INTERNAL_ALLOW_IPS' && got_warn=yes || got_warn=no
  label="domain=$domain allowlist=$([ -z "$value" ] && echo "<empty>" || echo "'$value'")"
  [ "$got_rendered" = "$want_rendered" ] \
    && pass "allowlist $label renders $want_rendered allow directive(s)" \
    || fail "allowlist $label rendered $got_rendered allow directive(s), expected $want_rendered"
  [ "$got_warn" = "$want_warn" ] \
    && pass "allowlist $label: warning fired=$got_warn (as required)" \
    || fail "allowlist $label: warning fired=$got_warn, required $want_warn — zero rendered directives means a bare 'deny all', so every internal call (crediting AND the alert webhook) gets 403 and the alert channel is disabled permanently and silently"
done <<'ALLOWLIST_CASES'
yes|203.0.113.7|1|no
yes|203.0.113.7,203.0.113.8|2|no
yes||0|yes
yes| |0|yes
yes|,|0|yes
yes| , |0|yes
no|203.0.113.7|0|no
no||0|no
ALLOWLIST_CASES

PROFILE_ENV_BLOCK=$(awk '/cat > "\$PROFILE_DIR\/profile\.env" << EOF/{b=1; next} b && /^EOF$/{exit} b{print}' "$P")
[ -n "$PROFILE_ENV_BLOCK" ] && pass "setup-profile.sh: located the profile.env heredoc" \
  || fail "setup-profile.sh: no profile.env heredoc found (the checks below would be vacuous)"
for v in OTEL_EXPORTER_OTLP_ENDPOINT PROFILE_LOGIN_CREATE_ENABLED \
         TELEGRAM_TOPIC_ALERTS TELEGRAM_TOPIC_NAME_CHANGES PROFILE_ALERT_WEBHOOK_TOKEN; do
  printf '%s\n' "$PROFILE_ENV_BLOCK" | grep -qE "^${v}=" \
    && pass "profile.env carries $v (the container can actually read it)" \
    || fail "profile.env does NOT carry $v — the deploy would forward it to nothing (the 0195 defect)"
done
printf '%s\n' "$PROFILE_ENV_BLOCK" | grep -q 'TELEGRAM_TOPIC_FEEDBACK' \
  && fail "profile.env carries TELEGRAM_TOPIC_FEEDBACK — dead config on this box" \
  || pass "profile.env does not carry TELEGRAM_TOPIC_FEEDBACK"
# The report-only OTLP reachability probe: the repeatable box → Uptrace proof. curl's
# stderr is discarded because its error text can carry the URL, which is a host.
PROBE_BLOCK=$(awk '/OTLP ingest reachability probe/{b=1} b{print} b && /^fi$/{exit}' "$P")
printf '%s\n' "$PROBE_BLOCK" | grep -q 'v1/metrics' && printf '%s\n' "$PROBE_BLOCK" | grep -q 'curl' \
  && pass "setup-profile.sh: an OTLP ingest probe exists (curl … /v1/metrics)" \
  || fail "setup-profile.sh: no OTLP reachability probe — 'metrics configured' would never be proven"
printf '%s\n' "$PROBE_BLOCK" | grep -q '2>/dev/null' \
  && pass "OTLP probe: curl stderr is discarded (its error text can carry the URL)" \
  || fail "OTLP probe: curl stderr is not discarded — the endpoint could reach the deploy log"
printf '%s\n' "$PROBE_BLOCK" | grep -qE 'echo .*\$(OTEL_EXPORTER_OTLP_ENDPOINT|endpoint)' \
  && fail "OTLP probe: the endpoint is echoed into the deploy output" \
  || pass "OTLP probe: the endpoint is never echoed (verdict only)"
# Review R8: the probe must build the SAME URL the app exports to. `%/` strips ONE
# trailing slash; Telemetry.ts's metricsExportUrl strips ALL. Behavioural, not a grep:
# the probe's URL-building lines are extracted and run against awkward endpoints, and
# the expected value is computed with the app's own rule.
PROBE_URL_SNIPPET=$(printf '%s\n' "$PROBE_BLOCK" | sed -n '/otlp_probe_base="\${OTEL_EXPORTER_OTLP_ENDPOINT}"/,/otlp_probe_url=/p')
if [ -n "$PROBE_URL_SNIPPET" ]; then
  probe_url_for() {  # <endpoint> — runs the REAL extracted lines
    ( OTEL_EXPORTER_OTLP_ENDPOINT="$1"
      eval "$PROBE_URL_SNIPPET"
      printf '%s' "$otlp_probe_url" )
  }
  # The app's rule, independently: strip every trailing slash, then append.
  app_url_for() { local e="$1"; e="$(printf '%s' "$e" | sed -E 's:/+$::')"; printf '%s/v1/metrics' "$e"; }
  url_ok=1
  for ep in 'https://otel.example.invalid' 'https://otel.example.invalid/' 'https://otel.example.invalid//' \
            'https://otel.example.invalid///' 'https://otel.example.invalid/base' 'https://otel.example.invalid/base//'; do
    got="$(probe_url_for "$ep")"; want="$(app_url_for "$ep")"
    [ "$got" = "$want" ] || { fail "OTLP probe URL for '$ep' is '$got', the app would use '$want' — probe and app disagree (R8)"; url_ok=0; }
  done
  [ "$url_ok" = 1 ] && pass "OTLP probe builds the same URL as Telemetry.ts for every trailing-slash shape (R8)"
  grep -q "replace(/\\\\/+\$/" "$REPO_ROOT/src/profile-server/Telemetry.ts" \
    && pass "Telemetry.ts still strips ALL trailing slashes (the rule the probe mirrors)" \
    || fail "Telemetry.ts's trailing-slash rule changed — re-check the probe in setup-profile.sh"
else
  fail "OTLP probe: could not extract the URL-building lines (their shape changed) — the R8 agreement is untested"
fi
# checks.env gains POSTGRES_USER/POSTGRES_DB so the daily checker can count players.
# Scoped to the checks.env writer ALONE: backup.env also writes POSTGRES_*, and a
# looser extraction would pass on that block and assert nothing here.
CHECKS_ENV_BLOCK=$(awk '/^# checks\.env \(0600\)/{b=1} b{print} b && /> "\$PROFILE_DIR\/checks\.env"/{exit}' "$P")
[ -n "$CHECKS_ENV_BLOCK" ] && pass "setup-profile.sh: located the checks.env writer" \
  || fail "setup-profile.sh: no checks.env writer found (the checks below would be vacuous)"
for v in POSTGRES_USER POSTGRES_DB; do
  printf '%s\n' "$CHECKS_ENV_BLOCK" | grep -q "printf '${v}=%q" \
    && pass "checks.env carries $v (the players-growth check needs it)" \
    || fail "checks.env does not carry $v — the growth check would FAIL 'could not count players' every day"
done

# ── Structural: the nginx /internal/ location is case-INSENSITIVE (task 0276) ──
# nginx PREFIX locations match case-sensitively, so `location /internal/ {` let
# `POST /INTERNAL/v1/credit` fall through to the catch-all `location / {` — past the
# IP allowlist entirely — and Express (case-insensitive by default) then routed it to
# the internal handler. The app half is `app.set("case sensitive routing", true)` in
# src/profile-server/Routes.ts, gated by tests/profile-server/InternalPathCase.test.ts.
# THIS section gates the nginx half, which no test touched at all before now.
# Same accepted residual as the 0060/0219 blocks: coupled to the heredoc's formatting,
# so a reformat reds this (false RED, never false green).
echo "== Structural: nginx /internal/ location is case-insensitive (0276) =="
P="$REPO_ROOT/setup-profile.sh"
# Extracted by "a location block whose path mentions /internal/", NOT by the expected
# header text: a reverted header must FAIL the assertion below, not vanish into an
# empty extraction that passes green.
INTERNAL_BLOCK=$(awk '/^[[:space:]]*location [^{]*\/internal\/[^{]*\{/{b=1} b{print} b && /^[[:space:]]*\}[[:space:]]*$/{exit}' "$P")
[ -n "$INTERNAL_BLOCK" ] && pass "setup-profile.sh: located the /internal/ nginx location block" \
  || fail "setup-profile.sh: no /internal/ nginx location block found (the checks below would be vacuous)"
# The header must be the case-insensitive REGEX form. `~*` is what makes /INTERNAL/,
# /Internal/ and /iNtErNaL/ hit the allowlist instead of the catch-all.
printf '%s\n' "$INTERNAL_BLOCK" | head -1 | grep -qE '^[[:space:]]*location[[:space:]]+~\*[[:space:]]+\^/internal/[[:space:]]*\{' \
  && pass "nginx /internal/: header is the case-insensitive regex 'location ~* ^/internal/'" \
  || fail "nginx /internal/: header is not 'location ~* ^/internal/ {' — a prefix location is CASE-SENSITIVE and case variants bypass the allowlist (0276)"
# And no case-sensitive prefix location may survive anywhere in the file.
grep -qE '^[[:space:]]*location[[:space:]]+/internal/[[:space:]]*\{' "$P" \
  && fail "setup-profile.sh: a case-sensitive 'location /internal/ {' prefix location is still present (0276 regression)" \
  || pass "setup-profile.sh: no case-sensitive 'location /internal/ {' prefix location remains"
# The allowlist itself must still be inside the block — a case-insensitive location
# that allows everyone is strictly worse than what it replaced.
printf '%s\n' "$INTERNAL_BLOCK" | grep -q '${ALLOW_DIRECTIVES}' \
  && pass "nginx /internal/: the block still interpolates \${ALLOW_DIRECTIVES}" \
  || fail "nginx /internal/: \${ALLOW_DIRECTIVES} is gone — the allowlist would allow nobody and deny everyone"
printf '%s\n' "$INTERNAL_BLOCK" | grep -qE 'deny all;' \
  && pass "nginx /internal/: the block still ends the allowlist with 'deny all;'" \
  || fail "nginx /internal/: 'deny all;' is gone — the allowlist allows the whole internet"
# ORDER is load-bearing: nginx evaluates allow/deny top-down, first match wins. With
# `deny all;` hoisted above the allows, the block denies EVERYONE — including the game
# server. That reads as a working allowlist to a file-wide grep, which is why it is
# checked positionally (same line or an earlier one, both handled).
printf '%s\n' "$INTERNAL_BLOCK" | awk '
  { blob = blob $0 "\n" }
  END {
    a = index(blob, "${ALLOW_DIRECTIVES}");
    d = index(blob, "deny all;");
    exit !(a > 0 && d > 0 && a < d);
  }' \
  && pass "nginx /internal/: \${ALLOW_DIRECTIVES} comes BEFORE 'deny all;'" \
  || fail "nginx /internal/: 'deny all;' precedes the allows — nginx matches first-wins, so this denies the game server too"
# nginx REFUSES a proxy_pass with a URI part inside a regex location. Ours has none;
# adding one would make `nginx -t` fail and abort the deploy (setup-profile.sh's ERR
# trap restores the previous site config, so the API stays up — but the deploy dies).
printf '%s\n' "$INTERNAL_BLOCK" | grep -qE '^[[:space:]]*proxy_pass[[:space:]]+http://127\.0\.0\.1:\$\{PROFILE_PORT\};[[:space:]]*$' \
  && pass "nginx /internal/: proxy_pass carries no URI part (legal inside a regex location)" \
  || fail "nginx /internal/: proxy_pass is not the bare 'http://127.0.0.1:\${PROFILE_PORT};' form — a URI part in a REGEX location makes nginx -t fail and aborts the deploy"

# ── Structural: the alert-path liveness probe (task 0284) ─────────────────────
# This harness is the ONLY gate over the telemetry scripts — scripts/check-config-parity.mjs
# covers game/profile/client and never reaches TELEMETRY_*. Same character as the blocks
# above: grep-level lints, with the same accepted residual (coupled to formatting, so a
# reformat reds this — false RED, never false green).
echo "== Structural: alert-path liveness probe — telemetry side + the marker-path coupling (0284) =="
TS="$REPO_ROOT/setup-telemetry.sh"
BT="$REPO_ROOT/build-deploy-telemetry.sh"
P="$REPO_ROOT/setup-profile.sh"

# 1) Both files are written with the right modes. A 0644 env file would leave the shared
#    secret world-readable on the box.
grep -qE '^\s*chmod 600 "\$UPTRACE_DIR/alert-probe\.env"$' "$TS" \
  && pass "setup-telemetry.sh: alert-probe.env is chmod 600" \
  || fail "setup-telemetry.sh: no 'chmod 600 \$UPTRACE_DIR/alert-probe.env' — the shared secret would be world-readable"
grep -qE '^\s*chmod 700 "\$UPTRACE_DIR/alert-probe\.sh"$' "$TS" \
  && pass "setup-telemetry.sh: alert-probe.sh is chmod 700" \
  || fail "setup-telemetry.sh: no 'chmod 700 \$UPTRACE_DIR/alert-probe.sh'"

# The probe script heredoc, and only it — every assertion below is scoped to it, so a
# match somewhere else in the file cannot make one pass vacuously.
PROBE_BLOCK=$(awk '/cat > "\$UPTRACE_DIR\/alert-probe\.sh" << .PROBEEOF.$/{b=1; next} b && /^PROBEEOF$/{exit} b{print}' "$TS")
[ -n "$PROBE_BLOCK" ] && pass "setup-telemetry.sh: located the alert-probe.sh heredoc" \
  || fail "setup-telemetry.sh: no alert-probe.sh heredoc found (the checks below would be vacuous)"

# 2) The body goes on stdin, and the secret never reaches an argv. `--data '{"secret":…}'`
#    would expose it in ps / /proc/<pid>/cmdline for the life of every hourly call.
printf '%s\n' "$PROBE_BLOCK" | grep -q -- '--data-binary @-' \
  && pass "probe: the JSON body is fed on stdin (--data-binary @-)" \
  || fail "probe: no '--data-binary @-' — the body (and the secret in it) would ride an argv"
#    ⚠️ Review R4: this guard used to grep the block LINE BY LINE while the real curl spans
#    three backslash-continued lines, so a leak placed on a continuation line passed. Proven
#    with a planted regression. Continuations are therefore JOINED first: the shell reads that
#    invocation as ONE command, and so must this check. Comments are stripped before joining —
#    they may NAME the secret (that is the warning), code may not.
PROBE_BLOCK_JOINED=$(printf '%s\n' "$PROBE_BLOCK" | grep -v '^[[:space:]]*#' \
  | awk '{ line = line $0; if (sub(/\\$/, " ", line)) next; print line; line = "" }
         END { if (line != "") print line }')
#    Non-vacuity for the join itself: these three fragments live on three separate physical
#    lines in setup-telemetry.sh, so they can only appear together if the joining worked.
printf '%s\n' "$PROBE_BLOCK_JOINED" | grep 'curl' | grep -- '--data-binary @-' | grep -q 'ALERT_PROBE_URL' \
  && pass "probe: the continued curl invocation reads as ONE line (so the argv guard is not line-blind)" \
  || fail "probe: could not find the whole curl invocation on one joined line — the argv guard below would be vacuous (review R4)"
printf '%s\n' "$PROBE_BLOCK_JOINED" | grep -qE 'curl[^|]*\$\{?ALERT_PROBE_SECRET' \
  && fail "probe: ALERT_PROBE_SECRET appears on a curl command line — it must only ever reach stdin" \
  || pass "probe: ALERT_PROBE_SECRET never appears on a curl argv"

# 3) No `set -x` anywhere in the probe — it would echo the secret into the log. Comments may
#    NAME it (that is the warning); code may not.
printf '%s\n' "$PROBE_BLOCK" | grep -v '^[[:space:]]*#' | grep -q 'set -x' \
  && fail "probe: 'set -x' in the probe script — it would echo the shared secret into the log" \
  || pass "probe: no 'set -x' in the probe script (outside comments)"

# 4) The cron actually invokes it. Without this the script is written and never runs, and the
#    profile box pages daily about a guard that was wired but never fired.
CRON_BLOCK=$(awk '/^CRON_FILE="\/etc\/cron\.d\/uptrace-backups"$/{b=1} b{print} b && /^EOF$/{exit}' "$TS")
printf '%s\n' "$CRON_BLOCK" | grep -qE '^[0-9*/, ]+ root \$UPTRACE_DIR/alert-probe\.sh' \
  && pass "setup-telemetry.sh: a cron line runs \$UPTRACE_DIR/alert-probe.sh" \
  || fail "setup-telemetry.sh: no cron line invoking alert-probe.sh — the probe would never run"

# 5) The hop nothing else can see: build-deploy-telemetry.sh must forward BOTH values into the
#    0600 staged env. check-config-parity.mjs does not reach telemetry variables at all.
for v in TELEMETRY_ALERT_PROBE_URL PROFILE_ALERT_WEBHOOK_TOKEN; do
  grep -qE "^export ${v}='\\\$\{${v}:-\}'$" "$BT" \
    && pass "build-deploy-telemetry.sh: stages export $v" \
    || fail "build-deploy-telemetry.sh: no 'export $v' line in the staged env heredoc — the box would never receive it"
done

# 6) Persist-or-reuse, and NEVER generate. A box-minted token fails every probe and pages
#    daily — 0182/0195's defect in a new place.
grep -qE '^persist_or_reuse_probe_value TELEMETRY_ALERT_PROBE_URL' "$TS" \
  && grep -qE '^persist_or_reuse_probe_value PROFILE_ALERT_WEBHOOK_TOKEN' "$TS" \
  && pass "setup-telemetry.sh: both probe values are persist-or-reuse" \
  || fail "setup-telemetry.sh: a probe value is not persist-or-reuse — a blank redeploy would wipe it and page daily"
grep -nE '^persist_or_reuse_probe_value ' "$TS" | grep -q 'generate' \
  && fail "setup-telemetry.sh: a probe value is in 'generate' mode — a box-minted token fails EVERY probe" \
  || pass "setup-telemetry.sh: no probe value is ever generated on the box"
awk '/^persist_or_reuse_probe_value\(\)/{b=1} b && /^}$/{exit} b{print}' "$TS" | grep -q 'openssl rand' \
  && fail "setup-telemetry.sh: persist_or_reuse_probe_value can mint a value — it must never generate" \
  || pass "setup-telemetry.sh: persist_or_reuse_probe_value has no generate branch at all"

# 7) Drift guard: the compose bind mount's CONTAINER path must equal the directory of
#    ALERT_PROBE_MARKER_PATH in src/profile-server/AlertRelay.ts. Two files in two languages
#    must agree on one string, and nothing else would catch them diverging — the marker would
#    simply be written where nobody reads it, and the check would page forever.
RELAY="$REPO_ROOT/src/profile-server/AlertRelay.ts"
RELAY_MARKER=$(sed -n 's/^[[:space:]]*"\(\/var\/[^"]*last-alert-probe\.json\)";$/\1/p' "$RELAY" | head -1)
[ -n "$RELAY_MARKER" ] && pass "AlertRelay.ts: read ALERT_PROBE_MARKER_PATH ($RELAY_MARKER)" \
  || fail "AlertRelay.ts: could not read ALERT_PROBE_MARKER_PATH (its shape changed — the drift guard is vacuous)"
RELAY_DIR="${RELAY_MARKER%/*}"
MOUNT_TARGET=$(sed -n 's/^[[:space:]]*- \.\/alerts:\(\/[^[:space:]]*\)$/\1/p' "$P" | head -1)
[ -n "$MOUNT_TARGET" ] && pass "setup-profile.sh: compose bind-mounts ./alerts ($MOUNT_TARGET)" \
  || fail "setup-profile.sh: no './alerts:<container path>' bind mount — a container-written marker is invisible to checks.sh"
[ -n "$RELAY_DIR" ] && [ "$RELAY_DIR" = "$MOUNT_TARGET" ] \
  && pass "the bind mount target equals ALERT_PROBE_MARKER_PATH's directory" \
  || fail "DRIFT: AlertRelay.ts writes into '$RELAY_DIR' but compose mounts '$MOUNT_TARGET' — the marker would be written where nothing reads it"
# And the checker must look in the same place on the HOST.
grep -qE '^PROBE_MARKER=.*\$PROFILE_DIR/alerts/last-alert-probe\.json\}"$' "$REPO_ROOT/profile-checks.sh" \
  && pass "profile-checks.sh: reads \$PROFILE_DIR/alerts/last-alert-probe.json" \
  || fail "profile-checks.sh: PROBE_MARKER does not default to \$PROFILE_DIR/alerts/last-alert-probe.json"

# 8) Review R2 (owner ruling 2026-09-18 — ENFORCE, not just document): a probe token holding a
#    " or a \ emits invalid JSON from alert-probe.sh, so every probe is dropped as `malformed`,
#    no marker is ever written, and the profile box pages EVERY DAY while alerting is fine.
#    BEHAVIOURAL, not structural: the real function is extracted and run. It only echoes and
#    exits, so running it has no side effects.
PROBE_TOKEN_GUARD=$(awk '/^assert_probe_token_json_safe\(\)/{b=1} b{print} b && /^}$/{exit}' "$TS")
[ -n "$PROBE_TOKEN_GUARD" ] \
  && pass "setup-telemetry.sh: located assert_probe_token_json_safe (the checks below are not vacuous)" \
  || fail "setup-telemetry.sh: no assert_probe_token_json_safe — a token with a quote or backslash would deploy and page daily (review R2)"
for bad in 'ab"cd' 'ab\cd'; do
  ( eval "$PROBE_TOKEN_GUARD"; assert_probe_token_json_safe "$bad" "harness" ) >/dev/null 2>&1 \
    && fail "setup-telemetry.sh: a probe token containing a quote/backslash was ACCEPTED — it would break the probe's JSON body forever" \
    || pass "setup-telemetry.sh: a probe token containing a quote/backslash is rejected (non-zero exit)"
done
( eval "$PROBE_TOKEN_GUARD"; assert_probe_token_json_safe "0f3ab9c7d1e5" "harness" ) >/dev/null 2>&1 \
  && pass "setup-telemetry.sh: an ordinary hex token still passes (the guard is not a blanket refusal)" \
  || fail "setup-telemetry.sh: assert_probe_token_json_safe rejects a plain hex token — every deploy would abort"
#    Both sources must be checked: the value this deploy supplies AND one already persisted on
#    a box provisioned before the guard existed.
grep -qE '^[[:space:]]*assert_probe_token_json_safe "\$PROFILE_ALERT_WEBHOOK_TOKEN"' "$TS" \
  && grep -qE '^[[:space:]]*assert_probe_token_json_safe "\$\(cat "\$UPTRACE_DIR/\.alert_probe_token"\)"' "$TS" \
  && pass "setup-telemetry.sh: the token guard covers both the deploy-supplied and the persisted value" \
  || fail "setup-telemetry.sh: the token guard misses a source (deploy-supplied or persisted) — a bad token could still reach the probe"
#    ⛔ And it must never print the token itself.
printf '%s\n' "$PROBE_TOKEN_GUARD" | grep '^[[:space:]]*echo' | grep -q '\$1' \
  && fail "setup-telemetry.sh: the token guard echoes the token value — it must name the variable only" \
  || pass "setup-telemetry.sh: the token guard names the variable only, never the token value"

# 9) Review R3 (owner ruling 2026-09-18): a bare 2xx must NOT exit 0. Every dropped call is a
#    deliberate 200 too (a 4xx would disable the notification channel), so the probe can only
#    know a marker was written from the relay's own distinct status string. Drift guard: that
#    string is defined in AlertRelay.ts and grepped for in the generated probe script.
RELAY_PROBE_STATUS=$(sed -n 's/^export const ALERT_PROBE_RESPONSE_STATUS = "\([^"]*\)";$/\1/p' "$RELAY" | head -1)
[ -n "$RELAY_PROBE_STATUS" ] \
  && pass "AlertRelay.ts: read ALERT_PROBE_RESPONSE_STATUS ($RELAY_PROBE_STATUS)" \
  || fail "AlertRelay.ts: could not read ALERT_PROBE_RESPONSE_STATUS (its shape changed — the drift guard is vacuous)"
[ "$RELAY_PROBE_STATUS" != "accepted" ] \
  && pass "the probe status differs from the 'accepted' a dropped call answers with" \
  || fail "ALERT_PROBE_RESPONSE_STATUS is 'accepted' — identical to a dropped call, so the probe learns nothing (review R3)"
printf '%s\n' "$PROBE_BLOCK" | grep -qF "$RELAY_PROBE_STATUS" \
  && pass "probe: the script matches on the relay's probe status ('$RELAY_PROBE_STATUS')" \
  || fail "DRIFT: alert-probe.sh does not look for '$RELAY_PROBE_STATUS' — it would exit 0 on a dropped call"
printf '%s\n' "$PROBE_BLOCK_JOINED" | grep 'curl' | grep -q -- '-o /dev/null' \
  && fail "probe: curl still discards the response body (-o /dev/null) — it cannot tell a recorded probe from a dropped call (review R3)" \
  || pass "probe: the response body is captured, not discarded"
#    ⛔ …and never written into the log: it need not have come from the relay, and the rule that
#    discards curl's stderr applies to it.
printf '%s\n' "$PROBE_BLOCK" | grep -v '^[[:space:]]*#' | grep -qE 'say .*\$\{?probe_body' \
  && fail "probe: the response body is echoed into the log — it can carry content this box should not log" \
  || pass "probe: the response body is never echoed into the log"

# 10) …and R3 BEHAVIOURALLY. The grep above proves the string is mentioned, not that the exit
#     logic works, and the fix hinges on capturing curl's `$?` THROUGH a command substitution —
#     exactly where a silent "any 2xx ⇒ exit 0" regression would hide. So the generated script
#     is written out and RUN against a stub curl (the extract-and-run idiom of T12).
PROBE_RUN_DIR=$(mktemp -d)
printf '%s\n' "$PROBE_BLOCK" > "$PROBE_RUN_DIR/alert-probe.sh"
printf 'ALERT_PROBE_URL=https://example.invalid/hook\nALERT_PROBE_SECRET=0f3ab9c7notreal\n' \
  > "$PROBE_RUN_DIR/alert-probe.env"
mkdir -p "$PROBE_RUN_DIR/bin"
cat > "$PROBE_RUN_DIR/bin/curl" <<'EOF'
#!/bin/bash
# Save the JSON body from stdin, as the real call sends it (task 0285 asserts what it carries).
cat > "$(dirname "$0")/../curl.stdin"
[ -n "${STUB_CURL_FAIL:-}" ] && exit 22
printf '%s' "${STUB_CURL_BODY:-}"
EOF
# Task 0285: the channel-state read. `timeout` is not on a macOS PATH and the real `docker`
# must never be reached from a test, so both are stubbed. The docker stub records its argv and
# prints psql.out (tab-separated `status<TAB>url` rows) — or FAILS when there is none, so the
# five 0284 cases below run with an UNREADABLE state and prove a failed read cannot break the
# liveness probe.
# Review R1/R2: the timeout stub records its argv (so the bound is asserted on the call that
# actually RAN) and can exit as a real timeout would — 124 after SIGTERM, 137 after SIGKILL —
# without running the command; the docker stub can fail with a chosen exit code.
cat > "$PROBE_RUN_DIR/bin/timeout" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >> "$(dirname "$0")/../timeout.argv"
[ -n "${STUB_TIMEOUT_RC:-}" ] && exit "$STUB_TIMEOUT_RC"
[ "$1" = "-k" ] && shift 2   # the kill grace
shift   # the duration
exec "$@"
EOF
cat > "$PROBE_RUN_DIR/bin/docker" <<'EOF'
#!/bin/bash
d="$(dirname "$0")/.."
printf '%s\n' "$*" >> "$d/docker.argv"
[ -f "$d/psql.out" ] || exit "${STUB_DOCKER_RC:-1}"
cat "$d/psql.out"
EOF
chmod +x "$PROBE_RUN_DIR/bin/curl" "$PROBE_RUN_DIR/bin/timeout" "$PROBE_RUN_DIR/bin/docker"
# The real script logs to /var/log; redirect that one line into the temp dir.
sed "s#^LOG=.*#LOG=\"$PROBE_RUN_DIR/probe.log\"#" "$PROBE_RUN_DIR/alert-probe.sh" > "$PROBE_RUN_DIR/run.sh"
grep -q "^LOG=\"$PROBE_RUN_DIR/probe.log\"\$" "$PROBE_RUN_DIR/run.sh" \
  && pass "probe: the extracted script is runnable with its log redirected (the cases below are not vacuous)" \
  || fail "probe: could not redirect LOG= in the extracted script — the behavioural cases below would be vacuous"
run_probe() {  # <VAR=VAL> ; sets PRC and PLOG
  rm -f "$PROBE_RUN_DIR/probe.log" "$PROBE_RUN_DIR/curl.stdin"
  env -i PATH="$PROBE_RUN_DIR/bin:/usr/bin:/bin" "$@" bash "$PROBE_RUN_DIR/run.sh" >/dev/null 2>&1
  PRC=$?
  PLOG=$(cat "$PROBE_RUN_DIR/probe.log" 2>/dev/null || true)
}
run_probe STUB_CURL_FAIL=1
{ [ "$PRC" -ne 0 ] && printf '%s' "$PLOG" | grep -q 'FAILED to reach'; } \
  && pass "probe: a curl failure exits non-zero and names it" \
  || fail "probe: a curl failure did not exit non-zero (rc=$PRC)"
run_probe 'STUB_CURL_BODY={"status":"accepted"}'
{ [ "$PRC" -ne 0 ] && printf '%s' "$PLOG" | grep -q 'did NOT record a probe'; } \
  && pass "probe: a 2xx carrying the DROPPED-call body exits NON-ZERO (review R3 — this is the case that used to log 'accepted')" \
  || fail "probe: a dropped call still reads as success (rc=$PRC) — the probe's exit code means nothing"
run_probe "STUB_CURL_BODY={\"status\":\"$RELAY_PROBE_STATUS\"}"
{ [ "$PRC" -eq 0 ] && printf '%s' "$PLOG" | grep -q 'recorded the probe'; } \
  && pass "probe: the relay's probe status exits 0 and says the marker was written" \
  || fail "probe: the probe status did not exit 0 (rc=$PRC)"
run_probe "STUB_CURL_BODY={ \"status\" : \"$RELAY_PROBE_STATUS\" }"
[ "$PRC" -eq 0 ] \
  && pass "probe: …and tolerates JSON spacing (an upstream formatting change is not a false page)" \
  || fail "probe: spacing in the JSON reply broke the match (rc=$PRC)"
#     And the unconfigured path must fail loudly rather than quietly succeed.
printf 'ALERT_PROBE_URL=\nALERT_PROBE_SECRET=\n' > "$PROBE_RUN_DIR/alert-probe.env"
run_probe "STUB_CURL_BODY={\"status\":\"$RELAY_PROBE_STATUS\"}"
{ [ "$PRC" -ne 0 ] && printf '%s' "$PLOG" | grep -q 'NOT CONFIGURED'; } \
  && pass "probe: an empty URL/secret exits non-zero and says NOT CONFIGURED" \
  || fail "probe: an unconfigured probe did not fail (rc=$PRC)"

# 11) Task 0285 — the notification channel's OWN state, BEHAVIOURALLY. The same extracted script,
#     now with rows from the stub psql. Only rows whose URL equals ALERT_PROBE_URL count; the
#     worst state wins; no match is `missing`; a failed or odd read is `unreadable` — and in
#     every case the POST is still sent and the exit code keeps 0284's meaning.
printf 'ALERT_PROBE_URL=https://example.invalid/hook\nALERT_PROBE_SECRET=0f3ab9c7notreal\n' \
  > "$PROBE_RUN_DIR/alert-probe.env"
PROBE_OK_BODY="{\"status\":\"$RELAY_PROBE_STATUS\"}"
expect_state() {  # <expected state> <label> [<expected log tail>] — asserts the POST body and the log line
  local want="{\"payload\":{\"secret\":\"0f3ab9c7notreal\",\"probe\":\"liveness\",\"channel_state\":\"$1\"}}"
  local want_log="${3:-$1}"
  { [ "$PRC" -eq 0 ] && [ "$(cat "$PROBE_RUN_DIR/curl.stdin" 2>/dev/null)" = "$want" ] \
      && [ "${PLOG##*channel state: }" = "$want_log" ]; } \
    && pass "probe (0285): $2 → POST carries channel_state \"$1\", exit 0, log ends 'channel state: $want_log'" \
    || fail "probe (0285): $2 — expected channel_state '$1' and log tail '$want_log' (rc=$PRC body=$(cat "$PROBE_RUN_DIR/curl.stdin" 2>/dev/null) log=$PLOG)"
}
printf 'delivering\thttps://example.invalid/hook\n' > "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY"; expect_state delivering "one delivering row"
printf 'disabled\thttps://example.invalid/hook\n' > "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY"; expect_state disabled "one disabled row"
printf 'delivering\thttps://example.invalid/hook\ndisabled\thttps://example.invalid/hook\npaused\thttps://example.invalid/hook\n' \
  > "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY"; expect_state disabled "two matching channels, delivering + disabled + paused (the worst wins)"
printf 'delivering\thttps://example.invalid/hook\ndisabled\thttps://other.example.invalid/hook\ndisabled\t\n' \
  > "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY"; expect_state delivering "a disabled channel at ANOTHER url, and one with no url (not ours — ignored)"
printf 'delivering\thttps://example.invalid/hook/\ndelivering\thttps://other.example.invalid/hook\n' > "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY"; expect_state missing "no channel's URL equals ALERT_PROBE_URL (exact match — a trailing slash is drift)"
: > "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY"; expect_state missing "no channels at all"
#     Review R3: what REAL psql does (measured, stderr discarded, ON_ERROR_STOP): a schema change
#     (missing table or column), a server-side statement_timeout cancel, and `docker compose exec`
#     on a service that is not running all exit rc 1 with EMPTY stdout; a failed connect (incl.
#     PGCONNECT_TIMEOUT) exits rc 2. psql never prints its error on stdout with rc 0 — so a
#     schema change is modelled here as rc 1 + nothing on stdout, not as an ERROR line.
rm -f "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY" STUB_DOCKER_RC=1; expect_state unreadable "the query FAILS, rc 1 + empty stdout — a schema change, a statement_timeout cancel or a stopped service (the POST is still sent, liveness exit unchanged)" \
  "unreadable (exec or psql failed, rc=1)"
#     Review R2: every unreadable cause class is logged — fixed words and an exit code only, the
#     POST still carries the bare word `unreadable`.
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY" STUB_DOCKER_RC=2; expect_state unreadable "psql cannot connect, rc 2 + empty stdout (incl. PGCONNECT_TIMEOUT)" \
  "unreadable (exec or psql failed, rc=2)"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY" STUB_TIMEOUT_RC=124; expect_state unreadable "the read TIMES OUT (SIGTERM, rc 124)" \
  "unreadable (timed out)"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY" STUB_TIMEOUT_RC=137; expect_state unreadable "the read is KILLED after the grace (rc 137)" \
  "unreadable (killed, rc=137)"
#     `unexpected output` is reached only when psql exits 0 with a row of the wrong shape.
printf 'disabled\n' > "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY"; expect_state unreadable "rc 0, but a row with no tab (not the verified shape)" \
  "unreadable (unexpected output)"
printf 'Disabled\thttps://example.invalid/hook\n' > "$PROBE_RUN_DIR/psql.out"
run_probe "STUB_CURL_BODY=$PROBE_OK_BODY"; expect_state unreadable "a status that is not a lowercase word" \
  "unreadable (unexpected output)"
{ ! printf '%s' "$PLOG" | grep -qF 'example.invalid' && ! printf '%s' "$PLOG" | grep -qF 'Disabled'; } \
  && pass "probe (0285): an unexpected-output log line carries neither the URL nor the raw psql row" \
  || fail "probe (0285): the log line leaks psql output or the URL: $PLOG"
#     A failed state read never turns a DROPPED call into success, nor a success into failure:
rm -f "$PROBE_RUN_DIR/psql.out"
run_probe 'STUB_CURL_BODY={"status":"accepted"}'
{ [ "$PRC" -ne 0 ] && printf '%s' "$PLOG" | grep -qF 'did NOT record a probe' \
    && [ "${PLOG##*channel state: }" = "unreadable (exec or psql failed, rc=1)" ]; } \
  && pass "probe (0285): a dropped call still exits non-zero with an unreadable state, and the log names both" \
  || fail "probe (0285): the state read changed the dropped-call outcome (rc=$PRC log=$PLOG)"
#     ⛔ Neither the secret nor the URL ever reaches docker's (and so psql's) argv.
[ -s "$PROBE_RUN_DIR/docker.argv" ] \
  && pass "probe (0285): the docker stub recorded its argv (the guard below is not vacuous)" \
  || fail "probe (0285): the docker stub was never called — the state read never ran"
{ grep -qF '0f3ab9c7notreal' "$PROBE_RUN_DIR/docker.argv" || grep -qF 'example.invalid' "$PROBE_RUN_DIR/docker.argv"; } \
  && fail "probe (0285): the secret or the URL reached the docker/psql argv — visible in ps for every hourly run" \
  || pass "probe (0285): neither the secret nor the URL is ever on the docker/psql argv"
grep -q 'default_transaction_read_only=on' "$PROBE_RUN_DIR/docker.argv" \
  && pass "probe (0285): the psql call that actually ran carries default_transaction_read_only=on" \
  || fail "probe (0285): the psql call ran WITHOUT the read-only transaction setting"
#     Review R1: the bound, on the call that actually RAN — every docker/psql call went through
#     `timeout -k <grace> <n>`, and it carried the server-side statement timeout.
{ [ -s "$PROBE_RUN_DIR/timeout.argv" ] \
    && ! grep -vqE '^-k [0-9]+s? [0-9]+s? docker compose exec ' "$PROBE_RUN_DIR/timeout.argv"; } \
  && pass "probe (0285): every state read ran under 'timeout -k <grace> <n> docker compose exec' (review R1)" \
  || fail "probe (0285): the state read ran without 'timeout -k <grace> <n>' — a wedged docker client would stall the liveness POST: $(cat "$PROBE_RUN_DIR/timeout.argv" 2>/dev/null)"
grep -q 'statement_timeout=' "$PROBE_RUN_DIR/docker.argv" \
  && pass "probe (0285): the psql call that actually ran carries a server-side statement_timeout" \
  || fail "probe (0285): the psql call ran WITHOUT statement_timeout — a wedged query leaves an orphan psql per hour"
rm -rf "$PROBE_RUN_DIR"

# 12) Task 0285 — STRUCTURAL guards on the state read. Grep-level, same accepted residual as above.
PROBE_PSQL_LINE=$(printf '%s\n' "$PROBE_BLOCK_JOINED" | grep 'docker compose exec' | grep 'psql' || true)
[ "$(printf '%s\n' "$PROBE_PSQL_LINE" | grep -c . || true)" = "1" ] \
  && pass "probe (0285): exactly ONE docker/psql invocation, joined onto one line (the guards below are not vacuous)" \
  || fail "probe (0285): expected exactly one 'docker compose exec … psql' line in the probe, found: $PROBE_PSQL_LINE"
printf '%s' "$PROBE_PSQL_LINE" | grep -q "PGOPTIONS='-c default_transaction_read_only=on[ ']" \
  && pass "probe (0285): the state query runs in a READ-ONLY transaction (Postgres refuses any write)" \
  || fail "probe (0285): the psql call lacks PGOPTIONS='-c default_transaction_read_only=on'"
#     Review R1: the bound. Client side: `timeout -k <grace> <n>` wraps the docker call itself
#     (SIGTERM, then SIGKILL). Server side: statement_timeout, strictly under the client's <n>, in
#     the same PGOPTIONS — killing the client never kills the psql inside the container.
PROBE_TIMEOUT_S=$(printf '%s' "$PROBE_PSQL_LINE" | sed -nE 's/.*\$\(cd "\$DIR" && timeout -k [0-9]+ ([0-9]+) docker compose exec .*/\1/p')
PROBE_STMT_S=$(printf '%s' "$PROBE_PSQL_LINE" | sed -nE "s/.*PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=([0-9]+)s'.*/\\1/p")
[ -n "$PROBE_TIMEOUT_S" ] \
  && pass "probe (0285): the state read runs under 'timeout -k <grace> ${PROBE_TIMEOUT_S} docker compose exec' (review R1)" \
  || fail "probe (0285): the docker/psql call is not wrapped in 'timeout -k <grace> <n>' — a wedged docker client would stall the liveness POST"
{ [ -n "$PROBE_STMT_S" ] && [ -n "$PROBE_TIMEOUT_S" ] && [ "$PROBE_STMT_S" -lt "$PROBE_TIMEOUT_S" ]; } \
  && pass "probe (0285): statement_timeout=${PROBE_STMT_S}s sits in the same PGOPTIONS, under the client's ${PROBE_TIMEOUT_S}s" \
  || fail "probe (0285): no server-side statement_timeout in PGOPTIONS, or it is not under the client timeout (stmt='$PROBE_STMT_S' client='$PROBE_TIMEOUT_S')"
printf '%s' "$PROBE_PSQL_LINE" | grep -qE -- '-e PGCONNECT_TIMEOUT=[0-9]+ ' \
  && pass "probe (0285): psql's connect is bounded too (PGCONNECT_TIMEOUT)" \
  || fail "probe (0285): the psql call lacks PGCONNECT_TIMEOUT — a Postgres that never accepts leaves an orphan psql"
#     Review R2: what the state reader echoes reaches the log. Only fixed words, a validated status
#     (via `worst`) and an exit code may be echoed — never a psql row, an unvalidated $status,
#     the URL or the rows buffer.
PROBE_READER=$(printf '%s\n' "$PROBE_BLOCK" | sed -n '/^read_channel_state() {$/,/^}$/p')
[ -n "$PROBE_READER" ] && printf '%s\n' "$PROBE_READER" | grep -qE '^[[:space:]]*(.*\) )?echo ' \
  && pass "probe (0285): extracted read_channel_state and its echo lines (the guard below is not vacuous)" \
  || fail "probe (0285): could not extract read_channel_state's echo lines — the guard below is vacuous"
printf '%s\n' "$PROBE_READER" | grep -v '^[[:space:]]*#' | grep -E '\becho ' | grep -qE '\$\{?(line|rows|url|status|ALERT_PROBE_(SECRET|URL))\b' \
  && fail "probe (0285): read_channel_state echoes a psql row, the URL or the secret — it would reach the log" \
  || pass "probe (0285): read_channel_state echoes only fixed words, a validated status and an exit code"
#     Review R2 drift: check 13's FAIL text tells the operator which cause class means what, so it
#     must name each class exactly as the probe logs it — else the pointer silently stops matching.
PROBE_CAUSE_DRIFT=""
for cause in 'timed out' 'killed' 'exec or psql failed, rc=' 'unexpected output'; do
  printf '%s\n' "$PROBE_READER" | grep -qF "echo \"unreadable ($cause" || PROBE_CAUSE_DRIFT="$PROBE_CAUSE_DRIFT [probe: $cause]"
  grep -qF "'$cause" "$REPO_ROOT/profile-checks.sh" || PROBE_CAUSE_DRIFT="$PROBE_CAUSE_DRIFT [check 13: $cause]"
done
#     Review R3: rc 1 (the query failed) and rc 2 (cannot connect) mean different things, so check
#     13 must name each one on its own.
for exit_code in 1 2; do
  grep -qF "'exec or psql failed, rc=$exit_code'" "$REPO_ROOT/profile-checks.sh" \
    || PROBE_CAUSE_DRIFT="$PROBE_CAUSE_DRIFT [check 13: rc=$exit_code]"
done
[ -z "$PROBE_CAUSE_DRIFT" ] \
  && pass "probe (0285): every unreadable cause class the probe logs is named, same spelling, in check 13's FAIL text" \
  || fail "DRIFT: unreadable cause classes differ between the probe and check 13's FAIL text:$PROBE_CAUSE_DRIFT"
PROBE_SQL=$(printf '%s' "$PROBE_PSQL_LINE" | sed -n 's/.* -c "\([^"]*\)".*/\1/p')
{ printf '%s' "$PROBE_SQL" | grep -qE '^SELECT ' \
    && ! printf '%s' "$PROBE_SQL" | grep -qiE '\b(insert|update|delete|alter|drop|create|truncate|grant|revoke|copy|call|do)\b|;'; } \
  && pass "probe (0285): the state query is one plain SELECT ('$PROBE_SQL')" \
  || fail "probe (0285): the state query is not a single plain SELECT: '$PROBE_SQL'"
printf '%s' "$PROBE_SQL" | grep -qiE "payload|secret" \
  && fail "probe (0285): the state query selects the channel's payload/secret — it must read status and url only" \
  || pass "probe (0285): the state query never selects the channel's payload (where the secret lives)"
printf '%s' "$PROBE_PSQL_LINE" | grep -qE '\$\{?ALERT_PROBE_(SECRET|URL)' \
  && fail "probe (0285): ALERT_PROBE_SECRET or ALERT_PROBE_URL is on the docker/psql argv" \
  || pass "probe (0285): the docker/psql line never references ALERT_PROBE_SECRET or ALERT_PROBE_URL"
printf '%s\n' "$PROBE_BLOCK" | grep -v '^[[:space:]]*#' | grep -E '^[[:space:]]*say ' | grep -qE '\$\{?(ALERT_PROBE_(SECRET|URL)|url|line|rows)\b' \
  && fail "probe (0285): a say line logs the secret, the URL or raw psql output" \
  || pass "probe (0285): no say line logs the secret, the URL or raw psql output"
#     The version pin. The query was verified against ONE image tag; an upgrade is a deliberate
#     edit of the compose file, and this makes it re-verify the schema before it ships instead of
#     paging nightly afterwards with `unreadable` (owner ruling Q2, 2026-09-28).
COMPOSE_UPTRACE_TAG=$(sed -n 's/^[[:space:]]*image: uptrace\/uptrace:\([^[:space:]]*\)$/\1/p' "$TS" | head -1)
VERIFIED_UPTRACE_TAG=$(printf '%s\n' "$PROBE_BLOCK" | sed -n 's/^# Schema verified against: uptrace\/uptrace:\([^[:space:]]*\) .*/\1/p' | head -1)
[ -n "$COMPOSE_UPTRACE_TAG" ] && [ -n "$VERIFIED_UPTRACE_TAG" ] \
  && pass "probe (0285): read the compose tag ($COMPOSE_UPTRACE_TAG) and the verified tag ($VERIFIED_UPTRACE_TAG)" \
  || fail "probe (0285): could not read the compose uptrace tag or the probe's 'Schema verified against' line — the pin is vacuous"
[ -n "$COMPOSE_UPTRACE_TAG" ] && [ "$COMPOSE_UPTRACE_TAG" = "$VERIFIED_UPTRACE_TAG" ] \
  && pass "probe (0285): the pinned monitoring image equals the version the channel-state query was verified against" \
  || fail "PIN: the compose runs uptrace/uptrace:$COMPOSE_UPTRACE_TAG but the channel-state query was verified against $VERIFIED_UPTRACE_TAG. Re-verify the notif_channels schema on the new version (task 0285 step 0), then update the 'Schema verified against' line"
#     Key-name drift: three files in two languages must spell the marker key the same way, and
#     nothing else would catch them diverging — check 13 would FAIL daily with 'no channel_state'.
printf '%s\n' "$PROBE_BLOCK" | grep -qF '"channel_state":"${channel_state}"' \
  && grep -qE '^[[:space:]]*channel_state: z\.unknown\(\)\.optional\(\),$' "$RELAY" \
  && grep -qE '^[[:space:]]*: \{ channel_state: channelState \}\),$' "$RELAY" \
  && grep -qF 'json_field "$PROBE_MARKER" channel_state' "$REPO_ROOT/profile-checks.sh" \
  && pass "channel_state: spelled the same in the probe script, AlertRelay.ts (schema + marker) and profile-checks.sh" \
  || fail "DRIFT: 'channel_state' is not spelled identically in the probe body, AlertRelay.ts's schema and marker, and profile-checks.sh's reader"

echo "== Structural: daily name-change digest (task 0283) =="
# Review R1. setup-profile.sh's executable bit went 755 → 644 in the working tree during this
# task and nothing noticed: build-deploy-profile.sh runs its own `chmod +x` on the copy before
# scp, so every deploy kept working while `./setup-profile.sh` run directly failed — and that
# same chmod re-dirties the tree on every deploy. The filesystem bit is asserted rather than the
# git index mode on purpose: the index still read 100755 the whole time, so an index check would
# have missed this exact drift, and `[ -x ]` needs no git and no work tree.
[ -x "$P" ] \
  && pass "setup-profile.sh is executable (the bit build-deploy-profile.sh's own chmod +x masks)" \
  || fail "setup-profile.sh has lost its executable bit — deploys still work (build-deploy-profile.sh chmods the copy) but ./setup-profile.sh does not, and the chmod re-dirties the tree every deploy. Fix: chmod 755 setup-profile.sh"
# The digest's ONE guarantee is "exactly one message a day". Nothing in the code can enforce
# that — cron owns the schedule — so the cron line itself is what has to be asserted, and the
# only way this design can double-send is two cron lines. $CRON_HEADER is extracted above
# (the always-present block, written in BOTH backup modes).
DIGEST_CRON=$(printf '%s\n' "$CRON_HEADER" \
  | grep -E '^0 [0-9]+ \* \* \* root docker compose -f \$PROFILE_DIR/docker-compose\.yml exec -T profile-api npm run digest:name-changes' || true)
n_digest_cron=$(printf '%s\n' "$DIGEST_CRON" | grep -c . || true)
[ "$n_digest_cron" = "1" ] \
  && pass "cron header: EXACTLY ONE name-change digest line (two would double-send every day)" \
  || fail "cron header: found $n_digest_cron digest cron line(s), expected exactly 1 — 0 means no digest, 2+ means a duplicate message every day (0283)"
# A daily schedule, not */N. An hour field of */2 turns the heartbeat into a flood and would
# still match the anchor above if the anchor were looser.
DIGEST_HOUR=$(printf '%s\n' "$DIGEST_CRON" | awk 'NR==1{print $2}')
DIGEST_DOM=$(printf '%s\n' "$DIGEST_CRON" | awk 'NR==1{print $3}')
DIGEST_MON=$(printf '%s\n' "$DIGEST_CRON" | awk 'NR==1{print $4}')
DIGEST_DOW=$(printf '%s\n' "$DIGEST_CRON" | awk 'NR==1{print $5}')
{ printf '%s' "$DIGEST_HOUR" | grep -qE '^[0-9]+$'; } \
  && [ "$DIGEST_DOM" = "*" ] && [ "$DIGEST_MON" = "*" ] && [ "$DIGEST_DOW" = "*" ] \
  && pass "cron header: the digest runs DAILY at a fixed hour ($DIGEST_HOUR:00 UTC)" \
  || fail "cron header: the digest schedule is not a fixed daily hour (hour='$DIGEST_HOUR' dom='$DIGEST_DOM' mon='$DIGEST_MON' dow='$DIGEST_DOW') — a */N hour would flood the topic"
# Review R3: pin the OWNER'S hour, not merely "some fixed hour". The other two rulings on this
# feature are mechanically pinned (the zero-count grep below, the negative-age guard at the end);
# without this one, moving the digest to any other hour passes every test. The minute is already
# pinned to 0 by the anchor above. ⛔ Only the owner changes this number.
[ "$DIGEST_HOUR" = "4" ] \
  && pass "cron header: …and the hour is the owner's 04:00 UTC = 07:00 MSK (Moscow is UTC+3 year-round)" \
  || fail "cron header: the digest hour is '$DIGEST_HOUR', not the owner's 4 (04:00 UTC = 07:00 MSK, ruling at the 0283 plan gate). The hour is an owner decision — do not re-point it here, take it back to the owner"
# </dev/null so a compose exec can never consume cron's stdin, and a log to look in when it
# fails (the exit code is the only other signal, and nothing else records it).
printf '%s\n' "$DIGEST_CRON" | grep -qF '</dev/null' \
  && pass "cron header: the digest line closes stdin (</dev/null)" \
  || fail "cron header: the digest line does not redirect </dev/null — a compose exec can consume cron's stdin"
printf '%s\n' "$DIGEST_CRON" | grep -qE '>> /var/log/[A-Za-z0-9._-]+\.log 2>&1$' \
  && pass "cron header: the digest line appends stdout+stderr to a log file" \
  || fail "cron header: the digest line does not append to a /var/log file — a failure would leave no trace at all"
# Drift guard: the npm script the cron line invokes must exist, and its target file must exist.
# Two files agreeing on one string, the same shape as the ALERT_PROBE_MARKER_PATH guard above.
DIGEST_SCRIPT=$(printf '%s\n' "$DIGEST_CRON" | sed -n 's/.*npm run \([A-Za-z0-9:_-]*\).*/\1/p' | head -1)
DIGEST_SCRIPT_CMD=$(sed -n "s/^[[:space:]]*\"$DIGEST_SCRIPT\": \"\(.*\)\",\{0,1\}$/\1/p" "$REPO_ROOT/package.json" | head -1)
[ -n "$DIGEST_SCRIPT" ] && [ -n "$DIGEST_SCRIPT_CMD" ] \
  && pass "package.json declares the '$DIGEST_SCRIPT' script the cron line runs" \
  || fail "package.json has no '$DIGEST_SCRIPT' script — the cron line would log 'Missing script' daily and send nothing (0283)"
DIGEST_ENTRY=$(printf '%s\n' "$DIGEST_SCRIPT_CMD" | tr ' ' '\n' | grep -E '^src/.*\.ts$' | head -1)
[ -n "$DIGEST_ENTRY" ] && [ -f "$REPO_ROOT/$DIGEST_ENTRY" ] \
  && pass "…and its entry file exists ($DIGEST_ENTRY)" \
  || fail "the '$DIGEST_SCRIPT' script's entry file is missing or unreadable ('$DIGEST_ENTRY')"
# The trap: a one-shot CLI that imports Server.ts BINDS A PORT at module load, so on the box it
# fights the running container for the port. ⚠️ Stakes stated honestly (review R7): this is NOT
# silent — EADDRINUSE exits non-zero, the marker is withheld, and check 12 pages within 26h. It
# is asserted statically because the failure would otherwise first appear in production, a day
# late, wearing the costume of a broken Telegram path.
#
# ⚠️ Scanned over the WHOLE comment-stripped file, not over `^import ` lines (review R7). The
# line-anchored form missed three real shapes: `"./Server.js"` (a legal respelling), a
# `require()`, and — the one prettier actually produces — a MULTI-LINE import whose
# `} from "./Routes";` line does not start with `import `. Matching the quoted specifier
# instead catches all of them, including a bare side-effect import.
DIGEST_ENTRY_CODE=$(sed -e 's#//.*##' "$REPO_ROOT/$DIGEST_ENTRY" | grep -v '^[[:space:]]*\*')
printf '%s\n' "$DIGEST_ENTRY_CODE" | grep -qE '["'"'"']\./NameChangeDigest(\.[jt]s)?["'"'"']' \
  && pass "digest entry: the specifier scan matches this file's own import shape (the checks below are not vacuous)" \
  || fail "digest entry: the specifier scan cannot even find ./NameChangeDigest in $DIGEST_ENTRY — the import-surface checks below would be vacuous"
for forbidden in Server Routes Telemetry; do
  printf '%s\n' "$DIGEST_ENTRY_CODE" | grep -qE "[\"']\./${forbidden}(\.[jt]s)?[\"']" \
    && fail "digest entry: references ./$forbidden — Server.ts calls listen() at module load, so the cron job would bind a port and be killed by EADDRINUSE (0283)" \
    || pass "digest entry: does not reference ./$forbidden in any import, re-export or require"
done
# The owner's zero-count ruling, made mechanical. A later "optimisation" that skips the empty
# digest DELETES THE HEARTBEAT — the absence of the daily message is the only signal that
# Telegram delivery from this box has stopped. Comments are stripped first so the ruling can be
# written out in prose in the file without tripping its own guard.
DIGEST_MODULE="$REPO_ROOT/src/profile-server/NameChangeDigest.ts"
DIGEST_CODE=$(sed -e 's#//.*##' "$DIGEST_MODULE" | grep -v '^[[:space:]]*\*' | grep -v '^[[:space:]]*/\*')
printf '%s\n' "$DIGEST_CODE" | grep -q 'countPendingNameChanges' \
  && pass "digest module: comment-stripped source still holds its code (the guard below is not vacuous)" \
  || fail "digest module: comment stripping ate the code — the zero-count guard below would be vacuous"
# ⚠️ Every operator must be listed explicitly: the trailing [01] means `<` does NOT also match
# `<= 1`. `>=` was missing (review R5), so `count >= 1` slipped through. This guard pins SYNTAX
# and will never be exhaustive — `!count`, a yoda `0 === count` and an env-gated skip all evade
# it. The real backstop is the jest case "SENDS when the count is zero", which pins BEHAVIOUR.
printf '%s\n' "$DIGEST_CODE" | grep -qE 'count[[:space:]]*(===|==|!==|!=|<|<=|>|>=)[[:space:]]*[01]' \
  && fail "digest module: a branch compares the pending count against 0/1 — a 'skip when empty' path REMOVES the heartbeat (owner ruling 2026-09-17, task 0283)" \
  || pass "digest module: no zero-count branch — the digest sends unconditionally (owner ruling)"
# Drift guard: the compose bind mount's CONTAINER path must equal the directory of
# NAME_CHANGE_DIGEST_MARKER_PATH, or the marker is written where nothing reads it and check 12
# pages forever. Same failure shape as the 0284 probe marker above.
DIGEST_MARKER_PATH=$(sed -n 's/^[[:space:]]*"\(\/var\/[^"]*last-name-change-digest\.json\)";$/\1/p' "$DIGEST_MODULE" | head -1)
[ -n "$DIGEST_MARKER_PATH" ] && pass "NameChangeDigest.ts: read NAME_CHANGE_DIGEST_MARKER_PATH ($DIGEST_MARKER_PATH)" \
  || fail "NameChangeDigest.ts: could not read NAME_CHANGE_DIGEST_MARKER_PATH (its shape changed — the drift guard is vacuous)"
DIGEST_MARKER_DIR="${DIGEST_MARKER_PATH%/*}"
DIGEST_MOUNT_TARGET=$(sed -n 's/^[[:space:]]*- \.\/digest:\(\/[^[:space:]]*\)$/\1/p' "$P" | head -1)
[ -n "$DIGEST_MOUNT_TARGET" ] && pass "setup-profile.sh: compose bind-mounts ./digest ($DIGEST_MOUNT_TARGET)" \
  || fail "setup-profile.sh: no './digest:<container path>' bind mount — a container-written marker is invisible to checks.sh"
[ -n "$DIGEST_MARKER_DIR" ] && [ "$DIGEST_MARKER_DIR" = "$DIGEST_MOUNT_TARGET" ] \
  && pass "the digest bind mount target equals NAME_CHANGE_DIGEST_MARKER_PATH's directory" \
  || fail "DRIFT: NameChangeDigest.ts writes into '$DIGEST_MARKER_DIR' but compose mounts '$DIGEST_MOUNT_TARGET' — the marker would be written where nothing reads it"
# ⛔ A sibling of alerts/, never the same directory: two different signals that must not be
# confusable, and mounting backups/ would expose every encrypted dump to the app container.
{ [ "$DIGEST_MOUNT_TARGET" != "$MOUNT_TARGET" ] && printf '%s' "$DIGEST_MOUNT_TARGET" | grep -qv 'backups'; } \
  && pass "the digest marker has its OWN directory (not alerts/, not backups/)" \
  || fail "the digest bind mount collides with another signal's directory ('$DIGEST_MOUNT_TARGET')"
grep -q 'mkdir -p "\$PROFILE_DIR/digest" && chmod 700 "\$PROFILE_DIR/digest"' "$P" \
  && pass "setup-profile.sh: creates digest/ 0700 before the compose file mounts it" \
  || fail "setup-profile.sh: digest/ is mounted but never created 0700 — Docker would create it root-owned and world-readable"
# Review R4 / owner disposition, 2026-09-18: the deploy runs the digest ONCE, after the cron file
# is written, so a deploy landing in the 04:00–08:00 UTC window cannot page for a healthy system.
# ⛔ Seeded by a REAL send, never by a synthetic marker — the marker asserts that a message
# ARRIVED. Asserted as an in-script invocation of the same npm script the cron line runs.
grep -qE "^if docker compose exec -T profile-api npm run $DIGEST_SCRIPT; then$" "$P" \
  && pass "setup-profile.sh: runs the digest once at deploy time (seeds check 12's marker from a real send)" \
  || fail "setup-profile.sh: no deploy-time 'npm run $DIGEST_SCRIPT' — a deploy between 04:00 and 08:00 UTC installs check 12 with no marker and pages once for a healthy system (0283 review R4)"
awk "/npm run $DIGEST_SCRIPT; then/{b=1} b{print} b && /^fi\$/{exit}" "$P" | grep -q 'NOT aborted' \
  && pass "…and it WARNS rather than aborting the deploy (check 12 already observes the failure)" \
  || fail "setup-profile.sh: the deploy-time digest does not say it is non-fatal — a Telegram outage must not block a deploy, and the convention here is 'warn where something else already watches'"
# And check 12 must actually exist, run, and read the same place on the HOST.
C="$REPO_ROOT/profile-checks.sh"
grep -qE '^DIGEST_MARKER=.*\$PROFILE_DIR/digest/last-name-change-digest\.json\}"$' "$C" \
  && pass "profile-checks.sh: reads \$PROFILE_DIR/digest/last-name-change-digest.json" \
  || fail "profile-checks.sh: DIGEST_MARKER does not default to \$PROFILE_DIR/digest/last-name-change-digest.json"
grep -qE '^check_name_change_digest\(\) \{' "$C" && grep -qE '^check_name_change_digest$' "$C" \
  && pass "profile-checks.sh: check 12 is defined AND called (a defined-but-uncalled check watches nothing)" \
  || fail "profile-checks.sh: check_name_change_digest is not both defined and called"
# The negative-age guard (owner ruling at the 0283 plan gate; the 0284 review R5 lesson).
# A future-dated finished_at gives a negative age that -gt reads as FRESH, so the check would
# stay green for the whole duration of a clock skew — worse than no check at all.
awk '/^check_name_change_digest\(\) \{/{b=1} b{print} b && /^\}$/{exit}' "$C" | grep -qE '\[ "\$age_h" -lt 0 \]' \
  && pass "profile-checks.sh: check 12 has the negative-age guard (a future-dated marker must never read GREEN)" \
  || fail "profile-checks.sh: check 12 has NO negative-age guard — clock skew would hold it green while no digest arrived (0283 owner ruling)"

# ── Structural: version-tagged profile deploys (task 0355) ────────────────────
# LINTS over the text; the behaviour is T20–T32 above. What these catch: the shipped-files
# pathspec drifting away from what Dockerfile.profile actually copies (a changed file that
# ships but is not checked would deploy "clean" and be tagged on the wrong content), the
# build metadata moving above the npm ci layer, a compose env_file able to override the
# baked version, and the deploy growing a package.json write or a forced/bulk tag push.
echo "== Structural: version-tagged profile deploys (0355) =="
B="$REPO_ROOT/build-deploy-profile.sh"
D="$REPO_ROOT/Dockerfile.profile"
P="$REPO_ROOT/setup-profile.sh"
H="$REPO_ROOT/scripts/deploy-version-tag.sh"
SHIPPED_LINE=$(grep -E '^PROFILE_SHIPPED_PATHS=\(.*\)$' "$B" | head -1)
[ -n "$SHIPPED_LINE" ] && pass "build-deploy-profile.sh: PROFILE_SHIPPED_PATHS is one single-line array" \
  || fail "build-deploy-profile.sh: no single-line PROFILE_SHIPPED_PATHS=( … ) (the checks below would be vacuous)"
SHIPPED=" $(printf '%s' "$SHIPPED_LINE" | sed -E 's/^PROFILE_SHIPPED_PATHS=\((.*)\)$/\1/') "
n_copy=0; missing=""
while read -r src; do
  [ -n "$src" ] || continue
  n_copy=$((n_copy+1))
  if printf '%s' "$src" | grep -q '[*?[]'; then
    # A glob source (package*.json): every file it matches in the repo must be listed.
    for f in $(cd "$REPO_ROOT" && compgen -G "$src"); do
      case "$SHIPPED" in *" $f "*) : ;; *) missing="$missing $f" ;; esac
    done
  else
    case "$SHIPPED" in *" ${src%/} "*) : ;; *) missing="$missing $src" ;; esac
  fi
done < <(awk '/^COPY /{ for (i = 2; i < NF; i++) if ($i !~ /^--/) print $i }' "$D")
[ "$n_copy" -ge 4 ] && [ -z "$missing" ] \
  && pass "every Dockerfile.profile COPY source ($n_copy) is in PROFILE_SHIPPED_PATHS" \
  || fail "Dockerfile.profile COPY source(s) missing from PROFILE_SHIPPED_PATHS:${missing:- (found only $n_copy COPY sources)}"
for f in Dockerfile.profile setup-profile.sh profile-backup.sh profile-checks.sh build-deploy-profile.sh scripts/deploy-version-tag.sh; do
  case "$SHIPPED" in *" $f "*) : ;; *) missing="$missing $f" ;; esac
done
[ -z "$missing" ] && pass "PROFILE_SHIPPED_PATHS also covers the Dockerfile, the three SCP'd scripts, this script and the helper" \
  || fail "PROFILE_SHIPPED_PATHS lacks:$missing"
grep -qE '^if DIRTY_SHIPPED=\$\(deploy_shipped_tree_dirty "\$\{PROFILE_SHIPPED_PATHS\[@\]\}"\); then$' "$B" \
  && pass "build-deploy-profile.sh: the dirty check uses PROFILE_SHIPPED_PATHS" \
  || fail "build-deploy-profile.sh: the dirty check does not call deploy_shipped_tree_dirty with PROFILE_SHIPPED_PATHS"
grep -nE '^[^#]*git status --porcelain' "$B" >/dev/null \
  && fail "build-deploy-profile.sh: a raw 'git status --porcelain' is back (the whole-tree check would refuse on any doc edit)" \
  || pass "build-deploy-profile.sh: no whole-tree git status left"
for l in 'ARG PROFILE_BUILD_VERSION=unknown' 'ARG PROFILE_BUILD_COMMIT=unknown' \
         'ENV PROFILE_BUILD_VERSION="$PROFILE_BUILD_VERSION"' 'ENV PROFILE_BUILD_COMMIT="$PROFILE_BUILD_COMMIT"'; do
  grep -qxF "$l" "$D" && pass "Dockerfile.profile: '$l'" || fail "Dockerfile.profile: missing '$l'"
done
grep -qE '^LABEL org\.opencontainers\.image\.version="\$PROFILE_BUILD_VERSION" org\.opencontainers\.image\.revision="\$PROFILE_BUILD_COMMIT"$' "$D" \
  && pass "Dockerfile.profile: OCI version + revision labels" || fail "Dockerfile.profile: no OCI version/revision LABEL line"
awk '/^RUN /{r=NR} /^COPY /{c=NR} /^ARG PROFILE_BUILD_/{if(!a)a=NR} /^CMD /{m=NR} END{exit !(a>0 && a>r && a>c && a<m)}' "$D" \
  && pass "Dockerfile.profile: the build metadata sits after the last RUN/COPY and before CMD (npm ci stays cached)" \
  || fail "Dockerfile.profile: the ARG PROFILE_BUILD_* lines are not after the last RUN/COPY and before CMD — every deploy would re-run npm ci"
grep -q 'PROFILE_BUILD_' "$P" \
  && fail "setup-profile.sh names PROFILE_BUILD_* — a profile.env key would override the version baked into the image" \
  || pass "setup-profile.sh never names PROFILE_BUILD_* (no env_file can override the baked version)"
# Task 0356: the telemetry deploy now tags too, so the same lints cover it.
for f in "$B" "$H" "$REPO_ROOT/build-deploy-telemetry.sh"; do
  n=$(basename "$f")
  [ -f "$f" ] || { fail "$n: missing"; continue; }
  grep -nE '^[^#]*bump-version' "$f" >/dev/null && fail "$n: calls bump-version.js" || pass "$n: never calls bump-version.js"
  grep -nE '^[^#]*>>? *"?(\./)?package(-lock)?\.json' "$f" >/dev/null && fail "$n: writes package.json" || pass "$n: never writes package.json"
  grep -nE '^[^#]*git +push[^#]*(--tags|--follow-tags|--force|--mirror|--all| -f( |$))' "$f" >/dev/null \
    && fail "$n: has a forced/bulk git push" || pass "$n: no git push --tags/--follow-tags/--force/-f"
  grep -nE '^[^#]*git +tag[^#]*( -f( |$)|--force)' "$f" >/dev/null && fail "$n: has git tag -f" || pass "$n: no git tag -f"
  # No quote before `git`: a message that merely says "no git commit" is not a call.
  grep -nE '^[^#"]*git +commit' "$f" >/dev/null && fail "$n: runs git commit" || pass "$n: no git commit"
done
# ══ Task 0356: version-tagged telemetry deploys ══════════════════════════════
# Same scheme as 0355 (ADR-117): <base>-telemetry.<N>, e.g. 0.0.155-telemetry.1. The telemetry
# box runs only pinned third-party images, so the name means "which commit of OUR setup
# scripts is live". It reaches three places: the staged env → a marker on the box
# (/opt/uptrace/deployed-version), the local deploy record, and — only after the remote
# setup succeeded — an annotated git tag. A deploy whose SHIPPED telemetry files are dirty is
# refused before anything touches the box (owner ruling at 0356's plan gate, 2026-10-01).
# Driven through the REAL build-deploy-telemetry.sh with the same stubs; setup-telemetry.sh is
# copied in only as the uploaded file (and for the Uptrace-version grep) — never executed.
# The base is read from package.json AT THE COMMIT (git show), never the working tree: the
# fixture's working-tree package.json deliberately says 0.0.999, so every name below that
# reads 0.0.155 proves where it came from.
TEL_HOST="203.0.113.20"                                   # documentation range — not a real box
TEL_TOKEN='synthetic-0356-project-token-not-real'
TEL_SECRET='synthetic-0356-secret-key-not-real'
TEL_ADMIN='synthetic-0356-admin "pass" not-real'
TEL_GIT_ALL=$(mktemp)                                     # every telemetry run's git argv, for the cross-run lint
TEL_RUN_COUNT=0
TEL_UNSTUBBED_RUNS=0
TEL_PKG_JSON=$(printf '{\n  "name": "fixture",\n  "version": "0.0.999"\n}')

run_telemetry_deploy() {  # extra env as VAR=VAL ... ; sets RC + populates $WORK logs
    RUN="$WORK/trun"; rm -rf "$RUN"; mkdir -p "$RUN/scripts"
    cp "$REPO_ROOT/build-deploy-telemetry.sh" "$RUN/build-deploy-telemetry.sh"
    cp "$REPO_ROOT/setup-telemetry.sh" "$RUN/setup-telemetry.sh"
    # HELPER_STUB=absent (a caller shell variable, as in run_deploy) leaves the helper out.
    if [ "${HELPER_STUB:-}" != "absent" ] && [ -f "$REPO_ROOT/scripts/deploy-version-tag.sh" ]; then
        cp "$REPO_ROOT/scripts/deploy-version-tag.sh" "$RUN/scripts/deploy-version-tag.sh"
    fi
    printf '%s\n' "$TEL_PKG_JSON" > "$RUN/package.json"
    : > "$WORK/fixture_ssh_key"; chmod 600 "$WORK/fixture_ssh_key"
    rm -f "$WORK/docker.argv" "$WORK/ssh.argv" "$WORK/scp.argv" "$WORK/sshpass.argv" \
          "$WORK/sshpass.filemode" "$WORK/scp.called" "$WORK/staged.env" \
          "$WORK/git.argv" "$WORK/calls.log" "$WORK/unstubbed.log"
    # env -i + an allow-list, for the same reason as run_deploy: nothing of the operator's
    # real environment (their .env.telemetry.secret values) may reach the staged file.
    ( cd "$RUN"
      env -i \
        PATH="$BIN:$PATH" HOME="$WORK/home" TMPDIR="${TMPDIR:-/tmp}" \
        TELEMETRY_SERVER_HOST="$TEL_HOST" \
        UPTRACE_PROJECT_TOKEN="$TEL_TOKEN" UPTRACE_SECRET_KEY="$TEL_SECRET" UPTRACE_ADMIN_PASSWORD="$TEL_ADMIN" \
        TELEMETRY_SSH_KEY="$WORK/fixture_ssh_key" \
        TELEMETRY_DEPLOY_RECORD="$RECORD" \
        "$@" \
        bash build-deploy-telemetry.sh > "$WORK/out.log" 2>&1 )
    RC=$?
    cat "$WORK/git.argv" >> "$TEL_GIT_ALL" 2>/dev/null
    TEL_RUN_COUNT=$((TEL_RUN_COUNT + 1))
    if [ -s "$WORK/unstubbed.log" ]; then
        TEL_UNSTUBBED_RUNS=$((TEL_UNSTUBBED_RUNS + 1))
        fail "run_telemetry_deploy made a git call the stub does not know: $(head -1 "$WORK/unstubbed.log") (see $WORK/out.log)"
    fi
}
TNEW() { NEW; RECORD="$WORK/home/.geoconflict/telemetry-deploy.log"; echo telemetry > "$WORK/marker"; }
staged_value() { ( . "$WORK/staged.env" >/dev/null 2>&1; eval "printf '%s' \"\${$1-}\"" ); }
tel_no_box() {  # <label> — nothing reached the box, nothing was tagged, nothing recorded
    [ ! -f "$WORK/scp.called" ] && pass "$1: no SCP" || fail "$1: an SCP ran"
    grep -q 'setup-telemetry\.sh' "$WORK/ssh.argv" 2>/dev/null && fail "$1: the remote setup ran" || pass "$1: no remote setup run"
    grep -qE '^git (tag -a|push)' "$WORK/git.argv" 2>/dev/null && fail "$1: it tagged or pushed" || pass "$1: no git tag / git push"
    [ ! -f "$RECORD" ] && pass "$1: no record block (no number used)" || fail "$1: a record block was written"
}

echo "== T40: tagged telemetry deploy — name, staged env, annotated tag AFTER the remote run, record (0356) =="
TNEW
run_telemetry_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC (expected 0); see $WORK/out.log"
[ "$(staged_value TELEMETRY_DEPLOY_VERSION)" = "0.0.155-telemetry.1" ] \
  && pass "staged env: TELEMETRY_DEPLOY_VERSION=0.0.155-telemetry.1 (from the commit's package.json, not the tree's 0.0.999)" \
  || fail "staged TELEMETRY_DEPLOY_VERSION is '$(staged_value TELEMETRY_DEPLOY_VERSION)'"
grep -qx "export TELEMETRY_DEPLOY_VERSION='0.0.155-telemetry.1'" "$WORK/staged.env" 2>/dev/null \
  && pass "…as a plain single-quoted export line" || fail "no \"export TELEMETRY_DEPLOY_VERSION='0.0.155-telemetry.1'\" line"
[ "$(staged_value TELEMETRY_DEPLOY_COMMIT)" = "$T_SHA" ] \
  && pass "staged env: TELEMETRY_DEPLOY_COMMIT=<full 40-hex sha>" || fail "staged TELEMETRY_DEPLOY_COMMIT is '$(staged_value TELEMETRY_DEPLOY_COMMIT)'"
TAGLINE=$(grep '^git tag -a ' "$WORK/git.argv" 2>/dev/null | head -1)
printf '%s' "$TAGLINE" | grep -qE "^git tag -a 0\.0\.155-telemetry\.1 -m .* $T_SHA \$" \
  && pass "annotated tag 0.0.155-telemetry.1 on the captured full commit" || fail "no 'git tag -a 0.0.155-telemetry.1 -m … $T_SHA' (got: ${TAGLINE:-none})"
printf '%s' "$TAGLINE" | grep -qE 'Telemetry.{0,2}server.{0,2}deploy' && printf '%s' "$TAGLINE" | grep -q 'package_version=0.0.155' \
  && pass "tag message names the telemetry deploy and carries package_version" || fail "tag message lacks 'Telemetry server deploy' or package_version"
printf '%s' "$TAGLINE" | grep -qF "$TEL_HOST" && fail "tag message carries the host" || pass "tag message carries no host"
grep -qx 'git push origin refs/tags/0.0.155-telemetry.1 ' "$WORK/git.argv" 2>/dev/null \
  && pass "pushed exactly refs/tags/0.0.155-telemetry.1" || fail "no 'git push origin refs/tags/0.0.155-telemetry.1'"
L_DEPLOY=$(grep -n '^ssh .*setup-telemetry\.sh' "$WORK/calls.log" 2>/dev/null | tail -1 | cut -d: -f1)
L_TAG=$(grep -n '^git tag -a ' "$WORK/calls.log" 2>/dev/null | head -1 | cut -d: -f1)
[ -n "$L_DEPLOY" ] && [ -n "$L_TAG" ] && [ "$L_TAG" -gt "$L_DEPLOY" ] \
  && pass "the git tag comes AFTER the remote setup ssh" || fail "git tag not after the remote setup ssh (deploy line ${L_DEPLOY:-none}, tag line ${L_TAG:-none})"
grep -qx 'version=0.0.155-telemetry.1' "$RECORD" 2>/dev/null && grep -qx "commit=$T_SHA" "$RECORD" \
  && grep -qx 'package_version=0.0.155' "$RECORD" && grep -qx 'env=telemetry' "$RECORD" \
  && pass "record has env=telemetry, version=, commit=, package_version=" || fail "record lacks env/version/commit/package_version (see $RECORD)"
grep -qE '^timestamp=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z$' "$RECORD" 2>/dev/null && pass "record has a UTC timestamp=" || fail "record lacks timestamp="
[ "$(tail -1 "$RECORD" 2>/dev/null)" = "validation_result=ok git_tag=pushed" ] \
  && pass "record's LAST line: validation_result=ok git_tag=pushed" || fail "record's last line is '$(tail -1 "$RECORD" 2>/dev/null)'"
[ "$(grep -c '^----$' "$RECORD" 2>/dev/null)" = "1" ] && pass "exactly one record block" || fail "expected one record block"
if grep -qF "$TEL_HOST" "$RECORD" 2>/dev/null || grep -qF 'synthetic-0356' "$RECORD" 2>/dev/null \
   || grep -qE '^(host|operator)=' "$RECORD" 2>/dev/null; then
  fail "the record carries a host, an operator or a fixture secret"
else
  pass "the record carries no host, no operator and no secret"
fi
[ "$(cat "$RUN/package.json")" = "$TEL_PKG_JSON" ] && pass "package.json byte-identical afterwards" || fail "package.json was modified by the deploy"
grep -q '^git show abc1234000000000000000000000000000000000:package.json ' "$WORK/git.argv" 2>/dev/null \
  && pass "the base is read from package.json AT the captured commit (git show <sha>:package.json)" || fail "no 'git show <sha>:package.json'"
grep -q 'Deployed version: 0.0.155-telemetry.1 (git tag: pushed)' "$WORK/out.log" && grep -qF 'cat /opt/uptrace/deployed-version' "$WORK/out.log" \
  && pass "DONE names the version, the tag outcome and the on-box marker" || fail "DONE lacks 'Deployed version: … (git tag: pushed)' or the marker hint"

echo "== T41: counter = 1 + max over local tags, remote tags and the record; per server, anchored (0356) =="
TNEW
printf '%s\n' 0.0.155-telemetry.1 0.0.155-telemetry.2 0.0.155-profile.40 0.0.154-telemetry.50 pre-t4-profile-backend-infra > "$WORK/local_tags"
printf '%s\trefs/tags/%s\n' \
  1111111111111111111111111111111111111111 0.0.155-telemetry.9 \
  2222222222222222222222222222222222222222 0.0.155-telemetry.10 \
  3333333333333333333333333333333333333333 '0.0.155-telemetry.10^{}' \
  4444444444444444444444444444444444444444 0.0.155-profile.40 \
  5555555555555555555555555555555555555555 0.0.154-telemetry.50 > "$WORK/remote_tags"
mkdir -p "$(dirname "$RECORD")"
printf '%s\n' ---- version=0.0.155-telemetry.11 version=0.0.155-profile.60 \
  'validation_result=failed git_tag=skipped:deploy-not-completed' > "$RECORD"
run_telemetry_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
[ "$(staged_value TELEMETRY_DEPLOY_VERSION)" = "0.0.155-telemetry.12" ] \
  && pass "next name is 0.0.155-telemetry.12 (profile tags, other bases, ^{} and pre-t4 ignored)" \
  || fail "expected 0.0.155-telemetry.12, staged '$(staged_value TELEMETRY_DEPLOY_VERSION)'"

echo "== T42: a -dev.N package version names the base (0356) =="
TNEW; echo 0.0.155-dev.2 > "$WORK/pkg_version"
run_telemetry_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
[ "$(staged_value TELEMETRY_DEPLOY_VERSION)" = "0.0.155-telemetry.1" ] && pass "0.0.155-dev.2 → 0.0.155-telemetry.1" \
  || fail "0.0.155-dev.2 named '$(staged_value TELEMETRY_DEPLOY_VERSION)'"
grep -qx 'package_version=0.0.155-dev.2' "$RECORD" 2>/dev/null && pass "record keeps the raw package_version" || fail "record lacks package_version=0.0.155-dev.2"

echo "== T43: an odd package version stops before the box is touched (0356) =="
TNEW; echo 1.2 > "$WORK/pkg_version"
run_telemetry_deploy
[ "$RC" -ne 0 ] && pass "version '1.2' → deploy refused (rc=$RC)" || fail "version '1.2' did not stop the deploy"
tel_no_box "T43"
grep -q 'Nothing was sent to the box' "$WORK/out.log" && pass "…saying nothing was sent to the box" || fail "no 'Nothing was sent to the box' message"

echo "== T44: uncommitted SHIPPED telemetry files refuse the deploy before the box (owner ruling 2026-10-01) =="
TNEW; printf ' M setup-telemetry.sh\n?? scripts/deploy-version-tag.sh\n' > "$WORK/dirty"
run_telemetry_deploy
[ "$RC" -ne 0 ] && pass "dirty setup-telemetry.sh → deploy refused (rc=$RC)" || fail "a dirty shipped telemetry file did not stop the deploy"
grep -q 'setup-telemetry.sh' "$WORK/out.log" && grep -q 'scripts/deploy-version-tag.sh' "$WORK/out.log" \
  && pass "…listing the dirty paths" || fail "the refusal does not list the dirty paths"
grep -q 'Commit, then redeploy' "$WORK/out.log" && pass "…saying 'Commit, then redeploy'" || fail "no 'Commit, then redeploy' hint"
[ ! -f "$WORK/ssh.argv" ] && pass "…before even the read-only preflight SSH" || fail "an SSH ran before the refusal"
tel_no_box "T44"
grep -qE '^git status --porcelain --untracked-files=normal -- setup-telemetry\.sh build-deploy-telemetry\.sh scripts/deploy-version-tag\.sh $' "$WORK/git.argv" 2>/dev/null \
  && pass "the dirty check is scoped to exactly the three shipped telemetry files" || fail "git status was not scoped to the telemetry shipped paths"

echo "== T45: uncommitted changes OUTSIDE the shipped files (docs, src/, package.json) still deploy and tag (0356) =="
TNEW; printf ' M ai-agents/tasks/backlog/notes.md\n M src/core/game/GameImpl.ts\n M package.json\n?? scratch.txt\n' > "$WORK/dirty"
run_telemetry_deploy
[ "$RC" -eq 0 ] && pass "non-shipped changes → deploy proceeds (rc=0)" || fail "a non-shipped change stopped the deploy (rc=$RC); see $WORK/out.log"
[ "$(tail -1 "$RECORD" 2>/dev/null)" = "validation_result=ok git_tag=pushed" ] && pass "…and it is tagged" || fail "record's last line is '$(tail -1 "$RECORD" 2>/dev/null)'"

echo "== T46: a failed remote setup does not tag, records its name, and uses up its number (0356) =="
TNEW; : > "$WORK/fail_deploy"
run_telemetry_deploy
[ "$RC" -ne 0 ] && pass "deploy failed (rc=$RC)" || fail "fail_deploy did not fail the deploy"
grep -qE '^git (tag -a|push)' "$WORK/git.argv" 2>/dev/null && fail "a FAILED deploy was tagged or pushed" || pass "no git tag/push on a failed deploy"
grep -qx 'version=0.0.155-telemetry.1' "$RECORD" 2>/dev/null && pass "record names the attempt 0.0.155-telemetry.1" || fail "record lacks version=0.0.155-telemetry.1"
[ "$(tail -1 "$RECORD" 2>/dev/null)" = "validation_result=failed git_tag=skipped:deploy-not-completed" ] \
  && pass "record: validation_result=failed git_tag=skipped:deploy-not-completed" || fail "record's last line is '$(tail -1 "$RECORD" 2>/dev/null)'"
rm -f "$WORK/fail_deploy"
run_telemetry_deploy
[ "$RC" -eq 0 ] && pass "the retry deploy exited 0" || fail "retry exited $RC; see $WORK/out.log"
[ "$(staged_value TELEMETRY_DEPLOY_VERSION)" = "0.0.155-telemetry.2" ] && pass "the retry is 0.0.155-telemetry.2 (the failed attempt used up .1)" \
  || fail "the retry got '$(staged_value TELEMETRY_DEPLOY_VERSION)'"
[ "$(grep -c '^----$' "$RECORD" 2>/dev/null)" = "2" ] && [ "$(grep -c '^validation_result=' "$RECORD" 2>/dev/null)" = "2" ] \
  && pass "two attempts → two whole blocks" || fail "expected 2 record blocks"
# The single EXIT trap also owns the local 0600 staged env: before 0356 a failing env-file SCP
# under set -e skipped its rm and left that secrets file in $TMPDIR.
TNEW; : > "$WORK/scp_env_fail"
run_telemetry_deploy
[ "$RC" -ne 0 ] && pass "a failing staged-env SCP fails the deploy (rc=$RC)" || fail "a failing staged-env SCP did not fail the deploy"
ENV_SRC=$(awk '{ for (i = 1; i < NF; i++) if ($(i+1) ~ /\.uptrace-deploy-env-/) print $i }' "$WORK/scp.argv" 2>/dev/null | tail -1)
[ -n "$ENV_SRC" ] && [ ! -e "$ENV_SRC" ] && pass "…and the local 0600 staged env file is removed anyway" \
  || fail "the local staged env file was left behind after a failed SCP (${ENV_SRC:-no upload seen})"
[ "$(tail -1 "$RECORD" 2>/dev/null)" = "validation_result=failed git_tag=skipped:deploy-not-completed" ] \
  && pass "…and the attempt is recorded as failed" || fail "record's last line is '$(tail -1 "$RECORD" 2>/dev/null)'"

echo "== T47: the tag already exists → warned, nothing pushed, exit stays 0 (0356) =="
TNEW; : > "$WORK/tag_fail"
run_telemetry_deploy
[ "$RC" -eq 0 ] && pass "deploy still exits 0" || fail "a tag failure changed the exit code ($RC)"
grep -q 'WARNING' "$WORK/out.log" && grep -q 'never force it' "$WORK/out.log" && pass "…with a WARNING that says never force it" || fail "no WARNING / 'never force it' for a failed tag"
grep -q '^git push' "$WORK/git.argv" 2>/dev/null && fail "…but it pushed anyway" || pass "…and no git push"
[ "$(tail -1 "$RECORD" 2>/dev/null)" = "validation_result=ok git_tag=tag-failed" ] && pass "record: ok … git_tag=tag-failed" || fail "record's last line is '$(tail -1 "$RECORD" 2>/dev/null)'"

echo "== T48: the tag push fails → warned with the exact retry, deploy stays ok (0356) =="
TNEW; : > "$WORK/push_fail"
run_telemetry_deploy
[ "$RC" -eq 0 ] && pass "deploy still exits 0" || fail "a push failure changed the exit code ($RC)"
grep -q 'WARNING' "$WORK/out.log" && pass "…with a WARNING" || fail "no WARNING for a failed push"
grep -qF 'git push origin refs/tags/0.0.155-telemetry.1' "$WORK/out.log" && pass "…carrying the retry command" || fail "no retry command in the output"
[ "$(tail -1 "$RECORD" 2>/dev/null)" = "validation_result=ok git_tag=push-failed" ] && pass "record: ok … git_tag=push-failed" || fail "record's last line is '$(tail -1 "$RECORD" 2>/dev/null)'"

echo "== T49: git ls-remote fails → warned; the counter uses local tags + the record (0356) =="
TNEW; : > "$WORK/ls_remote_fail"; echo 0.0.155-telemetry.3 > "$WORK/local_tags"
mkdir -p "$(dirname "$RECORD")"; printf '%s\n' ---- version=0.0.155-telemetry.5 'validation_result=failed git_tag=skipped:deploy-not-completed' > "$RECORD"
run_telemetry_deploy
[ "$RC" -eq 0 ] && pass "deploy exited 0" || fail "deploy exited $RC; see $WORK/out.log"
grep -qi 'remote tags' "$WORK/out.log" && pass "warned that remote tags could not be read" || fail "no warning about the unreadable remote tags"
[ "$(staged_value TELEMETRY_DEPLOY_VERSION)" = "0.0.155-telemetry.6" ] && pass "counter from local .3 + record .5 → .6" \
  || fail "expected 0.0.155-telemetry.6, got '$(staged_value TELEMETRY_DEPLOY_VERSION)'"

echo "== T50: no git commit, or git status failing, refuses before the box (0356) =="
TNEW; : > "$WORK/no_git_head"
run_telemetry_deploy
[ "$RC" -ne 0 ] && pass "no git (rev-parse fails) → deploy refused (rc=$RC)" || fail "a deploy with no git commit was not refused"
tel_no_box "T50 no-commit"
TNEW; : > "$WORK/status_fail"
run_telemetry_deploy
[ "$RC" -ne 0 ] && pass "git status error → deploy refused (rc=$RC) — fails closed" || fail "a failing git status did not stop the deploy (fail-OPEN)"
grep -q 'git status failed' "$WORK/out.log" && pass "…saying git status failed" || fail "the refusal does not say git status failed"
tel_no_box "T50 status-fail"

echo "== T51: the version-name helper is missing → refused before the box (0356) =="
TNEW
HELPER_STUB=absent run_telemetry_deploy
[ "$RC" -ne 0 ] && pass "missing scripts/deploy-version-tag.sh → deploy refused (rc=$RC)" || fail "a missing helper did not stop the deploy"
grep -q 'Nothing was sent to the box' "$WORK/out.log" && pass "…saying nothing was sent to the box" || fail "no 'Nothing was sent to the box' message"
[ ! -f "$WORK/ssh.argv" ] && pass "…before any SSH" || fail "an SSH ran before the refusal"
tel_no_box "T51"

echo "== T52: a wrong-role preflight aborts before the SCP and uses no number (0356) =="
TNEW; echo profile > "$WORK/marker"
run_telemetry_deploy
[ "$RC" -ne 0 ] && pass "wrong-role deploy aborted (rc=$RC)" || fail "wrong-role should abort"
grep -q "provisioned as role 'profile'" "$WORK/out.log" && pass "named the wrong role" || fail "no wrong-role message"
tel_no_box "T52"

echo "== T53: password fallback — 0600 file during use, gone after success AND failure, never in argv (0356) =="
TNEW
run_telemetry_deploy TELEMETRY_SSH_KEY= TELEMETRY_SSH_PASSWORD="$SECRET_PW" ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK=1
[ "$RC" -eq 0 ] && pass "password-path deploy exited 0" || fail "password-path deploy exited $RC; see $WORK/out.log"
if [ -s "$WORK/sshpass.filemode" ] && awk '$2!="600"{bad=1} END{exit bad+0}' "$WORK/sshpass.filemode"; then
  pass "sshpass password file was mode 0600 on every use"; else fail "sshpass password file not 0600 (or sshpass never used)"; fi
pwfile=$(awk 'NR==1{print $1}' "$WORK/sshpass.filemode" 2>/dev/null)
[ -n "$pwfile" ] && [ ! -f "$pwfile" ] && pass "password file removed after a successful deploy" || fail "password file left after success (${pwfile:-none})"
grep -rqF "$SECRET_PW" "$WORK"/*.argv "$WORK/calls.log" 2>/dev/null && fail "SSH password LEAKED into an argv" || pass "password never appears in any argv"
[ "$(tail -1 "$RECORD" 2>/dev/null)" = "validation_result=ok git_tag=pushed" ] && pass "…and it is recorded ok and tagged" || fail "record's last line is '$(tail -1 "$RECORD" 2>/dev/null)'"
: > "$WORK/fail_deploy"
run_telemetry_deploy TELEMETRY_SSH_KEY= TELEMETRY_SSH_PASSWORD="$SECRET_PW" ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK=1
[ "$RC" -ne 0 ] && pass "password-path failed deploy failed (rc=$RC)" || fail "fail_deploy did not fail the password-path deploy"
pwfile=$(awk 'NR==1{print $1}' "$WORK/sshpass.filemode" 2>/dev/null)
[ -n "$pwfile" ] && [ ! -f "$pwfile" ] && pass "password file removed after a FAILED deploy (the merged trap kept the cleanup)" || fail "password file left after failure (${pwfile:-none})"

echo "== T54: key auth — an INHERITED SSH_PASSWORD_FILE is not deleted at exit, success or failure (0356 review R1) =="
# The script owns SSH_PASSWORD_FILE only in the password branch. A value arriving from the
# operator's shell or a .env* file must never reach finalize_telemetry_deploy's rm -f.
TNEW
DECOY="$WORK/operator-file-not-ours"; printf 'keep me\n' > "$DECOY"
run_telemetry_deploy SSH_PASSWORD_FILE="$DECOY"
[ "$RC" -eq 0 ] && pass "key-auth deploy with an inherited SSH_PASSWORD_FILE exited 0" || fail "deploy exited $RC; see $WORK/out.log"
[ -f "$DECOY" ] && pass "inherited SSH_PASSWORD_FILE target survived a successful key-auth deploy" \
  || fail "a successful key-auth deploy DELETED the file named by an inherited SSH_PASSWORD_FILE"
: > "$WORK/fail_deploy"
run_telemetry_deploy SSH_PASSWORD_FILE="$DECOY"
[ "$RC" -ne 0 ] && pass "key-auth failed deploy failed (rc=$RC)" || fail "fail_deploy did not fail the key-auth deploy"
[ -f "$DECOY" ] && pass "inherited SSH_PASSWORD_FILE target survived a FAILED key-auth deploy" \
  || fail "a failed key-auth deploy DELETED the file named by an inherited SSH_PASSWORD_FILE"

echo "== Every telemetry run: never a forced/bulk tag push, no unstubbed git call (0356) =="
grep -qE '^git push ' "$TEL_GIT_ALL" && pass "telemetry runs did push tags (the lint below is not vacuous)" || fail "no telemetry run pushed a tag (the lint below would be vacuous)"
grep -E '^git push ' "$TEL_GIT_ALL" | grep -qE ' (-f|--force|--force-with-lease|--tags|--follow-tags|--mirror|--all|--delete|-d) ' \
  && fail "a telemetry git push carried a force/bulk/delete flag" || pass "no telemetry git push used -f/--force/--tags/--follow-tags/--mirror/--all/--delete"
grep -E '^git tag ' "$TEL_GIT_ALL" | grep -qE ' (-f|--force|-d|--delete) ' \
  && fail "a telemetry git tag call forced or deleted" || pass "no telemetry git tag -f / -d"
[ "$TEL_RUN_COUNT" -gt 0 ] && [ "$TEL_UNSTUBBED_RUNS" -eq 0 ] \
  && pass "none of the $TEL_RUN_COUNT telemetry runs made an unstubbed git call" \
  || fail "$TEL_UNSTUBBED_RUNS of $TEL_RUN_COUNT telemetry runs made an unstubbed git call (or none ran)"
rm -f "$TEL_GIT_ALL"

echo "== Behavioural: the on-box version marker (setup-telemetry.sh write_deploy_version_marker, 0356) =="
# The real function, extracted and run in a temp dir standing in for /opt/uptrace — like the
# probe-token guard above. It writes only under $UPTRACE_DIR, so running it has no other effect.
TS="$REPO_ROOT/setup-telemetry.sh"
MARKER_FN=$(awk '/^write_deploy_version_marker\(\) \{/{b=1} b{print} b && /^\}$/{exit}' "$TS")
[ -n "$MARKER_FN" ] && pass "setup-telemetry.sh: located write_deploy_version_marker (the checks below are not vacuous)" \
  || fail "setup-telemetry.sh: no write_deploy_version_marker() — the box would carry no version marker"
MDIR=$(mktemp -d)
( eval "$MARKER_FN"; UPTRACE_DIR="$MDIR"; TELEMETRY_DEPLOY_VERSION=0.0.155-telemetry.7; TELEMETRY_DEPLOY_COMMIT="$T_SHA"; write_deploy_version_marker ) > "$MDIR.out" 2>&1
[ "$(cat "$MDIR/deployed-version" 2>/dev/null)" = "$(printf 'version=0.0.155-telemetry.7\ncommit=%s' "$T_SHA")" ] \
  && pass "valid inputs → the marker is exactly 'version=…' + 'commit=…'" || fail "marker content is '$(cat "$MDIR/deployed-version" 2>/dev/null)'"
[ "$(mode_of "$MDIR/deployed-version" 2>/dev/null)" = "644" ] && pass "…mode 644" || fail "marker mode is $(mode_of "$MDIR/deployed-version" 2>/dev/null)"
[ "$(ls -A "$MDIR")" = "deployed-version" ] && pass "…and nothing else is left in the dir (temp file renamed, not copied)" || fail "the dir holds: $(ls -A "$MDIR" | tr '\n' ' ')"
grep -q 'Deployed version: 0.0.155-telemetry.7' "$MDIR.out" && pass "…and it prints the deployed version" || fail "no 'Deployed version:' line"
rm -rf "$MDIR" "$MDIR.out"
MDIR=$(mktemp -d)
( eval "$MARKER_FN"; UPTRACE_DIR="$MDIR"; unset TELEMETRY_DEPLOY_VERSION TELEMETRY_DEPLOY_COMMIT; write_deploy_version_marker ) > "$MDIR.out" 2>&1
[ "$(cat "$MDIR/deployed-version" 2>/dev/null)" = "$(printf 'version=unknown\ncommit=unknown')" ] \
  && pass "unset inputs (a hand run) → version=unknown / commit=unknown" || fail "unset-input marker is '$(cat "$MDIR/deployed-version" 2>/dev/null)'"
grep -q 'TELEMETRY_DEPLOY_VERSION' "$MDIR.out" && grep -q 'TELEMETRY_DEPLOY_COMMIT' "$MDIR.out" \
  && pass "…with a warning naming each variable" || fail "no warning naming TELEMETRY_DEPLOY_VERSION / TELEMETRY_DEPLOY_COMMIT"
rm -rf "$MDIR" "$MDIR.out"
for junk in '0.0.155-telemetry.1 extra' '../../etc/passwd' '198.51.100.7'; do
  MDIR=$(mktemp -d)
  ( eval "$MARKER_FN"; UPTRACE_DIR="$MDIR"; TELEMETRY_DEPLOY_VERSION="$junk"; TELEMETRY_DEPLOY_COMMIT="$junk"; write_deploy_version_marker ) > "$MDIR.out" 2>&1
  [ "$(cat "$MDIR/deployed-version" 2>/dev/null)" = "$(printf 'version=unknown\ncommit=unknown')" ] \
    && pass "junk input '$junk' → unknown in both fields" || fail "junk input '$junk' → marker '$(cat "$MDIR/deployed-version" 2>/dev/null)'"
  grep -qF "$junk" "$MDIR.out" "$MDIR/deployed-version" 2>/dev/null \
    && fail "junk input '$junk' was echoed into the output or the marker" || pass "…and the junk never appears in the output or the marker"
  rm -rf "$MDIR" "$MDIR.out"
done

echo "== Structural: version-tagged telemetry deploys (0356) =="
BT="$REPO_ROOT/build-deploy-telemetry.sh"
# The marker call: exactly once, top level, outside every heredoc, after the cron block and
# before SETUP COMPLETE — so it is written only when every step above succeeded under set -e.
awk '
  !inh && /<</ && !/<<</ { d=$0; sub(/.*<<-?[ ]*["'"'"']?/, "", d); sub(/[^A-Za-z_].*/, "", d); if (d != "") { inh=1; next } }
  inh { if ($0 == d) inh=0; else if ($0 ~ /write_deploy_version_marker/) bad=1; next }
  /^write_deploy_version_marker$/ { n++; c=NR }
  /^chmod 644 "\$CRON_FILE"$/ { cron=NR }
  /^print_header "SETUP COMPLETE"$/ { done=NR }
  END { exit !(n==1 && !bad && cron>0 && c>cron && c<done) }' "$TS" \
  && pass "setup-telemetry.sh: the marker is written once, outside any heredoc, after the cron block and before SETUP COMPLETE" \
  || fail "setup-telemetry.sh: write_deploy_version_marker is not called exactly once at top level between the cron block and SETUP COMPLETE"
TSHIP=$(grep -E '^TELEMETRY_SHIPPED_PATHS=\(.*\)$' "$BT" | head -1)
[ -n "$TSHIP" ] && pass "build-deploy-telemetry.sh: TELEMETRY_SHIPPED_PATHS is one single-line array" \
  || fail "build-deploy-telemetry.sh: no single-line TELEMETRY_SHIPPED_PATHS=( … ) (the checks below would be vacuous)"
TSHIP=" $(printf '%s' "$TSHIP" | sed -E 's/^TELEMETRY_SHIPPED_PATHS=\((.*)\)$/\1/') "
missing=""
for f in setup-telemetry.sh build-deploy-telemetry.sh scripts/deploy-version-tag.sh; do
  case "$TSHIP" in *" $f "*) : ;; *) missing="$missing $f" ;; esac
done
[ -z "$missing" ] && pass "TELEMETRY_SHIPPED_PATHS covers the uploaded script, this script and the helper" || fail "TELEMETRY_SHIPPED_PATHS lacks:$missing"
grep -qE '^if DIRTY_SHIPPED=\$\(deploy_shipped_tree_dirty "\$\{TELEMETRY_SHIPPED_PATHS\[@\]\}"\); then$' "$BT" \
  && pass "build-deploy-telemetry.sh: the dirty check uses TELEMETRY_SHIPPED_PATHS" \
  || fail "build-deploy-telemetry.sh: the dirty check does not call deploy_shipped_tree_dirty with TELEMETRY_SHIPPED_PATHS"
grep -nE '^[^#]*git status --porcelain' "$BT" >/dev/null \
  && fail "build-deploy-telemetry.sh: a raw whole-tree 'git status --porcelain'" || pass "build-deploy-telemetry.sh: no whole-tree git status"
# The 0284 staged-hop lint, for the two values this task adds (the deploy's own name/commit,
# not operator-supplied variables, hence their own pattern).
grep -qE "^export TELEMETRY_DEPLOY_VERSION='\\\$\{DEPLOY_VERSION\}'$" "$BT" \
  && grep -qE "^export TELEMETRY_DEPLOY_COMMIT='\\\$\{GIT_COMMIT\}'$" "$BT" \
  && pass "build-deploy-telemetry.sh: stages export TELEMETRY_DEPLOY_VERSION and TELEMETRY_DEPLOY_COMMIT" \
  || fail "build-deploy-telemetry.sh: the staged env heredoc lacks the TELEMETRY_DEPLOY_VERSION / TELEMETRY_DEPLOY_COMMIT exports — the box marker would read unknown"
awk '/DEPLOY-TARGET PREFLIGHT/{if(!p)p=NR} /^trap finalize_telemetry_deploy EXIT$/{t=NR; n++} /UPLOADING SETUP SCRIPT/{if(!u)u=NR} END{exit !(n==1 && p>0 && t>p && t<u)}' "$BT" \
  && pass "build-deploy-telemetry.sh: the record/cleanup EXIT trap is installed after the preflight and before the first SCP" \
  || fail "build-deploy-telemetry.sh: 'trap finalize_telemetry_deploy EXIT' is not installed once between DEPLOY-TARGET PREFLIGHT and UPLOADING SETUP SCRIPT"
awk '/^finalize_telemetry_deploy\(\) \{/{b=1} b{print} b && /^\}$/{exit}' "$BT" | grep -q 'rm -f "\$SSH_PASSWORD_FILE"' \
  && pass "build-deploy-telemetry.sh: finalize_telemetry_deploy still removes the sshpass password file" \
  || fail "build-deploy-telemetry.sh: finalize_telemetry_deploy does not remove \$SSH_PASSWORD_FILE — replacing the old trap would leak it"

echo "== Every run_deploy: no git call the stub does not know (0355 review R4) =="
[ "$RUN_DEPLOY_COUNT" -gt 0 ] && [ "$UNSTUBBED_RUNS" -eq 0 ] \
  && pass "none of the $RUN_DEPLOY_COUNT run_deploy calls made an unstubbed git call" \
  || fail "$UNSTUBBED_RUNS of $RUN_DEPLOY_COUNT run_deploy calls made an unstubbed git call (or none ran)"
echo
[ "$FAILED" -eq 0 ] && { echo "ALL PASS"; exit 0; } || { echo "SOME FAILED"; exit 1; }
