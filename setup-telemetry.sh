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
#   TELEMETRY_ALERT_PROBE_URL — full lowercase alert-webhook URL on the profile box; blank
#                               leaves the alert-path liveness probe off (task 0284)
#   PROFILE_ALERT_WEBHOOK_TOKEN — the SAME shared secret the profile box holds. 🚨 NEVER
#                               generated here: a box-minted token fails every probe and
#                               makes the profile box page daily (0182/0195's defect).
#                               ⚠️ No " and no \ — it is embedded in a JSON body, and this
#                               script REFUSES to deploy a token containing either
#   Both are persist-or-reuse: blank on a redeploy REUSES what is already on the box.
#
# What this script does:
#   1. Ensures a swapfile exists (low-RAM VPS OOM cushion)
#   2. Installs Docker + Docker Compose plugin
#   3. Writes docker-compose.yml, uptrace.yml, otel-collector.yaml to /opt/uptrace
#   4. Starts all five containers (uptrace, clickhouse, postgres, redis, otelcol)
#   5. Creates a systemd service for auto-start on reboot
#   6. Adds weekly backup cron jobs for PostgreSQL
#   7. Adds daily disk usage monitoring
#   8. Writes the alert-path liveness probe + its hourly cron (task 0284)
#   9. Prints connection info and DSN for the game server

set -e

# ── Unattended package operations (task 0286) ─────────────────────────────────
# A deploy runs with no terminal to answer debconf. Without this, `apt-get upgrade` stopped
# three times on keyboard-configuration/console-setup prompts (observed 2026-09-18) — and
# unattended it would WAIT FOREVER holding the apt lock, with set -e never firing.
# EXPORTED, not prefixed per call, deliberately: get.docker.com's installer below runs
# apt-get itself, which only an exported variable reaches — and any apt line added later
# inherits it.
# ⚠️ NOT a universal muzzle: it suppresses the PROMPT and takes debconf's stored (or default)
# answer. dpkg's own conffile prompt is NOT governed by it (see 0286's worklog).
export DEBIAN_FRONTEND=noninteractive

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

# Task 0284, review R2 (owner ruling 2026-09-18: ENFORCE, do not leave it documented).
# alert-probe.sh embeds this token in a JSON body, so a " or a \ in it emits INVALID JSON:
# the relay answers `malformed`, no marker is ever written, and the profile box pages EVERY
# DAY while the relay's own secret is perfectly fine. Checked here, at the top, BEFORE
# anything on this box is touched — the failure has to surface at deploy time instead of as
# a mystery daily page weeks later.
# Both sources are checked: the value this deploy supplies, and an already-persisted one (a
# box provisioned before this guard existed can be holding a bad token in its persist file).
# ⛔ The message names the variable only — never the value.
assert_probe_token_json_safe() {  # $1 value   $2 where it came from
    case "$1" in
        *'"'*|*'\'*)
            echo "Error: PROFILE_ALERT_WEBHOOK_TOKEN ($2) contains a double quote or a backslash."
            echo "       The alert-path probe embeds it in a JSON body, so those characters produce"
            echo "       invalid JSON: every probe would be dropped as malformed, no marker would ever"
            echo "       be written, and the profile box would page every day while alerting itself is"
            echo "       fine. Use hex or plain alphanumerics only, and keep it identical to the profile"
            echo "       box's PROFILE_ALERT_WEBHOOK_TOKEN. Aborting before anything is changed."
            exit 1
            ;;
    esac
}
if [ -n "${PROFILE_ALERT_WEBHOOK_TOKEN:-}" ]; then
    assert_probe_token_json_safe "$PROFILE_ALERT_WEBHOOK_TOKEN" "supplied by this deploy"
elif [ -s "$UPTRACE_DIR/.alert_probe_token" ]; then
    assert_probe_token_json_safe "$(cat "$UPTRACE_DIR/.alert_probe_token")" "persisted on this box"
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

# ── Role marker (X1) ──────────────────────────────────────────────────────────
# Records that this box is managed as the TELEMETRY backend. build-deploy-telemetry.sh's
# read-only preflight reads it before any mutation to refuse a mistyped/stale but reachable
# host. Written before the first mutation so a retry after a partial provision is still
# recognised as our box. Idempotent. (No deploy lock here — that is profile-only scope.)
echo telemetry > /etc/geoconflict-deploy-role
chmod 644 /etc/geoconflict-deploy-role

# ── System update ─────────────────────────────────────────────────────────────

print_header "UPDATING SYSTEM"
apt-get update -y && apt-get upgrade -y

# ── Swap ────────────────────────────────────────────────────────────────────────
# The telemetry VPS has limited RAM (~3.8 GB) and originally shipped with NO swap.
# ClickHouse memory spikes — notably background merges of internal diagnostics —
# repeatedly tripped the kernel OOM-killer and eventually froze the entire host
# (unreachable over both network and the provider console). A swapfile gives the
# kernel a cushion so a transient spike is paged out instead of wedging the box.
# Idempotent: skips creation if a /swapfile is already active. NOTE: this matches
# on presence only — it does NOT resize. Changing TELEMETRY_SWAP_SIZE_GB on a box
# that already has a /swapfile is a no-op; to resize, manually `swapoff /swapfile`
# and delete it first, then re-run.
print_header "CONFIGURING SWAP"

# Build /swapfile with one allocation method, then mkswap + swapon. Returns
# non-zero if any step fails — including the case where fallocate "succeeds" but
# produces a holey file that swapon rejects (e.g. btrfs/CoW filesystems).
try_enable_swapfile() {
    local method="$1"   # "fallocate" or "dd"
    rm -f /swapfile
    if [ "$method" = "fallocate" ]; then
        fallocate -l "${TELEMETRY_SWAP_SIZE_GB}G" /swapfile || return 1
    else
        dd if=/dev/zero of=/swapfile bs=1M count=$((TELEMETRY_SWAP_SIZE_GB * 1024)) status=none || return 1
    fi
    chmod 600 /swapfile || return 1
    mkswap /swapfile >/dev/null 2>&1 || return 1
    swapon /swapfile 2>/dev/null || return 1
    return 0
}

if [ "$TELEMETRY_SWAP_SIZE_GB" -eq 0 ]; then
    echo "TELEMETRY_SWAP_SIZE_GB=0; skipping swap management"
elif swapon --show=NAME --noheadings 2>/dev/null | grep -qx '/swapfile'; then
    echo "Swap already active; leaving it in place:"
    swapon --show
else
    echo "Creating ${TELEMETRY_SWAP_SIZE_GB}G swapfile at /swapfile..."
    # fallocate is fast and fine on ext4; on CoW filesystems it can yield a holey
    # file that swapon rejects, so fall back to dd (writes real blocks). Each
    # step is guarded so a failure does not trip set -e and abort the whole deploy.
    if try_enable_swapfile fallocate; then
        grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        swapon --show
    elif echo "fallocate path failed (holey/unsupported file?); retrying with dd..." && try_enable_swapfile dd; then
        grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        swapon --show
    else
        rm -f /swapfile
        echo "⚠️  ⚠️  ⚠️  SWAP SETUP FAILED — continuing WITHOUT swap."
        echo "⚠️  This box is at OOM risk under memory pressure (the 2026-06 freeze cause)."
        echo "⚠️  Investigate manually: check disk space and filesystem support for swapfiles."
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

# NOTE (ClickHouse-upgrade fragility): this cleanup reclaims disabled-table data
# (e.g. metric_log set to remove="1" above) only while ClickHouse still ATTACHES
# the on-disk table so it appears in system.tables / `exists table`. Today (25.8.x)
# a disabled system-log table stays attached and truncatable. If a future
# ClickHouse instead detaches disabled tables, discovery below silently skips them
# AND the >1 GB safety net further down also misses them (system.parts only lists
# attached tables) — leaving orphaned on-disk data. Re-verify the reclaim after any
# ClickHouse major upgrade.
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
    #
    # RENEWAL CONTRACT (for the certbot-renew cron below — mirrors setup-profile.sh):
    # certbot persists `authenticator = standalone`, which binds port 80 for the
    # HTTP-01 challenge. nginx permanently owns port 80 below, so `certbot renew`
    # MUST free it first. The renew cron therefore needs a PRE-hook that stops
    # nginx and a POST-hook that restarts it, e.g.:
    #   certbot renew --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"
    # A reload-only post-hook (the seed form, 0257) will NOT renew and the cert will
    # expire. Validate with `certbot renew --dry-run` while nginx is running.
    systemctl stop nginx || true
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --keep-until-expiring \
        -m ruflashist@gmail.com \
        -d "$TELEMETRY_DOMAIN"

    # The certbot package ships certbot.timer, a SECOND renewal path with no nginx hooks: behind
    # nginx its standalone bind on port 80 can only fail (noise in letsencrypt.log at every due
    # attempt). Same shape as the profile box (0219 review R3 ruling): the hooked cron below is
    # the ONLY renewer; disable the timer. Idempotent; never fails the deploy.
    systemctl disable --now certbot.timer >/dev/null 2>&1 || true

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

    # OTLP HTTP — /v1/traces, /v1/logs, /v1/metrics.
    # No client_max_body_size here, so this anonymous ingestion path keeps nginx's
    # 1 MB default. The larger limit is scoped to location / (uploads) below.
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
        # Source map uploads (POST /api/v1/sourcemaps → Uptrace) can be several MB;
        # raise from nginx's 1 MB default to Uptrace's 64 MB per-upload limit. Scoped
        # here (not server-wide) so the anonymous /v1/ OTLP path keeps the tight default.
        client_max_body_size 64m;
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

# ── Alert-path liveness probe (task 0284) ─────────────────────────────────────
#
# The profile box's alert webhook is mounted behind an nginx IP allowlist, and that
# allowlist answers 403 on a source-IP miss. A 403 makes the monitoring stack mark its
# notification channel DISABLED — permanently, silently, with no retry — so the day THIS
# box's egress address changes, the first real alert kills alerting and nothing says so.
#
# The guard is a probe FROM THIS BOX: an hourly cron POSTs to the same URL, through the
# same allowlist, with the same shared secret a real alert carries. The relay stamps a
# marker file and sends NOTHING; the profile box's daily checks.sh fails to its EXTERNAL
# dead-man's switch when that marker goes stale — a path that touches neither this stack
# nor Telegram, which is why it catches what everything else here cannot.
#
# ⚠️ The origin is the point. A probe from anywhere else proves nothing, because it is
# this box's address that the allowlist either holds or does not.
# 🚩 One assumption, stated not buried: the monitoring stack's own egress is SNAT'd to
# this host's primary address, so a host-run curl leaves from the same address. True for
# a single-public-address box with default Docker networking — this box's shape — but NOT
# proved. The task's drill is what verifies it: removing this address from the profile
# box's allowlist must fail the probe AND disable the channel. If the probe fails while
# the channel survives, the two egresses differ and this guard is not guarding.

print_header "CONFIGURING THE ALERT-PATH LIVENESS PROBE"

# Persist-or-reuse, mirroring setup-profile.sh's persist_or_reuse_secret:
#   env value set → wins AND is written through (so rotating just works)
#   env empty, file present → REUSE, and say so by name
#   neither → EMPTY, said so; the probe stays off
# 🚨 There is deliberately NO generate mode. A box-minted token is the PROFILE_INTERNAL_TOKEN
# trap (0182) and 0195's blank-overwrite defect at once: a secret only this box knows is a
# secret the relay does not, so every probe fails its secret check and the profile box pages
# EVERY DAY about a guard that was never wired. To clear either value, rm its persist file
# here and redeploy.
persist_or_reuse_probe_value() {  # $1 variable name   $2 persist file (root-only, 0600)
    local name="$1" file="$2" value
    value="${!name:-}"
    if [ -n "$value" ]; then
        ( umask 077; printf '%s' "$value" > "$file" )
        chmod 600 "$file"
        echo "Using $name from environment (persisted to $file)"
    elif [ -s "$file" ]; then
        value=$(cat "$file") || {
            echo "Error: $name: persist file $file exists but could not be read. Refusing to"
            echo "continue with an EMPTY value — fix the file, or rm it to clear the value. Aborting (fail closed)."
            exit 1
        }
        printf -v "$name" '%s' "$value"
        echo "⚠️  Reusing persisted $name from $file — the deploy supplied no value"
    else
        echo "$name: not supplied and nothing persisted — written EMPTY (the alert-path probe stays OFF)"
    fi
    return 0
}
persist_or_reuse_probe_value TELEMETRY_ALERT_PROBE_URL   "$UPTRACE_DIR/.alert_probe_url"
persist_or_reuse_probe_value PROFILE_ALERT_WEBHOOK_TOKEN "$UPTRACE_DIR/.alert_probe_token"

# 0600: the URL is a HOST and the token is a shared secret. %q so a value with spaces or
# shell metacharacters survives being sourced.
( umask 077
  {
    printf 'ALERT_PROBE_URL=%q\n'    "${TELEMETRY_ALERT_PROBE_URL:-}"
    printf 'ALERT_PROBE_SECRET=%q\n' "${PROFILE_ALERT_WEBHOOK_TOKEN:-}"
  } > "$UPTRACE_DIR/alert-probe.env"
)
chmod 600 "$UPTRACE_DIR/alert-probe.env"
echo "Written: alert-probe.env (0600)"

# Quoted heredoc: nothing in the probe script is expanded at write time.
cat > "$UPTRACE_DIR/alert-probe.sh" << 'PROBEEOF'
#!/usr/bin/env bash
#
# alert-probe.sh — written by setup-telemetry.sh (task 0284). Do NOT edit in place;
# change setup-telemetry.sh in the repo and redeploy.
#
# POSTs a liveness probe to the profile box's alert webhook — the same URL, the same nginx
# IP allowlist and the same shared secret a REAL alert uses — so the profile box's daily
# checks can tell whether this box can still reach that route at all. A 403 from that
# allowlist permanently disables the notification channel, and nothing else would notice.
#
# The relay answers 2xx and SENDS NOTHING for a probe: this never produces a Telegram
# message, and it never touches the notification channel's state.
#
# ⛔ Never add `set -x` — it would echo the shared secret into the log.
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="/var/log/uptrace-alert-probe.log"
# ONE line, TRUNCATING (>, not >>). This box has filled its disk before, and nothing reads
# the history anyway — the marker on the profile box is the signal.
say() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) alert-probe: $*" > "$LOG"; }

# shellcheck disable=SC1091
. "$DIR/alert-probe.env"

if [ -z "${ALERT_PROBE_URL:-}" ] || [ -z "${ALERT_PROBE_SECRET:-}" ]; then
    say "NOT CONFIGURED — ALERT_PROBE_URL and/or ALERT_PROBE_SECRET are empty in alert-probe.env. No probe was sent, so the profile box's daily check will page."
    exit 1
fi

# The body goes on STDIN, never in argv: --data '{"secret":…}' would expose the secret in
# ps / /proc/<pid>/cmdline for the life of the call.
# ⚠️ The secret is embedded in JSON, so it must contain no " and no \ (hex or alphanumeric
# only). That is ENFORCED, not merely documented: setup-telemetry.sh refuses to deploy a token
# containing either character (review R2, owner ruling 2026-09-18).
# ⛔ curl's stderr is discarded on purpose (same rule as profile-checks.sh): its error text
# can carry the URL, which is a host.
probe_rc=0
probe_body="$(curl -fsS -m 10 --retry 2 -X POST \
     -H 'Content-Type: application/json' --data-binary @- "$ALERT_PROBE_URL" \
     2>/dev/null <<JSON
{"payload":{"secret":"${ALERT_PROBE_SECRET}","probe":"liveness"}}
JSON
)" || probe_rc=$?

if [ "$probe_rc" -ne 0 ]; then
    say "FAILED to reach the alert webhook (curl exit ${probe_rc}). Check the profile box's PROFILE_INTERNAL_ALLOW_IPS against this box's egress address, then re-enable the notification channel by hand — fixing the address does NOT undo a disable."
    exit 1
fi

# 🚨 A 2xx is NOT enough — which is exactly why the relay answers a PROBE with its own
# distinct status string. EVERY dropped call is a deliberate 200 as well (a wrong secret, a
# malformed body: a 4xx there would permanently disable the notification channel), so an exit
# code alone cannot tell "the marker was written" from "the call was thrown away". Only the
# probe's own reply may exit 0.
# Matched loosely — no quoting or spacing assumptions about the JSON, so a formatting change
# upstream cannot turn this into a false failure. The string itself is the contract, and the
# hardening harness asserts it equals ALERT_PROBE_RESPONSE_STATUS in AlertRelay.ts.
# ⛔ The response body is never echoed into this log: it can in principle come from something
# other than the relay, and the same rule that discards curl's stderr applies to it.
case "$probe_body" in
    *probe-accepted*)
        say "accepted — the relay recorded the probe and wrote its marker"
        exit 0
        ;;
esac
say "REACHED the alert webhook, but it did NOT record a probe: the reply was a 2xx WITHOUT the probe status, which is the relay's deliberate 200 on a DROPPED call. The likeliest cause is that ALERT_PROBE_SECRET here does not match the profile box's PROFILE_ALERT_WEBHOOK_TOKEN. No marker was written, so the profile box's daily check will page."
exit 1
PROBEEOF
chmod 700 "$UPTRACE_DIR/alert-probe.sh"
echo "Written: alert-probe.sh (0700)"

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

# Certbot renewal — twice daily (Let's Encrypt recommendation). FIX vs the seed's reload-only
# post-hook (0257): the cert is issued with the --standalone authenticator, which binds port 80
# for the HTTP-01 challenge — but nginx permanently owns port 80, so a reload-only hook could
# NEVER renew and the cert silently expired. Free port 80 around renewal, exactly as the
# profile box does: stop nginx (pre-hook), renew, start nginx (post-hook).
0 0,12 * * * root certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx" >> /var/log/certbot-renew.log 2>&1

# Alert-path liveness probe (task 0284) — hourly at :17, deliberately off the top of the
# hour so it does not pile onto the jobs above. It writes a ONE-LINE truncating log of its
# own; the real signal is the marker it makes the profile box stamp, which that box's daily
# checks.sh reads. Output is discarded here because the script's log and that marker are
# the record — and because curl's error text can carry a host.
17 * * * * root $UPTRACE_DIR/alert-probe.sh >/dev/null 2>&1
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
# Task 0284. ⛔ Never print the URL — it is a host.
if [ -n "${TELEMETRY_ALERT_PROBE_URL:-}" ] && [ -n "${PROFILE_ALERT_WEBHOOK_TOKEN:-}" ]; then
    echo "Alert-path probe: configured (hourly cron → $UPTRACE_DIR/alert-probe.sh)."
    echo "   Run it once by hand now (exit 0 = accepted), then confirm the profile box's"
    echo "   checks.sh reports 'alert-path-probe … OK' BEFORE the next 08:00 UTC run —"
    echo "   otherwise that run pages about a marker that has never been written."
else
    echo "⚠️  Alert-path probe: NOT configured — TELEMETRY_ALERT_PROBE_URL and/or"
    echo "    PROFILE_ALERT_WEBHOOK_TOKEN are empty. The profile box's daily checks will FAIL"
    echo "    'alert-path-probe' every run, and the 403 channel-disable trap is unguarded."
    echo "    Set both in .env.telemetry.secret and redeploy."
fi
echo ""
echo "Change the admin password immediately after first login."
echo "======================================================"
