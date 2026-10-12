#!/usr/bin/env bash
#
# tests/ssh-alerts.sh — off-box test for ssh-alerts.sh and setup-game-host.sh (task 0443).
#
# Drives the REAL scripts into a fake root (SSH_ALERTS_ROOT / GAME_HOST_SETUP_ROOT) with a stub
# PATH: journalctl, systemctl, curl, timeout, getent and fail2ban-client record their argv and
# answer from per-case fixture files. Needs only bash + coreutils + node (runs on macOS and
# Linux), so it is in `npm test` via tests/scripts/ShellHarnesses.test.ts.
#
# The stubs are written ONCE and never rewritten (the task 0371 lesson: macOS checks every
# newly created executable on its first run); each one reads the current case folder from the
# pointer file "$WORK/case-pointer", which CASE refreshes.
#
# Not testable here (the verify task's job): GNU tar on the box, the real journalctl -f, systemd,
# cron, and a real Telegram delivery.
#
#   bash tests/ssh-alerts.sh
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT="$REPO_ROOT/ssh-alerts.sh"
HOST_SETUP="$REPO_ROOT/setup-game-host.sh"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ssh-alerts.XXXXXX")"
trap '[ -n "${KEEP_WORK:-}" ] || rm -rf "$WORK"' EXIT

pass=0; fail=0
ok() { echo "  ✅ $1"; pass=$((pass + 1)); }
no() { echo "  ❌ $1"; fail=$((fail + 1)); }

[ -f "$AGENT" ] || { echo "ERROR: $AGENT not found"; exit 1; }
[ -f "$HOST_SETUP" ] || { echo "ERROR: $HOST_SETUP not found"; exit 1; }

# Visibly synthetic. The leak guard at the end greps every argv log and output for them.
FAKE_TOKEN='0443fakeToken.NotReal_0000-aaaa+bbbb='
ADDR_V4_A='203.0.113.57'
ADDR_V4_B='198.51.100.201'
ADDR_V6='2001:db8:77:5::9'
FAKE_URL='https://api.example.invalid'

# ── Portable date helpers (GNU on Linux, BSD on macOS) ────────────────────────
utc_epoch() {  # "YYYY-MM-DD HH:MM:SS" (UTC) → epoch
    date -u -d "$1" +%s 2>/dev/null || date -u -j -f '%Y-%m-%d %H:%M:%S' "$1" +%s
}
local_stamp() {  # <epoch> → "YYYY-MM-DD HH:MM:SS" in $TZ (what fail2ban writes)
    date -d "@$1" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r "$1" '+%Y-%m-%d %H:%M:%S'
}

# ── Stubs (written once) ──────────────────────────────────────────────────────
BIN="$WORK/bin"; mkdir -p "$BIN"
POINTER="$WORK/case-pointer"

cat > "$BIN/journalctl" <<EOF
#!/bin/bash
read -r C < "$POINTER"
echo "journalctl \$*" >> "\$C/journalctl.argv"
echo "journalctl \$*" >> "$WORK/all.argv"
for a in "\$@"; do
  if [ "\$a" = "-f" ]; then [ -f "\$C/journal.follow" ] && cat "\$C/journal.follow"; exit 0; fi
done
[ -f "\$C/journal.fail" ] && exit 1
[ -f "\$C/journal.cat" ] && cat "\$C/journal.cat"
exit 0
EOF

cat > "$BIN/systemctl" <<EOF
#!/bin/bash
read -r C < "$POINTER"
echo "systemctl \$*" >> "\$C/systemctl.argv"
echo "systemctl \$*" >> "$WORK/all.argv"
if [ "\$1" = "is-active" ]; then
  unit="\${!#}"
  case "\$unit" in
    fail2ban) [ -f "\$C/f2b.active" ] && exit 0; exit 3 ;;
    *) [ -f "\$C/unit.active" ] && exit 0; exit 3 ;;
  esac
fi
exit 0
EOF

# curl: the config arrives on stdin (--config -). It is kept per call so a test can prove the
# token travelled there and not in argv; the event body (data-binary @file) is appended, one
# line per call, to bodies.log. The HTTP code answered comes from curl.code (default 202);
# "000" stands for a network failure (exit 7, like a real refused connection).
cat > "$BIN/curl" <<EOF
#!/bin/bash
read -r C < "$POINTER"
echo "curl \$*" >> "\$C/curl.argv"
echo "curl \$*" >> "$WORK/all.argv"
cfg=\$(cat)
printf '%s\n' "\$cfg" >> "\$C/curl.configs"
body=\$(printf '%s\n' "\$cfg" | sed -n 's/^data-binary = "@\(.*\)"\$/\1/p')
[ -n "\$body" ] && [ -f "\$body" ] && { cat "\$body"; echo; } >> "\$C/bodies.log"
code=\$(cat "\$C/curl.code" 2>/dev/null || echo 202)
printf '%s' "\$code"
[ "\$code" = "000" ] && exit 7
exit 0
EOF

cat > "$BIN/timeout" <<'EOF'
#!/bin/bash
shift
exec "$@"
EOF

cat > "$BIN/getent" <<EOF
#!/bin/bash
read -r C < "$POINTER"
echo "getent \$*" >> "$WORK/getent.argv"
[ "\$1" = hosts ] && [ -f "\$C/rdns" ] && { echo "\$2  \$(cat "\$C/rdns")"; exit 0; }
exit 2
EOF

cat > "$BIN/fail2ban-client" <<EOF
#!/bin/bash
read -r C < "$POINTER"
echo "fail2ban-client \$*" >> "\$C/f2b-client.argv"
echo "fail2ban-client \$*" >> "$WORK/all.argv"
[ "\$1" = status ] && [ -f "\$C/jail.ok" ] && exit 0
exit 1
EOF

# flock: every box has it (0443 inventory), macOS does not — so a stub, which makes the agent take
# its locked paths here too. It cannot really lock; "busy" is simulated by the flag file
# flock.busy (exit 1, as a real `flock -n` / `-w` does when it cannot get the lock).
cat > "$BIN/flock" <<EOF
#!/bin/bash
read -r C < "$POINTER"
echo "flock \$*" >> "\$C/flock.argv"
[ -f "\$C/flock.busy" ] && exit 1
exit 0
EOF
chmod +x "$BIN"/*

# ── Case helpers ──────────────────────────────────────────────────────────────
N=0
CASE() {  # a fresh case folder + fake root; the stubs follow the pointer
    N=$((N + 1)); C="$WORK/case$N"; mkdir -p "$C/root/var/log"
    printf '%s\n' "$C" > "$POINTER"
    NOW=""
}
agent() {  # run the real agent into this case's fake root
    env PATH="$BIN:$PATH" SSH_ALERTS_ROOT="$C/root" SSH_ALERTS_NOW="${NOW:-}" ${AGENT_EXTRA_ENV:-} \
        bash "$AGENT" "$@"
}
install_agent() {  # [box] — install with the fake token on stdin; output to $C/install.out
    printf '%s\n' "$FAKE_TOKEN" | agent install --box "${1:-game-dev}" --url "$FAKE_URL" > "$C/install.out" 2>&1
}
mode_of() { stat -f '%Lp' "$1" 2>/dev/null || stat -c '%a' "$1"; }
spool_files() { ls "$C/root/var/lib/geoconflict-ssh-alerts/spool/" 2>/dev/null | grep -c '\.json$' || true; }
count_bodies() {
    [ -f "$C/bodies.log" ] || { echo 0; return 0; }
    grep -c "\"type\":\"$1\"" "$C/bodies.log" || true
}
json_ok() {  # every line of <file> parses as JSON
    node -e 'const l=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").filter(Boolean); for (const x of l) JSON.parse(x); process.stdout.write(String(l.length))' "$1"
}

ENVF() { echo "$C/root/etc/geoconflict-ssh-alerts/ssh-alerts.env"; }
STATE() { echo "$C/root/var/lib/geoconflict-ssh-alerts"; }

# ═════════════════════════════════════════════════════════════════════════════
echo "=== I1: install writes config 0600, agent 0700, unit + cron 0644, and starts the watcher ==="
CASE
install_agent game-dev; rc=$?
[ "$rc" -eq 0 ] && ok "install exited 0" || no "install exited $rc: $(cat "$C/install.out")"
[ "$(mode_of "$(ENVF)")" = 600 ] && ok "config is 0600" || no "config mode $(mode_of "$(ENVF)")"
grep -qx 'SSH_ALERTS_BOX=game-dev' "$(ENVF)" && grep -qx "SSH_ALERTS_URL=$FAKE_URL" "$(ENVF)" \
  && grep -qxF "SSH_ALERTS_TOKEN=$FAKE_TOKEN" "$(ENVF)" && ok "config holds box, url and token" || no "config content wrong"
BINP="$C/root/usr/local/sbin/geoconflict-ssh-alerts"
cmp -s "$AGENT" "$BINP" && [ "$(mode_of "$BINP")" = 700 ] && ok "agent installed 0700, byte-identical" || no "agent not installed 0700"
UNIT="$C/root/etc/systemd/system/geoconflict-ssh-alerts.service"
grep -q '^ExecStart=/usr/local/sbin/geoconflict-ssh-alerts watch$' "$UNIT" && grep -q '^Restart=always$' "$UNIT" \
  && [ "$(mode_of "$UNIT")" = 644 ] && ok "unit 0644: ExecStart watch, Restart=always" || no "unit wrong"
CRON="$C/root/etc/cron.d/geoconflict-ssh-alerts"
grep -qE '^\*/5 \* \* \* \* root /usr/local/sbin/geoconflict-ssh-alerts tick ' "$CRON" && [ "$(mode_of "$CRON")" = 644 ] \
  && ok "cron 0644: every 5 minutes, runs tick" || no "cron wrong: $(cat "$CRON" 2>/dev/null)"
grep -q '%' "$CRON" && no "cron file contains a % (Vixie cron would cut the line)" || ok "cron file has no % sign"
LR="$C/root/etc/logrotate.d/geoconflict-ssh-alerts"
grep -q '^/var/log/geoconflict-ssh-alerts.log {$' "$LR" && grep -q 'rotate 4' "$LR" && grep -q 'maxsize 10M' "$LR" && [ "$(mode_of "$LR")" = 644 ] \
  && ok "logrotate 0644 for the tick's log (review R8: no unrotated log)" || no "logrotate file wrong: $(cat "$LR" 2>/dev/null)"
[ "$(mode_of "$(STATE)")" = 700 ] && [ "$(mode_of "$(STATE)/spool")" = 700 ] && ok "state + spool dirs 0700" || no "state dir modes wrong"
grep -q '^systemctl daemon-reload$' "$C/systemctl.argv" && grep -q 'enable --quiet geoconflict-ssh-alerts.service' "$C/systemctl.argv" \
  && [ "$(grep -c '^systemctl restart ' "$C/systemctl.argv")" = 1 ] && ok "daemon-reload, enable, and ONE restart" || no "systemctl calls: $(tr '\n' ';' < "$C/systemctl.argv")"

echo "=== I2: a second install of the same agent does NOT restart the watcher ==="
: > "$C/unit.active"
install_agent game-dev; rc=$?
[ "$rc" -eq 0 ] && ok "second install exited 0" || no "second install exited $rc"
[ "$(grep -c '^systemctl restart ' "$C/systemctl.argv")" = 1 ] && ok "still exactly one restart in total (no gap on redeploy)" \
  || no "the unchanged agent was restarted again"
grep -q 'not restarted' "$C/install.out" && ok "said 'not restarted'" || no "no 'not restarted' line"

echo "=== I3: a changed agent IS restarted; a stopped watcher is started ==="
echo '# drift' >> "$BINP"
install_agent game-dev
[ "$(grep -c '^systemctl restart ' "$C/systemctl.argv")" = 2 ] && ok "changed agent → restarted" || no "changed agent was not restarted"
rm -f "$C/unit.active"
install_agent game-dev
grep -q '^systemctl start geoconflict-ssh-alerts.service$' "$C/systemctl.argv" && ok "watcher not running → started" || no "a stopped watcher was not started"

echo "=== I4: install refuses bad input and writes nothing ==="
for spec in "bad-box|$FAKE_URL|$FAKE_TOKEN" "game-dev|$FAKE_URL/some/path|$FAKE_TOKEN" \
            "game-dev|ftp://x.invalid|$FAKE_TOKEN" "game-dev|$FAKE_URL|" "game-dev|$FAKE_URL|short" \
            "game-dev|$FAKE_URL|has space token value"; do
  CASE
  IFS='|' read -r b u t <<< "$spec"
  printf '%s\n' "$t" | agent install --box "$b" --url "$u" > "$C/out" 2>&1; rc=$?
  [ "$rc" -ne 0 ] && [ ! -e "$(ENVF)" ] && [ ! -e "$C/root/usr/local/sbin/geoconflict-ssh-alerts" ] \
    && ok "refused (rc=$rc): box='$b' url-ok=$([ "$u" = "$FAKE_URL" ] && echo y || echo n) token-len=${#t}" \
    || no "accepted bad input box='$b' url='$u' (rc=$rc)"
done
grep -qF 'has space token value' "$C/out" && no "the refused token was echoed" || ok "a refused token is never echoed"

echo "=== I4b: a file install cannot write is a FAILED install, never 'installed' (review R2) ==="
CASE; mkdir -p "$C/root/etc"; : > "$C/root/etc/cron.d"   # a FILE where the cron.d folder must be
install_agent game-dev; rc=$?
[ "$rc" -ne 0 ] && grep -q 'could not write .*cron.d/geoconflict-ssh-alerts' "$C/install.out" && ! grep -q 'installed for box' "$C/install.out" \
  && ok "unwritable cron file → exit $rc, names the file, no 'installed' line" || no "unwritable cron file: rc=$rc $(cat "$C/install.out")"

echo "=== I5: a blank token reuses the persisted one; the box never generates one ==="
CASE; install_agent game-prod
printf '\n' | agent install --box game-prod --url "$FAKE_URL" > "$C/out" 2>&1; rc=$?
[ "$rc" -eq 0 ] && grep -q 'token: persisted' "$C/out" && grep -qxF "SSH_ALERTS_TOKEN=$FAKE_TOKEN" "$(ENVF)" \
  && ok "blank stdin → persisted token reused, by name" || no "blank stdin did not reuse (rc=$rc): $(cat "$C/out")"
grep -v '^[[:space:]]*#' "$AGENT" | grep -qE 'openssl rand|/dev/urandom' && no "the agent can mint a token" || ok "the agent has no token-generating code"

echo "=== I6: uninstall stops + disables the watcher, removes the cron job, keeps config ==="
agent uninstall > "$C/out" 2>&1
grep -q '^systemctl disable --now geoconflict-ssh-alerts.service$' "$C/systemctl.argv" && ok "disable --now" || no "no disable --now"
[ ! -e "$C/root/etc/cron.d/geoconflict-ssh-alerts" ] && [ -f "$(ENVF)" ] && ok "cron removed, config kept" || no "uninstall removed the wrong things"
grep -q 'next deploy installs it again' "$C/out" && ok "says the next deploy reinstalls it" || no "no reinstall warning"

# ═════════════════════════════════════════════════════════════════════════════
echo "=== W1: the watcher makes an event for every Accepted line and NOTHING else ==="
CASE; install_agent game-prod
echo "host-57.example-isp.net." > "$C/rdns"
T0=1760259600
NOW=$((T0 - 60))   # the watcher starts a minute before these lines are logged
cat > "$C/journal.follow" <<EOF
$T0.100000 gc sshd[101]: Accepted publickey for root from $ADDR_V4_A port 50111 ssh2: ED25519 SHA256:abc
$((T0 + 1)).000001 gc sshd[102]: Failed password for root from $ADDR_V4_B port 50112 ssh2
$((T0 + 2)).5 gc sshd[103]: Invalid user admin from $ADDR_V4_B port 50113
$((T0 + 3)).000000 gc sshd[104]: Failed password for invalid user Accepted from $ADDR_V4_B port 50114 ssh2
$((T0 + 4)).200000 gc sshd-session[105]: Accepted password for openfront from $ADDR_V4_B port 50115 ssh2
$((T0 + 5)).300000 gc sshd[106]: Accepted keyboard-interactive/pam for deploy from $ADDR_V6 port 50116 ssh2
$((T0 + 6)).000000 gc sshd[107]: Connection closed by authenticating user root $ADDR_V4_B port 50117 [preauth]
$((T0 + 7)).000000 gc sshd[108]: pam_unix(sshd:session): session opened for user root(uid=0) by root(uid=0)
EOF
agent watch > "$C/watch.out" 2>&1
n=$(json_ok "$C/bodies.log" 2>/dev/null); [ "$n" = 3 ] && ok "exactly 3 events, each valid JSON (3 Accepted lines of 8)" || no "expected 3 valid JSON events, got '${n:-invalid JSON}': $(cat "$C/bodies.log" 2>/dev/null)"
[ "$(count_bodies login)" = 3 ] && ok "all three are login events" || no "not 3 login events"
grep -q '"user":"root","method":"key","source":"203.0.\*.\*","provider":"example-isp.net"' "$C/bodies.log" && ok "publickey → key, IPv4 masked to 203.0.*.*, provider = last two rDNS labels" || no "root/key event wrong: $(head -1 "$C/bodies.log")"
grep -q '"user":"openfront","method":"password","source":"198.51.\*.\*"' "$C/bodies.log" && ok "sshd-session (OpenSSH 10) line matched; password → password" || no "sshd-session/password event missing"
grep -q '"user":"deploy","method":"password","source":"2001:db8::\*"' "$C/bodies.log" && ok "keyboard-interactive/pam → password; IPv6 masked to its first two groups" || no "kbd-interactive/IPv6 event wrong"
grep -q '"box":"game-prod","agentVersion":1,"at":"2025-10-12T09:00:00Z"' "$C/bodies.log" && ok "box, agent version and the login's own UTC time are carried" || no "box/version/time wrong: $(head -1 "$C/bodies.log")"
for a in "$ADDR_V4_A" "$ADDR_V4_B" "$ADDR_V6"; do
  grep -rqF "$a" "$C/bodies.log" "$C/watch.out" "$C/curl.configs" && no "the FULL address $a left the box" || ok "full address $a appears in no event, log or curl config"
done
grep -q -- '-f -q --no-pager -o short-unix SYSLOG_IDENTIFIER=sshd SYSLOG_IDENTIFIER=sshd-session -n 0' "$C/journalctl.argv" \
  && ok "first run follows both identifiers from now (-n 0)" || no "first-run journalctl argv: $(cat "$C/journalctl.argv")"
grep -qF "Authorization: Bearer $FAKE_TOKEN" "$C/curl.configs" && ok "the token reached curl through its stdin config" || no "token not in curl's config"
grep -qF "$FAKE_TOKEN" "$C/curl.argv" && no "the TOKEN is in curl's argv" || ok "the token is NOT in curl's argv"
grep -q "url = \"$FAKE_URL/internal/v1/ssh-alerts/events\"" "$C/curl.configs" && ok "posts to <url>/internal/v1/ssh-alerts/events" || no "wrong URL"
[ "$(spool_files)" = 0 ] && ok "delivered events leave the spool" || no "spool not empty: $(spool_files)"

echo "=== W2: a restart resumes after the last handled login — no duplicate, no loss ==="
NOW=$((T0 + 100))
echo "$((T0 + 8)).000000 gc sshd[109]: Accepted publickey for root from $ADDR_V4_A port 50118 ssh2" >> "$C/journal.follow"
: > "$C/bodies.log"
agent watch > "$C/watch.out" 2>&1
[ "$(count_bodies login)" = 1 ] && ok "second run sent ONLY the one new login" || no "second run sent $(count_bodies login) login events"
tail -1 "$C/journalctl.argv" | grep -qE -- "--since @$((T0 + 5))\$" && ok "it resumed with --since @<last login second>" || no "resume argv: $(tail -1 "$C/journalctl.argv")"
NOW=$((T0 + 200000)); : > "$C/bodies.log"
agent watch > "$C/watch.out" 2>&1
tail -1 "$C/journalctl.argv" | grep -qE -- "--since @$((NOW - 86400))\$" && ok "after a long stop it reaches back no further than 24 h" || no "long-stop resume argv: $(tail -1 "$C/journalctl.argv")"
NOW=""

echo "=== W2b: the login is spooled BEFORE the resume marker moves (review R3) ==="
awk '/^handle_line\(\) \{/{b=1} b && /spool_event/{s=NR} b && /write_state "\$STATE_DIR\/last-login-us"/{m=NR} b && /^\}$/{exit} END{exit !(s>0 && m>s)}' "$AGENT" \
  && ok "handle_line spools first, moves the marker second (a watcher killed between them re-reads the line)" \
  || no "handle_line moves the resume marker before the event is spooled"

echo "=== W3: an unreachable relay never loses a login — it is spooled ==="
CASE; install_agent game-dev
echo "000" > "$C/curl.code"
REAL=$(date +%s)   # the spool dates events by the clock, and S1 below retries on the real one
echo "$REAL.000001 gc sshd[1]: Accepted password for root from $ADDR_V4_A port 1 ssh2" > "$C/journal.follow"
NOW=$((REAL - 60)); agent watch > "$C/watch.out" 2>&1; NOW=""
[ "$(spool_files)" = 1 ] && ok "network failure → the login is kept in the spool" || no "spool holds $(spool_files)"
f=$(ls "$(STATE)/spool/"*.json 2>/dev/null | head -1)
[ -n "$f" ] && [ "$(mode_of "$f")" = 600 ] && ok "spool file is 0600" || no "spool file mode wrong"

# ═════════════════════════════════════════════════════════════════════════════
echo "=== S1: retry rules — 2xx delivers, 400 drops, 401/403/404/429/5xx keep ==="
for code in 401 403 404 429 500 503; do
  echo "$code" > "$C/curl.code"; agent retry > "$C/out" 2>&1
  [ "$(spool_files)" = 1 ] && ok "HTTP $code → kept for retry" || no "HTTP $code changed the spool to $(spool_files)"
done
echo 202 > "$C/curl.code"; : > "$C/bodies.log"; agent retry > "$C/out" 2>&1
[ "$(spool_files)" = 0 ] && [ "$(count_bodies login)" = 1 ] && ok "HTTP 202 → delivered and removed" || no "202 did not deliver"
echo 400 > "$C/curl.code"; agent test > "$C/out" 2>&1; rc=$?
[ "$rc" -ne 0 ] && [ "$(spool_files)" = 0 ] && grep -q '400' "$C/out" && ok "HTTP 400 → dropped (it can never succeed), and test says so" || no "400 handling wrong (rc=$rc, spool=$(spool_files))"

echo "=== S1b: a claim whose sender is gone is released and delivered; a live one is left alone (review R5) ==="
CASE; install_agent game-dev
NOW=$(date +%s); mkdir -p "$(STATE)/spool"
dead=99999; while kill -0 "$dead" 2>/dev/null; do dead=$((dead + 1)); done
printf '%s\n' '{"type":"test","box":"game-dev","agentVersion":1,"at":"2025-01-01T00:00:00Z"}' > "$(STATE)/spool/$NOW-dead.json.sending-$dead"
printf '%s\n' '{"type":"test","box":"game-dev","agentVersion":1,"at":"2025-01-01T00:00:01Z"}' > "$(STATE)/spool/$NOW-live.json.sending-$$"
agent retry > "$C/out" 2>&1
[ "$(count_bodies test)" = 1 ] && [ ! -e "$(STATE)/spool/$NOW-dead.json.sending-$dead" ] && ok "the dead sender's claim was released and delivered" || no "dead claim not released: $(ls "$(STATE)/spool")"
[ -e "$(STATE)/spool/$NOW-live.json.sending-$$" ] && ok "a claim held by a live process is left alone" || no "a live claim was taken over"
grep -q 'claim="\$file.sending-\${BASHPID:-\$\$}"' "$AGENT" && ok "the claim pid is \$BASHPID, expanded in the sending shell (not a \$( ) subshell)" || no "claim pid is not \$BASHPID"
NOW=""

echo "=== S2: an event older than 24 h is dropped, and ONE 'alerts dropped' event replaces it ==="
NOW=$(date +%s)
printf '%s\n' '{"type":"test","box":"game-dev","agentVersion":1,"at":"2025-01-01T00:00:00Z"}' > "$(STATE)/spool/$((NOW - 90000))-old1.json"
printf '%s\n' '{"type":"test","box":"game-dev","agentVersion":1,"at":"2025-01-01T00:00:00Z"}' > "$(STATE)/spool/$((NOW - 90001))-old2.json"
echo 202 > "$C/curl.code"; : > "$C/bodies.log"; agent retry > "$C/out" 2>&1
[ "$(spool_files)" = 0 ] && ok "the stale events are gone" || no "stale events left: $(spool_files)"
[ "$(count_bodies dropped)" = 1 ] && grep -q '"type":"dropped".*"count":2' "$C/bodies.log" && ok "one dropped event, count 2" || no "dropped event wrong: $(cat "$C/bodies.log")"
[ "$(count_bodies test)" = 0 ] && ok "the stale events themselves were never sent" || no "a stale event was sent"
NOW=""

echo "=== S3: the spool never holds more than 500 events ==="
CASE; install_agent game-dev
NOW=$(date +%s)
mkdir -p "$(STATE)/spool"
i=0; while [ "$i" -lt 500 ]; do : > "$(STATE)/spool/$((NOW - 1000 + i / 100))-f$i.json"; i=$((i + 1)); done
echo 503 > "$C/curl.code"; agent test > "$C/out" 2>&1
[ "$(spool_files)" = 500 ] && ok "a 501st event drops the oldest: the spool stays at 500" || no "spool holds $(spool_files)"
[ "$(cat "$(STATE)/dropped.count")" = 1 ] && ok "the drop is counted for the 'alerts dropped' event" || no "dropped.count = $(cat "$(STATE)/dropped.count" 2>/dev/null)"
NOW=""

# ═════════════════════════════════════════════════════════════════════════════
echo "=== F1: fail2ban down needs TWO bad checks; reminder at 12 h; 'back' once ==="
CASE; install_agent game-dev
: > "$C/f2b.active"; : > "$C/jail.ok"
T=1760259600; NOW=$T; agent f2b-check; : > "$C/bodies.log"
[ ! -s "$C/bodies.log" ] && ok "up → no event" || no "an event while up"
rm -f "$C/f2b.active"
NOW=$((T + 300)); agent f2b-check 2>/dev/null
[ "$(count_bodies fail2ban)" = 0 ] && ok "one bad check (a deploy restart) → no event" || no "alerted after ONE bad check"
NOW=$((T + 600)); agent f2b-check 2>/dev/null
grep -q '"type":"fail2ban".*"event":"down","status":"down","since":"2025-10-12T09:05:00Z"' "$C/bodies.log" && ok "second bad check → ONE down event, with since" || no "down event wrong: $(cat "$C/bodies.log")"
NOW=$((T + 600 + 6 * 3600)); agent f2b-check 2>/dev/null
[ "$(count_bodies fail2ban)" = 1 ] && ok "still down at 6 h → nothing new" || no "repeated before 12 h"
NOW=$((T + 600 + 12 * 3600)); agent f2b-check 2>/dev/null
grep -q '"event":"reminder"' "$C/bodies.log" && [ "$(count_bodies fail2ban)" = 2 ] && ok "12 h later → one reminder" || no "no reminder at 12 h"
: > "$C/f2b.active"; NOW=$((T + 600 + 13 * 3600)); agent f2b-check 2>/dev/null
grep -q '"event":"back","status":"up"' "$C/bodies.log" && [ "$(count_bodies fail2ban)" = 3 ] && ok "back → one back event" || no "no back event"
NOW=$((T + 600 + 14 * 3600)); agent f2b-check 2>/dev/null
[ "$(count_bodies fail2ban)" = 3 ] && ok "stays up → nothing more" || no "repeated 'back'"

echo "=== F2: jail missing and fail2ban not installed are 'down' too ==="
CASE; install_agent game-dev
: > "$C/f2b.active"     # running, but no jail.ok
NOW=1760259600; agent f2b-check 2>/dev/null; NOW=1760259900; agent f2b-check 2>/dev/null
grep -q '"event":"down","status":"jail-missing"' "$C/bodies.log" && ok "running without its jail → down/jail-missing" || no "jail-missing not reported"
CASE; install_agent game-dev
AGENT_EXTRA_ENV="SSH_ALERTS_F2B_CLIENT=no-such-fail2ban-client"
NOW=1760259600; agent f2b-check 2>/dev/null; NOW=1760259900; agent f2b-check 2>/dev/null
AGENT_EXTRA_ENV=""
grep -q '"event":"down","status":"not-installed"' "$C/bodies.log" && ok "no fail2ban at all → down/not-installed (a rebuilt box)" || no "not-installed not reported"

# ═════════════════════════════════════════════════════════════════════════════
echo "=== D1: daily counts — 24 h of journal + fail2ban.log lines, restart-proof, in the box's local time ==="
export TZ=Europe/Moscow   # three of the four boxes run Moscow time; fail2ban.log is local time
CASE; install_agent game-dev
: > "$C/f2b.active"; : > "$C/jail.ok"
NOW=$(utc_epoch '2026-10-12 09:00:00')
printf '%s\n' 'Failed password for root from x port 1 ssh2' 'Failed password for invalid user a from x port 2 ssh2' \
  'Failed publickey for root from x port 3 ssh2' 'Invalid user a from x port 2' 'Invalid user b from x port 4' \
  'Accepted publickey for root from x port 5 ssh2' > "$C/journal.cat"
L="$C/root/var/log/fail2ban.log"
{ echo "$(local_stamp $((NOW - 30 * 3600))),001 fail2ban.server [1]: INFO Starting Fail2ban"
  echo "$(local_stamp $((NOW - 25 * 3600))),001 fail2ban.actions [1]: NOTICE  [sshd] Ban 192.0.2.1"
} > "$L.1"
{ echo "$(local_stamp $((NOW - 20 * 3600))),001 fail2ban.actions [1]: NOTICE  [sshd] Ban 192.0.2.2"
  echo "$(local_stamp $((NOW - 10 * 3600))),001 fail2ban.actions [1]: NOTICE  [sshd] Restore Ban 192.0.2.3"
  echo "$(local_stamp $((NOW - 9 * 3600))),001 fail2ban.actions [1]: NOTICE  [other] Ban 192.0.2.4"
  echo "$(local_stamp $((NOW - 1 * 3600))),001 fail2ban.actions [1]: NOTICE  [sshd] Ban 192.0.2.5"
  echo "$(local_stamp $((NOW - 1 * 3600))),001 fail2ban.filter  [1]: INFO    [sshd] Found 192.0.2.5"
} > "$L"
agent daily 2>/dev/null
grep -q '"type":"daily".*"failed":3,"invalid":2,"bans":2,"journal":"ok","banLog":"ok","fail2ban":"up"' "$C/bodies.log" \
  && ok "3 failed, 2 unknown-user, 2 bans (not the 25 h one, not Restore Ban, not another jail)" || no "daily wrong: $(cat "$C/bodies.log")"
grep -q -- "--since @$((NOW - 86400)) --until @$NOW" "$C/journalctl.argv" && ok "journal window is exactly the last 24 h" || no "journal window: $(tail -1 "$C/journalctl.argv")"

echo "=== D2: a ban log that does not reach back 24 h is 'partial'; none at all is 'unreadable'; a dead journal is null ==="
rm -f "$L.1"; : > "$C/bodies.log"; agent daily 2>/dev/null
grep -q '"bans":2,"journal":"ok","banLog":"partial"' "$C/bodies.log" && ok "log starts inside the window → partial" || no "partial not reported: $(cat "$C/bodies.log")"
rm -f "$L"; : > "$C/journal.fail"; : > "$C/bodies.log"; agent daily 2>/dev/null
grep -q '"failed":null,"invalid":null,"bans":null,"journal":"unreadable","banLog":"unreadable"' "$C/bodies.log" \
  && ok "unreadable sources are null + 'unreadable' — never 0" || no "unreadable not reported: $(cat "$C/bodies.log")"

echo "=== D3: the daily report goes out once per UTC day, at the first tick at/after 08:00 UTC — whatever the box's timezone ==="
CASE; install_agent game-dev; : > "$C/f2b.active"; : > "$C/jail.ok"
NOW=$(utc_epoch '2026-10-12 07:55:00'); agent tick 2>/dev/null
[ "$(count_bodies daily)" = 0 ] && ok "07:55 UTC (10:55 Moscow) → not yet" || no "sent before 08:00 UTC"
NOW=$(utc_epoch '2026-10-12 08:00:00'); agent tick 2>/dev/null
[ "$(count_bodies daily)" = 1 ] && ok "08:00 UTC → sent" || no "not sent at 08:00 UTC"
NOW=$(utc_epoch '2026-10-12 08:05:00'); agent tick 2>/dev/null
NOW=$(utc_epoch '2026-10-12 23:55:00'); agent tick 2>/dev/null
[ "$(count_bodies daily)" = 1 ] && ok "later ticks the same UTC day → not again (restart-proof state file)" || no "sent twice in one day"
NOW=$(utc_epoch '2026-10-13 08:05:00'); agent tick 2>/dev/null
[ "$(count_bodies daily)" = 2 ] && ok "next UTC day → sent again" || no "not sent the next day"
unset TZ

echo "=== D4: one tick at a time — a tick that finds the lock busy does nothing (review R5) ==="
CASE; install_agent game-dev
NOW=$(utc_epoch '2026-10-12 08:00:00'); : > "$C/flock.busy"
agent tick > "$C/out" 2>&1; rc=$?
[ "$rc" -eq 0 ] && grep -q 'previous tick is still running' "$C/out" && [ ! -s "$C/bodies.log" ] && [ ! -e "$(STATE)/f2b.state" ] \
  && ok "busy → skipped, exit 0: no fail2ban check, no daily report, no send" || no "busy tick ran anyway (rc=$rc): $(cat "$C/out")"
grep -q '^flock -n 9$' "$C/flock.argv" && ok "the tick asks for the lock without waiting (flock -n)" || no "tick lock argv: $(cat "$C/flock.argv" 2>/dev/null)"
rm -f "$C/flock.busy"; agent tick > "$C/out" 2>&1
[ "$(count_bodies daily)" = 1 ] && ok "free again → the next tick runs normally" || no "the next tick did not run"
NOW=""

echo "=== T1: test sends a marked test event and reports the result ==="
CASE; install_agent telemetry
agent test > "$C/out" 2>&1; rc=$?
[ "$rc" -eq 0 ] && grep -q '^OK: test event delivered (HTTP 202)' "$C/out" && grep -q '"type":"test","box":"telemetry"' "$C/bodies.log" \
  && ok "delivered → exit 0 and says so" || no "test failed (rc=$rc): $(cat "$C/out")"
echo 403 > "$C/curl.code"; agent test > "$C/out" 2>&1; rc=$?
[ "$rc" -ne 0 ] && grep -q 'NOT DELIVERED: HTTP 403' "$C/out" && ok "403 → exit non-zero, names the code and its meaning" || no "403 not reported (rc=$rc)"
rm -f "$(ENVF)"; agent tick > "$C/out" 2>&1; rc=$?
[ "$rc" -ne 0 ] && grep -q 'run install' "$C/out" && ok "no config → refuses to run, says run install" || no "ran with no config"

# ═════════════════════════════════════════════════════════════════════════════
host_env() {  # <token> <url> <env> — written the way deploy.sh writes it
    ( umask 077; printf '%s=%q\n' PROFILE_SSH_ALERT_TOKEN "$1" PROFILE_API_URL "$2" GAME_ENV "$3" > "$C/host.env" )
}
host_setup() {
    env PATH="$BIN:$PATH" GAME_HOST_SETUP_ROOT="$C/root" SSH_ALERTS_ROOT="$C/root" \
        bash "$C/ship/setup-game-host.sh" "$C/host.env" > "$C/hs.out" 2>&1
}
ship() { mkdir -p "$C/ship"; cp "$HOST_SETUP" "$AGENT" "$C/ship/"; }

echo "=== G1: setup-game-host.sh — reads + deletes host.env, writes the role marker, installs the agent ==="
CASE; ship; host_env "$FAKE_TOKEN" "$FAKE_URL" dev
host_setup; rc=$?
[ "$rc" -eq 0 ] && grep -q '^GAME HOST SETUP: OK$' "$C/hs.out" && ok "exit 0, 'GAME HOST SETUP: OK'" || no "rc=$rc: $(cat "$C/hs.out")"
[ ! -e "$C/host.env" ] && ok "host.env deleted right after it was read" || no "host.env left behind"
[ "$(cat "$C/root/etc/geoconflict-deploy-role")" = game ] && ok "role marker 'game'" || no "no role marker"
grep -qx 'SSH_ALERTS_BOX=game-dev' "$(ENVF)" && ok "agent installed with --box game-dev" || no "agent box wrong"
grep -q '  OK  preconditions' "$C/hs.out" && grep -q '  OK  ssh-alerts' "$C/hs.out" && ok "each section reports OK" || no "section lines missing"

echo "=== G2: a second run is a no-op (idempotent): exit 0, no restart ==="
: > "$C/unit.active"; host_env "$FAKE_TOKEN" "$FAKE_URL" dev; host_setup; rc=$?
[ "$rc" -eq 0 ] && [ "$(grep -c '^systemctl restart ' "$C/systemctl.argv")" = 1 ] && ok "second run exit 0, still one restart in total" || no "second run rc=$rc or restarted again"

echo "=== G3: blank token → SKIPPED, exit 3, no install ==="
CASE; ship; host_env "" "$FAKE_URL" prod; host_setup; rc=$?
[ "$rc" -eq 3 ] && grep -q '  SKIPPED  ssh-alerts — PROFILE_SSH_ALERT_TOKEN is empty' "$C/hs.out" && [ ! -e "$(ENVF)" ] \
  && ok "SKIPPED with the reason, exit 3, nothing installed" || no "blank token: rc=$rc $(cat "$C/hs.out")"
CASE; ship; host_env "$FAKE_TOKEN" "" prod; host_setup; rc=$?
[ "$rc" -eq 3 ] && grep -q 'SKIPPED  ssh-alerts — PROFILE_API_URL is empty' "$C/hs.out" && ok "blank URL → SKIPPED, exit 3" || no "blank URL: rc=$rc"

echo "=== G4: a failed section → exit 1 ==="
CASE; ship; host_env "$FAKE_TOKEN" "$FAKE_URL/with/a/path" prod; host_setup; rc=$?
[ "$rc" -eq 1 ] && grep -q '  FAILED  ssh-alerts' "$C/hs.out" && grep -q '^GAME HOST SETUP: FAILED' "$C/hs.out" \
  && ok "install refused → FAILED, exit 1" || no "failed section: rc=$rc $(cat "$C/hs.out")"

echo "=== G5: a box marked as another role is refused, its marker untouched ==="
CASE; ship; mkdir -p "$C/root/etc"; echo telemetry > "$C/root/etc/geoconflict-deploy-role"
host_env "$FAKE_TOKEN" "$FAKE_URL" prod; host_setup; rc=$?
[ "$rc" -eq 1 ] && grep -q "marked 'telemetry'" "$C/hs.out" && [ "$(cat "$C/root/etc/geoconflict-deploy-role")" = telemetry ] && [ ! -e "$(ENVF)" ] \
  && ok "wrong box → FAILED, marker kept, nothing installed" || no "wrong-box guard: rc=$rc $(cat "$C/hs.out")"
CASE; ship; host_env "$FAKE_TOKEN" "$FAKE_URL" qa; host_setup; rc=$?
[ "$rc" -eq 1 ] && grep -q 'GAME_ENV is not dev, staging or prod' "$C/hs.out" && ok "unknown GAME_ENV → FAILED" || no "bad GAME_ENV accepted (rc=$rc)"

# ═════════════════════════════════════════════════════════════════════════════
echo "=== L: leak guard across EVERY run above ==="
grep -qF "$FAKE_TOKEN" "$WORK/all.argv" && no "LEAK: the token appears in an argv" || ok "the token appears in no stub's argv"
cat "$WORK"/case*/install.out "$WORK"/case*/hs.out "$WORK"/case*/out "$WORK"/case*/watch.out 2>/dev/null | grep -qF "$FAKE_TOKEN" \
  && no "LEAK: the token appears in script output" || ok "the token appears in no script output"
[ -s "$WORK/all.argv" ] && ok "the guard was not vacuous ($(wc -l < "$WORK/all.argv" | tr -d ' ') argv lines inspected)" || no "no argv captured"
grep -v '^[[:space:]]*#' "$AGENT" "$HOST_SETUP" | grep -q 'set -x' && no "a 'set -x' would print the token" || ok "no 'set -x' in either script"

echo
echo "==== RESULT: $pass passed, $fail failed ===="
[ "$fail" -eq 0 ]
