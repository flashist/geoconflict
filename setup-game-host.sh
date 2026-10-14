#!/usr/bin/env bash
#
# setup-game-host.sh — the game box's EVERY-DEPLOY root step (task 0443, owner ruling "Way A").
#
# deploy.sh ships this file (with ssh-alerts.sh, sshd-hardening.sh and a 0600 host.env) in ONE
# root login BY KEY, after the new game container is already up, and runs:
#     bash setup-game-host.sh <path to host.env>
# It is how a game box gets its host-level setup from the repo's scripts alone: nothing is set
# up by hand, and a rebuilt or restored box is fixed by its next deploy. (setup.sh is one-time
# provisioning that no deploy re-runs; update.sh runs as the non-root deploy user.)
#
# ── THE CONTRACT — every section added here MUST keep it ─────────────────────
#   - Runs as root on EVERY game deploy, so every section is idempotent and safe to repeat.
#   - LIGHT: no apt upgrade, no certbot, no nginx or container changes. Target: under 30 s.
#   - Never restarts a service unless that service's config actually changed. (A reload is not
#     a restart: the sshd section reloads sshd on every run, so its OK is true of the RUNNING
#     daemon — task 0442 R2; sessions stay up, as on the profile box.)
#   - Each section is one print_header block that reports exactly one of OK, SKIPPED (with the
#     reason) or FAILED. Exit code: 0 = every section OK; 1 = a section FAILED; 3 = nothing
#     failed but a section was SKIPPED. deploy.sh treats anything but 0 as "host setup NOT done"
#     and fails the deploy after its banner (owner ruling Q-A1: a skip fails too).
#   - Inputs come ONLY from the staged host.env passed by path — sourced, then deleted at once.
#     Never from argv: it holds a token.
#   - 🚨 MUST NEVER LOCK OUT SSH. The sshd section (task 0442, sshd-hardening.sh) validates
#     with `sshd -t` before any reload, gates on the effective config and rolls back on any
#     failure, exactly like setup-profile.sh's guarded section (0221).
#
# Shipped next to it by deploy.sh: ssh-alerts.sh (the agent) and sshd-hardening.sh (sourced).
#
# Test seam (tests/ssh-alerts.sh): GAME_HOST_SETUP_ROOT prefixes every path this script writes
# (the sshd section's too); SSH_ALERTS_ROOT does the same for the agent install it runs.
# Bash 3.2 compatible.

set -u

ROOT="${GAME_HOST_SETUP_ROOT:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_ENV="${1:-}"

print_header() {
    echo "======================================================"
    echo "🚀 $1"
    echo "======================================================"
}

FAILED_SECTIONS=""
SKIPPED_SECTIONS=""
report() {  # <section> <OK|SKIPPED|FAILED> [<reason>]
    echo "  $2  $1${3:+ — $3}"
    case "$2" in
        FAILED) FAILED_SECTIONS="$FAILED_SECTIONS $1" ;;
        SKIPPED) SKIPPED_SECTIONS="$SKIPPED_SECTIONS $1" ;;
    esac
}

finish() {
    print_header "GAME HOST SETUP SUMMARY"
    if [ -n "$FAILED_SECTIONS" ]; then
        echo "GAME HOST SETUP: FAILED (sections:$FAILED_SECTIONS)${SKIPPED_SECTIONS:+ — also skipped:$SKIPPED_SECTIONS}"
        exit 1
    fi
    if [ -n "$SKIPPED_SECTIONS" ]; then
        echo "GAME HOST SETUP: SKIPPED (sections:$SKIPPED_SECTIONS)"
        exit 3
    fi
    echo "GAME HOST SETUP: OK"
    exit 0
}

print_header "GAME HOST SETUP (root, every deploy — task 0443)"

if [ -z "$HOST_ENV" ] || [ ! -f "$HOST_ENV" ]; then
    echo "Error: usage: setup-game-host.sh <host.env> (the staged file deploy.sh ships)"
    exit 1
fi
PROFILE_SSH_ALERT_TOKEN=""
PROFILE_API_URL=""
GAME_ENV=""
# Written by deploy.sh with printf %q, 0600, in a 0700 directory only root can enter.
# shellcheck source=/dev/null
. "$HOST_ENV"
rm -f "$HOST_ENV"

# ── 1. Preconditions ──────────────────────────────────────────────────────────
print_header "PRECONDITIONS"
precondition_failed=""
if [ -z "$ROOT" ] && [ "$(id -u)" != 0 ]; then
    precondition_failed="must run as root"
fi
case "$GAME_ENV" in
    dev|staging|prod) ;;
    *) precondition_failed="${precondition_failed:+$precondition_failed; }GAME_ENV is not dev, staging or prod" ;;
esac
# The role marker, like the telemetry and profile boxes' (their deploys refuse a box whose
# marker names another role). A box already marked as something else means this game deploy
# is pointed at the WRONG box: refuse, and never overwrite the other role's marker.
ROLE_FILE="$ROOT/etc/geoconflict-deploy-role"
if [ -z "$precondition_failed" ] && [ -f "$ROLE_FILE" ]; then
    current_role=$(head -1 "$ROLE_FILE" 2>/dev/null | tr -d '[:space:]')
    if [ "$current_role" != game ]; then
        [[ $current_role =~ ^[a-z-]{1,32}$ ]] || current_role="(unreadable)"
        precondition_failed="this box is marked '$current_role' in /etc/geoconflict-deploy-role, not 'game' — this deploy is pointed at the wrong box"
    fi
fi
if [ -n "$precondition_failed" ]; then
    report preconditions FAILED "$precondition_failed"
    finish
fi
mkdir -p "$(dirname "$ROLE_FILE")"
echo game > "$ROLE_FILE" && chmod 644 "$ROLE_FILE"
report preconditions OK "root, GAME_ENV=$GAME_ENV, role marker 'game'"

# ── 2. SSH security alerts (task 0443) ────────────────────────────────────────
print_header "SSH SECURITY ALERTS"
if [ -z "$PROFILE_SSH_ALERT_TOKEN" ]; then
    report ssh-alerts SKIPPED "PROFILE_SSH_ALERT_TOKEN is empty — set it in .env.secret (the same value as on the profile box)"
elif [ -z "$PROFILE_API_URL" ]; then
    report ssh-alerts SKIPPED "PROFILE_API_URL is empty — the agent has nowhere to send"
elif [ ! -f "$HERE/ssh-alerts.sh" ]; then
    report ssh-alerts FAILED "ssh-alerts.sh was not shipped next to this script"
elif printf '%s\n' "$PROFILE_SSH_ALERT_TOKEN" \
        | bash "$HERE/ssh-alerts.sh" install --box "game-$GAME_ENV" --url "$PROFILE_API_URL"; then
    report ssh-alerts OK "agent installed for game-$GAME_ENV"
else
    report ssh-alerts FAILED "ssh-alerts.sh install failed (its output is above)"
fi

# ── 3. sshd hardening (task 0442) ─────────────────────────────────────────────
# Password login off, root key-only — sshd-hardening.sh's harden_sshd, the same guards and
# restore-not-delete rollback as setup-profile.sh's section (0221). Independent of section 2:
# a SKIPPED alerts section (blank token) does not stop it.
# Guard 0 (never harden on a deploy that came in by PASSWORD) holds by construction here:
# deploy.sh runs this whole step only over the game key, BatchMode=yes with password and
# keyboard-interactive auth off, after the game update succeeded with that same key — so the
# key logins of the deploy user and of root are both proven before this section runs.
print_header "SSHD HARDENING (0442)"
if [ ! -f "$HERE/sshd-hardening.sh" ]; then
    report sshd FAILED "sshd-hardening.sh was not shipped next to this script — password login unchanged"
else
    # shellcheck source=sshd-hardening.sh
    . "$HERE/sshd-hardening.sh"
    if harden_sshd "$ROOT"; then
        report sshd OK "password login off, root key-only"
    else
        report sshd FAILED "$SSHD_HARDENING_REASON"
    fi
fi

# ── Sections still to come (follow-up task 0446 — NO code for them in 0443) ───
# (follow-up: fail2ban sshd jail — copy 0221)

finish
