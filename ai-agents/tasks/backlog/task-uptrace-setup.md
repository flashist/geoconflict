# Task — Uptrace Self-Hosted Setup on Dedicated Internal Server

## Priority
Immediate — blocks Sprint 3 server monitoring work (5d-A and 5d-B). Uptrace replaces Sentry as the error tracking and observability backend for both client and server.

## Context

Sentry account is blocked. Uptrace is the chosen replacement — an open-source, OpenTelemetry-native APM that handles distributed traces, metrics, logs, and errors in a single dashboard. It ingests data via OTLP (the same protocol the server already uses), meaning the existing OTEL instrumentation connects to Uptrace with a config change rather than a rewrite.

Uptrace runs on a **dedicated second VPS** on reg.ru — separate from the game server. This server will also host future internal tooling (admin panel, name review process, etc.).

This task covers infrastructure setup only. Connecting the game server's OTEL instrumentation and client-side error tracking to Uptrace is covered in Tasks 5d-A and 5d-B respectively.

---

## Server Sizing Recommendation

For Uptrace at Geoconflict's current scale, a modest second VPS is sufficient:

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 2 vCPU | 2–4 vCPU |
| RAM | 4 GB | 4–8 GB |
| Disk | 40 GB SSD | 60 GB SSD |

ClickHouse is the primary RAM consumer. 4GB is workable with memory limits set in config. 8GB gives comfortable headroom for future services on the same server.

**Region:** choose the same Moscow datacenter as the game server to minimise latency on OTEL data sent between servers.

---

## Part A — Network Connection Between Servers

**This is the first thing to resolve before any software is installed.**

The game server needs to reach the Uptrace OTEL ingestion ports (4317 and 4318) on the second server. How this works depends on whether reg.ru supports private networking.

### Step 1 — Check reg.ru control panel for private networking

Log into the reg.ru личный кабинет and check the network settings for your VPS instances. Look for an option called "приватная сеть" or "локальная сеть между серверами".

---

### Option A — If reg.ru supports private networking (preferred)

Enable private networking for both VPS instances from the control panel. Each server will receive a private IP in the `10.x.x.x` range.

Once enabled:
- The game server sends OTEL data to `http://10.x.x.x:4317` (Uptrace private IP)
- Ports 4317/4318 on the Uptrace server do NOT need to be opened in the public firewall
- The Uptrace dashboard (port 14318) remains accessible only via SSH tunnel

---

### Option B — If reg.ru does NOT support private networking: firewall rules on public IPs

Open ports 4317 and 4318 on the Uptrace server's firewall, restricted to the game server's public IP only:

```bash
sudo ufw allow from GAME_SERVER_PUBLIC_IP to any port 4317
sudo ufw allow from GAME_SERVER_PUBLIC_IP to any port 4318
sudo ufw deny 4317
sudo ufw deny 4318
sudo ufw deny 14318
```

---

### Option C — WireGuard VPN (if private networking is unavailable and a clean long-term solution is preferred)

WireGuard creates an encrypted private tunnel between the two servers regardless of provider support. Recommended if future internal services (admin panel, name review) will also need to communicate between servers — avoids opening new firewall ports per service.

**On the Uptrace server:**
```bash
sudo apt install wireguard
wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key

cat > /etc/wireguard/wg0.conf << EOF
[Interface]
PrivateKey = $(cat /etc/wireguard/private.key)
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = GAME_SERVER_PUBLIC_KEY
AllowedIPs = 10.0.0.2/32
EOF

sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

**On the game server:**
```bash
wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key

cat > /etc/wireguard/wg0.conf << EOF
[Interface]
PrivateKey = $(cat /etc/wireguard/private.key)
Address = 10.0.0.2/24

[Peer]
PublicKey = UPTRACE_SERVER_PUBLIC_KEY
Endpoint = UPTRACE_SERVER_PUBLIC_IP:51820
AllowedIPs = 10.0.0.1/32
PersistentKeepalive = 25
EOF

sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

Once running, the game server reaches Uptrace at `http://10.0.0.1:4317`. Only port 51820 UDP needs to be open on the Uptrace server's public firewall.

---

## Part B — Install Docker and Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt-get install docker-compose-plugin
docker --version
docker compose version
```

---

## Part C — Deploy Uptrace via Docker Compose

Copy `scripts/setup-uptrace-server.sh` from the repo to the server and run it:

```bash
bash setup-uptrace-server.sh
```

This script creates `/opt/uptrace`, downloads `docker-compose.yml` from the official Uptrace repo, writes the correct `uptrace.yml` with verified v2 field names, and starts all services.

---

## Part D — Access the Dashboard

Access via SSH tunnel only — never expose port 14318 publicly:

```bash
ssh -L 14318:localhost:14318 user@UPTRACE_SERVER_PUBLIC_IP
```

Open `http://localhost:14318` in your browser. Change the default admin password immediately.

---

## Part E — Verify OTEL Ingestion

```bash
docker compose exec uptrace wget -O- \
  'http://localhost:14318/api/v1/test' \
  --header='uptrace-dsn: http://YOUR_PROJECT_TOKEN@localhost:14318/1'
```

A test trace should appear in the dashboard within a few seconds.

---

## Part F — Record the DSN

| Connection method | DSN |
|---|---|
| reg.ru private network | `http://TOKEN@10.x.x.x:14318/1` |
| Firewall rules | `http://TOKEN@UPTRACE_PUBLIC_IP:14318/1` |
| WireGuard | `http://TOKEN@10.0.0.1:14318/1` |

OTLP endpoints (used by the OTEL SDK, not the dashboard):
- gRPC: `[uptrace-ip]:4317`
- HTTP: `[uptrace-ip]:4318`

Record all three values — required for Tasks 5d-A and 5d-B.

---

## Part G — Auto-start on Reboot

```bash
sudo tee /etc/systemd/system/uptrace.service > /dev/null <<EOF
[Unit]
Description=Uptrace Observability
Requires=docker.service
After=docker.service

[Service]
WorkingDirectory=/opt/uptrace
ExecStart=/usr/bin/docker compose up
ExecStop=/usr/bin/docker compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable uptrace
```

Test with a reboot, then verify `docker compose ps` shows all services running.

---

## Part H — Data Persistence & Backup Strategy

### Understanding what needs to be protected

Uptrace stores two categories of data in separate databases:

**PostgreSQL** — alert rules, project configuration, user accounts, metric definitions. Small (a few MB). If lost, the entire Uptrace setup must be manually reconfigured from scratch.

**ClickHouse** — all telemetry: error traces, stack traces, spans, metrics, logs. This is the data you look at every day. Critically, **error history has ongoing diagnostic value** — comparing whether a specific error existed before or after a deploy requires this historical data. If lost, you cannot answer "was this error present in the previous release?" until enough new data accumulates.

Both databases must be backed up. Docker volumes alone are not a backup — they live on the host and are permanently lost if the VPS is ever rebuilt or migrated.

### Automated weekly backups

```bash
# Edit crontab: crontab -e
# Run every Sunday at 3am

# PostgreSQL backup
0 3 * * 0 cd /opt/uptrace && docker compose exec -T postgres pg_dump -U uptrace uptrace > /opt/uptrace/backups/pg-$(date +\%Y\%m\%d).sql

# ClickHouse backup
30 3 * * 0 cd /opt/uptrace && docker compose exec -T clickhouse clickhouse-backup create uptrace-$(date +\%Y\%m\%d)

# Retain only last 4 weekly backups
0 5 * * 0 find /opt/uptrace/backups -name "pg-*.sql" -mtime +28 -delete
```

**Note:** the `clickhouse-backup` tool must be installed inside the ClickHouse container. Add it to the ClickHouse service in `docker-compose.yml`:
```yaml
clickhouse:
  image: clickhouse/clickhouse-server:latest
  volumes:
    - clickhouse_data:/var/lib/clickhouse
    - ./clickhouse-backup.yml:/etc/clickhouse-backup/config.yml
```

Alternatively, for simplicity at small scale, a filesystem-level backup of the ClickHouse Docker volume is sufficient:
```bash
# Stop ClickHouse briefly, snapshot the volume, restart
docker compose stop clickhouse
tar czf /opt/uptrace/backups/clickhouse-$(date +%Y%m%d).tar.gz \
  /var/lib/docker/volumes/uptrace_clickhouse_data
docker compose start clickhouse
```

### Safe upgrade procedure

**Before every Uptrace version update, without exception:**

```bash
# Step 1 — Back up both databases
cd /opt/uptrace
docker compose exec -T postgres pg_dump -U uptrace uptrace > /opt/uptrace/backups/pg-pre-upgrade-$(date +%Y%m%d).sql
docker compose stop clickhouse
tar czf /opt/uptrace/backups/clickhouse-pre-upgrade-$(date +%Y%m%d).tar.gz \
  /var/lib/docker/volumes/uptrace_clickhouse_data
docker compose start clickhouse

# Step 2 — Update the image tag in docker-compose.yml
# Change: image: uptrace/uptrace:X.Y.Z
# To:     image: uptrace/uptrace:X.Y+1.Z  (one minor version at a time only)

# Step 3 — Bring down WITHOUT volumes flag
docker compose down          # ✅ correct — preserves data volumes
# NEVER run:
# docker compose down --volumes   # ❌ permanently destroys all data

# Step 4 — Start with new version
docker compose up -d

# Step 5 — Verify
docker compose ps
docker compose logs uptrace  # check for migration errors
```

**One minor version at a time:** Uptrace only supports upgrading one minor version at a time (1.1 → 1.2, not 1.1 → 1.3). If multiple versions behind, repeat the procedure for each version increment.

### Restore procedure (if needed)

```bash
# Restore PostgreSQL
docker compose exec -T postgres psql -U uptrace uptrace < /opt/uptrace/backups/pg-YYYYMMDD.sql

# Restore ClickHouse (requires services to be down)
docker compose down
tar xzf /opt/uptrace/backups/clickhouse-YYYYMMDD.tar.gz -C /
docker compose up -d
```

---

## Verification Checklist

- [ ] Second VPS provisioned on reg.ru in same region as game server
- [ ] Network connection method confirmed (Part A) — private network, firewall rules, or WireGuard
- [ ] Connectivity confirmed — game server can reach Uptrace OTEL port (`curl http://[uptrace-ip]:4318`)
- [ ] All four Docker containers running (`docker compose ps` shows all `Up`)
- [ ] Uptrace dashboard accessible via SSH tunnel
- [ ] Default admin password changed
- [ ] Test trace visible in dashboard (Part E)
- [ ] DSN recorded and shared — required for Tasks 5d-A and 5d-B
- [ ] Uptrace systemd service enabled and survives reboot
- [ ] Weekly backup cron jobs in place for both PostgreSQL and ClickHouse
- [ ] Manual backup tested — confirm restore procedure works before relying on it
- [ ] Ports 4317, 4318, 14318 NOT accessible from public internet

## Notes

- **Production data only — no dev telemetry:** Uptrace must only receive data from the production game server. The OTEL initialisation on the game server (covered in Task 5d-A) must be gated on an environment variable — if the variable is absent, OTEL is silently disabled. The prod server has the variable set; the dev server does not. The same applies to client-side error tracking (Task 5d-B). Under no circumstances should the Uptrace DSN or OTLP endpoint be hardcoded in the codebase — it must always come from environment config so dev and prod behaviour diverge automatically without code changes.
- **Future services:** WireGuard (Option C) is recommended if an admin panel or name review tool will be added to this server — it gives all internal services a shared private network without opening additional public firewall ports per service.
- **Disk monitoring:** at Geoconflict's current scale, total disk usage (OS + Docker images + ClickHouse data + backups) is estimated at 20–25 GB, leaving comfortable headroom on a 60 GB disk. However, set up an automated disk usage alert so growth never becomes a surprise. Add the following cron job to send an email warning when disk usage exceeds 70%:

  ```bash
  # crontab -e — runs daily at 8am
  0 8 * * * USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%'); if [ "$USAGE" -gt 70 ]; then echo "Uptrace server disk usage is ${USAGE}% — consider pruning backups or upgrading disk" | mail -s "Disk Warning: Uptrace Server" your@email.com; fi
  ```

  If `mail` is not configured on the server, an alternative is to write to a log file and check it periodically:
  ```bash
  0 8 * * * USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%'); if [ "$USAGE" -gt 70 ]; then echo "$(date) — disk usage ${USAGE}%" >> /var/log/disk-warnings.log; fi
  ```

  Check `/var/log/disk-warnings.log` if the server ever feels slow or Uptrace starts behaving unexpectedly — a full disk is a common silent failure mode.
- **This task unblocks:** Task 5d-A (server metrics) and Task 5d-B (error tracking). Neither can start until the DSN is available.
