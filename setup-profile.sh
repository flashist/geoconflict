#!/bin/bash
# setup-profile.sh - One-time/idempotent setup for the player-profile backend VPS.
# Run on the profile VPS as root. Mirrors setup-telemetry.sh (do NOT invent a
# parallel pattern). Stands up Postgres + the profile API behind host nginx/TLS.
#
# Required env vars (passed by build-deploy-profile.sh via a sourced temp file):
#   PROFILE_IMAGE              — full registry ref of the profile API image to pull
#   PROFILE_SERVER_HOST        — IP/host (used only for the connection-info banner)
#   POSTGRES_PASSWORD          — Postgres password for the profile DB (required)
# Optional env vars (with defaults):
#   PROFILE_DOMAIN             — public domain; when set, nginx + Let's Encrypt TLS
#   PROFILE_PORT               — profile API port (default 8080)
#   PROFILE_SWAP_SIZE_GB       — swapfile size in GB; 0 disables (default 4)
#   POSTGRES_USER / POSTGRES_DB — profile DB user/name (default profile)
#   DATABASE_URL               — API connection string. Synthesized URL-encoded from the
#                                POSTGRES_* values when unset; an explicit value is passed
#                                through verbatim (operator owns its encoding).
#   PROFILE_INTERNAL_TOKEN     — service token (auto-generated if blank)
#   PROFILE_INTERNAL_ALLOW_IPS — game-server IPs for the nginx /internal/ allowlist
#   CERTBOT_EMAIL              — Let's Encrypt email (default ruflashist@gmail.com)
#   DOCKER_USERNAME/DOCKER_TOKEN — optional registry auth for pulling PROFILE_IMAGE
#
# What this script does:
#   1. Ensures a swapfile exists (low-RAM VPS OOM cushion)
#   2. Installs Docker + Docker Compose plugin
#   3. Applies a ufw firewall (SSH/80/443 only; default-deny incoming)
#   4. Writes docker-compose.yml (postgres + profile-api) to /opt/profile
#   5. Pulls the image and starts the stack
#   6. Configures host nginx + Let's Encrypt TLS for api.geoconflict.ru
#   7. Creates a systemd service for auto-start on reboot
#   8. Adds weekly Postgres backup + certbot renewal cron jobs
#   9. Prints connection info
#
# ── Validation scope (what a successful run / validation_result=passed certifies) ──────
# GUARANTEED NOW by this deploy:
#   • every expected service is running and (where defined) healthcheck-healthy;
#   • the DISCRETE Postgres credentials authenticate over TCP (probe_db_credentials);
#   • the EXACT DATABASE_URL the API consumes opens a real connection and SELECT 1 succeeds
#     (probe_database_url) — operator overrides validated through the same gate, no verbatim
#     trust; a malformed/misdirected URL FAILS the deploy instead of recording passed;
#   • the profile-api image is deployed (and rolled back) by immutable @sha256 digest;
#     postgres runs the major-pinned official image (postgres:16-alpine) and a routine API
#     deploy pulls/recreates ONLY profile-api, so the data-bearing DB is never silently
#     re-pulled or bounced — a Postgres image change is a deliberate, separate action.
# DELIBERATELY OUT OF SCOPE — tracked: a DB-backed application readiness endpoint (/ready)
#   that compose/deploy waits on. It needs the T5 Postgres-backed repository (the API here is
#   a /health-only liveness skeleton). Owned by T5 (s4-profile-05-backend-db-api.md — Scope
#   item 5 "DB connection + readiness check").

set -e

# ── Serialize deploys on this box ───────────────────────────────────────────────
# The rollback backups below use FIXED filenames (profile.env.predeploy.bak /
# docker-compose.yml.predeploy.bak) and the deploy runs `docker compose up
# --force-recreate`. Two overlapping runs — two operators, or a retry while the
# previous SSH-launched run is still going — would clobber each other's backups
# (so a rollback restores the WRONG, in-flight config) and race on the same compose
# project. Take an exclusive, non-blocking lock for the lifetime of this process and
# fail fast if another deploy already holds it — or if flock itself is unavailable and
# cannot be installed. Serialization is mandatory, NOT a best-effort cushion: deploying
# without the lock is unsafe, so the unavailable case ABORTS (it is not a "warn and
# continue" path). The lock releases automatically when this process exits (fd 9
# closes), so it never needs manual cleanup.
if ! command -v flock >/dev/null 2>&1; then
    apt-get update -y >/dev/null 2>&1 && apt-get install -y util-linux >/dev/null 2>&1 || true
fi
# Fail closed: without flock the fixed-name rollback backups (PROFILE_ENV_BAK /
# COMPOSE_BAK below) and `docker compose up --force-recreate` are unsafe under concurrent
# runs. Abort BEFORE any config is written rather than proceeding without serialization.
if ! command -v flock >/dev/null 2>&1; then
    echo "Error: flock (util-linux) is required to serialize deploys and could not be installed."
    echo "       Without it, concurrent runs would clobber the fixed-name rollback backups and"
    echo "       race 'docker compose up --force-recreate'. Aborting before any config is written."
    echo "       Install it manually (apt-get install -y util-linux) and re-run."
    exit 1
fi
exec 9>/var/lock/profile-deploy.lock
if ! flock -n 9; then
    echo "Error: another profile deploy is already running on this box"
    echo "       (lock: /var/lock/profile-deploy.lock). Aborting to avoid a corrupted"
    echo "       rollback state and a 'docker compose --force-recreate' race."
    exit 1
fi

PROFILE_DIR="/opt/profile"
BACKUP_DIR="$PROFILE_DIR/backups"

print_header() {
    echo "======================================================"
    echo "  $1"
    echo "======================================================"
}

is_truthy() {
    case "$1" in
        1|true|TRUE|yes|YES|on|ON) return 0 ;;
        *) return 1 ;;
    esac
}

# Percent-encode a string for safe inclusion in a URI component (RFC 3986: keep only the
# unreserved set, encode everything else). Used to build DATABASE_URL from POSTGRES_*
# without a raw password breaking the URL. LC_ALL=C makes ${#s}/${s:i:1} iterate BYTES,
# and masking to 0xFF keeps high/UTF-8 bytes from sign-extending in printf "'$c", so the
# output is correct for any byte and round-trips through a URL parser's decodeURIComponent.
urlencode() {
    local LC_ALL=C s=$1 out= i c ord
    for (( i=0; i<${#s}; i++ )); do
        c=${s:i:1}
        case $c in
            [a-zA-Z0-9.~_-]) out+=$c ;;
            *) ord=$(printf '%d' "'$c"); out+=$(printf '%%%02X' "$(( ord & 0xFF ))") ;;
        esac
    done
    printf '%s' "$out"
}

# Inverse of urlencode(): percent-decode a URI component back to its literal bytes. Used to
# recover the literal DB password from a DATABASE_URL so it can be fed to psql via PGPASSWORD
# (env), keeping the secret out of any argv. LC_ALL=C iterates BYTES; printf -v avoids the
# trailing-newline stripping of command substitution. A malformed %-escape (not two hex
# digits) FAILS CLOSED — a URL we cannot decode must never silently validate. Round-trips
# with urlencode for any byte string (proven by test).
urldecode() {
    local LC_ALL=C s=$1 out= i c hex dec
    for (( i=0; i<${#s}; i++ )); do
        c=${s:i:1}
        case $c in
            %)
                hex=${s:i+1:2}
                case $hex in
                    [0-9A-Fa-f][0-9A-Fa-f]) ;;
                    *) return 1 ;;
                esac
                printf -v dec '%b' "\\x$hex"
                out+=$dec
                i=$((i + 2))
                ;;
            *) out+=$c ;;
        esac
    done
    printf '%s' "$out"
}

print_header "PLAYER-PROFILE BACKEND SERVER SETUP"

# ── Defaults ──────────────────────────────────────────────────────────────────

PROFILE_PORT="${PROFILE_PORT:-8080}"
PROFILE_SWAP_SIZE_GB="${PROFILE_SWAP_SIZE_GB:-4}"
POSTGRES_USER="${POSTGRES_USER:-profile}"
POSTGRES_DB="${POSTGRES_DB:-profile}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-ruflashist@gmail.com}"
PROFILE_DOMAIN="${PROFILE_DOMAIN:-}"
PROFILE_INTERNAL_ALLOW_IPS="${PROFILE_INTERNAL_ALLOW_IPS:-}"
# Break-glass: permit a PUBLIC /internal/ allow-list token (`all` / `*/0`). Default off — such a
# token is otherwise rejected fail-closed (see the allow-list validation in the HTTPS section).
PROFILE_INTERNAL_ALLOW_PUBLIC="${PROFILE_INTERNAL_ALLOW_PUBLIC:-}"

# Service-to-service token (shared with the game server in T6). It MUST stay stable
# across redeploys — rotating it silently would break game-server crediting calls —
# so an env value always wins, else we reuse a persisted token, else we generate one
# and persist it (root-only). This keeps the script idempotent.
PROFILE_TOKEN_FILE="$PROFILE_DIR/.internal_token"
if [ -n "${PROFILE_INTERNAL_TOKEN:-}" ]; then
    echo "Using PROFILE_INTERNAL_TOKEN from environment"
elif [ -f "$PROFILE_TOKEN_FILE" ]; then
    PROFILE_INTERNAL_TOKEN=$(cat "$PROFILE_TOKEN_FILE")
    echo "Reusing persisted PROFILE_INTERNAL_TOKEN from $PROFILE_TOKEN_FILE"
else
    PROFILE_INTERNAL_TOKEN=$(openssl rand -hex 32)
    mkdir -p "$PROFILE_DIR"
    ( umask 077; printf '%s' "$PROFILE_INTERNAL_TOKEN" > "$PROFILE_TOKEN_FILE" )
    chmod 600 "$PROFILE_TOKEN_FILE"
    echo "Generated and persisted PROFILE_INTERNAL_TOKEN to $PROFILE_TOKEN_FILE"
fi

# Postgres connection string for the API (T4/T5 contract: the box provides DATABASE_URL).
# The API reaches Postgres over the compose network as host 'postgres'. Each component is
# URL-ENCODED via urlencode() so a password containing URL-special characters (/, #, ?, @,
# :, %) can't produce a malformed/misparsed postgresql:// URL — a pg/Node client decodes
# the components back to their literal values. (The discrete POSTGRES_* below are ALSO
# written to profile.env for callers that prefer discrete params; the credential probe
# uses those via PGPASSWORD, never this URL, so the secret never lands in a process argv.)
# An operator-supplied DATABASE_URL wins verbatim — they own its encoding.
DATABASE_URL="${DATABASE_URL:-postgresql://$(urlencode "$POSTGRES_USER"):$(urlencode "$POSTGRES_PASSWORD")@postgres:5432/$(urlencode "$POSTGRES_DB")}"

# ── Validate ──────────────────────────────────────────────────────────────────

if [ -z "${PROFILE_IMAGE:-}" ]; then
    echo "Error: PROFILE_IMAGE is not set (the registry image to pull)."
    exit 1
fi
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "Error: POSTGRES_PASSWORD is not set. Set it in .env.profile.secret."
    exit 1
fi
if ! [[ "$PROFILE_PORT" =~ ^[0-9]+$ ]] || [ "$PROFILE_PORT" -lt 1 ]; then
    echo "Error: PROFILE_PORT must be a positive integer."
    exit 1
fi
if ! [[ "$PROFILE_SWAP_SIZE_GB" =~ ^[0-9]+$ ]]; then
    echo "Error: PROFILE_SWAP_SIZE_GB must be a non-negative integer (GB). Use 0 to disable."
    exit 1
fi

# ── System update ─────────────────────────────────────────────────────────────

print_header "UPDATING SYSTEM"
apt-get update -y && apt-get upgrade -y

# ── Swap ──────────────────────────────────────────────────────────────────────
# The reg.ru profile VPS is low-RAM; the prior telemetry box froze the entire host
# under OOM because it shipped with zero swap. A swapfile gives the kernel a cushion
# so a transient Postgres/Node spike is paged out instead of wedging the box.
# Idempotent: matches on /swapfile presence only — it does NOT resize. To resize,
# `swapoff /swapfile && rm /swapfile` first, then re-run.
print_header "CONFIGURING SWAP"

try_enable_swapfile() {
    local method="$1"   # "fallocate" or "dd"
    rm -f /swapfile
    if [ "$method" = "fallocate" ]; then
        fallocate -l "${PROFILE_SWAP_SIZE_GB}G" /swapfile || return 1
    else
        dd if=/dev/zero of=/swapfile bs=1M count=$((PROFILE_SWAP_SIZE_GB * 1024)) status=none || return 1
    fi
    chmod 600 /swapfile || return 1
    mkswap /swapfile >/dev/null 2>&1 || return 1
    swapon /swapfile 2>/dev/null || return 1
    return 0
}

if [ "$PROFILE_SWAP_SIZE_GB" -eq 0 ]; then
    echo "PROFILE_SWAP_SIZE_GB=0; skipping swap management"
elif swapon --show=NAME --noheadings 2>/dev/null | grep -qx '/swapfile'; then
    echo "Swap already active; leaving it in place:"
    swapon --show
else
    echo "Creating ${PROFILE_SWAP_SIZE_GB}G swapfile at /swapfile..."
    # fallocate is fast on ext4; on CoW filesystems it can yield a holey file that
    # swapon rejects, so fall back to dd (writes real blocks). Each step is guarded
    # so a failure does not trip set -e and abort the whole deploy.
    if try_enable_swapfile fallocate; then
        grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        swapon --show
    elif echo "fallocate path failed (holey/unsupported file?); retrying with dd..." && try_enable_swapfile dd; then
        grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        swapon --show
    else
        rm -f /swapfile
        echo "⚠️  SWAP SETUP FAILED — continuing WITHOUT swap. This box is at OOM risk."
    fi
fi

# Prefer RAM; only spill to swap under real pressure. Persist across reboots.
sysctl -w vm.swappiness=10 >/dev/null 2>&1 || true
if [ -f /etc/sysctl.conf ] && ! grep -q '^vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# ── Docker ────────────────────────────────────────────────────────────────────

print_header "INSTALLING DOCKER"

if command -v docker &> /dev/null; then
    echo "Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    echo "Docker installed: $(docker --version)"
fi

if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi
echo "Docker Compose: $(docker compose version)"

# ── Firewall (ufw) ────────────────────────────────────────────────────────────
# This box holds personal data + entitlements, so — unlike the telemetry box,
# which only printed advisory rules — we actually apply the firewall. Postgres
# (5432) is published on 127.0.0.1 only, so default-deny on the public interface
# keeps it private without an explicit rule. Internal endpoints are additionally
# IP-allowlisted at the nginx /internal/ block below.
print_header "CONFIGURING FIREWALL (ufw)"
if ! command -v ufw >/dev/null 2>&1; then
    apt-get install -y ufw
fi
# Allow SSH FIRST so enabling ufw can never lock us out of the box.
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
ufw status verbose

# ── Directories ───────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"
# Root-only: this dir holds the compose env_file + the persisted internal token.
chmod 700 "$PROFILE_DIR"
cd "$PROFILE_DIR"

# ── Registry auth (optional) ──────────────────────────────────────────────────

if [ -n "${DOCKER_TOKEN:-}" ] && [ -n "${DOCKER_USERNAME:-}" ]; then
    echo "Logging in to the container registry as ${DOCKER_USERNAME}..."
    echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

# ── Secret env file + docker-compose.yml ──────────────────────────────────────
# Two services: postgres (private) + the profile API. nginx is NOT a compose
# service — it runs on the host (telemetry pattern) and terminates TLS.
#
# Credentials live in a root-only (0600) env_file referenced by compose, NOT
# inlined in docker-compose.yml, so a local unprivileged account on the box
# cannot read the DB password or the service token from the compose file.
#
# Back up the existing config (redeploy only) so a failed deploy can be restored to
# the previous known-good state instead of leaving a broken API live. Removed on
# success at the end of validation. Fixed filenames are safe because the flock at the
# top of this script guarantees only one deploy runs on the box at a time, so no
# concurrent run can clobber these backups with an in-flight config.
# A fresh (first-time) deploy has no previous config on disk, so there is nothing to
# roll back to. We never auto-delete the Postgres data volume — it is a data-bearing
# resource and a detection slip would be catastrophic — so on a fresh-deploy failure
# the rollback instead prints an explicit clean-retry hint (see rollback_deploy).
# Classify the pre-deploy on-disk config into one of THREE states, failing closed on the third:
#   • complete pair (both files present) -> REDEPLOY: a valid rollback target (backed up below).
#   • neither file present                -> FRESH first-time deploy (nothing to roll back to).
#   • exactly one file (PARTIAL)          -> REFUSE. A lone file is NEVER a validated rollback
#     target: the success path only ever leaves BOTH files together and the fresh-fail rollback
#     removes BOTH together, so "on-disk config ⇒ validated" holds only for a complete pair. A
#     partial pair can only arise from a crash / OOM / power-loss mid-write (the EXIT trap cannot
#     run on SIGKILL) or a manual edit. Treating it as a redeploy would back up the lone file and,
#     after a failure BEFORE STACK_RECREATED=1, leave the freshly-written (never-validated) OTHER
#     file on disk as a future rollback target that later recreates unvalidated config. Abort
#     BEFORE any config write — and before the rollback trap is installed, so there is nothing to
#     undo — and make the operator resolve the anomalous state explicitly.
PROFILE_ENV_PRESENT=0; [ -f "$PROFILE_DIR/profile.env" ] && PROFILE_ENV_PRESENT=1
PROFILE_COMPOSE_PRESENT=0; [ -f "$PROFILE_DIR/docker-compose.yml" ] && PROFILE_COMPOSE_PRESENT=1
if [ "$PROFILE_ENV_PRESENT" != "$PROFILE_COMPOSE_PRESENT" ]; then
    echo "❌ Refusing to deploy: $PROFILE_DIR is in a PARTIAL config state (profile.env present=$PROFILE_ENV_PRESENT,"
    echo "   docker-compose.yml present=$PROFILE_COMPOSE_PRESENT) — exactly one of the two files exists."
    echo "   A single file is never a validated rollback target (it can only come from a crash,"
    echo "   OOM/power-loss mid-write, or a manual edit), so this deploy refuses to start from it."
    echo "   Resolve it before redeploying:"
    echo "     • retry as a REDEPLOY: restore the MISSING file from a known-good backup so BOTH"
    echo "       exist as a validated pair; OR"
    echo "     • start CLEAN (the postgres_data volume is preserved — never auto-deleted):"
    echo "           rm -f \"$PROFILE_DIR/profile.env\" \"$PROFILE_DIR/docker-compose.yml\""
    echo "       then re-run this deploy (it proceeds as a fresh first-time deploy)."
    exit 1
fi
FRESH_DEPLOY=0
{ [ "$PROFILE_ENV_PRESENT" = "0" ] && [ "$PROFILE_COMPOSE_PRESENT" = "0" ]; } && FRESH_DEPLOY=1

PROFILE_ENV_BAK="$PROFILE_DIR/profile.env.predeploy.bak"
COMPOSE_BAK="$PROFILE_DIR/docker-compose.yml.predeploy.bak"
[ -f "$PROFILE_DIR/profile.env" ] && cp -f "$PROFILE_DIR/profile.env" "$PROFILE_ENV_BAK"
[ -f "$PROFILE_DIR/docker-compose.yml" ] && cp -f "$PROFILE_DIR/docker-compose.yml" "$COMPOSE_BAK"

restore_previous_config() {
    # Restore the pre-deploy config files (when backups exist). Callers decide whether to
    # also recreate containers. Always returns 0 so it is safe inside the EXIT trap — but a
    # restore FAILURE is reported, never swallowed: losing the config restore is itself a
    # rollback failure the operator must see.
    if [ -f "$PROFILE_ENV_BAK" ]; then
        mv -f "$PROFILE_ENV_BAK" "$PROFILE_DIR/profile.env" \
            || echo "❌ ROLLBACK: failed to restore profile.env from $PROFILE_ENV_BAK"
    fi
    if [ -f "$COMPOSE_BAK" ]; then
        mv -f "$COMPOSE_BAK" "$PROFILE_DIR/docker-compose.yml" \
            || echo "❌ ROLLBACK: failed to restore docker-compose.yml from $COMPOSE_BAK"
    fi
    return 0
}

# Atomic rollback: install the EXIT trap BEFORE the first destructive write below, so
# an interruption or write failure at ANY point from here on (a truncated config
# heredoc, the DB probe, the health gate, certbot, nginx, systemd, cron) auto-restores
# the previous compose/env (+ nginx site) instead of leaving corrupted on-disk config
# behind. Cleared only after the ENTIRE setup succeeds (DEPLOY_VALIDATED=1 at the end).
DEPLOY_VALIDATED=0
STACK_RECREATED=0
# nginx ships a default site symlink (sites-enabled/default) that we remove when pointing
# the box at the profile vhost. Capture + restore it on rollback so a failed deploy never
# leaves the box without its original default vhost — a previously-unreverted mutation. The
# backup lives in $PROFILE_DIR, NOT in sites-enabled/ (nginx would try to load it there).
# (Closing this live gap; the full LIFO rollback refactor remains the doctrine's deferred ideal.)
DEFAULT_SITE_BAK="$PROFILE_DIR/sites-enabled-default.predeploy.bak"
DEFAULT_SITE_REMOVED=0
# systemd unit + cron file are the LAST host-state writes. The EXIT trap is live through them,
# but a fallible step there (e.g. the cron `cat`/`chmod` runs AFTER `systemctl enable profile`)
# could fail and leave a FRESH deploy with the service ENABLED + compose/env preserved — so a
# reboot would resurrect the unvalidated stack. Capture each before writing and undo on
# rollback: restore the previous content (redeploy) or disable+remove (fresh).
SYSTEMD_UNIT="/etc/systemd/system/profile.service"
SYSTEMD_UNIT_BAK="$PROFILE_DIR/profile.service.predeploy.bak"
PROFILE_SERVICE_EXISTED=0
SYSTEMD_WRITTEN=0
CRON_FILE="/etc/cron.d/profile-backups"
CRON_FILE_BAK="$PROFILE_DIR/profile-backups.cron.predeploy.bak"
CRON_EXISTED=0
CRON_WRITTEN=0
rollback_deploy() {
    # Preserve the exit status that triggered this trap so the deploy still fails with its
    # ORIGINAL code (the rollback reports its own outcome but never masks the failure).
    local rc=$?
    [ "$DEPLOY_VALIDATED" = "1" ] && return 0
    echo "⚠️  Deploy failed (exit $rc) — rolling back to the previous known-good state..."
    # Undo the systemd unit + cron file FIRST (they were the LAST mutations — LIFO). Critically,
    # on a FRESH deploy a newly-ENABLED profile.service + the preserved compose/env would
    # otherwise resurrect the unvalidated stack on the next reboot. Restore the previous content
    # when it existed (redeploy — keep it enabled); disable + remove it when this deploy created
    # it (fresh). Gated on *_WRITTEN so a failure BEFORE these sections leaves them untouched.
    if [ "${CRON_WRITTEN:-0}" = "1" ]; then
        if [ "$CRON_EXISTED" = "1" ] && [ -f "$CRON_FILE_BAK" ]; then
            mv -f "$CRON_FILE_BAK" "$CRON_FILE" \
                && echo "✅ ROLLBACK: restored the previous cron file." \
                || echo "❌ ROLLBACK: failed to restore the previous cron file from $CRON_FILE_BAK."
        else
            rm -f "$CRON_FILE" \
                && echo "✅ ROLLBACK: removed the newly-created cron file." \
                || echo "❌ ROLLBACK: failed to remove the newly-created cron file $CRON_FILE."
        fi
    fi
    if [ "${SYSTEMD_WRITTEN:-0}" = "1" ]; then
        if [ "$PROFILE_SERVICE_EXISTED" = "1" ] && [ -f "$SYSTEMD_UNIT_BAK" ]; then
            # Redeploy: restore the previous unit (it was enabled before — leave it enabled).
            if mv -f "$SYSTEMD_UNIT_BAK" "$SYSTEMD_UNIT"; then
                systemctl daemon-reload || true
                echo "✅ ROLLBACK: restored the previous profile.service."
            else
                echo "❌ ROLLBACK: failed to restore profile.service from $SYSTEMD_UNIT_BAK."
            fi
        else
            # Fresh: this deploy created (and enabled) the service — disable + remove it so a
            # reboot can't resurrect the unvalidated stack. Disable BEFORE rm so the
            # multi-user.target.wants symlink is cleaned up while the unit still resolves. Guard
            # the rm (|| echo) like every other rollback action: a bare `rm -f` that returns
            # non-zero (read-only fs / permission) would abort this trap under set -e, masking
            # the original exit code and skipping the remaining rollback steps.
            systemctl disable profile 2>/dev/null || true
            rm -f "$SYSTEMD_UNIT" \
                && echo "✅ ROLLBACK: disabled and removed the newly-created profile.service." \
                || echo "❌ ROLLBACK: disabled but could NOT remove $SYSTEMD_UNIT — remove it manually."
            systemctl daemon-reload || true
        fi
    fi
    # Restore nginx's default site first (if this deploy removed it) so the nginx
    # restart/reload in the profile-site branch below picks it up. cp -P preserves a symlink;
    # the backup lives outside sites-enabled/ so nginx never tried to load it.
    if [ "${DEFAULT_SITE_REMOVED:-0}" = "1" ] && { [ -L "$DEFAULT_SITE_BAK" ] || [ -e "$DEFAULT_SITE_BAK" ]; }; then
        if cp -Pf "$DEFAULT_SITE_BAK" /etc/nginx/sites-enabled/default; then
            echo "✅ ROLLBACK: restored the nginx default site."
        else
            echo "❌ ROLLBACK: failed to restore the nginx default site from $DEFAULT_SITE_BAK."
        fi
    fi
    if [ -n "${SITE_BAK:-}" ] && [ -f "${SITE_BAK:-}" ]; then
        # A previous nginx site existed — restore it. Rollback visibility: surface a
        # restore/(re)start failure (the if-conditions keep set -e from aborting the trap).
        mv -f "$SITE_BAK" /etc/nginx/sites-available/profile \
            || echo "❌ ROLLBACK: failed to restore the previous nginx site from $SITE_BAK"
        if systemctl restart nginx || systemctl start nginx; then
            echo "✅ ROLLBACK: nginx restored to the previous site."
        else
            echo "❌ ROLLBACK: nginx did not (re)start after restoring the previous site — TLS/proxy may be DOWN."
        fi
    elif [ -n "${SITE_BAK:-}" ]; then
        # We entered the nginx section but there was NO previous site (SITE_BAK is set
        # but the .bak file was never created). Remove the freshly-created site + symlink
        # so a failed deploy never leaves a public proxy to an incomplete deploy.
        rm -f /etc/nginx/sites-available/profile /etc/nginx/sites-enabled/profile
        # Restore nginx to its PRE-DEPLOY run-state. certbot --standalone stopped nginx
        # above; a bare `reload` cannot start a stopped unit, so the old `reload || stop`
        # left a previously-RUNNING nginx DOWN on a fresh first-TLS deploy (the default
        # vhost — restored above when this deploy removed it — would otherwise be served
        # fine). If nginx was active before we stopped it, bring it back UP and surface a
        # failure loudly; if it was already down, leave it down (don't gratuitously start it).
        if [ "${NGINX_WAS_ACTIVE:-0}" = "1" ]; then
            if systemctl restart nginx || systemctl start nginx; then
                echo "✅ ROLLBACK: removed the unvalidated nginx site; nginx restored to running."
            else
                echo "❌ ROLLBACK: removed the unvalidated nginx site but nginx did NOT come back up — TLS/proxy may be DOWN."
            fi
        else
            echo "✅ ROLLBACK: removed the unvalidated nginx site (nginx was not running before this deploy; left stopped)."
        fi
    fi
    if [ -f "$PROFILE_ENV_BAK" ] || [ -f "$COMPOSE_BAK" ]; then
        restore_previous_config
        # Only recreate if we already replaced the live stack; before that the previous
        # stack is still running, so restoring the config files is enough (and avoids an
        # unnecessary restart of a stack the failed deploy never actually touched). The
        # recreate is the core of rollback safety — NEVER silence it: report success, or
        # on failure print an unmistakable banner plus the stack state and recent logs.
        if [ "$STACK_RECREATED" = "1" ]; then
            # Registry policy (docs/security/registry-image-policy.md): never roll back to a
            # pre-hardening / mutable image. The forward path refuses mutable tags, so every
            # compose THIS pipeline writes is @sha256-pinned — but a COMPOSE_BAK captured from a
            # pre-existing (pre-pipeline) stack on the very first hardened deploy may not be. So
            # before recreating, confirm the restored profile-api image is digest-pinned. This
            # is a SELF-CONTAINED check on the on-disk compose — it reads NO deploy record, so it
            # never refuses rollback "for lack of a passed record" (the Class C invariant); it
            # only declines to RUN a policy-forbidden mutable image, failing LOUD instead.
            # The awk targets the profile-api service's image (NOT postgres') from the line this
            # pipeline always writes single-line as `image: <ref>`; any compose it cannot parse
            # that way yields a non-@sha256 value and so conservatively HALTS (break-glass).
            local prev_image=""
            prev_image=$(awk '$1 == "profile-api:" { in_svc = 1; next } in_svc && $1 == "image:" { print $2; exit }' "$PROFILE_DIR/docker-compose.yml" 2>/dev/null || true)
            if printf '%s' "$prev_image" | grep -q '@sha256:'; then
                echo "Recreating the previous profile-api..."
                # Mirror the forward path: postgres was converged in place and never stopped
                # by this deploy, so converge it again (no-op if running) and recreate ONLY
                # the API (--no-deps) — restoring the previous digest-pinned API without
                # bouncing the data-bearing DB.
                docker compose up -d postgres || true
                if docker compose up -d --force-recreate --no-deps profile-api; then
                    # `up -d` only means "started", not "healthy" (no --wait, and --no-deps drops
                    # the depends_on health-wait). Wait on the SAME assertion the forward path uses
                    # before declaring recovery — a started-but-unhealthy old image (or one whose DB
                    # connection is broken) must be reported as a rollback FAILURE, not a success.
                    echo "   Recreated the previous profile-api; waiting for it to become healthy..."
                    local rb_elapsed=0
                    while [ "$rb_elapsed" -lt 120 ]; do
                        if all_services_running_healthy; then
                            break
                        fi
                        sleep 3
                        rb_elapsed=$((rb_elapsed + 3))
                    done
                    if all_services_running_healthy; then
                        echo "✅ ROLLBACK: previous stack restored and healthy."
                    else
                        echo "❌ ROLLBACK FAILED: the previous profile-api was recreated but did NOT become"
                        echo "   healthy within ${rb_elapsed}s — the profile API may be DOWN. Manual recovery"
                        echo "   required. Current state and recent logs:"
                        docker compose ps || true
                        echo "----- recent logs (last 50 lines) -----"
                        docker compose logs --tail=50 || true
                    fi
                else
                    echo "❌ ROLLBACK FAILED: could not recreate the previous profile-api — the profile API may be DOWN."
                    echo "   Manual recovery required. Current state and recent logs:"
                    docker compose ps || true
                    echo "----- recent logs (last 50 lines) -----"
                    docker compose logs --tail=50 || true
                fi
            else
                echo "🛑 ROLLBACK HALTED: the previous stack's profile-api image is NOT digest-pinned"
                echo "   (${prev_image:-<none found>}). Registry policy forbids rolling back to a"
                echo "   pre-hardening / mutable image (docs/security/registry-image-policy.md), so"
                echo "   the previous config was restored to disk but the stack was NOT recreated."
                echo "   BREAK-GLASS — an operator must choose one:"
                echo "     • redeploy a known-good @sha256 digest (re-run build-deploy-profile.sh"
                echo "       with a pinned ref) — preferred; OR"
                echo "     • accept the pre-hardening image and recreate it by hand from $PROFILE_DIR."
                echo "   Current stack state:"
                docker compose ps || true
            fi
        fi
    elif [ "$FRESH_DEPLOY" = "1" ]; then
        # Fresh (first-time) deploy failed — there is NO previous good config to roll back to.
        # BOTH steps below must run even when the failure PRECEDED the stack recreate (e.g.
        # `docker compose pull profile-api` failed): the old `&& STACK_RECREATED=1` guard
        # skipped this whole branch in that window, stranding the unvalidated config on disk.
        #   1. If the stack was created, STOP it (never leave a live, publicly-proxied service).
        #      `down` WITHOUT -v — we PRESERVE the postgres_data volume (never auto-delete data).
        #   2. ALWAYS remove the unvalidated profile.env + docker-compose.yml. Otherwise the NEXT
        #      run sees them, treats this never-validated config as an existing deploy, backs it
        #      up, and a later failure could RECREATE it as the "previous" stack (it is
        #      @sha256-pinned, so the digest gate passes) — bringing up config that never passed
        #      health/DB validation. Removing it keeps the invariant: on-disk config ⇒ validated.
        if [ "$STACK_RECREATED" = "1" ]; then
            echo "Stopping the unvalidated stack (preserving the postgres_data volume)..."
            if docker compose down; then
                echo "✅ ROLLBACK: unvalidated stack stopped (volume preserved)."
            else
                echo "❌ ROLLBACK: 'docker compose down' failed — the unvalidated stack may still be running."
                docker compose ps || true
            fi
        fi
        # Quarantine the unvalidated config (guard the rm so it can't abort the trap under set -e).
        rm -f "$PROFILE_DIR/profile.env" "$PROFILE_DIR/docker-compose.yml" \
            && echo "✅ ROLLBACK: removed the unvalidated profile.env + docker-compose.yml (never validated)." \
            || echo "❌ ROLLBACK: failed to remove the unvalidated config under $PROFILE_DIR — remove it manually."
        echo ""
        echo "ℹ️  This was a FIRST-TIME deploy that did not validate; its config was removed so the"
        echo "   next run starts clean (a never-validated config can never become a rollback target)."
        echo "   Re-run the deploy to retry."
        if [ "$STACK_RECREATED" = "1" ]; then
            echo "   The postgres_data volume is PRESERVED and still holds this run's initial password:"
            echo "     • Retry with the SAME password: just re-run the deploy."
            echo "     • Retry with a DIFFERENT password (or from a clean slate): reset the DB volume"
            echo "       first (the compose file was removed, so use the volume directly), then re-run:"
            echo "           docker volume rm profile_postgres_data"
            echo "       (DELETES the postgres_data volume — safe here: this deploy never validated,"
            echo "        so the volume holds no data you need.)"
        fi
    fi
    return "$rc"
}

# Service health assertions — defined BEFORE the trap so the EXIT rollback (which recreates the
# previous stack) can reuse the EXACT check the forward path uses below. Each service is inspected
# explicitly (running + healthy/none); a `docker compose ps` string-grep is a NEGATIVE check that
# passes on Created/Dead/Paused, a missing service, or a compose-command error.
EXPECTED_SERVICES="postgres profile-api"

service_running_healthy() {
    local svc cid status health
    svc="$1"
    cid=$(docker compose ps -q "$svc" 2>/dev/null) || return 1
    [ -n "$cid" ] || return 1
    status=$(docker inspect --format '{{.State.Status}}' "$cid" 2>/dev/null) || return 1
    [ "$status" = "running" ] || return 1
    # "none" => no healthcheck declared; otherwise the service must be "healthy".
    health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null) || return 1
    case "$health" in
        healthy|none) return 0 ;;
        *) return 1 ;;
    esac
}

all_services_running_healthy() {
    local svc
    for svc in $EXPECTED_SERVICES; do
        service_running_healthy "$svc" || return 1
    done
    return 0
}

trap rollback_deploy EXIT

# DATABASE_URL is always present (synthesized URL-encoded above, or an operator override).
# Discrete POSTGRES_* are written too so a caller can use either; the credential probe
# uses the discrete password via PGPASSWORD (never this URL) to keep it out of any argv.
( umask 077; cat > "$PROFILE_DIR/profile.env" << EOF
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
DATABASE_URL=${DATABASE_URL}
PROFILE_INTERNAL_TOKEN=${PROFILE_INTERNAL_TOKEN}
PROFILE_PORT=${PROFILE_PORT}
EOF
)
chmod 600 "$PROFILE_DIR/profile.env"
echo "Written: profile.env (0600)"

cat > "$PROFILE_DIR/docker-compose.yml" << EOF
services:
  postgres:
    image: postgres:16-alpine
    restart: on-failure
    # Conservative memory caps for a low-RAM box (no auto-sizing). The swapfile
    # above is the host-level cushion; these keep Postgres itself bounded.
    command: postgres -c shared_buffers=128MB -c work_mem=4MB -c max_connections=25 -c maintenance_work_mem=64MB
    # Secrets come from the 0600 profile.env (POSTGRES_USER/PASSWORD/DB) — never inlined.
    environment:
      PGDATA: /var/lib/postgresql/data/pgdata
    env_file:
      - ./profile.env
    # Bound to loopback only — reachable on the box (psql 127.0.0.1) but never public.
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 5s
      timeout: 3s
      retries: 30
    volumes:
      - postgres_data:/var/lib/postgresql/data/pgdata

  profile-api:
    image: ${PROFILE_IMAGE}
    restart: on-failure
    # DATABASE_URL + POSTGRES_* + PROFILE_INTERNAL_TOKEN + PROFILE_PORT come from the
    # 0600 profile.env.
    env_file:
      - ./profile.env
    # Bound to loopback only — host nginx proxies 443 -> 127.0.0.1:${PROFILE_PORT}.
    ports:
      - "127.0.0.1:${PROFILE_PORT}:${PROFILE_PORT}"
    depends_on:
      postgres:
        condition: service_healthy
    # /health is deliberately liveness-only (dependency-free). A DB-backed readiness probe
    # (/ready) is deferred; owned by T5 (s4-profile-05-backend-db-api.md — Scope item 5
    # "DB connection + readiness check"). The deploy's authoritative DB check is
    # probe_database_url (real SELECT 1 over the exact DATABASE_URL), not this healthcheck.
    healthcheck:
      test: ['CMD-SHELL', 'curl -fsS http://localhost:${PROFILE_PORT}/health || exit 1']
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
EOF

chmod 600 "$PROFILE_DIR/docker-compose.yml"
echo "Written: docker-compose.yml (0600)"

# ── Start services ────────────────────────────────────────────────────────────

print_header "STARTING PROFILE SERVICES"

# SUPPLEMENTARY discrete-credential probe — NOT the authoritative DB gate (that is
# probe_database_url below, which validates the EXACT DATABASE_URL the API consumes).
# This checks the DISCRETE POSTGRES_USER/PASSWORD/DB path via psql for first-init /
# password-drift detection against the running Postgres volume; it deliberately does NOT
# use DATABASE_URL. Like the URL gate it keeps the secret out of any process argv. Passing a
# password-bearing DATABASE_URL (or `-e PGPASSWORD=...`) to `docker compose exec`
# would place the secret in the HOST docker process argv AND the container psql argv
# (visible to `ps`, /proc/<pid>/cmdline, execve auditing, and process collectors) —
# undercutting the 0600 root-only env-file boundary. Instead the password is piped
# via stdin and read into PGPASSWORD inside the container; only the non-secret
# user/db are passed as args. `printf` is a bash builtin, so the password is never in
# a forked process's argv here either. We inject the SCRIPT's $POSTGRES_PASSWORD (the
# value being deployed) rather than the container's own env var, because pre-recreate
# the running container still holds the OLD password — testing that would defeat the
# drift detection. `-h postgres` forces TCP, so this is a real password auth, not the
# local trust socket.
probe_db_credentials() {
    printf '%s\n' "$POSTGRES_PASSWORD" | docker compose exec -T postgres \
        sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec psql -h postgres -U "$1" -d "$2" -tAc "select 1"' \
        _ "$POSTGRES_USER" "$POSTGRES_DB" >/dev/null 2>&1
}

# AUTHORITATIVE DB gate (review #12 / F12): validate the EXACT DATABASE_URL the API will
# consume — including an operator-supplied override (previously trusted verbatim) — by
# opening a real connection with it and running SELECT 1. That literal connection string is
# the artifact the running API uses; the discrete probe above and the dependency-free
# /health check are only PROXIES for it, so a malformed / wrong-host / wrong-db /
# wrong-credential URL must fail HERE rather than be recorded validation_result=passed.
#
# Secret-safety (round-#7 boundary + R1): libpq accepts the password on MORE than the
# user:pass@ userinfo channel — it also reads `?password=` / `&password=` from the query
# string. EVERY such channel must be stripped before the URL reaches `psql -d` argv (where
# `ps`, /proc/<pid>/cmdline, execve auditing, and process collectors can read it). So we:
#   • split the query string off and pull `password=` out of it (fed via stdin → PGPASSWORD,
#     exactly like the userinfo password), while PRESERVING non-secret params (sslmode, etc.)
#     so the validated URL still matches what the API consumes;
#   • fail CLOSED on `sslpassword=` — the client-key passphrase has no PGPASSWORD-style stdin
#     channel, and an SSL client-cert connection cannot be exercised from inside the postgres
#     container anyway, so we refuse rather than leak it to argv or record a false pass;
#   • fail CLOSED when a password appears in BOTH userinfo AND the query string (libpq
#     precedence is not something this gate should guess).
# The password-FREE URL is handed to `psql -d`, so libpq — the real client URL parser —
# parses the exact scheme/host/port/db/params. Any structural ambiguity we cannot split
# safely fails CLOSED, so a parse divergence can only BLOCK a deploy, never let a broken
# one pass.
probe_database_url() {
    local url=$1 scheme rest base query
    local userinfo hostpart user ui_pw_enc ui_pw
    local safe_query q_pw_enc pw url_no_pw authority kv kv_key kv_val kv_key_lc
    local host_only hostname host_lc is_ipv6 reject_loopback v6
    local has_q_pw=0 has_sslpw=0 has_host_param=0 host_param_name=
    local -a params=()
    case $url in
        postgresql://*) scheme=postgresql ;;
        postgres://*) scheme=postgres ;;
        *)
            echo "   (DATABASE_URL does not start with postgresql:// or postgres://)"
            return 1
            ;;
    esac
    rest=${url#*://}                        # [user[:pass]@]host[:port][/db][?params]
    # Split the query string off FIRST: a credential can ride the query
    # (?password= / &password= / ?sslpassword=), not only the user:pass@ userinfo.
    if [[ $rest == *\?* ]]; then
        base=${rest%%\?*}                   # [user[:pass]@]host[:port][/db]
        query=${rest#*\?}                   # k=v&k=v...
    else
        base=$rest
        query=
    fi
    # Userinfo (the user:pass@ channel) — split the password out to stdin as before.
    if [[ $base == *@* ]]; then
        userinfo=${base%%@*}                # user[:pass]   (everything before the first @)
        hostpart=${base#*@}                 # host[:port][/db]   (query already removed)
        if [[ $userinfo == *:* ]]; then
            user=${userinfo%%:*}
            ui_pw_enc=${userinfo#*:}
            if ! ui_pw=$(urldecode "$ui_pw_enc"); then
                echo "   (DATABASE_URL userinfo password is not valid percent-encoding)"
                return 1
            fi
        else
            user=$userinfo
            ui_pw=
        fi
    else
        user=
        hostpart=$base
        ui_pw=
    fi
    # Reject a container-local LOOPBACK host. This probe runs psql INSIDE the postgres
    # container (`docker compose exec -T postgres`), but the URL is consumed by the
    # profile-api container. `localhost` / `127.0.0.0/8` / `::1` / `0.0.0.0` resolve to
    # *whatever container asks* — from postgres they reach the DB (probe passes), but from
    # profile-api they reach the API's OWN loopback (no DB), so the API would fail at runtime
    # on a connection the gate recorded as passed. In this single-host compose topology the
    # API can reach Postgres ONLY via the compose service name `postgres` (or an external
    # host), never its own loopback — so a loopback host is always wrong for the API and the
    # in-postgres-container probe cannot faithfully test it. Fail CLOSED. (No container but
    # the API shares the API's loopback, so probing from an ephemeral container would not fix
    # this — rejection is the correct gate, not a fallback.)
    host_only=${hostpart%%/*}                   # strip /db -> host[:port]
    # Reject a MULTI-HOST authority (comma-separated hosts, e.g. postgresql://h1,localhost/db).
    # libpq tries each host in turn, so a localhost member passes from inside the postgres
    # container (reaches the DB) yet fails from the API (its own loopback) — and the single-host
    # loopback check below would never see it (the literal 'h1,localhost' matches no pattern). A
    # comma is never valid inside one hostname/IP, so it always means a host list. This single-host
    # compose topology never needs one; fail CLOSED so the check governs the one real target.
    case $host_only in
        *,*)
            echo "   (DATABASE_URL authority lists MULTIPLE hosts ('$host_only'). libpq tries each"
            echo "    in turn — a localhost member passes from the DB container but fails from the"
            echo "    API. Supply a single host (the compose service name 'postgres').)"
            return 1
            ;;
    esac
    is_ipv6=0
    case $host_only in
        \[*\]*) hostname=${host_only%%\]*}; hostname=${hostname#\[}; is_ipv6=1 ;;  # [IPv6]:port
        *) hostname=${host_only%%:*} ;;                                            # host[:port]
    esac
    host_lc=$(printf '%s' "$hostname" | LC_ALL=C tr 'A-Z' 'a-z')
    host_lc=${host_lc%.}                         # strip a trailing FQDN dot (localhost. -> localhost)
    reject_loopback=0
    # IPv4 loopback (127.0.0.0/8) / unspecified / IPv4-mapped-IPv6 loopback, by literal form.
    case $host_lc in
        localhost | 0.0.0.0 | 127.* | ::ffff:127.*) reject_loopback=1 ;;
    esac
    # IPv6 loopback in ANY spelling — ::1, 0:0:0:0:0:0:0:1, the fully-zero-padded form, 0::1 — all
    # consist solely of zero groups plus a single 1; the unspecified address :: is all zeros (and
    # routes to local on Linux). Normalize rather than enumerate: strip ':' and '0'; what remains
    # is "1" for loopback and "" for ::. Apply ONLY to a real bracketed IPv6 literal so a plain
    # hostname like "1" is never caught.
    if [ "$is_ipv6" = "1" ]; then
        v6=${host_lc//:/}
        v6=${v6//0/}
        { [ "$v6" = "1" ] || [ -z "$v6" ]; } && reject_loopback=1
    fi
    if [ "$reject_loopback" = "1" ]; then
        echo "   (DATABASE_URL host is '$hostname' — from the profile-api container that is"
        echo "    the API's OWN loopback, not Postgres. Use the compose service name"
        echo "    'postgres' (the API reaches the DB over the compose network), not localhost.)"
        return 1
    fi
    # Walk the query params: pull out any credential-bearing key, KEEP the rest
    # (e.g. sslmode=require) so the validated URL matches what the API consumes. Use
    # `read -ra` (not unquoted $query) so a param value can never glob-expand.
    if [[ -n $query ]]; then
        IFS='&' read -ra params <<< "$query" || true
        safe_query=
        for kv in "${params[@]}"; do
            [[ -z $kv ]] && continue        # empty field from a stray & — drop it
            # libpq matches connection-parameter NAMES case-INSENSITIVELY, so classify on a
            # lowercased KEY — never the value (a password's case is significant). Split the
            # key from the value, but keep the ORIGINAL kv for any param we pass through so
            # non-secret params survive verbatim.
            if [[ $kv == *=* ]]; then
                kv_key=${kv%%=*}
                kv_val=${kv#*=}
            else
                kv_key=$kv
                kv_val=
            fi
            # A percent-escape in a query KEY is an evasion vector. libpq percent-DECODES the
            # query keyword and THEN matches it (fe-connect.c conninfo_uri_parse_params:
            # `keyword = conninfo_uri_decode(keyword, ...)` — verified REL_12..master), so an
            # encoded key like `pass%77ord` decodes to the LIVE `password` credential channel and
            # `h%6fst` to a `host` authority override. Left in the pass-through query, that value
            # would BOTH reach the API as a working password/host parameter AND land in psql's
            # argv here — slipping past the password/sslpassword/host classification below. No
            # real libpq keyword name (sslmode, connect_timeout, application_name, sslcert, host,
            # hostaddr, …) ever contains '%', and this script's own URL synthesis never encodes
            # key names, so reject any '%' in a key fail-closed: it can only ever refuse a
            # hand-crafted evasion, never a valid deploy. (This also refuses an encoded spelling
            # of a benign keyword — e.g. `sslmod%65`=sslmode, which the API WOULD accept — but
            # that is intentional fail-closed conservatism: it blocks a deploy, never records a
            # false pass, and the script never emits such a URL. Encoded VALUES are fine and
            # preserved — only the key is checked here.)
            case $kv_key in
                *%*)
                    echo "   (DATABASE_URL query parameter name '$kv_key' contains a percent-escape."
                    echo "    Connection parameter names are never percent-encoded; refusing it so an"
                    echo "    encoded key (e.g. pass%77ord, h%6fst) cannot bypass the password/host"
                    echo "    checks. Use the literal parameter name.)"
                    return 1
                    ;;
            esac
            kv_key_lc=$(printf '%s' "$kv_key" | LC_ALL=C tr 'A-Z' 'a-z')
            case $kv_key_lc in
                password)
                    q_pw_enc=$kv_val
                    has_q_pw=1
                    ;;
                sslpassword)
                    has_sslpw=1
                    ;;
                host | hostaddr)
                    # A host/hostaddr query param OVERRIDES the URL's authority host for the
                    # actual libpq connection — so it can point the connection at a target the
                    # authority-host loopback check above never inspected (e.g. ?host=localhost,
                    # which reaches Postgres from the DB container but is the API's own loopback
                    # at runtime). Reject it so the host can only come from the authority, where
                    # the loopback/multi-host checks govern it.
                    has_host_param=1
                    host_param_name=$kv_key_lc
                    ;;
                *)
                    if [[ -n $safe_query ]]; then
                        safe_query="${safe_query}&${kv}"
                    else
                        safe_query=$kv
                    fi
                    ;;
            esac
        done
    fi
    if [[ $has_host_param == 1 ]]; then
        echo "   (DATABASE_URL carries a '$host_param_name' connection parameter in the query string,"
        echo "    which overrides the URL's host for the ACTUAL connection. The in-postgres-container"
        echo "    probe would then test a different target than the authority-host check examined"
        echo "    (e.g. ?host=localhost reaches Postgres from the DB container but is the API's own"
        echo "    loopback at runtime). Put the host in the URL authority instead.)"
        return 1
    fi
    if [[ $has_sslpw == 1 ]]; then
        echo "   (DATABASE_URL carries sslpassword in the query string; the in-container probe"
        echo "    cannot validate client-certificate auth — validate that path separately)"
        return 1
    fi
    if [[ $has_q_pw == 1 && -n $ui_pw ]]; then
        echo "   (DATABASE_URL specifies a password in BOTH userinfo and the query string;"
        echo "    refusing to guess which libpq would use — supply exactly one)"
        return 1
    fi
    if [[ $has_q_pw == 1 ]]; then
        if ! pw=$(urldecode "$q_pw_enc"); then
            echo "   (DATABASE_URL query-string password is not valid percent-encoding)"
            return 1
        fi
    else
        pw=$ui_pw
    fi
    # Rebuild a password-FREE connection string: scheme://[user@]hostpart[?safe_query].
    if [[ -n $user ]]; then
        authority="${user}@"
    else
        authority=
    fi
    url_no_pw="${scheme}://${authority}${hostpart}"
    if [[ -n $safe_query ]]; then
        url_no_pw="${url_no_pw}?${safe_query}"
    fi
    printf '%s\n' "$pw" | docker compose exec -T postgres \
        sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec psql -d "$1" -tAc "select 1"' \
        _ "$url_no_pw" >/dev/null 2>&1
}

# Pre-recreate credential check: on a redeploy (postgres already running), confirm the
# NEW password authenticates against the EXISTING volume BEFORE we recreate the live
# API. postgres only honors POSTGRES_PASSWORD on first init, so a changed password
# against an existing postgres_data volume would otherwise replace a working API with a
# DB-broken one. Abort + restore here, leaving the running stack untouched.
if [ -n "$(docker compose ps -q postgres 2>/dev/null || true)" ]; then
    echo "Existing stack detected — verifying new credentials against the running Postgres..."
    if ! probe_db_credentials; then
        echo "❌ New credentials do not authenticate against the existing Postgres volume."
        echo "   POSTGRES_PASSWORD likely changed but the volume keeps the original password."
        echo "   Fix by EITHER reconciling POSTGRES_PASSWORD with the existing volume,"
        echo "   OR — only if this DB has no data you need — resetting the volume:"
        echo "       cd $PROFILE_DIR && docker compose down -v    # DELETES postgres_data"
        echo "   then re-run. Restoring previous config and aborting WITHOUT touching the live stack."
        restore_previous_config
        exit 1
    fi
    echo "✅ New credentials authenticate against the existing Postgres."
    # Also validate the EXACT DATABASE_URL the API will consume — BEFORE the destructive
    # force-recreate below — so a wrong operator override (bad host/db/credential or a malformed
    # URL) aborts while the previous API is still LIVE and untouched, instead of replacing it with
    # a DB-broken container that only the post-recreate gate (Step 2) would catch — a transient
    # outage, or persistent if rollback recreation then fails. postgres is running on this redeploy
    # path and reachable as the compose service `postgres` (the same channel probe_db_credentials
    # uses), so the probe is representative. The FRESH-deploy path has no running postgres here and
    # is still covered by the post-recreate Step 2 gate. STACK_RECREATED is still 0, so aborting
    # here leaves the live stack untouched (config-only restore), exactly like the check above.
    echo "Verifying the configured DATABASE_URL opens a real connection (pre-recreate)..."
    if ! probe_database_url "$DATABASE_URL"; then
        echo "❌ DATABASE_URL did not open a working connection against the running Postgres."
        echo "   The API consumes this exact connection string; a malformed URL, wrong host/db,"
        echo "   or different credentials would fail at runtime. Reconcile DATABASE_URL (or the"
        echo "   discrete POSTGRES_* it is built from), then re-run. Restoring previous config and"
        echo "   aborting WITHOUT touching the live stack."
        restore_previous_config
        exit 1
    fi
    echo "✅ DATABASE_URL opens a real connection (pre-recreate)."
fi

# Pull and recreate ONLY the profile-api service. postgres is a data-bearing service on
# the major-pinned official image (postgres:16-alpine); a routine API deploy must NOT
# silently re-pull it (non-reproducible binary drift) nor force-recreate it (gratuitous
# DB downtime on every ship). So: pull just the API image; converge postgres in place
# (create-if-missing; recreate only if its compose definition genuinely changed — never on
# a bare API redeploy; and never a silent image bump, since we don't `pull` it here); then
# force-recreate the API alone. `--no-deps` is required because `--force-recreate` otherwise
# cascades to dependencies; the dropped `depends_on` health-wait is covered by the health
# gate below (+ `restart: on-failure` and the dependency-free /health). A deliberate
# Postgres image change is a separate, explicit maintenance action — not a routine deploy.
docker compose pull profile-api
# Mark the live stack as touched BEFORE the FIRST container-mutating command. BOTH the
# postgres converge below (which can CREATE the DB on a fresh deploy, or RECREATE it if its
# compose definition drifted) AND the API force-recreate mutate containers; a failure in
# EITHER must let the EXIT rollback reconverge/stop the stack (recreate the previous stack on
# a redeploy, or `docker compose down` the unvalidated one on a fresh deploy). Setting this
# only after the converge would land a converge failure in rollback with STACK_RECREATED=0,
# which restores config but never touches the half-mutated postgres — leaving the DB down or
# partial. Placed AFTER `pull` because pulling an image touches no containers, so a pull
# failure is a pure config-only restore (no recreate needed).
STACK_RECREATED=1
docker compose up -d postgres
docker compose up -d --force-recreate --no-deps profile-api

# T5: apply DB migrations here once they exist, e.g.:
#   docker compose exec -T profile-api npm run migrate

# service_running_healthy / all_services_running_healthy / EXPECTED_SERVICES are defined ABOVE,
# before the rollback trap, so the EXIT rollback can reuse the SAME health assertion as this
# forward gate. Each inspects every service explicitly (running + healthy/none); a string-grep of
# `docker compose ps` is a NEGATIVE check that can pass on Created/Dead/Paused, a missing service,
# or a compose-command error.
echo "Waiting for all services to be running and healthy..."
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    if all_services_running_healthy; then
        break
    fi
    sleep 3
    ELAPSED=$((ELAPSED + 3))
done

# Fail hard unless EVERY expected service is running and healthy. The game server
# will depend on this box, so a broken/missing stack must stop the deploy here —
# before nginx is pointed at a dead upstream and before we report success. The EXIT
# rollback trap restores the previous stack.
if ! all_services_running_healthy; then
    echo "❌ Not all services are running and healthy:"
    docker compose ps || true
    echo "----- recent logs (last 50 lines) -----"
    docker compose logs --tail=50 || true
    echo "Aborting before nginx configuration; the EXIT rollback will restore the previous stack."
    exit 1
fi
echo "✅ All services running and healthy:"
docker compose ps

# Step 1 (supplementary): verify the DISCRETE credentials authenticate. The Docker
# healthchecks do NOT prove this: pg_isready sends no password, and /health is
# dependency-free. In particular, postgres:16-alpine applies POSTGRES_PASSWORD only
# on FIRST init — against a pre-existing postgres_data volume a changed password is
# silently ignored, so the API's DB credentials would fail auth while the gate passes.
# probe_db_credentials does a real TCP password auth without exposing the secret in
# any process argv.
echo "Verifying Postgres accepts the configured credentials..."
if ! probe_db_credentials; then
    echo "❌ Postgres did not accept the configured credentials."
    echo "   pg_isready can pass while POSTGRES_PASSWORD drifts from the password in an"
    echo "   existing postgres_data volume. Reconcile the password (or reset the volume), then re-run."
    docker compose logs --tail=50 postgres || true
    echo "The EXIT rollback will restore the previous stack."
    exit 1
fi
echo "✅ Postgres credential check passed."

# Step 2 (AUTHORITATIVE): open a real connection with the EXACT DATABASE_URL the API will
# consume (review #12 / F12). The discrete check above and /health are proxies; this gate
# exercises the literal connection string — operator override included — so a malformed
# URL, wrong host/db, or different credentials FAIL the deploy here instead of being
# recorded validation_result=passed on a connection the API would then fail to use.
echo "Verifying the configured DATABASE_URL opens a real connection..."
if ! probe_database_url "$DATABASE_URL"; then
    echo "❌ DATABASE_URL did not open a working connection (SELECT 1 failed)."
    echo "   The API consumes this exact connection string; a malformed URL, wrong host/db,"
    echo "   or different credentials would fail at runtime. Reconcile DATABASE_URL (or the"
    echo "   POSTGRES_* values it is synthesized from), then re-run."
    docker compose logs --tail=50 postgres || true
    echo "The EXIT rollback will restore the previous stack."
    exit 1
fi
echo "✅ DATABASE_URL connection check passed."

# ── HTTPS via nginx + Let's Encrypt ──────────────────────────────────────────

if [ -n "$PROFILE_DOMAIN" ]; then
    print_header "CONFIGURING HTTPS ($PROFILE_DOMAIN)"

    # Fail fast if DNS isn't pointed at THIS host — certbot's HTTP-01 challenge
    # needs the A record resolving to this box. Checking the actual target (not just
    # "resolves") catches the common first-setup / DNS-change failure BEFORE we stop
    # nginx, so a misconfigured domain never takes the service offline.
    RESOLVED_IPS=$(getent hosts "$PROFILE_DOMAIN" | awk '{print $1}')
    if [ -z "$RESOLVED_IPS" ]; then
        echo "Error: $PROFILE_DOMAIN does not resolve. Point its DNS A record at this box first."
        exit 1
    fi
    HOST_IPS=$(hostname -I 2>/dev/null || true)
    DNS_MATCH=0
    for rip in $RESOLVED_IPS; do
        for hip in $HOST_IPS; do
            [ "$rip" = "$hip" ] && DNS_MATCH=1
        done
    done
    if [ "$DNS_MATCH" -ne 1 ]; then
        echo "Error: $PROFILE_DOMAIN resolves to [$RESOLVED_IPS], not an IP on this host ([$HOST_IPS])."
        echo "Update the A record to point at this box before deploying (certbot HTTP-01 would fail)."
        exit 1
    fi

    apt-get install -y nginx certbot

    # Capture nginx's pre-deploy run-state BEFORE we touch anything in this section (it is
    # running now — freshly installed, or from a prior deploy), so a rollback can restore
    # exactly that state. Captured here, AHEAD of the site backup below, so it is always set
    # before SITE_BAK is — rollback_deploy's case (b) keys off SITE_BAK and reads
    # NGINX_WAS_ACTIVE, so a failure between the two (e.g. the backup `cp`) must not leave the
    # flag unset. A fresh first-TLS deploy whose certbot step fails must not leave a
    # previously-RUNNING nginx stopped: `reload` cannot start a stopped unit, which is why the
    # old `reload || stop` left it down.
    NGINX_WAS_ACTIVE=0
    systemctl is-active --quiet nginx && NGINX_WAS_ACTIVE=1

    # Back up the current site config so the EXIT rollback (rollback_deploy) can restore
    # it. certbot --standalone needs port 80, so nginx is stopped below; if certbot or
    # the config test fails, rollback_deploy restores this file + restarts nginx AND
    # recreates the previous container stack — a failed TLS re-run never leaves the box
    # half-applied or the public API down.
    SITE_FILE=/etc/nginx/sites-available/profile
    SITE_BAK="${SITE_FILE}.bak.$$"
    [ -f "$SITE_FILE" ] && cp -f "$SITE_FILE" "$SITE_BAK"

    # --keep-until-expiring is a no-op if the cert is still fresh (safe to re-run).
    systemctl stop nginx || true
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --keep-until-expiring \
        -m "$CERTBOT_EMAIL" \
        -d "$PROFILE_DOMAIN"

    # Build the allow-list directives for the internal endpoints from the configured game-server
    # IPs (comma- or space-separated). VALIDATE each token first: the /internal/ block is
    # `allow <token>; … deny all;` and nginx allow/deny is FIRST-MATCH, so an overbroad token
    # silently makes this service-to-service endpoint PUBLIC — and nginx -t would ACCEPT it:
    #   • `all` (any case) → `allow all;` matches everyone;
    #   • any `*/0` CIDR (0.0.0.0/0, ::/0, 10.0.0.0/0, …) → matches everyone;
    #   • a token with characters outside an IPv4/IPv6/CIDR set could inject an nginx directive
    #     into the block (e.g. `1.2.3.4; return 200`).
    # Reject these fail-closed (abort BEFORE writing the config, so the EXIT rollback restores the
    # prior state). nginx -t remains the authority for full address-format validation of what
    # passes here. A DELIBERATE public widening requires PROFILE_INTERNAL_ALLOW_PUBLIC=1 (loud).
    ALLOW_DIRECTIVES=""
    if [ -n "$PROFILE_INTERNAL_ALLOW_IPS" ]; then
        for ip in ${PROFILE_INTERNAL_ALLOW_IPS//,/ }; do
            ip_lc=$(printf '%s' "$ip" | LC_ALL=C tr 'A-Z' 'a-z')
            # Is this a match-EVERYONE token (would make /internal/ PUBLIC; nginx -t accepts it)?
            #   • `all`;
            #   • any CIDR with a /0 prefix in ANY spelling — /0, /00, /000 — because nginx reads the
            #     prefix as a plain DECIMAL (leading zeros are NOT octal, they collapse to 0), so /00
            #     == /0 == a zero-bit mask matching everyone. Normalize: strip zeros from the prefix;
            #     empty ⇒ the prefix was all-zeros ⇒ /0. (A bare `*/0` glob would MISS /00.)
            is_public=0
            case $ip_lc in
                all) is_public=1 ;;
                */*)
                    ip_prefix=${ip_lc##*/}
                    if [ -z "${ip_prefix//0/}" ]; then is_public=1; fi
                    ;;
            esac
            if [ "$is_public" = "1" ]; then
                # nginx allow/deny is first-match, so a public token overrides the 'deny all' below.
                if is_truthy "$PROFILE_INTERNAL_ALLOW_PUBLIC"; then
                    echo "⚠️  PROFILE_INTERNAL_ALLOW_IPS token '${ip}' makes /internal/ PUBLIC, and"
                    echo "    PROFILE_INTERNAL_ALLOW_PUBLIC=1 is set — the endpoint will be reachable"
                    echo "    from ANY address. The only protection becomes the service token."
                else
                    echo "❌ PROFILE_INTERNAL_ALLOW_IPS token '${ip}' would expose /internal/ to the"
                    echo "   public internet (a /0 — or 'all' — matches every client). /internal/ is a"
                    echo "   service-to-service endpoint — use the specific game-server IP(s)/CIDR(s)."
                    echo "   To widen deliberately, re-run with PROFILE_INTERNAL_ALLOW_PUBLIC=1."
                    exit 1
                fi
            else
                # Not public: reject a token with characters outside the IPv4/IPv6/CIDR set — blocks
                # nginx-directive injection (e.g. `1.2.3.4; return 200`) and obvious garbage with a
                # clear error. nginx -t validates the precise address shape of what passes here.
                case $ip_lc in
                    *[!0-9a-fA-F:./]*)
                        echo "❌ PROFILE_INTERNAL_ALLOW_IPS token '${ip}' contains a character that is"
                        echo "   not part of an IPv4/IPv6/CIDR address. Refusing (it could inject an"
                        echo "   nginx directive into the /internal/ block). Provide plain IP/CIDR tokens."
                        exit 1
                        ;;
                esac
            fi
            ALLOW_DIRECTIVES+="        allow ${ip};"$'\n'
        done
    fi

    cat > /etc/nginx/sites-available/profile << NGINXEOF
server {
    listen 80;
    server_name ${PROFILE_DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${PROFILE_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${PROFILE_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${PROFILE_DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Service-to-service endpoints (T5 adds POST /internal/v1/credit). IP-allowlisted
    # to the game-server VPS now as a firewall hook; returns 404 until T5 wires it.
    location /internal/ {
${ALLOW_DIRECTIVES}        deny all;
        proxy_pass http://127.0.0.1:${PROFILE_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }

    location / {
        proxy_pass http://127.0.0.1:${PROFILE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }
}
NGINXEOF

    ln -sf /etc/nginx/sites-available/profile /etc/nginx/sites-enabled/profile
    # Capture nginx's default site before removing it so the EXIT rollback can restore it
    # (cp -P preserves the symlink; backup kept outside sites-enabled/ so nginx ignores it).
    if [ -L /etc/nginx/sites-enabled/default ] || [ -e /etc/nginx/sites-enabled/default ]; then
        cp -Pf /etc/nginx/sites-enabled/default "$DEFAULT_SITE_BAK"
        DEFAULT_SITE_REMOVED=1
    fi
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl enable --now nginx
    systemctl restart nginx
    echo "✅ nginx running with TLS for $PROFILE_DOMAIN"
fi

# ── systemd service (auto-start on reboot) ────────────────────────────────────

print_header "CONFIGURING SYSTEMD AUTO-START"

# Capture the unit's pre-deploy state so the EXIT rollback can restore-or-remove it. Mark it
# WRITTEN right after the heredoc so any later failure (daemon-reload, enable, or the cron
# section) reverts it — a fresh deploy must never leave an enabled service behind.
if [ -f "$SYSTEMD_UNIT" ]; then
    cp -f "$SYSTEMD_UNIT" "$SYSTEMD_UNIT_BAK"
    PROFILE_SERVICE_EXISTED=1
fi
# Mark WRITTEN BEFORE the heredoc: once we begin overwriting the unit, a mid-write failure
# (e.g. disk full) must still trigger the rollback restore-or-remove — otherwise a redeploy
# would leave the live unit truncated with its backup unrestored.
SYSTEMD_WRITTEN=1
cat > "$SYSTEMD_UNIT" << 'EOF'
[Unit]
Description=Player Profile Backend Stack
Requires=docker.service
After=docker.service network-online.target

[Service]
WorkingDirectory=/opt/profile
ExecStart=/usr/bin/docker compose up
ExecStop=/usr/bin/docker compose down
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable profile
echo "✅ systemd service 'profile' enabled (starts on reboot)"

# ── Backup + maintenance cron jobs ────────────────────────────────────────────
# A weekly pg_dump skeleton. T8 hardens this to nightly + ships to reg.ru S3 and
# adds a restore drill.

print_header "SETTING UP BACKUP CRON JOBS"

# CRON_FILE is defined with the rollback-state vars above. Capture its pre-deploy state so the
# EXIT rollback can restore-or-remove it, and mark it WRITTEN right after the heredoc.
if [ -f "$CRON_FILE" ]; then
    cp -f "$CRON_FILE" "$CRON_FILE_BAK"
    CRON_EXISTED=1
fi
# Mark WRITTEN before the heredoc (same reasoning as the unit above — cover a mid-write failure).
CRON_WRITTEN=1
cat > "$CRON_FILE" << EOF
# Profile backups — added by setup-profile.sh. T8 hardens (nightly + S3 + restore drill).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# PostgreSQL backup every Sunday at 3:00am
0 3 * * 0 root cd $PROFILE_DIR && docker compose exec -T postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > $BACKUP_DIR/pg-\$(date +\\%Y\\%m\\%d).sql 2>&1

# Prune old PostgreSQL backups — keep last 14 days.
0 5 * * 0 root find $BACKUP_DIR -name "pg-*.sql" -mtime +14 -delete

# Disk usage warning — daily at 8:00am. Writes to /var/log/disk-warnings.log when usage > 60%.
0 8 * * * root USAGE=\$(df / | awk 'NR==2 {print \$5}' | tr -d '%'); if [ "\$USAGE" -gt 60 ]; then echo "\$(date) -- disk usage \${USAGE}%" >> /var/log/disk-warnings.log; fi

# Certbot renewal — twice daily (Let's Encrypt recommendation)
0 0,12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx" >> /var/log/certbot-renew.log 2>&1
EOF

chmod 644 "$CRON_FILE"
echo "✅ Cron jobs written to $CRON_FILE"

# ── Print connection info ─────────────────────────────────────────────────────

SERVER_IP="${PROFILE_SERVER_HOST:-$(hostname -I | awk '{print $1}')}"

print_header "SETUP COMPLETE"
echo ""
if [ -n "$PROFILE_DOMAIN" ]; then
    echo "Health check:"
    echo "  curl https://${PROFILE_DOMAIN}/health   # expect {\"status\":\"ok\"}"
else
    echo "Health check (no domain configured — loopback only):"
    echo "  curl http://127.0.0.1:${PROFILE_PORT}/health"
fi
echo ""
echo "Postgres: reachable on 127.0.0.1:5432 on the box only (never public)."
echo ""
echo "Game server env vars — add to .env.prod for T6:"
echo "  PROFILE_API_URL=https://${PROFILE_DOMAIN:-<set-domain>}"
echo "  PROFILE_INTERNAL_TOKEN=<value managed in .env.profile.secret>"
echo ""
echo "Firewall: ufw active (SSH/80/443 allowed, everything else denied)."
echo "======================================================"

# Entire setup succeeded — mark validated so the EXIT rollback trap is a no-op, and
# drop the rollback backups now that the new stack is fully applied.
DEPLOY_VALIDATED=1
rm -f "$PROFILE_ENV_BAK" "$COMPOSE_BAK" "$DEFAULT_SITE_BAK" "$SYSTEMD_UNIT_BAK" "$CRON_FILE_BAK" ${SITE_BAK:+"$SITE_BAK"}
