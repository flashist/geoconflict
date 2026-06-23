#!/bin/bash
# setup-profile.sh - One-time/idempotent provisioning + deploy for the player-profile
# backend VPS. Run on the profile VPS as root. Mirrors setup-telemetry.sh (do NOT
# invent a parallel pattern). build-deploy-profile.sh (T4e1, local build/push) SSH-
# invokes this script with a digest-pinned PROFILE_IMAGE once T4e3 wires transport.
#
# It both PROVISIONS the box (swap, Docker, ufw, /opt/profile, host nginx/TLS) AND
# DEPLOYS the app stack: it writes docker-compose.yml + profile.env, pulls the image
# behind a 120s health-gate with digest-pinned rollback, installs the profile systemd
# unit, and lays down the pg_dump/maintenance cron. PROFILE_IMAGE + POSTGRES_PASSWORD
# are therefore REQUIRED (see Validate) — without them the deploy cannot proceed.
#
# Required env vars:
#   PROFILE_IMAGE              — profile API image to deploy; MUST be @sha256-pinned
#                                (a mutable tag is declined — K2). Built+pushed by T4e1.
#   POSTGRES_PASSWORD          — Postgres password for the profile DB
# Optional env vars (with defaults):
#   PROFILE_DOMAIN             — public domain; when set, host nginx + Let's Encrypt TLS
#   PROFILE_PORT               — profile API port nginx proxies to (default 8080)
#   PROFILE_SWAP_SIZE_GB       — swapfile size in GB; 0 disables management (default 4)
#   POSTGRES_USER / POSTGRES_DB — profile DB user/name (default profile)
#   DATABASE_URL               — API connection string (default built from POSTGRES_*,
#                                @127.0.0.1:5432 — see the stack-write section)
#   PROFILE_INTERNAL_TOKEN     — service token (reused/persisted/auto-generated)
#   PROFILE_INTERNAL_ALLOW_IPS — game-server IPs for the dormant nginx /internal/ allowlist
#   CERTBOT_EMAIL              — Let's Encrypt email (default ruflashist@gmail.com)
#   DOCKER_USERNAME/DOCKER_TOKEN — optional registry auth for pulling a private PROFILE_IMAGE
#   PROFILE_SERVER_HOST        — IP/host of this box; used for the connection-info banner
#                                and the HTTPS DNS pre-check (NAT-bypass match — prefer an
#                                IP; a hostname is getent-resolved for the gate)
#
# What this script does:
#   1. Ensures a swapfile exists (low-RAM VPS OOM cushion)
#   2. Installs Docker + Docker Compose plugin
#   3. Applies a ufw firewall (SSH/80/443 only; default-deny incoming)
#   4. Creates /opt/profile (0700) + backups/
#   5. Writes profile.env + docker-compose.yml (postgres + profile-api), both 0600
#   6. Pulls + starts the stack behind a 120s health-gate with @sha256 rollback
#   7. Configures host nginx + Let's Encrypt TLS for api.geoconflict.ru, with a
#      dormant /internal/ IP allowlist (network-shape only; T5 wires the endpoint)
#   8. Installs the profile systemd unit (auto-start on reboot)
#   9. Adds the pg_dump backup + maintenance/certbot-renew cron
#  10. Prints connection info

set -e

PROFILE_DIR="/opt/profile"
BACKUP_DIR="$PROFILE_DIR/backups"

print_header() {
    echo "======================================================"
    echo "  $1"
    echo "======================================================"
}

print_header "PLAYER-PROFILE BACKEND SERVER SETUP (PROVISION + DEPLOY)"

# ── Defaults ──────────────────────────────────────────────────────────────────

PROFILE_PORT="${PROFILE_PORT:-8080}"
PROFILE_SWAP_SIZE_GB="${PROFILE_SWAP_SIZE_GB:-4}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-ruflashist@gmail.com}"
PROFILE_DOMAIN="${PROFILE_DOMAIN:-}"
PROFILE_INTERNAL_ALLOW_IPS="${PROFILE_INTERNAL_ALLOW_IPS:-}"
POSTGRES_USER="${POSTGRES_USER:-profile}"
POSTGRES_DB="${POSTGRES_DB:-profile}"
# The internal service token + DATABASE_URL are derived in the stack-write section
# below (after validation), so a missing POSTGRES_PASSWORD can't yield a half-built URL.

# ── Validate ──────────────────────────────────────────────────────────────────
# This script both provisions AND deploys, so the deploy inputs it consumes are
# required and validated here. DATABASE_URL semantics/connectability are NOT checked
# (that is T5's `pg` consumer's job) — we assert only that PROFILE_IMAGE is immutably
# digest-pinned and that a DB password is present.

# K2 (box half): deploy + roll back by an immutable @sha256 digest only. A mutable tag
# (or a mangled/short digest) could be silently re-pointed at a different image between
# the scan and the pull, so decline anything not in strict repo@sha256:<64-hex> form and
# fail closed before touching the stack. T4e1 resolves and passes this digest.
if [ -z "${PROFILE_IMAGE:-}" ]; then
    echo "Error: PROFILE_IMAGE is not set (the @sha256-pinned image to deploy)."
    exit 1
fi
if ! [[ "$PROFILE_IMAGE" =~ @sha256:[0-9a-f]{64}$ ]]; then
    echo "Error: PROFILE_IMAGE ('$PROFILE_IMAGE') is not @sha256-pinned."
    echo "Refusing to deploy a mutable tag — pass the immutable digest resolved by"
    echo "build-deploy-profile.sh (repo@sha256:<64-hex>). Aborting (fail closed)."
    exit 1
fi
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "Error: POSTGRES_PASSWORD is not set. Set it in .env.profile.secret."
    exit 1
fi
if ! [[ "$PROFILE_PORT" =~ ^[0-9]+$ ]] || [ "$PROFILE_PORT" -lt 1 ] || [ "$PROFILE_PORT" -gt 65535 ]; then
    echo "Error: PROFILE_PORT must be an integer in 1-65535."
    exit 1
fi
if ! [[ "$PROFILE_SWAP_SIZE_GB" =~ ^[0-9]+$ ]]; then
    echo "Error: PROFILE_SWAP_SIZE_GB must be a non-negative integer (GB). Use 0 to disable."
    exit 1
fi
# The /internal/ allowlist is the IP trust boundary T5's crediting endpoint inherits.
# nginx's `allow` accepts the special value `all` (→ `allow all; deny all;`, first match
# wins, everyone permitted), so a stray `all`/hostname/typo baked into the live config
# would silently open the boundary. Require every entry to be a literal IPv4/IPv6 address
# or CIDR; fail closed before touching nginx so the allowlist always stays a restriction.
if [ -n "$PROFILE_INTERNAL_ALLOW_IPS" ]; then
    # CIDR suffix is 1-32 (v4) / 1-128 (v6): a /0 prefix (0.0.0.0/0, ::/0) matches every
    # client, which is `all` in CIDR form — reject it so the allowlist stays a restriction.
    ipv4_re='^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}(/(3[0-2]|[12][0-9]|[1-9]))?$'
    ipv6_re='^[0-9A-Fa-f:]+:[0-9A-Fa-f:]*(/(12[0-8]|1[01][0-9]|[1-9][0-9]?))?$'
    for entry in ${PROFILE_INTERNAL_ALLOW_IPS//,/ }; do
        if ! [[ "$entry" =~ $ipv4_re ]] && ! [[ "$entry" =~ $ipv6_re ]]; then
            echo "Error: PROFILE_INTERNAL_ALLOW_IPS entry '$entry' is not a valid IPv4/IPv6 address or CIDR."
            echo "nginx special values (e.g. 'all'), hostnames, and syntax are rejected so the /internal/"
            echo "allowlist stays a real restriction. Fix it in .env.profile and re-run."
            exit 1
        fi
    done
fi

# ── System update ─────────────────────────────────────────────────────────────

print_header "UPDATING SYSTEM"
apt-get update -y && apt-get upgrade -y

# ── Swap ──────────────────────────────────────────────────────────────────────
# The reg.ru profile VPS is low-RAM; the prior telemetry box froze the entire host
# under OOM because it shipped with zero swap. A swapfile gives the kernel a cushion
# so a transient Postgres/Node spike is paged out instead of wedging the box.
# Swap is MANDATORY here: if it cannot be enabled we fail closed (the only opt-out
# is PROFILE_SWAP_SIZE_GB=0, a conscious operator choice).
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

ensure_swapfile_fstab_entry() {
    # Match the first field EXACTLY — `grep '^/swapfile'` also matches a stale
    # /swapfile-old entry and would skip persisting the real one, leaving mandatory
    # swap non-persistent (gone after reboot → the OOM risk this rule prevents).
    awk '$1 == "/swapfile" && $3 == "swap" {f=1} END {exit !f}' /etc/fstab 2>/dev/null \
        || echo '/swapfile none swap sw 0 0' >> /etc/fstab
}

if [ "$PROFILE_SWAP_SIZE_GB" -eq 0 ]; then
    echo "PROFILE_SWAP_SIZE_GB=0; skipping swap management"
elif swapon --show=NAME --noheadings 2>/dev/null | grep -qx '/swapfile'; then
    echo "Swap already active; leaving it in place:"
    swapon --show
    # Ensure persistence even if /swapfile was activated out-of-band (e.g. a manual
    # `swapon` without an fstab entry) — otherwise swap silently vanishes on reboot.
    # Idempotent: the create branch already adds this, so a normal re-run never
    # duplicates the entry.
    ensure_swapfile_fstab_entry
else
    echo "Creating ${PROFILE_SWAP_SIZE_GB}G swapfile at /swapfile..."
    # fallocate is fast on ext4; on CoW filesystems it can yield a holey file that
    # swapon rejects, so fall back to dd (writes real blocks). Each method is guarded
    # with `|| return 1` so a fallocate failure falls through to dd instead of
    # tripping set -e; if BOTH methods fail we abort (swap is mandatory on this box).
    if try_enable_swapfile fallocate; then
        ensure_swapfile_fstab_entry
        swapon --show
    elif echo "fallocate path failed (holey/unsupported file?); retrying with dd..." && try_enable_swapfile dd; then
        ensure_swapfile_fstab_entry
        swapon --show
    else
        # Reached only when PROFILE_SWAP_SIZE_GB != 0 (the =0 case is handled above)
        # AND no /swapfile is active AND both allocation methods failed. Fail closed:
        # standing up Postgres + profile data on a swapless low-RAM box reproduces the
        # exact OOM-freeze this requirement exists to prevent.
        rm -f /swapfile
        echo "⚠️  SWAP SETUP FAILED — both fallocate and dd could not enable /swapfile."
        echo "Swap is mandatory on this low-RAM box (Postgres + profile data → OOM-freeze risk)."
        echo "Aborting provisioning. Investigate disk space / filesystem swapfile support,"
        echo "or set PROFILE_SWAP_SIZE_GB=0 to consciously provision WITHOUT swap."
        exit 1
    fi
fi

# Prefer RAM; only spill to swap under real pressure. Persist AUTHORITATIVELY across
# reboots: append-only-when-absent silently loses to a pre-existing value (e.g. a cloud
# image pinning vm.swappiness=60), so write a high-precedence drop-in, neutralise any
# competing /etc/sysctl.conf assignment, reload, and verify the effective value is 10.
echo 'vm.swappiness=10' > /etc/sysctl.d/99-geoconflict-swappiness.conf
if [ -f /etc/sysctl.conf ] && grep -qE '^[[:space:]]*vm\.swappiness[[:space:]]*=' /etc/sysctl.conf; then
    sed -i -E 's|^[[:space:]]*vm\.swappiness[[:space:]]*=.*$|# (superseded by 99-geoconflict-swappiness.conf) &|' /etc/sysctl.conf
fi
sysctl --system >/dev/null 2>&1 || sysctl -w vm.swappiness=10 >/dev/null 2>&1 || true
EFFECTIVE_SWAPPINESS=$(sysctl -n vm.swappiness 2>/dev/null || echo "?")
if [ "$EFFECTIVE_SWAPPINESS" = "10" ]; then
    echo "vm.swappiness persisted and active (=10)."
else
    echo "⚠️  vm.swappiness is '${EFFECTIVE_SWAPPINESS}', expected 10. Check /etc/sysctl.d/ and /etc/sysctl.conf."
fi

# ── Docker ────────────────────────────────────────────────────────────────────

print_header "INSTALLING DOCKER"

if command -v docker &> /dev/null; then
    echo "Docker already installed: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    echo "Docker installed: $(docker --version)"
fi

# Always ensure the daemon is enabled + running — a preinstalled-but-disabled Docker
# (common on reused/minimal images) would otherwise pass provisioning while T4e's
# pull/up fails. `docker compose version` is client-only and does NOT prove the daemon.
systemctl enable --now docker
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon is not accessible after 'systemctl enable --now docker'."
    echo "Investigate 'systemctl status docker' / 'journalctl -u docker' before deploying."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi
echo "Docker Compose: $(docker compose version)"

# ── Firewall (ufw) ────────────────────────────────────────────────────────────
# This box holds personal data + entitlements, so — unlike the telemetry box,
# which only printed advisory rules — we actually apply the firewall. Postgres
# (5432) is published on 127.0.0.1 only (by the compose file T4e authors), so
# default-deny on the public interface keeps it private without an explicit rule.
# Internal endpoints are additionally IP-allowlisted at the nginx /internal/ block.
print_header "CONFIGURING FIREWALL (ufw)"
if ! command -v ufw >/dev/null 2>&1; then
    apt-get install -y ufw
fi
# Detect the SSH port(s) actually in use so the reset+enable can't lock us out on a
# non-standard port. Sources: the live session's server port ($SSH_CONNECTION 4th
# field — set when this runs over SSH, the deploy path) and sshd's effective config.
# Fall back to 22 only if neither yields a port. The active session survives enable
# (conntrack keeps ESTABLISHED), but reconnection on a custom port would be blocked
# unless we allow it here.
SSH_PORTS=""
[ -n "${SSH_CONNECTION:-}" ] && SSH_PORTS="$SSH_PORTS $(echo "$SSH_CONNECTION" | awk '{print $4}')"
command -v sshd >/dev/null 2>&1 && SSH_PORTS="$SSH_PORTS $(sshd -T 2>/dev/null | awk '/^port /{print $2}')"
SSH_PORTS=$(echo "$SSH_PORTS" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u)
[ -z "$SSH_PORTS" ] && SSH_PORTS="22"

# Reset to a known-clean ruleset first so a reused/provider-preconfigured host can't
# keep a stray public allow (e.g. 5432) that `default deny incoming` would NOT remove.
# Reset disables ufw (no filtering during the gap). (Cleared rules are backed up to
# /etc/ufw/*.rules.*)
ufw --force reset
# Allow SSH FIRST (every detected port) so enabling ufw can never lock us out.
for p in $SSH_PORTS; do
    ufw allow "${p}/tcp"
done
ufw allow 80/tcp
ufw allow 443/tcp
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
ufw status verbose

# ── Directories ───────────────────────────────────────────────────────────────
# Root-only: holds the compose env_file + the persisted internal token written just
# below; backups/ is pre-created as the pg_dump cron's target.

mkdir -p "$BACKUP_DIR"
chmod 700 "$PROFILE_DIR"

# ── Internal service token + DATABASE_URL ─────────────────────────────────────
# The service-to-service token (shared with the game server in T6) MUST stay stable
# across redeploys — silently rotating it would break crediting calls — so an env value
# always wins, else we reuse a persisted token, else we generate one and persist it
# (root-only). Idempotent. $PROFILE_DIR already exists (created above).
PROFILE_TOKEN_FILE="$PROFILE_DIR/.internal_token"
if [ -n "${PROFILE_INTERNAL_TOKEN:-}" ]; then
    echo "Using PROFILE_INTERNAL_TOKEN from environment"
elif [ -f "$PROFILE_TOKEN_FILE" ]; then
    PROFILE_INTERNAL_TOKEN=$(cat "$PROFILE_TOKEN_FILE")
    echo "Reusing persisted PROFILE_INTERNAL_TOKEN from $PROFILE_TOKEN_FILE"
else
    PROFILE_INTERNAL_TOKEN=$(openssl rand -hex 32)
    ( umask 077; printf '%s' "$PROFILE_INTERNAL_TOKEN" > "$PROFILE_TOKEN_FILE" )
    chmod 600 "$PROFILE_TOKEN_FILE"
    echo "Generated and persisted PROFILE_INTERNAL_TOKEN to $PROFILE_TOKEN_FILE"
fi

# The profile API reaches Postgres over the box's loopback (postgres publishes
# 127.0.0.1:5432). FIX vs the 4e56fbf seed, which used the compose-network host
# `postgres:5432` and fails the epic acceptance. Template only — NO connect/libpq
# validation here (that is T5's `pg` consumer, where a bad URL actually fails a query).
DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}}"

# ── Secret env file + docker-compose.yml ──────────────────────────────────────
# Two services: postgres (private) + the profile API. nginx is NOT a compose service —
# it runs on the host (telemetry pattern) and terminates TLS below. Credentials live in
# a root-only (0600) env_file referenced by compose, NEVER inlined in the compose file,
# so a local unprivileged account on the box can't read the DB password or token from it.
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
    # Conservative memory caps for a low-RAM box (no auto-sizing). The swapfile above
    # is the host-level cushion; these keep Postgres itself bounded (the OOM lesson).
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
    # DATABASE_URL + PROFILE_INTERNAL_TOKEN + PROFILE_PORT come from the 0600 profile.env.
    env_file:
      - ./profile.env
    # Bound to loopback only — host nginx proxies 443 -> 127.0.0.1:${PROFILE_PORT}.
    ports:
      - "127.0.0.1:${PROFILE_PORT}:${PROFILE_PORT}"
    depends_on:
      postgres:
        condition: service_healthy
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

# Every `docker compose` command below resolves the project from this directory.
cd "$PROFILE_DIR"

# ── Start the stack: health-gate + digest-pinned rollback ─────────────────────

print_header "STARTING PROFILE STACK"

# Shared health assertion: PROVE every expected service is present AND healthy — a
# POSITIVE check, not "no bad keyword". A negative grep over `docker compose ps` is
# unsound: the default `ps` shows only running containers (stopped/created need `-a`),
# so an `up … || true` converge that left a service absent/created/exited would show
# no keyword and the gate would wrongly report healthy (→ nginx onto a dead upstream).
# The forward wait AND the K3 rollback wait both call this, so a started-but-unhealthy
# image is FAILURE on either path. EXPECTED_SERVICES must track the compose services
# (both declare healthchecks, so requiring State.Health == "healthy" is correct).
EXPECTED_SERVICES="postgres profile-api"
all_services_running_healthy() {
    local svc cid health
    for svc in $EXPECTED_SERVICES; do
        cid=$(docker compose ps -q "$svc" 2>/dev/null) || return 1
        [ -n "$cid" ] || return 1   # service not created → FAIL (closes the absent-container false positive)
        health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null) || return 1
        [ "$health" = "healthy" ] || return 1
    done
    return 0
}

# Optional registry auth so `docker compose pull` can fetch a private PROFILE_IMAGE.
# Token on stdin via --password-stdin — never in argv. No-op when unset.
if [ -n "${DOCKER_TOKEN:-}" ] && [ -n "${DOCKER_USERNAME:-}" ]; then
    echo "Logging in to the container registry as ${DOCKER_USERNAME}..."
    echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

# Capture the currently-running profile-api image BEFORE any mutation, so we can roll
# back to the last known-good one if the new image fails its healthcheck. Empty on a
# fresh box — nothing to roll back to. (.Config.Image of the live container still names
# the OLD image even though the compose file above already references the new one.)
PREV_PROFILE_IMAGE=""
PREV_PROFILE_CID=$(docker compose ps -q profile-api 2>/dev/null || true)
if [ -n "$PREV_PROFILE_CID" ]; then
    PREV_PROFILE_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$PREV_PROFILE_CID" 2>/dev/null || true)
fi

# Pull BEFORE marking the stack touched: a pull failure (bad digest / missing auth)
# aborts under set -e with the running stack untouched — the safe, recoverable outcome.
docker compose pull

# K4: mark the live stack as touched BEFORE the FIRST container-mutating command, so a
# failure in either converge below leaves the stack flagged for rollback (and a future
# EXIT-trap in T4g could reconverge/stop it). The `|| true` lets a converge failure
# reach the health-gate (which rolls back) instead of tripping set -e first.
STACK_RECREATED=1
docker compose up -d postgres || true
docker compose up -d --force-recreate --no-deps profile-api || true

# T5: apply DB migrations here once they exist, e.g.:
#   docker compose exec -T profile-api npm run migrate

echo "Waiting up to 120s for all services to become healthy..."
ELAPSED=0
while [ "$ELAPSED" -lt 120 ]; do
    if all_services_running_healthy; then
        break
    fi
    sleep 3
    ELAPSED=$((ELAPSED + 3))
done

if ! all_services_running_healthy; then
    echo "❌ One or more containers did not become healthy within 120s:"
    docker compose ps
    echo "----- recent logs (last 50 lines) -----"
    docker compose logs --tail=50 || true

    # K3: fail-closed rollback. Recreate the PREVIOUS image only if it is itself
    # @sha256-pinned (K2 — never run a mutable/garbage image), then wait on the SAME
    # health assertion: a started-but-unhealthy old image is FAILURE, not success.
    if [ "$STACK_RECREATED" = "1" ] && [ -n "$PREV_PROFILE_IMAGE" ] && [ "$PREV_PROFILE_IMAGE" != "$PROFILE_IMAGE" ]; then
        if [[ "$PREV_PROFILE_IMAGE" =~ @sha256:[0-9a-f]{64}$ ]]; then
            echo "Rolling back profile-api to the last known-good image: $PREV_PROFILE_IMAGE"
            sed -i "s|image: ${PROFILE_IMAGE}|image: ${PREV_PROFILE_IMAGE}|" "$PROFILE_DIR/docker-compose.yml"
            docker compose up -d --force-recreate --no-deps profile-api || true
            RB_ELAPSED=0
            while [ "$RB_ELAPSED" -lt 120 ]; do
                if all_services_running_healthy; then
                    break
                fi
                sleep 3
                RB_ELAPSED=$((RB_ELAPSED + 3))
            done
            if all_services_running_healthy; then
                echo "✅ Rolled back to $PREV_PROFILE_IMAGE; the service is healthy again."
            else
                echo "❌ ROLLBACK FAILED — the previous image is also unhealthy:"
                docker compose ps
                docker compose logs --tail=50 || true
            fi
        else
            echo "❌ Previous image '$PREV_PROFILE_IMAGE' is NOT @sha256-pinned — refusing to"
            echo "   recreate a mutable/garbage image. HALTING (fail closed); fix the new image."
        fi
    else
        echo "No prior @sha256 image to roll back to (fresh deploy). HALTING (fail closed)."
    fi

    echo "The postgres data volume is preserved. 'docker compose down -v' would DELETE it"
    echo "(all profile data) — never run automatically; only an operator should, knowingly."
    echo "Aborting before nginx/systemd/cron. Fix the image and re-run."
    exit 1
fi
echo "✅ All containers running and healthy:"
docker compose ps

# ── HTTPS ─────────────────────────────────────────────────────────────────────

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
    # On a NAT'd VPS (e.g. reg.ru 1:1 NAT), the public IP the A-record points at is
    # never present on a local interface — `hostname -I` only shows the private address
    # (e.g. 192.168.x.x). The explicit deploy target PROFILE_SERVER_HOST *is* that public
    # IP, so accept it as well: "DNS resolves to the host we are deploying to" is exactly
    # the intent of this gate, and certbot's HTTP-01 still reaches the box via the NAT.
    ACCEPTABLE_IPS="$HOST_IPS ${PROFILE_SERVER_HOST:-}"
    # PROFILE_SERVER_HOST may be a hostname (documented "IP/host" form); resolve it to
    # IP(s) too so the hostname form also matches the getent-resolved domain IP. (getent
    # on an IP returns that IP, so this is a harmless no-op for the common IP-valued case.)
    if [ -n "${PROFILE_SERVER_HOST:-}" ]; then
        ACCEPTABLE_IPS="$ACCEPTABLE_IPS $(getent hosts "$PROFILE_SERVER_HOST" | awk '{print $1}')"
    fi
    DNS_MATCH=0
    for rip in $RESOLVED_IPS; do
        for hip in $ACCEPTABLE_IPS; do
            [ "$rip" = "$hip" ] && DNS_MATCH=1
        done
    done
    if [ "$DNS_MATCH" -ne 1 ]; then
        echo "Error: $PROFILE_DOMAIN resolves to [$RESOLVED_IPS], not this host (local [$HOST_IPS] / target [${PROFILE_SERVER_HOST:-unset}])."
        echo "Update the A record to point at this box before deploying (certbot HTTP-01 would fail)."
        exit 1
    fi

    apt-get install -y nginx certbot

    # certbot --standalone needs port 80, so we stop nginx first. If certbot or the
    # later config test fails (set -e), an ERR trap restores the previous site config
    # and restarts nginx — a failed TLS re-run must never leave the public API down.
    SITE_FILE=/etc/nginx/sites-available/profile
    SITE_LINK=/etc/nginx/sites-enabled/profile
    DEFAULT_LINK=/etc/nginx/sites-enabled/default
    # Snapshot the COMPLETE prior state of every path we touch — recording its exact
    # type (absent / symlink+target / regular-file+content) — so the ERR trap can
    # reconstruct it verbatim. A shape-blind backup would, on a reused/preconfigured
    # host, destroy a prior regular-file site or an alternate-target symlink; on a
    # fresh box it would leave the broken site enabled, the default removed, nginx down.
    NGINX_BAK_DIR=$(mktemp -d)
    snapshot_path() {  # $1=path $2=tag
        local p="$1" t="$2"
        if [ -L "$p" ]; then
            echo symlink > "$NGINX_BAK_DIR/$t.type"
            readlink "$p" > "$NGINX_BAK_DIR/$t.target"
        elif [ -f "$p" ]; then
            echo file > "$NGINX_BAK_DIR/$t.type"
            cp -f "$p" "$NGINX_BAK_DIR/$t.content"
        else
            echo absent > "$NGINX_BAK_DIR/$t.type"
        fi
    }
    restore_path() {  # $1=path $2=tag — remove current, then recreate exactly what was there
        local p="$1" t="$2" ty
        ty=$(cat "$NGINX_BAK_DIR/$t.type" 2>/dev/null || echo absent)
        rm -f "$p"
        case "$ty" in
            symlink) ln -sf "$(cat "$NGINX_BAK_DIR/$t.target")" "$p" ;;
            file)    cp -f "$NGINX_BAK_DIR/$t.content" "$p" ;;
        esac
    }
    snapshot_path "$SITE_FILE" sitefile
    snapshot_path "$SITE_LINK" sitelink
    snapshot_path "$DEFAULT_LINK" defaultlink
    restore_nginx_on_failure() {
        # Snapshot gone → nothing to restore. Guards the post-success window (the
        # dir is rm'd on success while INT/TERM may still be armed) so a stray signal
        # can never drive a destructive "restore" against a missing snapshot.
        [ -d "$NGINX_BAK_DIR" ] || return
        echo "⚠️  HTTPS setup failed — restoring nginx to its previous state."
        restore_path "$SITE_FILE" sitefile
        restore_path "$SITE_LINK" sitelink
        restore_path "$DEFAULT_LINK" defaultlink
        systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
        rm -rf "$NGINX_BAK_DIR"
    }
    # ERR for failed steps; INT/TERM so a Ctrl-C during certbot also restores nginx
    # and doesn't orphan the snapshot temp dir.
    trap restore_nginx_on_failure ERR INT TERM

    # --keep-until-expiring is a no-op if the cert is still fresh (safe to re-run).
    #
    # RENEWAL CONTRACT (for T4e's certbot-renew cron — owned there, not here):
    # certbot persists `authenticator = standalone`, which binds port 80 for the
    # HTTP-01 challenge. nginx permanently owns port 80 below, so `certbot renew`
    # MUST free it first. T4e's renew cron therefore needs a PRE-hook that stops
    # nginx and a POST-hook that restarts it, e.g.:
    #   certbot renew --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"
    # A reload-only post-hook (the seed form) will NOT renew and the cert will
    # expire. Validate with `certbot renew --dry-run` while nginx is running.
    systemctl stop nginx || true
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --keep-until-expiring \
        -m "$CERTBOT_EMAIL" \
        -d "$PROFILE_DOMAIN"

    # Build the allow-list directives for the internal endpoints from the
    # configured game-server IPs (comma- or space-separated).
    ALLOW_DIRECTIVES=""
    if [ -n "$PROFILE_INTERNAL_ALLOW_IPS" ]; then
        for ip in ${PROFILE_INTERNAL_ALLOW_IPS//,/ }; do
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
    # to the game-server VPS now as a firewall hook; dormant until then — disallowed
    # IPs get 403 (deny all), allowed IPs get 502 (no upstream yet).
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
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl enable --now nginx
    systemctl restart nginx
    # Success — drop the rollback safety net (ALL three signals, so nothing fires
    # against the snapshot dir removed on the next line).
    trap - ERR INT TERM
    rm -rf "$NGINX_BAK_DIR"
    echo "✅ nginx running with TLS for $PROFILE_DOMAIN"
fi

# ── systemd service (auto-start on reboot) ────────────────────────────────────
# Authored alongside the compose file it boots, so `systemctl start profile` is
# functional the moment it lands (not merely "enabled").

print_header "CONFIGURING SYSTEMD AUTO-START"

cat > /etc/systemd/system/profile.service << 'EOF'
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
# adds a restore drill. POSTGRES_USER/DB are expanded into the cron line at write
# time (unquoted heredoc) so the dump targets the real running database.

print_header "SETTING UP BACKUP CRON JOBS"

CRON_FILE="/etc/cron.d/profile-backups"
cat > "$CRON_FILE" << EOF
# Profile backups — added by setup-profile.sh. T8 hardens (nightly + S3 + restore drill).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# PostgreSQL backup every Sunday at 3:00am
0 3 * * 0 root cd $PROFILE_DIR && docker compose exec -T postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > $BACKUP_DIR/pg-\$(date +\\%Y\\%m\\%d).sql 2>&1

# Prune old PostgreSQL backups — keep last 14 days.
0 5 * * 0 root find $BACKUP_DIR -name "pg-*.sql" -mtime +14 -delete

# Disk usage warning — daily at 8:00am. Writes to /var/log/disk-warnings.log when usage > 60%.
# Vixie cron (/etc/cron.d) turns an unescaped % into a newline, so BOTH % are escaped \\% (→ \% on
# disk, matching the pg_dump line above) or the command would truncate at the first one and never run.
0 8 * * * root USAGE=\$(df / | awk 'NR==2 {print \$5}' | tr -d '\\%'); if [ "\$USAGE" -gt 60 ]; then echo "\$(date) -- disk usage \${USAGE}\\%" >> /var/log/disk-warnings.log; fi
EOF

# Certbot renewal — appended ONLY when a domain is configured. Without PROFILE_DOMAIN,
# nginx + certbot are never installed (see the HTTPS guard above), so an unconditional
# line would just log `certbot: command not found` twice daily on the standalone-test
# path. Twice daily per the Let's Encrypt recommendation. FIX vs the seed's reload-only
# post-hook: the cert is issued with the --standalone authenticator, which binds port 80
# for the HTTP-01 challenge — but nginx permanently owns port 80, so a reload-only hook
# would NEVER renew and the cert would silently expire. Free port 80 around renewal:
# stop nginx (pre-hook), renew, start nginx (post-hook).
if [ -n "$PROFILE_DOMAIN" ]; then
    cat >> "$CRON_FILE" << EOF

# Certbot renewal — twice daily (Let's Encrypt recommendation).
0 0,12 * * * root certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx" >> /var/log/certbot-renew.log 2>&1
EOF
fi

chmod 644 "$CRON_FILE"
echo "✅ Cron jobs written to $CRON_FILE"

# ── Print connection info ─────────────────────────────────────────────────────

SERVER_IP="${PROFILE_SERVER_HOST:-$(hostname -I | awk '{print $1}')}"

print_header "PROVISIONING + DEPLOY COMPLETE"
echo ""
echo "Box provisioned (swap + Docker + ufw + /opt/profile 0700) and the profile stack"
echo "is deployed + healthy from ${PROFILE_IMAGE}."
echo ""
if [ -n "$PROFILE_DOMAIN" ]; then
    echo "Health check (public, over TLS):"
    echo "  curl https://${PROFILE_DOMAIN}/health   # expect 200 {\"status\":\"ok\"}"
else
    echo "Health check (no domain configured — loopback only):"
    echo "  curl http://127.0.0.1:${PROFILE_PORT}/health"
    echo ""
    echo "PROFILE_DOMAIN unset — TLS/nginx skipped. Set it (with the A record pointed"
    echo "at this box) and re-run to configure HTTPS."
fi
echo ""
echo "/internal/ nginx allowlist laid down (dormant): allow ${PROFILE_INTERNAL_ALLOW_IPS:-<none>} + deny all."
echo "Postgres: reachable on 127.0.0.1:5432 on the box only (never public)."
echo "Lifecycle: systemd unit 'profile' enabled (auto-start on reboot); pg_dump +"
echo "maintenance cron active in /etc/cron.d/profile-backups."
echo ""
echo "Game server env vars — add to .env.prod for T6:"
echo "  PROFILE_API_URL=https://${PROFILE_DOMAIN:-<set-domain>}"
echo "  PROFILE_INTERNAL_TOKEN=<value managed in .env.profile.secret>"
echo ""
echo "Firewall: ufw active (SSH/80/443 allowed, everything else denied)."
echo "======================================================"
