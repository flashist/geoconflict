#!/bin/bash
# setup-profile.sh - One-time/idempotent provisioning for the player-profile backend VPS.
# Run on the profile VPS as root. Mirrors setup-telemetry.sh (do NOT invent a
# parallel pattern).
#
# This is the PROVISIONING half. It stands up the box but does NOT deploy the app
# stack: the docker-compose.yml, profile.env, the profile systemd unit, the
# pull/health-gate/rollback, and the pg_dump/maintenance cron are authored by
# build-deploy-profile.sh (task T4e). Standing them up here would crash-loop on a
# box that has no compose file yet, so they live in T4e alongside the POSTGRES_*
# vars they consume. Everything this script ships works the moment it lands.
#
# Optional env vars (with defaults):
#   PROFILE_DOMAIN             — public domain; when set, host nginx + Let's Encrypt TLS
#   PROFILE_PORT               — profile API port nginx proxies to (default 8080)
#   PROFILE_SWAP_SIZE_GB       — swapfile size in GB; 0 disables management (default 4)
#   PROFILE_INTERNAL_ALLOW_IPS — game-server IPs for the dormant nginx /internal/ allowlist
#   CERTBOT_EMAIL              — Let's Encrypt email (default ruflashist@gmail.com)
#   PROFILE_SERVER_HOST        — IP/host (used only for the connection-info banner)
#
# What this script does:
#   1. Ensures a swapfile exists (low-RAM VPS OOM cushion)
#   2. Installs Docker + Docker Compose plugin
#   3. Applies a ufw firewall (SSH/80/443 only; default-deny incoming)
#   4. Creates /opt/profile (0700) + backups/ for the deploy slice to write into
#   5. Configures host nginx + Let's Encrypt TLS for api.geoconflict.ru, with a
#      dormant /internal/ IP allowlist (network-shape only; T5 wires the endpoint)
#   6. Prints connection info

set -e

PROFILE_DIR="/opt/profile"
BACKUP_DIR="$PROFILE_DIR/backups"

print_header() {
    echo "======================================================"
    echo "  $1"
    echo "======================================================"
}

print_header "PLAYER-PROFILE BACKEND SERVER PROVISIONING"

# ── Defaults ──────────────────────────────────────────────────────────────────

PROFILE_PORT="${PROFILE_PORT:-8080}"
PROFILE_SWAP_SIZE_GB="${PROFILE_SWAP_SIZE_GB:-4}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-ruflashist@gmail.com}"
PROFILE_DOMAIN="${PROFILE_DOMAIN:-}"
PROFILE_INTERNAL_ALLOW_IPS="${PROFILE_INTERNAL_ALLOW_IPS:-}"

# ── Validate ──────────────────────────────────────────────────────────────────
# Provisioning-only: deploy vars (PROFILE_IMAGE / POSTGRES_PASSWORD / DATABASE_URL /
# PROFILE_INTERNAL_TOKEN) are NOT required here — they belong to the deploy slice
# (T4e), which writes profile.env. Only the values this script actually consumes
# are validated.

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

if [ "$PROFILE_SWAP_SIZE_GB" -eq 0 ]; then
    echo "PROFILE_SWAP_SIZE_GB=0; skipping swap management"
elif swapon --show=NAME --noheadings 2>/dev/null | grep -qx '/swapfile'; then
    echo "Swap already active; leaving it in place:"
    swapon --show
    # Ensure persistence even if /swapfile was activated out-of-band (e.g. a manual
    # `swapon` without an fstab entry) — otherwise swap silently vanishes on reboot.
    # Idempotent: the create branch already adds this, so a normal re-run never
    # duplicates the entry.
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
    echo "Creating ${PROFILE_SWAP_SIZE_GB}G swapfile at /swapfile..."
    # fallocate is fast on ext4; on CoW filesystems it can yield a holey file that
    # swapon rejects, so fall back to dd (writes real blocks). Each method is guarded
    # with `|| return 1` so a fallocate failure falls through to dd instead of
    # tripping set -e; if BOTH methods fail we abort (swap is mandatory on this box).
    if try_enable_swapfile fallocate; then
        grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        swapon --show
    elif echo "fallocate path failed (holey/unsupported file?); retrying with dd..." && try_enable_swapfile dd; then
        grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
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
# (5432) is published on 127.0.0.1 only (by the compose file T4e authors), so
# default-deny on the public interface keeps it private without an explicit rule.
# Internal endpoints are additionally IP-allowlisted at the nginx /internal/ block.
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
# Root-only: the deploy slice (T4e) writes the compose env_file + the persisted
# internal token here. backups/ is pre-created so T4e's pg_dump cron has a target.

mkdir -p "$BACKUP_DIR"
chmod 700 "$PROFILE_DIR"

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

    # certbot --standalone needs port 80, so we stop nginx first. If certbot or the
    # later config test fails (set -e), an ERR trap restores the previous site config
    # and restarts nginx — a failed TLS re-run must never leave the public API down.
    SITE_FILE=/etc/nginx/sites-available/profile
    SITE_BAK="${SITE_FILE}.bak.$$"
    [ -f "$SITE_FILE" ] && cp -f "$SITE_FILE" "$SITE_BAK"
    restore_nginx_on_failure() {
        echo "⚠️  HTTPS setup failed — restoring nginx to its previous state."
        [ -f "$SITE_BAK" ] && mv -f "$SITE_BAK" "$SITE_FILE"
        systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
    }
    trap restore_nginx_on_failure ERR

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
    # Success — drop the rollback safety net.
    trap - ERR
    rm -f "$SITE_BAK"
    echo "✅ nginx running with TLS for $PROFILE_DOMAIN"
fi

# ── Print connection info ─────────────────────────────────────────────────────

SERVER_IP="${PROFILE_SERVER_HOST:-$(hostname -I | awk '{print $1}')}"

print_header "PROVISIONING COMPLETE"
echo ""
echo "Box provisioned: swap + Docker + ufw (SSH/80/443) + /opt/profile (0700)."
if [ -n "$PROFILE_DOMAIN" ]; then
    echo ""
    echo "nginx + Let's Encrypt TLS is live for ${PROFILE_DOMAIN}."
    echo "There is NO app upstream yet, so:"
    echo "  curl https://${PROFILE_DOMAIN}/    # terminates valid TLS, returns nginx 502 (expected)"
    echo "The API stack + working /health land via the deploy slice (build-deploy-profile.sh, T4e)."
else
    echo ""
    echo "PROFILE_DOMAIN unset — TLS/nginx skipped. Set it (with the A record pointed"
    echo "at this box) and re-run to configure HTTPS."
fi
echo ""
echo "/internal/ nginx allowlist laid down (dormant): allow ${PROFILE_INTERNAL_ALLOW_IPS:-<none>} + deny all."
echo "Postgres will be published on 127.0.0.1:5432 by the deploy slice (never public)."
echo ""
echo "Firewall: ufw active (SSH/80/443 allowed, everything else denied)."
echo "Next: run build-deploy-profile.sh (T4e) to deploy the profile API + Postgres stack."
echo "======================================================"
