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

# Service-to-service token (shared with the game server in T6). Auto-generate so a
# fresh box is never left with an empty token.
if [ -z "${PROFILE_INTERNAL_TOKEN:-}" ]; then
    PROFILE_INTERNAL_TOKEN=$(openssl rand -hex 32)
    echo "Generated PROFILE_INTERNAL_TOKEN"
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
cd "$PROFILE_DIR"

# ── Registry auth (optional) ──────────────────────────────────────────────────

if [ -n "${DOCKER_TOKEN:-}" ] && [ -n "${DOCKER_USERNAME:-}" ]; then
    echo "Logging in to the container registry as ${DOCKER_USERNAME}..."
    echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

# ── docker-compose.yml ────────────────────────────────────────────────────────
# Two services: postgres (private) + the profile API. nginx is NOT a compose
# service — it runs on the host (telemetry pattern) and terminates TLS.

cat > "$PROFILE_DIR/docker-compose.yml" << EOF
services:
  postgres:
    image: postgres:16-alpine
    restart: on-failure
    # Conservative memory caps for a low-RAM box (no auto-sizing). The swapfile
    # above is the host-level cushion; these keep Postgres itself bounded.
    command: postgres -c shared_buffers=128MB -c work_mem=4MB -c max_connections=25 -c maintenance_work_mem=64MB
    environment:
      PGDATA: /var/lib/postgresql/data/pgdata
      POSTGRES_USER: "${POSTGRES_USER}"
      POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
      POSTGRES_DB: "${POSTGRES_DB}"
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
    environment:
      PROFILE_PORT: "${PROFILE_PORT}"
      DATABASE_URL: "${DATABASE_URL}"
      PROFILE_INTERNAL_TOKEN: "${PROFILE_INTERNAL_TOKEN}"
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

echo "Written: docker-compose.yml"

# ── Start services ────────────────────────────────────────────────────────────

print_header "STARTING PROFILE SERVICES"

docker compose pull
docker compose up -d --force-recreate

# T5: apply DB migrations here once they exist, e.g.:
#   docker compose exec -T profile-api npm run migrate

echo "Waiting for all services to become healthy..."
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    if ! docker compose ps | grep -qE "starting|unhealthy"; then
        break
    fi
    sleep 3
    ELAPSED=$((ELAPSED + 3))
done

if docker compose ps | grep -E "(Exit|unhealthy)" > /dev/null 2>&1; then
    echo "⚠️  One or more containers may have issues:"
    docker compose ps
    echo "Check logs: docker compose -f $PROFILE_DIR/docker-compose.yml logs"
else
    echo "✅ All containers running:"
    docker compose ps
fi

# ── HTTPS via nginx + Let's Encrypt ──────────────────────────────────────────

if [ -n "$PROFILE_DOMAIN" ]; then
    print_header "CONFIGURING HTTPS ($PROFILE_DOMAIN)"

    # Fail fast with a helpful message if DNS is not pointed yet — certbot's
    # HTTP-01 challenge needs the A record resolving to this box.
    if ! getent hosts "$PROFILE_DOMAIN" >/dev/null 2>&1; then
        echo "Error: $PROFILE_DOMAIN does not resolve."
        echo "Point its DNS A record at this box before deploying (certbot HTTP-01 needs it)."
        exit 1
    fi

    apt-get install -y nginx certbot

    # Stop nginx so certbot --standalone can own port 80 for the HTTP-01 challenge.
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
