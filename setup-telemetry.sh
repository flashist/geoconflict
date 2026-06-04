#!/bin/bash
# setup-telemetry.sh - One-time setup for the Uptrace observability server
# Run on the Uptrace VPS as root.
#
# Required env vars (passed by build-deploy-telemetry.sh):
#   UPTRACE_PROJECT_TOKEN  — project token for OTLP auth (auto-generated if blank)
#   UPTRACE_SECRET_KEY     — Uptrace secret key (auto-generated if blank)
#   UPTRACE_ADMIN_PASSWORD — dashboard admin password (default: change_me_immediately)
#   UPTRACE_RETENTION_DAYS — span/log/event retention in days (default: 7)
#   UPTRACE_METRICS_RETENTION_DAYS — metrics retention in days (default: 90)
#   CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS — ClickHouse internal log retention (default: 1)
#   CLICKHOUSE_QUERY_LOG_RETENTION_DAYS — ClickHouse query/part log retention (default: 3)
#   CLICKHOUSE_TRUNCATE_SYSTEM_LOGS — clear existing ClickHouse system logs on setup (default: 1)
#   CLICKHOUSE_TRUNCATE_FILE_LOGS — clear ClickHouse filesystem logs on setup/redeploy (default: 1)
#   CLICKHOUSE_FILE_LOG_LEVEL — ClickHouse filesystem log level (default: warning)
#   CLICKHOUSE_FILE_LOG_SIZE — max size per ClickHouse filesystem log before rotation (default: 50M)
#   CLICKHOUSE_FILE_LOG_COUNT — rotated ClickHouse filesystem log files to keep (default: 2)
#   CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO — ClickHouse memory cap ratio (default: 0.6)
#   CLICKHOUSE_DISABLE_METRIC_LOG — disable ClickHouse system.metric_log diagnostics (default: 1)
#   TELEMETRY_SWAP_SIZE_GB — swapfile size in GB; 0 disables swap management (default: 4)
#
# What this script does:
#   1. Ensures a swapfile exists (low-RAM VPS OOM cushion)
#   2. Installs Docker + Docker Compose plugin
#   3. Writes docker-compose.yml, uptrace.yml, otel-collector.yaml to /opt/uptrace
#   4. Starts all five containers (uptrace, clickhouse, postgres, redis, otelcol)
#   5. Creates a systemd service for auto-start on reboot
#   6. Adds weekly backup cron jobs for PostgreSQL
#   7. Adds daily disk usage monitoring
#   8. Prints connection info and DSN for the game server

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
UPTRACE_RETENTION_DAYS="${UPTRACE_RETENTION_DAYS:-7}"
UPTRACE_METRICS_RETENTION_DAYS="${UPTRACE_METRICS_RETENTION_DAYS:-90}"
CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS="${CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS:-1}"
CLICKHOUSE_QUERY_LOG_RETENTION_DAYS="${CLICKHOUSE_QUERY_LOG_RETENTION_DAYS:-3}"
CLICKHOUSE_TRUNCATE_SYSTEM_LOGS="${CLICKHOUSE_TRUNCATE_SYSTEM_LOGS:-1}"
CLICKHOUSE_TRUNCATE_FILE_LOGS="${CLICKHOUSE_TRUNCATE_FILE_LOGS:-1}"
CLICKHOUSE_FILE_LOG_LEVEL="${CLICKHOUSE_FILE_LOG_LEVEL:-warning}"
CLICKHOUSE_FILE_LOG_SIZE="${CLICKHOUSE_FILE_LOG_SIZE:-50M}"
CLICKHOUSE_FILE_LOG_COUNT="${CLICKHOUSE_FILE_LOG_COUNT:-2}"
CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO="${CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO:-0.6}"
CLICKHOUSE_DISABLE_METRIC_LOG="${CLICKHOUSE_DISABLE_METRIC_LOG:-1}"
TELEMETRY_SWAP_SIZE_GB="${TELEMETRY_SWAP_SIZE_GB:-4}"
if ! [[ "$UPTRACE_RETENTION_DAYS" =~ ^[0-9]+$ ]] || [ "$UPTRACE_RETENTION_DAYS" -lt 1 ]; then
    echo "Error: UPTRACE_RETENTION_DAYS must be a positive integer."
    exit 1
fi
if ! [[ "$UPTRACE_METRICS_RETENTION_DAYS" =~ ^[0-9]+$ ]] || [ "$UPTRACE_METRICS_RETENTION_DAYS" -lt 1 ]; then
    echo "Error: UPTRACE_METRICS_RETENTION_DAYS must be a positive integer."
    exit 1
fi
if ! [[ "$CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS" =~ ^[0-9]+$ ]] || [ "$CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS" -lt 1 ]; then
    echo "Error: CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS must be a positive integer."
    exit 1
fi
if ! [[ "$CLICKHOUSE_QUERY_LOG_RETENTION_DAYS" =~ ^[0-9]+$ ]] || [ "$CLICKHOUSE_QUERY_LOG_RETENTION_DAYS" -lt 1 ]; then
    echo "Error: CLICKHOUSE_QUERY_LOG_RETENTION_DAYS must be a positive integer."
    exit 1
fi
if ! [[ "$CLICKHOUSE_FILE_LOG_LEVEL" =~ ^(none|fatal|critical|error|warning|notice|information|debug|trace|test)$ ]]; then
    echo "Error: CLICKHOUSE_FILE_LOG_LEVEL must be a valid ClickHouse log level."
    exit 1
fi
if ! [[ "$CLICKHOUSE_FILE_LOG_SIZE" =~ ^[0-9]+[KMG]?$ ]]; then
    echo "Error: CLICKHOUSE_FILE_LOG_SIZE must be a size like 104857600, 100M, 512M, or 1G."
    exit 1
fi
if ! [[ "$CLICKHOUSE_FILE_LOG_COUNT" =~ ^[0-9]+$ ]] || [ "$CLICKHOUSE_FILE_LOG_COUNT" -lt 1 ]; then
    echo "Error: CLICKHOUSE_FILE_LOG_COUNT must be a positive integer."
    exit 1
fi
if ! [[ "$CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO" =~ ^0\.[0-9]+$|^1(\.0+)?$ ]]; then
    echo "Error: CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO must be between 0 and 1, for example 0.6."
    exit 1
fi
if ! [[ "$TELEMETRY_SWAP_SIZE_GB" =~ ^[0-9]+$ ]]; then
    echo "Error: TELEMETRY_SWAP_SIZE_GB must be a non-negative integer (GB). Use 0 to disable swap management."
    exit 1
fi
UPTRACE_RETENTION_NS=$((UPTRACE_RETENTION_DAYS * 86400 * 1000000000))
UPTRACE_METRICS_RETENTION_NS=$((UPTRACE_METRICS_RETENTION_DAYS * 86400 * 1000000000))

is_truthy() {
    case "$1" in
        1|true|TRUE|yes|YES|on|ON)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# ── System update ─────────────────────────────────────────────────────────────

print_header "UPDATING SYSTEM"
apt-get update -y && apt-get upgrade -y

# ── Swap ────────────────────────────────────────────────────────────────────────
# The telemetry VPS has limited RAM (~3.8 GB) and originally shipped with NO swap.
# ClickHouse memory spikes — notably background merges of internal diagnostics —
# repeatedly tripped the kernel OOM-killer and eventually froze the entire host
# (unreachable over both network and the provider console). A swapfile gives the
# kernel a cushion so a transient spike is paged out instead of wedging the box.
# Idempotent: skips creation if a /swapfile is already active.
print_header "CONFIGURING SWAP"

if [ "$TELEMETRY_SWAP_SIZE_GB" -eq 0 ]; then
    echo "TELEMETRY_SWAP_SIZE_GB=0; skipping swap management"
elif swapon --show 2>/dev/null | grep -q '/swapfile'; then
    echo "Swap already active; leaving it in place:"
    swapon --show
else
    echo "Creating ${TELEMETRY_SWAP_SIZE_GB}G swapfile at /swapfile..."
    # fallocate is fast but unsupported on some filesystems for swap; fall back to dd.
    if ! fallocate -l "${TELEMETRY_SWAP_SIZE_GB}G" /swapfile 2>/dev/null; then
        rm -f /swapfile
        dd if=/dev/zero of=/swapfile bs=1M count=$((TELEMETRY_SWAP_SIZE_GB * 1024)) status=none
    fi
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    swapon --show
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
          max_execution_time: 15s

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
if grep -q '^ch:' "$UPTRACE_DIR/uptrace.yml"; then
    echo "Error: generated uptrace.yml contains unsupported top-level ch: config for Uptrace 2.0.2"
    exit 1
fi

# ── ClickHouse config ─────────────────────────────────────────────────────────

# metric_log / asynchronous_metric_log are pure ClickHouse internal diagnostics.
# On this small VPS metric_log grew to ~480 MB and its background merges drove
# repeated MEMORY_LIMIT_EXCEEDED errors and OOM-kills (the root cause of the
# 2026-06 freeze). remove="1" disables those tables entirely — no inserts, no
# merges, no memory churn. Set CLICKHOUSE_DISABLE_METRIC_LOG=0 to keep them with
# a short TTL instead.
if is_truthy "$CLICKHOUSE_DISABLE_METRIC_LOG"; then
    METRIC_LOG_XML='    <metric_log remove="1"/>
    <asynchronous_metric_log remove="1"/>'
else
    METRIC_LOG_XML="    <metric_log>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </metric_log>
    <asynchronous_metric_log>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </asynchronous_metric_log>"
fi

cat > "$UPTRACE_DIR/clickhouse-system-logs.xml" << EOF
<clickhouse>
    <trace_log>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </trace_log>
    <text_log>
        <level>warning</level>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </text_log>
${METRIC_LOG_XML}
    <processors_profile_log>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </processors_profile_log>
    <query_log>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_QUERY_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </query_log>
    <query_thread_log>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_QUERY_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </query_thread_log>
    <query_views_log>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_QUERY_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </query_views_log>
    <part_log>
        <ttl>event_date + INTERVAL ${CLICKHOUSE_QUERY_LOG_RETENTION_DAYS} DAY DELETE</ttl>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </part_log>
</clickhouse>
EOF

cat > "$UPTRACE_DIR/clickhouse-logger.xml" << EOF
<clickhouse>
    <logger>
        <level>${CLICKHOUSE_FILE_LOG_LEVEL}</level>
        <log>/var/log/clickhouse-server/clickhouse-server.log</log>
        <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
        <size>${CLICKHOUSE_FILE_LOG_SIZE}</size>
        <count>${CLICKHOUSE_FILE_LOG_COUNT}</count>
    </logger>
</clickhouse>
EOF

cat > "$UPTRACE_DIR/clickhouse-memory.xml" << EOF
<clickhouse>
    <max_server_memory_usage_to_ram_ratio>${CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO}</max_server_memory_usage_to_ram_ratio>
</clickhouse>
EOF

cat > "$UPTRACE_DIR/clickhouse-profiler.xml" << EOF
<clickhouse>
    <profiles>
        <default>
            <query_profiler_real_time_period_ns>0</query_profiler_real_time_period_ns>
            <query_profiler_cpu_time_period_ns>0</query_profiler_cpu_time_period_ns>
            <memory_profiler_step>0</memory_profiler_step>
            <memory_profiler_sample_probability>0</memory_profiler_sample_probability>
        </default>
    </profiles>
</clickhouse>
EOF

echo "Written: clickhouse-system-logs.xml"
echo "Written: clickhouse-logger.xml"
echo "Written: clickhouse-memory.xml"
echo "Written: clickhouse-profiler.xml"

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
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'localhost:8123/ping']
      interval: 1s
      timeout: 1s
      retries: 30
    volumes:
      - clickhouse_data:/var/lib/clickhouse
      - ./clickhouse-system-logs.xml:/etc/clickhouse-server/config.d/geoconflict-system-logs.xml:ro
      - ./clickhouse-logger.xml:/etc/clickhouse-server/config.d/geoconflict-logger.xml:ro
      - ./clickhouse-memory.xml:/etc/clickhouse-server/config.d/geoconflict-memory.xml:ro
      - ./clickhouse-profiler.xml:/etc/clickhouse-server/users.d/geoconflict-profiler.xml:ro
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

# ClickHouse and Uptrace read mounted config files at process startup. Force
# recreation so re-running this script applies regenerated XML/YAML settings.
docker compose up -d --force-recreate clickhouse uptrace otelcol

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

# ── ClickHouse filesystem log cleanup ────────────────────────────────────────

print_header "CONFIGURING CLICKHOUSE FILE LOGS"

if is_truthy "$CLICKHOUSE_TRUNCATE_FILE_LOGS"; then
    docker compose exec -T clickhouse sh -lc '
        mkdir -p /var/log/clickhouse-server
        for file in \
            /var/log/clickhouse-server/clickhouse-server.log \
            /var/log/clickhouse-server/clickhouse-server.err.log
        do
            if [ -e "$file" ]; then
                truncate -s 0 "$file"
            fi
        done
        rm -f /var/log/clickhouse-server/clickhouse-server.log.* \
              /var/log/clickhouse-server/clickhouse-server.err.log.*
    ' || echo "⚠️  Could not truncate ClickHouse filesystem logs; continuing"
else
    echo "CLICKHOUSE_TRUNCATE_FILE_LOGS=${CLICKHOUSE_TRUNCATE_FILE_LOGS}; preserving existing ClickHouse filesystem logs"
fi

docker compose exec -T clickhouse sh -lc '
    ls -lh /var/log/clickhouse-server 2>/dev/null || true
    du -h -d1 /var/log/clickhouse-server 2>/dev/null || true
' || echo "⚠️  Could not inspect ClickHouse filesystem logs; continuing"

docker compose exec -T clickhouse clickhouse-client -u uptrace --password uptrace -q "
    select name, value
    from system.server_settings
    where name = 'max_server_memory_usage_to_ram_ratio';" || \
    echo "⚠️  Could not verify ClickHouse memory ratio; continuing"

# ── ClickHouse internal log cleanup ──────────────────────────────────────────

print_header "CONFIGURING CLICKHOUSE SYSTEM LOG RETENTION"

clickhouse_query() {
    docker compose exec -T clickhouse clickhouse-client -u uptrace --password uptrace -q "$1"
}

clickhouse_table_exists() {
    local table="$1"
    [ "$(clickhouse_query "exists table system.${table}")" = "1" ]
}

clickhouse_system_log_ttl_days() {
    local table="$1"
    if [[ "$table" =~ ^(.+)_[0-9]+$ ]]; then
        table="${BASH_REMATCH[1]}"
    fi

    case "$table" in
        query_log|query_thread_log|query_views_log|part_log)
            echo "$CLICKHOUSE_QUERY_LOG_RETENTION_DAYS"
            ;;
        *)
            echo "$CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS"
            ;;
    esac
}

clickhouse_system_log_tables() {
    clickhouse_query "
        select name
        from system.tables
        where database = 'system'
          and (
              name in (
                  'trace_log',
                  'text_log',
                  'metric_log',
                  'asynchronous_metric_log',
                  'processors_profile_log',
                  'query_log',
                  'query_thread_log',
                  'query_views_log',
                  'part_log'
              )
              or match(name, '^(trace_log|text_log|metric_log|asynchronous_metric_log|processors_profile_log|query_log|query_thread_log|query_views_log|part_log)_[0-9]+$')
          )
        order by name
        format TSV"
}

clickhouse_large_system_log_tables() {
    clickhouse_query "
        select table, formatReadableSize(sum(bytes_on_disk)) as size
        from system.parts
        where database = 'system'
          and active
          and (
              table in (
                  'trace_log',
                  'text_log',
                  'metric_log',
                  'asynchronous_metric_log',
                  'processors_profile_log',
                  'query_log',
                  'query_thread_log',
                  'query_views_log',
                  'part_log'
              )
              or match(table, '^(trace_log|text_log|metric_log|asynchronous_metric_log|processors_profile_log|query_log|query_thread_log|query_views_log|part_log)_[0-9]+$')
          )
        group by table
        having sum(bytes_on_disk) > 1073741824
        order by sum(bytes_on_disk) desc
        format TSV"
}

clickhouse_query "SYSTEM FLUSH LOGS" || echo "⚠️  Could not flush ClickHouse system logs before cleanup"

mapfile -t CLICKHOUSE_SYSTEM_LOG_TABLES < <(clickhouse_system_log_tables)
echo "Discovered ${#CLICKHOUSE_SYSTEM_LOG_TABLES[@]} ClickHouse system log table(s)"
echo "CLICKHOUSE_TRUNCATE_SYSTEM_LOGS=${CLICKHOUSE_TRUNCATE_SYSTEM_LOGS}"

for table in "${CLICKHOUSE_SYSTEM_LOG_TABLES[@]}"; do
    [ -n "$table" ] || continue

    if ! clickhouse_table_exists "$table"; then
        echo "Skipping missing ClickHouse system table: system.${table}"
        continue
    fi

    ttl_days="$(clickhouse_system_log_ttl_days "$table")"
    if clickhouse_query "ALTER TABLE system.${table} MODIFY TTL event_date + INTERVAL ${ttl_days} DAY DELETE"; then
        echo "Set TTL on system.${table}: ${ttl_days} day(s)"
    else
        echo "⚠️  Could not set TTL on system.${table}; continuing"
    fi

    if is_truthy "$CLICKHOUSE_TRUNCATE_SYSTEM_LOGS"; then
        if clickhouse_query "TRUNCATE TABLE system.${table}"; then
            echo "Truncated system.${table}"
        else
            echo "⚠️  Could not truncate system.${table}; continuing"
        fi
    fi
done

if is_truthy "$CLICKHOUSE_TRUNCATE_SYSTEM_LOGS"; then
    LARGE_SYSTEM_LOG_TABLES="$(clickhouse_large_system_log_tables)"
    if [ -n "$LARGE_SYSTEM_LOG_TABLES" ]; then
        echo "Error: large ClickHouse system log tables remain after cleanup:"
        echo "$LARGE_SYSTEM_LOG_TABLES"
        exit 1
    fi
fi

docker compose exec -T clickhouse clickhouse-client -u uptrace --password uptrace -q "
    select database, table, active, formatReadableSize(sum(bytes_on_disk)) as size
    from system.parts
    group by database, table, active
    order by sum(bytes_on_disk) desc
    limit 20;"

# ── Retention control ────────────────────────────────────────────────────────

print_header "CONFIGURING RETENTION"

# Uptrace 2.x stores telemetry retention as project-level TTLs in PostgreSQL.
# The older top-level ch.retention/ch_schema TTL config is not compatible with
# the generated v2 config shape used by uptrace/uptrace:2.0.2.
RETENTION_UPDATED=0
for attempt in {1..30}; do
    RETENTION_UPDATED=$(docker compose exec -T postgres psql -U uptrace -d uptrace -tAc "
        with updated as (
            update projects
            set spans_ttl = ${UPTRACE_RETENTION_NS},
                logs_ttl = ${UPTRACE_RETENTION_NS},
                events_ttl = ${UPTRACE_RETENTION_NS},
                metrics_ttl = ${UPTRACE_METRICS_RETENTION_NS},
                updated_at = now()
            where _key = 'geoconflict_project' or name = 'geoconflict'
            returning 1
        )
        select count(*) from updated;")

    if [ "$RETENTION_UPDATED" -gt 0 ]; then
        echo "✅ Retention updated for ${RETENTION_UPDATED} project(s)"
        break
    fi

    echo "Retention target project not found yet (attempt ${attempt}/30); waiting for Uptrace seed data..."
    sleep 2
done

if [ "$RETENTION_UPDATED" -eq 0 ]; then
    echo "Error: retention was not applied because the geoconflict project row was not found."
    exit 1
fi

docker compose exec -T postgres psql -U uptrace -d uptrace \
    -c "select id, name,
               spans_ttl / 86400000000000.0 as spans_days,
               logs_ttl / 86400000000000.0 as logs_days,
               events_ttl / 86400000000000.0 as events_days,
               metrics_ttl / 86400000000000.0 as metrics_days
        from projects
        order by id;"

docker compose exec -T uptrace /uptrace --config=/etc/uptrace/config.yml retention check || \
    echo "⚠️  Retention check failed; cron will retry daily. Check Uptrace logs if this persists."

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

    # Source map uploads (POST /api/v1/sourcemaps → Uptrace via location /) can be
    # several MB; raise from nginx's 1 MB default to Uptrace's 64 MB per-upload limit.
    client_max_body_size 64m;

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

# ClickHouse local tar backups are intentionally disabled.
# They filled the 59 GB telemetry VPS disk and are not crash-consistent.

# Prune old PostgreSQL backups — keep last 14 days.
# This preserves two weekly metadata restore points while keeping all local
# backup storage conservative on the 59 GB telemetry VPS.
0 5 * * 0 root find $BACKUP_DIR -name "pg-*.sql" -mtime +14 -delete

# Disk usage log warning — daily at 8:00am. Writes to /var/log/disk-warnings.log when usage > 60%.
# Local log only (no email/webhook) — check the log manually or configure a notification if needed.
0 8 * * * root USAGE=\$(df / | awk 'NR==2 {print \$5}' | tr -d '%'); if [ "\$USAGE" -gt 60 ]; then echo "\$(date) -- disk usage \${USAGE}%" >> /var/log/disk-warnings.log; fi

# Enforce project-level telemetry TTL daily. Uptrace 2.x stores TTLs in Postgres
# as spans_ttl/logs_ttl/events_ttl/metrics_ttl and applies them via this command.
15 4 * * * root cd $UPTRACE_DIR && docker compose exec -T uptrace /uptrace --config=/etc/uptrace/config.yml retention check >> /var/log/uptrace-retention.log 2>&1

# Certbot renewal — twice daily (Let's Encrypt recommendation)
0 0,12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx" >> /var/log/certbot-renew.log 2>&1
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
echo "  Login: admin@geoconflict.ru / <configured UPTRACE_ADMIN_PASSWORD>"
echo ""
echo "Game server env vars — add to .env.prod:"
if [ -n "$TELEMETRY_DOMAIN" ]; then
    OTLP_ENDPOINT="https://${TELEMETRY_DOMAIN}"
else
    OTLP_ENDPOINT="http://${SERVER_IP}:4318"
fi
echo "  OTEL_EXPORTER_OTLP_ENDPOINT=${OTLP_ENDPOINT}"
echo ""
echo "Tokens:"
echo "  Values are managed by .env.telemetry.secret / the deployment environment."
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
