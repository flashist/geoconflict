#!/bin/bash
# setup-telemetry.sh - One-time setup for the Uptrace observability server
# Run on the Uptrace VPS as root.
#
# Required env vars (passed by build-deploy-telemetry.sh):
#   UPTRACE_PROJECT_TOKEN  — project token for OTLP auth (auto-generated if blank)
#   UPTRACE_SECRET_KEY     — Uptrace secret key (auto-generated if blank)
#   UPTRACE_ADMIN_PASSWORD — dashboard admin password (default: change_me_immediately)
#
# What this script does:
#   1. Installs Docker + Docker Compose plugin
#   2. Writes docker-compose.yml, uptrace.yml, otel-collector.yaml to /opt/uptrace
#   3. Starts all five containers (uptrace, clickhouse, postgres, redis, otelcol)
#   4. Creates a systemd service for auto-start on reboot
#   5. Adds weekly backup cron jobs for PostgreSQL and ClickHouse
#   6. Adds daily disk usage monitoring
#   7. Prints connection info and DSN for the game server

set -e

UPTRACE_DIR="/opt/uptrace"
BACKUP_DIR="$UPTRACE_DIR/backups"

print_header() {
    echo "======================================================"
    echo "  $1"
    echo "======================================================"
}

print_header "UPTRACE TELEMETRY SERVER SETUP"

# ── Tokens ────────────────────────────────────────────────────────────────────

if [ -z "$UPTRACE_PROJECT_TOKEN" ]; then
    UPTRACE_PROJECT_TOKEN=$(openssl rand -hex 32)
    echo "Generated UPTRACE_PROJECT_TOKEN"
fi

if [ -z "$UPTRACE_SECRET_KEY" ]; then
    UPTRACE_SECRET_KEY=$(openssl rand -hex 32)
    echo "Generated UPTRACE_SECRET_KEY"
fi

UPTRACE_ADMIN_PASSWORD="${UPTRACE_ADMIN_PASSWORD:-change_me_immediately}"

# ── System update ─────────────────────────────────────────────────────────────

print_header "UPDATING SYSTEM"
apt-get update -y && apt-get upgrade -y

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

# ── Directories ───────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"
cd "$UPTRACE_DIR"

# ── uptrace.yml ───────────────────────────────────────────────────────────────

print_header "WRITING CONFIGURATION FILES"

if [ -n "$TELEMETRY_DOMAIN" ]; then
    UPTRACE_SITE_URL="https://${TELEMETRY_DOMAIN}"
else
    UPTRACE_SITE_URL="http://localhost:14318"
fi

cat > "$UPTRACE_DIR/uptrace.yml" << EOF
##
## Uptrace v2 configuration
## https://uptrace.dev/get/config.html
##

service:
  secret: '${UPTRACE_SECRET_KEY}'

site:
  url: '${UPTRACE_SITE_URL}'

listen:
  http:
    addr: ':80'
  grpc:
    addr: ':4317'

auth: {}

pg:
  addr: postgres:5432
  user: uptrace
  password: uptrace
  database: uptrace

ch_cluster:
  cluster: uptrace1
  replicated: false
  distributed: false
  shards:
    - replicas:
        - addr: clickhouse:9000
          user: uptrace
          password: uptrace
          database: uptrace

redis_cache:
  addrs:
    1: redis:6379

seed_data:
  update: true
  delete: false
  users:
    - key: admin_user
      name: Admin
      email: admin@geoconflict.ru
      password: '${UPTRACE_ADMIN_PASSWORD}'
      email_confirmed: true
  orgs:
    - key: geoconflict_org
      name: Geoconflict
  org_users:
    - key: geoconflict_org_user
      org_key: geoconflict_org
      user_key: admin_user
      role: owner
  projects:
    - key: geoconflict_project
      name: geoconflict
      org_key: geoconflict_org
  project_tokens:
    - key: geoconflict_token
      project_key: geoconflict_project
      token: '${UPTRACE_PROJECT_TOKEN}'
  project_users:
    - key: geoconflict_project_user
      project_key: geoconflict_project
      org_user_key: geoconflict_org_user
      perm_level: admin
EOF

echo "Written: uptrace.yml"

# ── otel-collector.yaml ───────────────────────────────────────────────────────

cat > "$UPTRACE_DIR/otel-collector.yaml" << EOF
# OpenTelemetry Collector config
# Receives OTLP from the game server on ports 4317/4318,
# then forwards to Uptrace with the project DSN header.

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
        cors:
          # Wildcard is intentional — browser clients connect from any origin.
          # Anyone can send spans to port 4318, which may pollute telemetry.
          # Acceptable trade-off for a game; tighten to your domain if needed.
          allowed_origins:
            - "*"
          allowed_headers:
            - "*"

processors:
  batch:
    timeout: 10s
    send_batch_size: 10000

exporters:
  otlphttp/uptrace:
    endpoint: http://uptrace:80
    headers:
      uptrace-dsn: "http://${UPTRACE_PROJECT_TOKEN}@uptrace:80"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/uptrace]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/uptrace]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/uptrace]
EOF

echo "Written: otel-collector.yaml"

# ── docker-compose.yml ────────────────────────────────────────────────────────

if [ -n "$TELEMETRY_DOMAIN" ]; then
    OTELCOL_HTTP_PORT="127.0.0.1:4318:4318"   # nginx proxies; no direct external access
else
    OTELCOL_HTTP_PORT="4318:4318"              # plain HTTP, exposed directly
fi

cat > "$UPTRACE_DIR/docker-compose.yml" << EOF
services:
  clickhouse:
    image: clickhouse/clickhouse-server:25.8.15.35
    restart: on-failure
    environment:
      CLICKHOUSE_USER: uptrace
      CLICKHOUSE_PASSWORD: uptrace
      CLICKHOUSE_DB: uptrace
      CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO: "0.6"
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'localhost:8123/ping']
      interval: 1s
      timeout: 1s
      retries: 30
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

  postgres:
    image: postgres:17-alpine
    restart: on-failure
    environment:
      PGDATA: /var/lib/postgresql/data/pgdata
      POSTGRES_USER: uptrace
      POSTGRES_PASSWORD: uptrace
      POSTGRES_DB: uptrace
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U uptrace -d uptrace']
      interval: 1s
      timeout: 1s
      retries: 30
    volumes:
      - postgres_data:/var/lib/postgresql/data/pgdata

  redis:
    image: redis:7-alpine
    restart: on-failure
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 1s
      timeout: 1s
      retries: 30

  uptrace:
    image: uptrace/uptrace:2.0.2
    restart: on-failure
    volumes:
      - ./uptrace.yml:/etc/uptrace/config.yml
    # Bind to localhost only — access via SSH tunnel: ssh -L 14318:localhost:14318 root@HOST
    ports:
      - "127.0.0.1:14318:80"
      - "127.0.0.1:14317:4317"
    depends_on:
      clickhouse:
        condition: service_healthy
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Receives OTLP from the game server, forwards to Uptrace with project DSN
  otelcol:
    image: otel/opentelemetry-collector-contrib:0.123.0
    restart: on-failure
    volumes:
      - ./otel-collector.yaml:/etc/otelcol-contrib/config.yaml
    # These ports must be firewalled to game-server IP only (see build-deploy-telemetry.sh output)
    ports:
      - "4317:4317"                 # OTLP gRPC
      - "${OTELCOL_HTTP_PORT}"      # OTLP HTTP (127.0.0.1 only when HTTPS mode)
    depends_on:
      - uptrace

volumes:
  clickhouse_data:
  postgres_data:
EOF

echo "Written: docker-compose.yml"

# ── Start services ────────────────────────────────────────────────────────────

print_header "STARTING UPTRACE SERVICES"

docker compose up -d
docker compose restart uptrace

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
    echo "Check logs: docker compose -f $UPTRACE_DIR/docker-compose.yml logs"
else
    echo "✅ All containers running:"
    docker compose ps
fi

# ── HTTPS via nginx + Let's Encrypt ──────────────────────────────────────────

if [ -n "$TELEMETRY_DOMAIN" ]; then
    print_header "CONFIGURING HTTPS ($TELEMETRY_DOMAIN)"

    apt-get install -y nginx certbot

    # Stop nginx so certbot --standalone can own port 80 for the HTTP-01 challenge.
    # --keep-until-expiring is a no-op if the cert is still fresh (safe to re-run).
    systemctl stop nginx || true
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --keep-until-expiring \
        -m ruflashist@gmail.com \
        -d "$TELEMETRY_DOMAIN"

    cat > /etc/nginx/sites-available/telemetry << NGINXEOF
server {
    listen 80;
    server_name ${TELEMETRY_DOMAIN};
    return 301 https://\$host\$request_uri;
}

# OTLP collector + Uptrace dashboard on the same domain/port
# /v1/* → otelcol (OTLP HTTP); everything else → Uptrace dashboard
server {
    listen 443 ssl;
    server_name ${TELEMETRY_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${TELEMETRY_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${TELEMETRY_DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # OTLP HTTP — /v1/traces, /v1/logs, /v1/metrics
    location /v1/ {
        proxy_pass http://127.0.0.1:4318;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }

    # Uptrace dashboard
    # sub_filter rewrites the hardcoded localhost:14318 in the pre-built JS bundle
    # so API calls resolve to the public domain instead of failing in the browser.
    # proxy_set_header Accept-Encoding "" + gunzip on: upstream sends gzip; gunzip
    # decompresses before sub_filter runs, then nginx re-compresses for the client.
    # proxy_hide_header Cache-Control + no-store: upstream caches assets for ~1 year;
    # we strip that so browsers always re-fetch the rewritten JS.
    # proxy_http_version 1.1 + Upgrade/Connection headers: required for WebSocket
    # proxying (Uptrace uses WebSockets for live query results).
    location / {
        proxy_pass http://127.0.0.1:14318;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Accept-Encoding "";
        proxy_read_timeout 3600s;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-store";
        gunzip on;
        sub_filter 'http://localhost:14318' 'https://${TELEMETRY_DOMAIN}';
        sub_filter_once off;
        sub_filter_types text/html application/javascript text/javascript;
    }
}
NGINXEOF

    ln -sf /etc/nginx/sites-available/telemetry /etc/nginx/sites-enabled/telemetry
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl enable --now nginx
    echo "✅ nginx running with TLS for $TELEMETRY_DOMAIN"
fi

# ── systemd service (auto-start on reboot) ────────────────────────────────────

print_header "CONFIGURING SYSTEMD AUTO-START"

cat > /etc/systemd/system/uptrace.service << 'EOF'
[Unit]
Description=Uptrace Observability Stack
Requires=docker.service
After=docker.service network-online.target

[Service]
WorkingDirectory=/opt/uptrace
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
systemctl enable uptrace
echo "✅ systemd service 'uptrace' enabled (starts on reboot)"

# ── Backup cron jobs ──────────────────────────────────────────────────────────

print_header "SETTING UP BACKUP CRON JOBS"

CRON_FILE="/etc/cron.d/uptrace-backups"
cat > "$CRON_FILE" << EOF
# Uptrace weekly backups — added by setup-telemetry.sh
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# PostgreSQL backup every Sunday at 3:00am
0 3 * * 0 root cd $UPTRACE_DIR && docker compose exec -T postgres pg_dump -U uptrace uptrace > $BACKUP_DIR/pg-\$(date +\\%Y\\%m\\%d).sql 2>&1

# ClickHouse live filesystem snapshot every Sunday at 3:30am (no downtime).
# Known limitation: snapshot is not crash-consistent if ClickHouse is writing during tar.
# Acceptable for a telemetry system — upgrade to ClickHouse native BACKUP TO Disk
# if strict consistency becomes a requirement.
30 3 * * 0 root tar czf $BACKUP_DIR/clickhouse-\$(date +\\%Y\\%m\\%d).tar.gz /var/lib/docker/volumes/uptrace_clickhouse_data 2>&1

# Prune old backups — keep last 4 weeks
0 5 * * 0 root find $BACKUP_DIR -name "pg-*.sql" -mtime +28 -delete && find $BACKUP_DIR -name "clickhouse-*.tar.gz" -mtime +28 -delete

# Disk usage alert — daily at 8:00am. Writes to /var/log/disk-warnings.log when usage > 70%.
# Log-only (no email/webhook) — check the log manually or configure a notification if needed.
0 8 * * * root USAGE=\$(df / | awk 'NR==2 {print \$5}' | tr -d '%'); if [ "\$USAGE" -gt 70 ]; then echo "\$(date) -- disk usage \${USAGE}%" >> /var/log/disk-warnings.log; fi

# Certbot renewal — twice daily (Let's Encrypt recommendation)
0 0,12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx" 2>&1
EOF

chmod 644 "$CRON_FILE"
echo "✅ Cron jobs written to $CRON_FILE"

# ── Print connection info ─────────────────────────────────────────────────────

SERVER_IP="${TELEMETRY_SERVER_HOST:-$(hostname -I | awk '{print $1}')}"

print_header "SETUP COMPLETE"
echo ""
if [ -n "$TELEMETRY_DOMAIN" ]; then
    echo "Dashboard:"
    echo "  Open: https://${TELEMETRY_DOMAIN}"
else
    echo "Dashboard (via SSH tunnel only):"
    echo "  ssh -L 14318:localhost:14318 root@${SERVER_IP}"
    echo "  Open: http://localhost:14318"
fi
echo "  Login: admin@geoconflict.ru / ${UPTRACE_ADMIN_PASSWORD}"
echo ""
echo "Game server env vars — add to .env.prod:"
if [ -n "$TELEMETRY_DOMAIN" ]; then
    OTLP_ENDPOINT="https://${TELEMETRY_DOMAIN}"
else
    OTLP_ENDPOINT="http://${SERVER_IP}:4318"
fi
echo "  OTEL_EXPORTER_OTLP_ENDPOINT=${OTLP_ENDPOINT}"
echo ""
echo "Tokens (save these — they cannot be recovered):"
echo "  UPTRACE_PROJECT_TOKEN=${UPTRACE_PROJECT_TOKEN}"
echo "  UPTRACE_SECRET_KEY=${UPTRACE_SECRET_KEY}"
echo ""
if [ -n "$TELEMETRY_DOMAIN" ]; then
    echo "⚠️  FIREWALL:"
    echo "   ufw allow 80     # HTTP (certbot renewal challenge)"
    echo "   ufw allow 443    # HTTPS — OTLP + Uptrace dashboard"
    echo "   ufw allow from GAME_SERVER_IP to any port 4317   # gRPC (optional)"
    echo "   ufw deny 4317 && ufw deny 4318 && ufw deny 14317 && ufw deny 14318"
    echo "   ufw enable"
else
    echo "⚠️  FIREWALL: port 4317 (gRPC) — restrict to game server only; port 4318 (HTTP) — open to all for browser clients:"
    echo "   ufw allow from GAME_SERVER_IP to any port 4317"
    echo "   ufw deny 4317 && ufw allow 4318 && ufw deny 14317 && ufw deny 14318 && ufw enable"
fi
echo ""
echo "Change the admin password immediately after first login."
echo "======================================================"
