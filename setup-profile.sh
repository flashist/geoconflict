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
#   DATABASE_URL               — API connection string (default built from POSTGRES_*)
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

set -e

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

print_header "PLAYER-PROFILE BACKEND SERVER SETUP"

# ── Defaults ──────────────────────────────────────────────────────────────────

PROFILE_PORT="${PROFILE_PORT:-8080}"
PROFILE_SWAP_SIZE_GB="${PROFILE_SWAP_SIZE_GB:-4}"
POSTGRES_USER="${POSTGRES_USER:-profile}"
POSTGRES_DB="${POSTGRES_DB:-profile}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-ruflashist@gmail.com}"
PROFILE_DOMAIN="${PROFILE_DOMAIN:-}"
PROFILE_INTERNAL_ALLOW_IPS="${PROFILE_INTERNAL_ALLOW_IPS:-}"

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

# The API reaches Postgres over the compose network as host 'postgres'.
DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}}"

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
# success at the end of validation.
PROFILE_ENV_BAK="$PROFILE_DIR/profile.env.predeploy.bak"
COMPOSE_BAK="$PROFILE_DIR/docker-compose.yml.predeploy.bak"
[ -f "$PROFILE_DIR/profile.env" ] && cp -f "$PROFILE_DIR/profile.env" "$PROFILE_ENV_BAK"
[ -f "$PROFILE_DIR/docker-compose.yml" ] && cp -f "$PROFILE_DIR/docker-compose.yml" "$COMPOSE_BAK"

restore_previous_config() {
    # Restore the pre-deploy config files (when backups exist). Callers decide whether
    # to also recreate containers. Always returns 0 so it is safe inside the EXIT trap.
    [ -f "$PROFILE_ENV_BAK" ] && mv -f "$PROFILE_ENV_BAK" "$PROFILE_DIR/profile.env"
    [ -f "$COMPOSE_BAK" ] && mv -f "$COMPOSE_BAK" "$PROFILE_DIR/docker-compose.yml"
    return 0
}

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

# ── Start services ────────────────────────────────────────────────────────────

print_header "STARTING PROFILE SERVICES"

# Pre-recreate credential check: on a redeploy (postgres already running), confirm the
# NEW DATABASE_URL authenticates against the EXISTING volume BEFORE we recreate the live
# API. postgres only honors POSTGRES_PASSWORD on first init, so a changed password
# against an existing postgres_data volume would otherwise replace a working API with a
# DB-broken one. Abort + restore here, leaving the running stack untouched.
if [ -n "$(docker compose ps -q postgres 2>/dev/null || true)" ]; then
    echo "Existing stack detected — verifying new credentials against the running Postgres..."
    if ! docker compose exec -T postgres psql "$DATABASE_URL" -tAc 'select 1' >/dev/null 2>&1; then
        echo "❌ New DATABASE_URL does not authenticate against the existing Postgres volume."
        echo "   POSTGRES_PASSWORD likely changed but the volume keeps the original password."
        echo "   Restoring previous config and aborting WITHOUT touching the live stack."
        restore_previous_config
        exit 1
    fi
    echo "✅ New credentials authenticate against the existing Postgres."
fi

# Atomic rollback: from here on, ANY failure (health gate, DB probe, certbot, nginx,
# systemd, cron) restores the previous compose/env (+ nginx site) and recreates the
# previous stack, so a failed deploy never leaves a half-applied live stack behind.
# Cleared only after the ENTIRE setup succeeds (DEPLOY_VALIDATED=1 at the end).
DEPLOY_VALIDATED=0
rollback_deploy() {
    [ "$DEPLOY_VALIDATED" = "1" ] && return 0
    echo "⚠️  Deploy failed — rolling back to the previous known-good state..."
    if [ -n "${SITE_BAK:-}" ] && [ -f "${SITE_BAK:-}" ]; then
        mv -f "$SITE_BAK" /etc/nginx/sites-available/profile
        systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
    fi
    if [ -f "$PROFILE_ENV_BAK" ] || [ -f "$COMPOSE_BAK" ]; then
        restore_previous_config
        docker compose up -d --force-recreate 2>/dev/null || true
    fi
}
trap rollback_deploy EXIT

docker compose pull
docker compose up -d --force-recreate

# T5: apply DB migrations here once they exist, e.g.:
#   docker compose exec -T profile-api npm run migrate

# Positively assert every expected service is running and (where a healthcheck is
# defined) healthy. A string-grep of `docker compose ps` is a NEGATIVE check that can
# pass on Created/Dead/Paused states, a missing service, or a compose-command error;
# inspect each service explicitly instead.
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

# Verify Postgres actually accepts the credentials the API will use. The Docker
# healthchecks do NOT prove this: pg_isready sends no password, and /health is
# dependency-free. In particular, postgres:16-alpine applies POSTGRES_PASSWORD only
# on FIRST init — against a pre-existing postgres_data volume a changed password is
# silently ignored, so the API's DATABASE_URL would fail auth while the gate passes.
# Probe with the exact DATABASE_URL (TCP to host 'postgres' => real password auth).
echo "Verifying Postgres accepts the configured credentials (DATABASE_URL)..."
if ! docker compose exec -T postgres psql "$DATABASE_URL" -tAc 'select 1' >/dev/null 2>&1; then
    echo "❌ Postgres did not accept the configured credentials (DATABASE_URL)."
    echo "   pg_isready can pass while POSTGRES_PASSWORD / DATABASE_URL drift from an"
    echo "   existing postgres_data volume. Reconcile the password (or reset the volume), then re-run."
    docker compose logs --tail=50 postgres || true
    echo "The EXIT rollback will restore the previous stack."
    exit 1
fi
echo "✅ Postgres credential check passed."

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
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl enable --now nginx
    systemctl restart nginx
    echo "✅ nginx running with TLS for $PROFILE_DOMAIN"
fi

# ── systemd service (auto-start on reboot) ────────────────────────────────────

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
# adds a restore drill.

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
rm -f "$PROFILE_ENV_BAK" "$COMPOSE_BAK" ${SITE_BAK:+"$SITE_BAK"}
