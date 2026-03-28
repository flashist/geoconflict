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

**Region:** choose the same Moscow datacenter as the game server. This minimises latency on OTEL data sent between servers and avoids cross-datacenter traffic costs if reg.ru charges for it.

---

## Part A — Network Connection Between Servers

**This is the first thing to resolve before any software is installed.**

The game server needs to reach the Uptrace OTEL ingestion ports (4317 and 4318) on the second server. How this works depends on whether reg.ru supports private networking.

### Step 1 — Check reg.ru control panel for private networking

Log into the reg.ru личный кабинет and check the network settings for your VPS instances. Look for an option called "приватная сеть" (private network) or "локальная сеть между серверами".

---

### Option A — If reg.ru supports private networking (preferred)

Enable private networking for both VPS instances from the control panel. Each server will receive a private IP in the `10.x.x.x` range.

Once enabled:
- The game server sends OTEL data to `http://10.x.x.x:4317` (Uptrace private IP) — never touches the public internet
- Ports 4317/4318 on the Uptrace server do NOT need to be opened in the public firewall
- The Uptrace dashboard (port 14318) remains accessible only via SSH tunnel

This is the cleanest and most secure setup. Use this if available.

---

### Option B — If reg.ru does NOT support private networking: firewall rules on public IPs

Open ports 4317 and 4318 on the Uptrace server's firewall, but restrict access to the game server's public IP only:

```bash
# On the Uptrace server — allow OTEL ingestion from game server only
sudo ufw allow from GAME_SERVER_PUBLIC_IP to any port 4317
sudo ufw allow from GAME_SERVER_PUBLIC_IP to any port 4318

# Block all other access to those ports
sudo ufw deny 4317
sudo ufw deny 4318

# Dashboard port — never expose publicly
sudo ufw deny 14318
```

Traffic travels over the public internet but is locked to the game server's IP. Adequate for this use case — OTEL telemetry data is not sensitive.

---

### Option C — If you want a proper private tunnel regardless of provider support: WireGuard VPN

WireGuard creates an encrypted private tunnel between the two servers, regardless of what reg.ru's network panel offers. This is more setup work but gives you a proper private network that also works for future services (admin panel, etc.) on the same internal server.

**Install WireGuard on both servers:**
```bash
sudo apt install wireguard
```

**On the Uptrace server (acts as VPN server):**
```bash
# Generate keys
wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key

# Create config
cat > /etc/wireguard/wg0.conf << EOF
[Interface]
PrivateKey = $(cat /etc/wireguard/private.key)
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = GAME_SERVER_PUBLIC_KEY  # fill in after generating on game server
AllowedIPs = 10.0.0.2/32
EOF

sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

**On the game server (acts as VPN client):**
```bash
wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key

cat > /etc/wireguard/wg0.conf << EOF
[Interface]
PrivateKey = $(cat /etc/wireguard/private.key)
Address = 10.0.0.2/24

[Peer]
PublicKey = UPTRACE_SERVER_PUBLIC_KEY  # fill in from Uptrace server
Endpoint = UPTRACE_SERVER_PUBLIC_IP:51820
AllowedIPs = 10.0.0.1/32
PersistentKeepalive = 25
EOF

sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

Once WireGuard is running, the game server reaches Uptrace at `http://10.0.0.1:4317` — a private address that doesn't exist on the public internet. Only port 51820 (WireGuard) needs to be open on the Uptrace server's public firewall, and only for UDP.

**Recommendation:** if reg.ru's private networking is unavailable or unclear, use WireGuard. It is more work now but the right long-term foundation for multiple internal services on the second server.

---

## Part B — Install Docker and Docker Compose on the Uptrace server

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt-get install docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## Part C — Deploy Uptrace via Docker Compose

### 1. Create working directory

```bash
mkdir /opt/uptrace && cd /opt/uptrace
mkdir backups
```

### 2. Download official config files

```bash
curl -sS https://raw.githubusercontent.com/uptrace/uptrace/master/example/docker/docker-compose.yml -o docker-compose.yml
curl -sS https://raw.githubusercontent.com/uptrace/uptrace/master/example/docker/uptrace.yml -o uptrace.yml
```

### 3. Configure uptrace.yml

Open `uptrace.yml` and set the following:

**Project token** — used by the game server to authenticate when sending OTEL data:
```yaml
projects:
  - id: 1
    name: geoconflict
    token: "REPLACE_WITH_STRONG_RANDOM_SECRET"
```
Generate a strong token: `openssl rand -hex 32`

**Secret key** for web session security:
```yaml
secret_key: "REPLACE_WITH_ANOTHER_STRONG_RANDOM_SECRET"
```
Generate: `openssl rand -hex 32`

**Data retention** — calibrated to 60GB disk:
```yaml
ch_schema:
  spans:
    ttl_delete: "30 DAY"
  metrics:
    ttl_delete: "90 DAY"
```

**ClickHouse memory limit** — prevents ClickHouse from consuming all available RAM:
Add to the ClickHouse section of `docker-compose.yml`:
```yaml
environment:
  - CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO=0.6
```
On a 4GB server this caps ClickHouse at ~2.4GB, leaving RAM for PostgreSQL, Redis, Uptrace, and future services.

### 4. Start all services

```bash
cd /opt/uptrace
docker compose up -d
```

First startup takes 2–3 minutes while ClickHouse initialises. Check progress:
```bash
docker compose logs -f uptrace
```

### 5. Verify all containers are running

```bash
docker compose ps
```

All four services (`uptrace`, `clickhouse`, `postgres`, `redis`) should show `Up`. If any show `Exit`:
```bash
docker compose logs clickhouse   # most common failure point
docker compose logs uptrace
```

---

## Part D — Access the Dashboard

Uptrace dashboard runs on port 14318. Access via SSH tunnel — never expose this port publicly.

**From your local machine:**
```bash
ssh -L 14318:localhost:14318 user@UPTRACE_SERVER_PUBLIC_IP
```

Then open `http://localhost:14318` in your browser.

**Change the default admin password immediately** after first login — find the default credentials in `uptrace.yml` under `auth`.

---

## Part E — Verify OTEL Ingestion is Working

Send a test trace before connecting the game server:

```bash
# On the Uptrace server
docker compose exec uptrace wget -O- \
  'http://localhost:14318/api/v1/test' \
  --header='uptrace-dsn: http://YOUR_PROJECT_TOKEN@localhost:14318/1'
```

A test trace should appear in the Uptrace dashboard under the `geoconflict` project within a few seconds.

---

## Part F — Record the DSN

The DSN the game server uses to send OTEL data depends on the network connection chosen in Part A:

| Connection method | DSN format |
|---|---|
| reg.ru private network | `http://TOKEN@10.x.x.x:14318/1` |
| Firewall rules (public IP) | `http://TOKEN@UPTRACE_PUBLIC_IP:14318/1` |
| WireGuard VPN | `http://TOKEN@10.0.0.1:14318/1` |

Record this DSN — it is required for Tasks 5d-A and 5d-B.

Also note the OTLP endpoint used by the OTEL SDK (different from the dashboard DSN):
- gRPC: `http://[uptrace-ip]:4317`
- HTTP: `http://[uptrace-ip]:4318`

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

Test that it survives a reboot:
```bash
sudo reboot
# After reboot:
docker compose -f /opt/uptrace/docker-compose.yml ps
```

---

## Part H — Backup

PostgreSQL holds metadata, alert rules, and project config — this is what matters to back up. ClickHouse telemetry data is not critical (the game server repopulates it automatically).

```bash
# Create backups directory
mkdir -p /opt/uptrace/backups

# Add to crontab (crontab -e):
# Weekly PostgreSQL backup every Sunday at 3am
0 3 * * 0 cd /opt/uptrace && docker compose exec -T postgres pg_dump -U uptrace uptrace > /opt/uptrace/backups/pg-$(date +\%Y\%m\%d).sql

# Keep only last 4 weekly backups
0 4 * * 0 find /opt/uptrace/backups -name "pg-*.sql" -mtime +28 -delete
```

---

## Verification Checklist

- [ ] Second VPS provisioned on reg.ru in same region as game server
- [ ] Network connection method chosen (Part A) — private network, firewall rules, or WireGuard
- [ ] Connectivity confirmed — game server can reach Uptrace OTEL port (test with `curl http://[uptrace-ip]:4318`)
- [ ] All four Docker containers running (`docker compose ps` shows all `Up`)
- [ ] Uptrace dashboard accessible via SSH tunnel
- [ ] Default admin password changed
- [ ] Test trace visible in dashboard (Part E)
- [ ] DSN recorded and shared — required for Tasks 5d-A and 5d-B
- [ ] Uptrace systemd service enabled and survives reboot
- [ ] PostgreSQL backup cron job in place
- [ ] Ports 4317, 4318, 14318 NOT accessible from public internet (verify: `curl http://UPTRACE_PUBLIC_IP:14318` should time out from an external machine)

## Notes

- **This task unblocks:** Task 5d-A (server metrics) and Task 5d-B (error tracking). Neither can start until the DSN is available from this task.
- **Future services:** the WireGuard VPN approach (Option C) is recommended if you plan to put an admin panel or name review tool on this server — it gives all internal services a clean private network to communicate over without opening additional public firewall ports per service.
- **Upgrades:** Uptrace only supports upgrading one minor version at a time (1.1 → 1.2, not 1.1 → 1.3). Keep a note of the installed version. Check GitHub releases before upgrading.
- **Disk monitoring:** check `/opt/uptrace` disk usage monthly. The 30-day trace TTL and 90-day metrics TTL will auto-prune old data, but ClickHouse compresses aggressively so growth should be slow at current scale.
