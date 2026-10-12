#!/usr/bin/env bash
#
# ssh-alerts.sh — the SSH security alert agent AND its own installer (task 0443).
#
# Runs on every box (game prod/dev, profile, telemetry). It tells the operator, through the
# profile box's relay (POST <url>/internal/v1/ssh-alerts/events → the Alerts topic):
#   (a) every SUCCESSFUL ssh login — box, user, key or password, a masked source;
#   (b) fail2ban (or its sshd jail) down / missing, and back;
#   (c) once a day, the last 24 h of failed logins and fail2ban bans (stored by the relay and
#       sent as ONE digest message by the profile box — this agent never messages per guess).
#
# Installed by each box's own deploy step, never by hand:
#   game       deploy.sh → setup-game-host.sh (root, every deploy)
#   profile    build-deploy-profile.sh → setup-profile.sh
#   telemetry  build-deploy-telemetry.sh → setup-telemetry.sh
#
# Subcommands:
#   install --box <name> --url <base> [--jail <name>]   root; the token is read from STDIN
#   uninstall      emergency off switch: stops the watcher, removes the cron job (config and
#                  state are kept). ⚠️ The box's next deploy installs it again.
#   watch          the systemd service: follows the journal for "Accepted …" lines
#   tick           the 5-minute cron job: fail2ban check, spool retry, the daily report when due
#   f2b-check | daily | retry   one part of tick, by hand
#   test           send one clearly marked test event and say whether it arrived
#
# ⛔ HARD RULES, each one load-bearing:
#   - A login can never be blocked or slowed by this: there is NO PAM hook and NO sshd change.
#     The journal is read AFTER the fact; a dead Telegram or profile box costs an alert, never
#     a login.
#   - No event is ever made from a "Failed …" or "Invalid user …" line. The parser matches
#     only "Accepted <method> for <user> from <addr> port <n>". Failed guesses are only COUNTED,
#     in the daily report.
#   - The full source address never leaves the box: it is masked here (first two parts of an
#     IPv4 address, first two groups of an IPv6 one) plus a provider hint from reverse DNS
#     (last two name labels only).
#   - The token is never in any argv: it arrives on stdin at install, is stored 0600, and
#     reaches curl through `--config -` on stdin. The box NEVER generates a token — a value
#     only this box knows would be rejected by the relay on every event.
#   - Every value put into an event is checked against a strict pattern first, so the JSON is
#     built by printf without any escaping problem.
#   - No `set -x`, ever: it would print the token.
#
# Delivery: every event is first written to a spool file (0600), then POSTed. 2xx = delivered;
# 400 = can never succeed, logged and dropped; anything else (network error, 401, 403, 404,
# 429, 5xx) = kept and retried every 5 minutes, so a token, allow list or route fixed later
# still delivers. Spooled events older than 24 h, or beyond 500 files, are dropped and ONE
# "N alerts dropped" event is sent instead.
#
# Test seams (the harness, tests/ssh-alerts.sh): SSH_ALERTS_ROOT prefixes every path;
# SSH_ALERTS_NOW fixes the clock (epoch seconds); SSH_ALERTS_F2B_CLIENT names the
# fail2ban-client command.
#
# Must stay bash 3.2 compatible (the harness runs on macOS's /bin/bash): no associative
# arrays, no ${var,,}, no mapfile, and no empty-array expansion under set -u.

set -u

# ⚠️ Bump whenever this file's behaviour changes. The profile relay knows the current value
# (SSH_ALERTS_AGENT_VERSION in src/profile-server/SshAlerts.ts — the hardening harness
# asserts the two agree) and the daily digest flags a box still on an older one.
SSH_ALERTS_AGENT_VERSION=1

ROOT="${SSH_ALERTS_ROOT:-}"
CONF_DIR="$ROOT/etc/geoconflict-ssh-alerts"
ENV_FILE="$CONF_DIR/ssh-alerts.env"
BIN_PATH="$ROOT/usr/local/sbin/geoconflict-ssh-alerts"
UNIT_NAME="geoconflict-ssh-alerts.service"
UNIT_PATH="$ROOT/etc/systemd/system/$UNIT_NAME"
CRON_PATH="$ROOT/etc/cron.d/geoconflict-ssh-alerts"
LOGROTATE_PATH="$ROOT/etc/logrotate.d/geoconflict-ssh-alerts"
STATE_DIR="$ROOT/var/lib/geoconflict-ssh-alerts"
SPOOL_DIR="$STATE_DIR/spool"
F2B_LOG="$ROOT/var/log/fail2ban.log"
F2B_CLIENT="${SSH_ALERTS_F2B_CLIENT:-fail2ban-client}"
EVENTS_PATH="/internal/v1/ssh-alerts/events"

SPOOL_MAX_AGE_S=86400      # an event not delivered within 24 h is dropped
SPOOL_MAX_FILES=500        # and the spool never holds more than this many
F2B_REMINDER_S=43200       # while fail2ban stays down, remind every 12 h
DAILY_UTC_HOUR=8           # the daily report goes out at the first tick at/after 08:00 UTC

BOXES="game-prod game-dev game-staging profile telemetry"

SELF="${BASH_SOURCE[0]}"

# ── Small helpers ─────────────────────────────────────────────────────────────

now() {
    if [ -n "${SSH_ALERTS_NOW:-}" ]; then printf '%s' "$SSH_ALERTS_NOW"; else date +%s; fi
}
# GNU date on the boxes, BSD date in the harness.
fmt_utc() { date -u -d "@$1" "+$2" 2>/dev/null || date -u -r "$1" "+$2"; }
fmt_local() { date -d "@$1" "+$2" 2>/dev/null || date -r "$1" "+$2"; }
iso_utc() { fmt_utc "$1" '%Y-%m-%dT%H:%M:%SZ'; }

log() { printf '%s ssh-alerts: %s\n' "$(iso_utc "$(now)")" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

with_timeout() {  # <seconds> <command…> — `timeout` when the box has it (coreutils does)
    local seconds="$1"; shift
    if command -v timeout >/dev/null 2>&1; then timeout "$seconds" "$@"; else "$@"; fi
}

valid_box() { case " $BOXES " in *" $1 "*) return 0 ;; esac; return 1; }
valid_url() { [[ $1 =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; }
valid_token() { [[ $1 =~ ^[A-Za-z0-9._~+/=-]{16,255}$ ]]; }
valid_jail() { [[ $1 =~ ^[A-Za-z0-9_-]{1,32}$ ]]; }

# Read the 0600 config as KEY=VALUE lines. Parsed, never sourced: nothing in it is executed.
load_env() {
    BOX=""; URL=""; TOKEN=""; JAIL="sshd"
    if [ ! -r "$ENV_FILE" ]; then
        log "config $ENV_FILE is missing or unreadable — run install"
        return 1
    fi
    local line key value
    # Split on the FIRST "=" only: `IFS='=' read` would strip a trailing "=" from the value,
    # and a base64 token ends in one.
    while IFS= read -r line; do
        key="${line%%=*}"; value="${line#*=}"
        case "$key" in
            SSH_ALERTS_BOX) BOX="$value" ;;
            SSH_ALERTS_URL) URL="$value" ;;
            SSH_ALERTS_TOKEN) TOKEN="$value" ;;
            SSH_ALERTS_JAIL) JAIL="$value" ;;
        esac
    done < "$ENV_FILE"
    if ! valid_box "$BOX" || ! valid_url "$URL" || ! valid_token "$TOKEN" || ! valid_jail "$JAIL"; then
        log "config $ENV_FILE holds an invalid value — run install again"
        return 1
    fi
    return 0
}

ensure_state_dirs() {
    ( umask 077; mkdir -p "$STATE_DIR" "$SPOOL_DIR" )
    chmod 700 "$STATE_DIR" "$SPOOL_DIR" 2>/dev/null || true
}

write_state() {  # <file> <content> — temp file + rename, 0600
    ( umask 077; printf '%s\n' "$2" > "$1.tmp" ) && mv "$1.tmp" "$1"
}

read_state() {  # <file> — first line, or nothing
    [ -r "$1" ] && head -1 "$1" 2>/dev/null
    return 0
}

# ── The spool and delivery ────────────────────────────────────────────────────

# Several writers touch the spool at once: the watcher's background sends, the cron tick and a
# by-hand `test`. The cap check + write and the dropped counter's read-modify-write run under
# ONE lock, so the cap holds and no dropped count is lost (0443 review R5). flock is on every box
# (0443 inventory); where it is missing (macOS, the harness) the sections run unlocked. Never
# nest it: a second flock on the same file from the same process would wait on itself.
with_spool_lock() {  # <function> [args…]
    if command -v flock >/dev/null 2>&1; then
        {
            flock -w 30 8 || log "the spool lock was busy for 30 s — going ahead without it"
            "$@"
        } 8>>"$STATE_DIR/spool.lock"
    else
        "$@"
    fi
}

spool_event() {  # <json> — writes one spool file, prints its path
    ensure_state_dirs
    with_spool_lock spool_event_locked "$1"
}

spool_event_locked() {  # <json> — only through with_spool_lock
    enforce_spool_cap
    local tmp file
    # mktemp for a name no other writer (the watcher's background sends, the cron job) can
    # hold; the epoch second in front orders the spool and dates the event.
    tmp=$(mktemp "$SPOOL_DIR/.new.XXXXXXXX" 2>/dev/null) || tmp=""
    if [ -n "$tmp" ] && printf '%s\n' "$1" > "$tmp" && chmod 600 "$tmp"; then
        file="$SPOOL_DIR/$(now)-${tmp##*.}.json"
        if mv "$tmp" "$file"; then
            printf '%s' "$file"
            return 0
        fi
    fi
    [ -n "$tmp" ] && rm -f "$tmp"
    log "could not write to the spool ($SPOOL_DIR) — this event is lost"
    return 1
}

spool_count() {
    local n=0 f
    for f in "$SPOOL_DIR"/*.json; do [ -e "$f" ] && n=$((n + 1)); done
    printf '%s' "$n"
}

add_dropped_locked() {  # <n> — only under the spool lock
    local count
    count=$(read_state "$STATE_DIR/dropped.count")
    [[ $count =~ ^[0-9]+$ ]] || count=0
    write_state "$STATE_DIR/dropped.count" "$((count + $1))"
}
add_dropped() { with_spool_lock add_dropped_locked "$1"; }

take_dropped_locked() {  # prints the dropped count and resets it to 0 — only under the spool lock
    local count
    count=$(read_state "$STATE_DIR/dropped.count")
    [[ $count =~ ^[0-9]+$ ]] || count=0
    [ "$count" -gt 0 ] && write_state "$STATE_DIR/dropped.count" 0
    printf '%s' "$count"
}

enforce_spool_cap() {  # make room for one more: drop the OLDEST beyond SPOOL_MAX_FILES - 1 (locked)
    local excess f
    excess=$(( $(spool_count) - SPOOL_MAX_FILES + 1 ))
    [ "$excess" -gt 0 ] || return 0
    for f in "$SPOOL_DIR"/*.json; do
        [ "$excess" -gt 0 ] || break
        [ -e "$f" ] || continue
        rm -f "$f" && add_dropped_locked 1
        excess=$((excess - 1))
    done
    return 0
}

spool_time() {  # <file> — the epoch second the event was spooled (its name's first field)
    local name="${1##*/}"
    name="${name%%-*}"
    [[ $name =~ ^[0-9]+$ ]] && printf '%s' "$name" || printf '0'
}

# An event is claimed by renaming it, so the watcher's send and the cron retry can never
# deliver the same file twice. A claim whose process is gone (killed mid-send) is released.
release_stale_claims() {
    local f pid
    for f in "$SPOOL_DIR"/*.json.sending-*; do
        [ -e "$f" ] || continue
        pid="${f##*.sending-}"
        if ! kill -0 "$pid" 2>/dev/null; then mv "$f" "${f%.sending-*}" 2>/dev/null || true; fi
    done
}

LAST_CODE=""
deliver_file() {  # <spool file> — 0 = done with it (delivered or dropped), 1 = kept for retry
    local file="$1" claim code
    # The claim carries the sending process's OWN pid: $BASHPID, expanded right here (bash 4+,
    # every box) — never inside a $( ), whose subshell has a pid of its own. $$ is the parent's
    # pid inside a background subshell, so it is only bash 3.2's fallback (the macOS harness),
    # where a claim may look stale and be released early: a possible duplicate, never a loss.
    claim="$file.sending-${BASHPID:-$$}"
    mv "$file" "$claim" 2>/dev/null || return 1   # someone else is sending it
    # The token and the URL reach curl on STDIN (--config -, written by the printf BUILTIN),
    # never in its argv. curl's own error text is discarded: it can carry the host.
    code=$(printf 'url = "%s"\nheader = "Authorization: Bearer %s"\nheader = "Content-Type: application/json"\ndata-binary = "@%s"\n' \
            "$URL$EVENTS_PATH" "$TOKEN" "$claim" \
        | curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 15 --config - 2>/dev/null) || true
    [[ $code =~ ^[0-9]{3}$ ]] || code="000"
    LAST_CODE="$code"
    case "$code" in
        2??)
            rm -f "$claim"
            return 0 ;;
        400)
            log "the relay rejected an event as malformed (400) — dropped, it can never succeed: $(head -c 300 "$claim" 2>/dev/null)"
            rm -f "$claim"
            return 0 ;;
        *)
            mv "$claim" "$file" 2>/dev/null || true
            log "delivery failed (HTTP $code) — kept in the spool, retried every 5 minutes for up to 24 h"
            return 1 ;;
    esac
}

report_dropped_if_any() {  # ONE "N alerts dropped" event for everything dropped so far
    local count file
    count=$(with_spool_lock take_dropped_locked)
    [[ $count =~ ^[0-9]+$ ]] || return 0
    [ "$count" -gt 0 ] || return 0
    if ! file=$(spool_event "$(event_json dropped "\"count\":$count")"); then
        add_dropped "$count"   # not queued — keep the count for the next try
        return 0
    fi
    log "$count undelivered alert(s) were dropped; one 'alerts dropped' event is queued"
    deliver_file "$file" || true
}

retry_spool() {
    local f age
    [ -d "$SPOOL_DIR" ] || return 0
    release_stale_claims
    for f in "$SPOOL_DIR"/*.json; do
        [ -e "$f" ] || continue
        age=$(( $(now) - $(spool_time "$f") ))
        if [ "$age" -gt "$SPOOL_MAX_AGE_S" ]; then
            rm -f "$f"
            add_dropped 1
            continue
        fi
        deliver_file "$f" || true
    done
    report_dropped_if_any
    return 0
}

send_event() {  # <json> — spool, then try once now
    local file
    file=$(spool_event "$1") || return 1
    deliver_file "$file"
}

event_json() {  # <type> [<extra fields, already valid JSON fragments>]
    local extra="${2:-}"
    printf '{"type":"%s","box":"%s","agentVersion":%s,"at":"%s"%s}' \
        "$1" "$BOX" "$SSH_ALERTS_AGENT_VERSION" "$(iso_utc "$(now)")" "${extra:+,$extra}"
}

# ── (a) Successful logins ─────────────────────────────────────────────────────

mask_addr() {  # <address> — never prints the full address
    local addr="${1#::ffff:}"
    if [[ $addr =~ ^([0-9]{1,3})\.([0-9]{1,3})\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        printf '%s.%s.*.*' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
    elif [[ $addr =~ ^([0-9A-Fa-f]{1,4}):([0-9A-Fa-f]{1,4}): ]]; then
        printf '%s:%s::*' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" | tr 'A-F' 'a-f'
    else
        printf 'unknown'
    fi
}

provider_hint() {  # <address> — the last two labels of its reverse-DNS name, or "unknown"
    local name
    name=$(with_timeout 2 getent hosts "$1" 2>/dev/null | awk 'NR==1{print $2}' | tr 'A-Z' 'a-z') || true
    name="${name%.}"
    if [[ $name =~ ([a-z0-9-]+\.[a-z0-9-]+)$ ]]; then
        printf '%s' "${BASH_REMATCH[1]}"
    else
        printf 'unknown'
    fi
}

# The journal line, in `-o short-unix` form:
#   1728712345.123456 host sshd[1234]: Accepted publickey for root from 203.0.113.5 port 52344 ssh2: …
# OpenSSH 9.x logs it as `sshd`, OpenSSH 10.x as `sshd-session` (0443 inventory) — both match.
LOGIN_RE='^([0-9]+)(\.([0-9]+))?[[:space:]]+[^[:space:]]+[[:space:]]+(sshd|sshd-session)\[[0-9]+\]:[[:space:]]+Accepted[[:space:]]+([A-Za-z0-9/-]+)[[:space:]]+for[[:space:]]+([^[:space:]]+)[[:space:]]+from[[:space:]]+([0-9A-Fa-f:.]+)[[:space:]]+port[[:space:]]+[0-9]+'

line_time_us() {  # <seconds> <fraction> — microseconds, for the resume check
    local frac="${2:-0}000000"
    frac="${frac:0:6}"
    printf '%s' "$(( $1 * 1000000 + 10#$frac ))"
}

login_event_json() {  # <seconds> <ssh method> <user> <address>
    local method user source provider at
    case "$2" in
        publickey) method=key ;;
        # "keyboard-interactive/pam" is how a PAM password prompt is logged.
        password|keyboard-interactive|keyboard-interactive/*) method=password ;;
        *) method=other ;;
    esac
    user="$3"
    [[ $user =~ ^[A-Za-z0-9_.@-]{1,64}$ ]] || user="unprintable"
    source=$(mask_addr "$4")
    provider=$(provider_hint "$4")
    at=$(iso_utc "$1")
    printf '{"type":"login","box":"%s","agentVersion":%s,"at":"%s","user":"%s","method":"%s","source":"%s","provider":"%s"}' \
        "$BOX" "$SSH_ALERTS_AGENT_VERSION" "$at" "$user" "$method" "$source" "$provider"
}

handle_line() {  # <journal line> — makes an event for an Accepted line, nothing else
    [[ $1 =~ $LOGIN_RE ]] || return 0
    local seconds="${BASH_REMATCH[1]}" fraction="${BASH_REMATCH[3]}" method="${BASH_REMATCH[5]}"
    local user="${BASH_REMATCH[6]}" addr="${BASH_REMATCH[7]}" at_us last_us file
    at_us=$(line_time_us "$seconds" "$fraction")
    last_us=$(read_state "$STATE_DIR/last-login-us")
    [[ $last_us =~ ^[0-9]+$ ]] || last_us=0
    [ "$at_us" -le "$last_us" ] && return 0       # already handled before a restart
    # SPOOLED FIRST, the resume marker moved second (0443 review R3): a watcher killed in between
    # — a deploy's `install` restarts it right after its own root login — re-reads this line on
    # restart (at worst one duplicate alert) instead of losing it. So the reverse-DNS lookup
    # (at most 2 s) runs here in the foreground; later lines wait in the journal pipe meanwhile.
    file=$(spool_event "$(login_event_json "$seconds" "$method" "$user" "$addr")") || file=""
    write_state "$STATE_DIR/last-login-us" "$at_us"
    # The SEND runs in the background, so a slow relay never holds up the next line. The config
    # is re-read there, so a new token or URL needs no restart.
    if [ -n "$file" ]; then
        ( load_env && deliver_file "$file" ) &
    fi
    return 0
}

cmd_watch() {
    load_env || exit 1
    ensure_state_dirs
    local last_us seconds floor
    last_us=$(read_state "$STATE_DIR/last-login-us")
    if [[ $last_us =~ ^[0-9]+$ ]] && [ "$last_us" -gt 0 ]; then
        # Resume where the last run stopped — a restart loses no login. Never further back than
        # 24 h: an event that old would be dropped from the spool anyway.
        seconds=$((last_us / 1000000))
        floor=$(( $(now) - SPOOL_MAX_AGE_S ))
        [ "$seconds" -lt "$floor" ] && seconds="$floor"
        set -- --since "@$seconds"
    else
        # First run: start from now, and remember it, so the next restart resumes from here.
        write_state "$STATE_DIR/last-login-us" "$(( $(now) * 1000000 ))"
        set -- -n 0
    fi
    log "watching for ssh logins (box=$BOX, agent v$SSH_ALERTS_AGENT_VERSION)"
    journalctl -f -q --no-pager -o short-unix SYSLOG_IDENTIFIER=sshd SYSLOG_IDENTIFIER=sshd-session "$@" \
        | { while IFS= read -r line; do handle_line "$line"; done; wait; }
    log "the journal follower exited — systemd restarts this watcher"
    exit 1
}

# ── (b) fail2ban down / back ──────────────────────────────────────────────────

f2b_status() {  # up | down | jail-missing | not-installed
    if ! command -v "$F2B_CLIENT" >/dev/null 2>&1; then echo not-installed; return 0; fi
    if ! systemctl is-active --quiet fail2ban 2>/dev/null; then echo down; return 0; fi
    if ! with_timeout 20 "$F2B_CLIENT" status "$JAIL" >/dev/null 2>&1; then echo jail-missing; return 0; fi
    echo up
}

state_field() {  # <file> <key>
    [ -r "$1" ] && sed -n "s/^$2=//p" "$1" | head -1
    return 0
}

cmd_f2b_check() {
    local file="$STATE_DIR/f2b.state" status streak alerted last_alert since t
    ensure_state_dirs
    status=$(f2b_status)
    streak=$(state_field "$file" streak); [[ $streak =~ ^[0-9]+$ ]] || streak=0
    alerted=$(state_field "$file" alerted); [ "$alerted" = 1 ] || alerted=0
    last_alert=$(state_field "$file" last_alert); [[ $last_alert =~ ^[0-9]+$ ]] || last_alert=0
    since=$(state_field "$file" since); [[ $since =~ ^[0-9]+$ ]] || since=0
    t=$(now)
    if [ "$status" = up ]; then
        if [ "$alerted" = 1 ]; then
            send_event "$(event_json fail2ban "\"event\":\"back\",\"status\":\"up\"")" || true
            log "fail2ban is back"
        fi
        streak=0; alerted=0; last_alert=0; since=0
    else
        # Two bad checks in a row before "down": a single bad check is usually the fail2ban
        # restart every profile deploy performs.
        streak=$((streak + 1))
        [ "$since" -gt 0 ] || since="$t"
        if [ "$alerted" = 0 ] && [ "$streak" -ge 2 ]; then
            send_event "$(event_json fail2ban "\"event\":\"down\",\"status\":\"$status\",\"since\":\"$(iso_utc "$since")\"")" || true
            alerted=1; last_alert="$t"
            log "fail2ban is $status — down alert sent"
        elif [ "$alerted" = 1 ] && [ $((t - last_alert)) -ge "$F2B_REMINDER_S" ]; then
            send_event "$(event_json fail2ban "\"event\":\"reminder\",\"status\":\"$status\",\"since\":\"$(iso_utc "$since")\"")" || true
            last_alert="$t"
            log "fail2ban is still $status — reminder sent"
        fi
    fi
    write_state "$file" "$(printf 'status=%s\nstreak=%s\nalerted=%s\nlast_alert=%s\nsince=%s' \
        "$status" "$streak" "$alerted" "$last_alert" "$since")"
    return 0
}

# ── (c) The daily counts ──────────────────────────────────────────────────────
# Both counts cover the 24 h before now, and both survive a fail2ban restart — fail2ban's own
# "Total" counters reset on every restart, so they are NOT used (0443 inventory finding):
#   failed / invalid  the journal's "Failed …" and "Invalid user …" sshd lines
#   bans              "[<jail>] Ban " lines in fail2ban.log (and .1), whose timestamps are the
#                     box's LOCAL time — so the window is built in local time too.

daily_event_json() {
    local t start out failed invalid journal bans ban_log cutoff end first f status
    local files=""
    t=$(now); start=$((t - 86400))
    if out=$(journalctl -q --no-pager -o cat SYSLOG_IDENTIFIER=sshd SYSLOG_IDENTIFIER=sshd-session \
            --since "@$start" --until "@$t" 2>/dev/null); then
        failed=$(printf '%s\n' "$out" | grep -c '^Failed ' || true)
        invalid=$(printf '%s\n' "$out" | grep -c '^Invalid user ' || true)
        journal=ok
    else
        failed=null; invalid=null; journal=unreadable
    fi
    for f in "$F2B_LOG.1" "$F2B_LOG"; do [ -r "$f" ] && files="$files $f"; done
    if [ -z "$files" ]; then
        bans=null; ban_log=unreadable
    else
        cutoff=$(fmt_local "$start" '%Y-%m-%d %H:%M:%S')
        end=$(fmt_local "$t" '%Y-%m-%d %H:%M:%S')
        # shellcheck disable=SC2086 — $files is a space-separated list of fixed paths
        read -r bans first < <(awk -v c="$cutoff" -v e="$end" -v j="[$JAIL] Ban " '
            /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]/ {
                ts = substr($0, 1, 19)
                if (first == "") first = ts
                if (ts >= c && ts <= e && index($0, j) > 0) n++
            }
            END { printf "%d %s\n", n, (first == "" ? "none" : first) }' $files)
        [[ $bans =~ ^[0-9]+$ ]] || bans=null
        if [ "$bans" = null ]; then
            ban_log=unreadable
        elif [ "$first" = none ] || [[ "$first" > "$cutoff" ]]; then
            ban_log=partial     # the log does not reach back a full 24 h (rotated, or new)
        else
            ban_log=ok
        fi
    fi
    status=$(f2b_status)
    event_json daily "\"failed\":$failed,\"invalid\":$invalid,\"bans\":$bans,\"journal\":\"$journal\",\"banLog\":\"$ban_log\",\"fail2ban\":\"$status\""
}

cmd_daily() {
    local file
    file=$(spool_event "$(daily_event_json)") || return 1
    write_state "$STATE_DIR/daily.last" "$(fmt_utc "$(now)" '%Y-%m-%d')"
    deliver_file "$file" || true
    return 0
}

daily_if_due() {  # once per UTC day, at the first tick at/after 08:00 UTC — whatever the box's TZ
    local t hour today
    t=$(now)
    hour=$(fmt_utc "$t" '%H'); today=$(fmt_utc "$t" '%Y-%m-%d')
    [ $((10#$hour)) -ge "$DAILY_UTC_HOUR" ] || return 0
    [ "$(read_state "$STATE_DIR/daily.last")" = "$today" ] && return 0
    cmd_daily
}

cmd_tick() {
    load_env || exit 1
    ensure_state_dirs
    # One tick at a time (0443 review R5): against a black-holed relay one tick's retries can
    # outlast five minutes, and two overlapping ticks would both send "fail2ban down" or both
    # build a daily report. The lock is held until this process exits; a busy lock skips.
    if command -v flock >/dev/null 2>&1; then
        exec 9>>"$STATE_DIR/tick.lock"
        if ! flock -n 9; then
            log "the previous tick is still running — this one is skipped"
            return 0
        fi
    fi
    cmd_f2b_check
    retry_spool
    daily_if_due
    return 0
}

cmd_test() {
    load_env || exit 1
    local file
    file=$(spool_event "$(event_json test)") || exit 1
    if deliver_file "$file" && [[ $LAST_CODE == 2?? ]]; then
        echo "OK: test event delivered (HTTP $LAST_CODE) — expect one test message in the Alerts topic."
        return 0
    fi
    if [ "$LAST_CODE" = 400 ]; then
        echo "NOT DELIVERED: HTTP 400 — the relay rejected the event as malformed (agent and relay disagree; redeploy both)."
        exit 1
    fi
    echo "NOT DELIVERED: HTTP $LAST_CODE — the event stays in the spool and is retried every 5 minutes."
    echo "  401 = token mismatch · 403 = this box is not on the profile box's /internal/ allow list"
    echo "  404 = the profile route is not deployed yet · 503 = the profile box has no token set · 000 = unreachable"
    exit 1
}

# ── install / uninstall ───────────────────────────────────────────────────────

unit_text() {
    cat <<'EOF'
# Written by ssh-alerts.sh install (task 0443). Do not edit — redeploy instead.
[Unit]
Description=Geoconflict SSH login alerts (task 0443)
After=systemd-journald.service network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/sbin/geoconflict-ssh-alerts watch
Restart=always
RestartSec=5
Nice=10

[Install]
WantedBy=multi-user.target
EOF
}

cron_text() {
    # No percent sign anywhere: Vixie cron turns an unescaped one into a newline. The job runs
    # every 5 minutes and decides the daily report by UTC itself, so it is right on a box in
    # any timezone (three of four boxes run Europe/Moscow, and Vixie cron ignores CRON_TZ).
    cat <<'EOF'
# Geoconflict SSH security alerts (task 0443) — written by ssh-alerts.sh install. Do not edit;
# redeploy instead. Every 5 minutes: fail2ban check, spool retry, the daily report when due.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
*/5 * * * * root /usr/local/sbin/geoconflict-ssh-alerts tick >> /var/log/geoconflict-ssh-alerts.log 2>&1
EOF
}

logrotate_text() {
    # The cron tick appends to this log on every run; while the relay is unreachable it logs one
    # line per spooled event per tick, so it is rotated like every other log (0443 review R8 —
    # the project has had a disk-full outage from an unrotated log). The tick reopens the file
    # each run, so no copytruncate and no postrotate are needed.
    cat <<'EOF'
# Written by ssh-alerts.sh install (task 0443). Do not edit — redeploy instead.
/var/log/geoconflict-ssh-alerts.log {
    weekly
    maxsize 10M
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
}
EOF
}

# Returns 0 when it wrote, 1 when unchanged, 2 when it could NOT write (0443 review R2: a failed
# write must never read as "installed").
write_if_changed() {  # <path> <mode> <content>
    local path="$1" mode="$2" content="$3"
    if [ -f "$path" ] && [ "$(cat "$path")" = "$content" ]; then
        chmod "$mode" "$path" || return 2
        return 1
    fi
    mkdir -p "$(dirname "$path")" || return 2
    if ( umask 077; printf '%s\n' "$content" > "$path.tmp" ) && chmod "$mode" "$path.tmp" && mv "$path.tmp" "$path"; then
        return 0
    fi
    rm -f "$path.tmp"
    return 2
}

cmd_install() {
    local box="" url="" jail="sshd" token="" source="stdin" changed=0 tool rc
    while [ $# -gt 0 ]; do
        case "$1" in
            --box) box="${2:-}"; shift 2 ;;
            --url) url="${2:-}"; shift 2 ;;
            --jail) jail="${2:-}"; shift 2 ;;
            *) die "install: unknown argument '$1' (usage: install --box <name> --url <base> [--jail <name>], token on stdin)" ;;
        esac
    done
    while [ "${url%/}" != "$url" ]; do url="${url%/}"; done
    valid_box "$box" || die "install: --box must be one of: $BOXES"
    valid_url "$url" || die "install: --url must be a base URL (http(s)://host[:port], no path)"
    valid_jail "$jail" || die "install: --jail is not a plain jail name"
    if [ -z "$ROOT" ] && [ "$(id -u)" != 0 ]; then die "install: must run as root"; fi
    IFS= read -r token || true
    token="${token%$'\r'}"
    if [ -z "$token" ] && [ -r "$ENV_FILE" ]; then
        token=$(sed -n 's/^SSH_ALERTS_TOKEN=//p' "$ENV_FILE" | head -1)
        source="persisted"
    fi
    valid_token "$token" \
        || die "install: no usable token on stdin and none persisted — refusing (the box never generates one; it must equal the profile box's PROFILE_SSH_ALERT_TOKEN)"
    for tool in curl journalctl systemctl; do
        command -v "$tool" >/dev/null 2>&1 || die "install: '$tool' is not installed"
    done

    ( umask 077; mkdir -p "$CONF_DIR" ); chmod 700 "$CONF_DIR"
    ensure_state_dirs
    write_if_changed "$ENV_FILE" 600 "$(printf 'SSH_ALERTS_BOX=%s\nSSH_ALERTS_URL=%s\nSSH_ALERTS_TOKEN=%s\nSSH_ALERTS_JAIL=%s' \
        "$box" "$url" "$token" "$jail")"
    [ $? -ne 2 ] || die "install: could not write $ENV_FILE"

    mkdir -p "$(dirname "$BIN_PATH")"
    if ! cmp -s "$SELF" "$BIN_PATH"; then
        cp "$SELF" "$BIN_PATH.tmp" && chmod 700 "$BIN_PATH.tmp" && mv "$BIN_PATH.tmp" "$BIN_PATH" \
            || die "install: could not install $BIN_PATH"
        changed=1
    else
        chmod 700 "$BIN_PATH"
    fi
    write_if_changed "$UNIT_PATH" 644 "$(unit_text)"; rc=$?
    [ "$rc" -ne 2 ] || die "install: could not write $UNIT_PATH"
    if [ "$rc" = 0 ]; then
        changed=1
        systemctl daemon-reload || die "install: systemctl daemon-reload failed"
    fi
    write_if_changed "$CRON_PATH" 644 "$(cron_text)"
    [ $? -ne 2 ] || die "install: could not write $CRON_PATH"
    write_if_changed "$LOGROTATE_PATH" 644 "$(logrotate_text)"
    [ $? -ne 2 ] || die "install: could not write $LOGROTATE_PATH"

    systemctl enable --quiet "$UNIT_NAME" || die "install: could not enable $UNIT_NAME"
    # Restarted ONLY when the agent or its unit changed: an every-deploy install of the same
    # version must not open a gap in which a login goes unseen.
    if [ "$changed" = 1 ]; then
        systemctl restart "$UNIT_NAME" || die "install: could not restart $UNIT_NAME"
        echo "ssh-alerts: agent v$SSH_ALERTS_AGENT_VERSION installed and (re)started"
    elif ! systemctl is-active --quiet "$UNIT_NAME"; then
        systemctl start "$UNIT_NAME" || die "install: could not start $UNIT_NAME"
        echo "ssh-alerts: agent v$SSH_ALERTS_AGENT_VERSION unchanged — the watcher was not running, started it"
    else
        echo "ssh-alerts: agent v$SSH_ALERTS_AGENT_VERSION unchanged and running — not restarted"
    fi
    echo "ssh-alerts: installed for box '$box' (token: $source; fail2ban jail: $jail)"
    return 0
}

cmd_uninstall() {
    if [ -z "$ROOT" ] && [ "$(id -u)" != 0 ]; then die "uninstall: must run as root"; fi
    systemctl disable --now "$UNIT_NAME" 2>/dev/null || true
    rm -f "$CRON_PATH"
    echo "ssh-alerts: watcher stopped and disabled, cron job removed. Config and state are kept."
    echo "  ⚠️ The box's next deploy installs it again — see docs/vps-deployment-guide.md §8."
    return 0
}

case "${1:-}" in
    install) shift; cmd_install "$@" ;;
    uninstall) cmd_uninstall ;;
    watch) cmd_watch ;;
    tick) cmd_tick ;;
    f2b-check) load_env || exit 1; cmd_f2b_check ;;
    daily) load_env || exit 1; cmd_daily ;;
    retry) load_env || exit 1; retry_spool ;;
    test) cmd_test ;;
    *)
        echo "usage: $0 install --box <name> --url <base> [--jail <name>]  (token on stdin)" >&2
        echo "       $0 uninstall | watch | tick | f2b-check | daily | retry | test" >&2
        exit 2 ;;
esac
