#!/bin/bash
# setup-telemetry.sh - One-time setup for the Uptrace observability server
# Run on the Uptrace VPS as root.
#
# Required env vars (passed by deploy-telemetry.sh):
#   UPTRACE_PROJECT_TOKEN  — project token for OTLP auth (auto-generated if blank)
#   UPTRACE_SECRET_KEY     — Uptrace secret key (auto-generated if blank)
#   UPTRACE_ADMIN_PASSWORD — dashboard admin password (default: change_me_immediately)
#
# What this script does:
#   1. Installs Docker + Docker Compose plugin
#   2. Writes docker-compose.yml, uptrace.yml, otel-collector.yaml to /opt/uptrace
#   3. Starts all four containers (uptrace, clickhouse, postgres, otelcol)
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

cat > "$UPTRACE_DIR/uptrace.yml" << EOF
##
## Uptrace configuration
## https://uptrace.dev/get/config.html
##

secret_key: '${UPTRACE_SECRET_KEY}'

auth:
  users:
    - name: Admin
      email: admin@geoconflict.ru
      password: '${UPTRACE_ADMIN_PASSWORD}'
      role: admin

projects:
  - id: 1
    name: geoconflict
    token: '${UPTRACE_PROJECT_TOKEN}'

ch:
  addr: clickhouse:9000
  user: default
  password: ""
  database: uptrace

db:
  driver: pg
  dsn: "postgresql://uptrace:uptrace@postgres:5432/uptrace?sslmode=disable"

listen:
  http:
    addr: ':14318'
  grpc:
    addr: ':14317'

ch_schema:
  # Retain telemetry data for 90 days (covers ~3 release sprints for cross-release comparison)
  spans:
    ttl_delete: 90 DAY
  metrics:
    ttl_delete: 90 DAY
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

processors:
  batch:
    timeout: 10s
    send_batch_size: 10000

exporters:
  otlphttp/uptrace:
    endpoint: http://uptrace:14318
    headers:
      uptrace-dsn: "http://${UPTRACE_PROJECT_TOKEN}@localhost:14318/1"
    tls:
      insecure: true

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

cat > "$UPTRACE_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  uptrace:
    image: uptrace/uptrace:latest
    restart: unless-stopped
    volumes:
      - ./uptrace.yml:/etc/uptrace/uptrace.yml
    # Bind to localhost only — access via SSH tunnel: ssh -L 14318:localhost:14318 root@HOST
    ports:
      - "127.0.0.1:14318:14318"
      - "127.0.0.1:14317:14317"
    depends_on:
      - clickhouse
      - postgres

  clickhouse:
    image: clickhouse/clickhouse-server:23.7
    restart: unless-stopped
    environment:
      - CLICKHOUSE_DB=uptrace
      # Cap ClickHouse at 60% of available RAM to leave headroom for other services
      - CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO=0.6
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=uptrace
      - POSTGRES_PASSWORD=uptrace
      - POSTGRES_DB=uptrace
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Receives OTLP from the game server, forwards to Uptrace with project DSN
  otelcol:
    image: otel/opentelemetry-collector-contrib:latest
    restart: unless-stopped
    volumes:
      - ./otel-collector.yaml:/etc/otelcol-contrib/config.yaml
    # These ports must be firewalled to game-server IP only (see deploy-telemetry.sh output)
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
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
echo "Waiting 15 seconds for services to initialise..."
sleep 15

if docker compose ps | grep -E "(Exit|unhealthy)" > /dev/null 2>&1; then
    echo "⚠️  One or more containers may have issues:"
    docker compose ps
    echo "Check logs: docker compose -f $UPTRACE_DIR/docker-compose.yml logs"
else
    echo "✅ All containers running:"
    docker compose ps
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

# ClickHouse filesystem backup every Sunday at 3:30am (stop briefly to snapshot)
30 3 * * 0 root docker compose -f $UPTRACE_DIR/docker-compose.yml stop clickhouse && tar czf $BACKUP_DIR/clickhouse-\$(date +\\%Y\\%m\\%d).tar.gz /var/lib/docker/volumes/uptrace_clickhouse_data && docker compose -f $UPTRACE_DIR/docker-compose.yml start clickhouse 2>&1

# Prune old backups — keep last 4 weeks
0 5 * * 0 root find $BACKUP_DIR -name "pg-*.sql" -mtime +28 -delete && find $BACKUP_DIR -name "clickhouse-*.tar.gz" -mtime +28 -delete

# Disk usage alert — daily at 8:00am (logs to /var/log/disk-warnings.log if usage > 70%)
0 8 * * * root USAGE=\$(df / | awk 'NR==2 {print \$5}' | tr -d '%'); if [ "\$USAGE" -gt 70 ]; then echo "\$(date) -- disk usage \${USAGE}%" >> /var/log/disk-warnings.log; fi
EOF

chmod 644 "$CRON_FILE"
echo "✅ Cron jobs written to $CRON_FILE"

# ── Print connection info ─────────────────────────────────────────────────────

SERVER_IP=$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}')

print_header "SETUP COMPLETE"
echo ""
echo "Dashboard (via SSH tunnel only):"
echo "  ssh -L 14318:localhost:14318 root@${SERVER_IP}"
echo "  Open: http://localhost:14318"
echo "  Login: admin@geoconflict.ru / ${UPTRACE_ADMIN_PASSWORD}"
echo ""
echo "Game server env vars — add to .env.prod:"
echo "  OTEL_EXPORTER_OTLP_ENDPOINT=http://${SERVER_IP}:4318"
echo ""
echo "Tokens (save these — they cannot be recovered):"
echo "  UPTRACE_PROJECT_TOKEN=${UPTRACE_PROJECT_TOKEN}"
echo "  UPTRACE_SECRET_KEY=${UPTRACE_SECRET_KEY}"
echo ""
echo "⚠️  FIREWALL: restrict ports 4317 and 4318 to the game server IP only:"
echo "   ufw allow from GAME_SERVER_IP to any port 4317"
echo "   ufw allow from GAME_SERVER_IP to any port 4318"
echo "   ufw deny 4317"
echo "   ufw deny 4318"
echo "   ufw deny 14317"
echo "   ufw deny 14318"
echo ""
echo "Change the admin password immediately after first login."
echo "======================================================"
