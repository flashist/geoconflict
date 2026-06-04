# Telemetry Server Incident History - 2026-06-03

## Summary

The self-hosted Uptrace telemetry server at `https://telemetry.geoconflict.ru` has had several operational problems on the small telemetry VPS. The earlier disk-related problems are fixed in repo-managed scripts. The 2026-06-03 incident is now RESOLVED (2026-06-04): root cause was memory exhaustion (OOM) on a low-RAM, zero-swap VPS — not disk. See "Current Incident" below for the full root cause and the fix (swap added, `system.metric_log` disabled, ClickHouse memory cap lowered to 0.6).

State at incident start (2026-06-03):

- `https://telemetry.geoconflict.ru/` was not available.
- An external `curl -i --max-time 15 https://telemetry.geoconflict.ru/` timed out.
- The timeout symptom differed from the earlier confirmed `502 Bad Gateway` startup/config failure.
- Disk-full was the leading hypothesis but proved WRONG — disk was only 18% used. The real cause was OOM.

## Known Problems Faced So Far

### 1. Local ClickHouse backup archives could fill the VPS disk

Date: 2026-05-07

Status: fixed in repo-managed setup.

The telemetry setup previously created local ClickHouse filesystem tar backups under `/opt/uptrace/backups`. On a 59 GB VPS, those archives could grow until the root disk filled and the telemetry stack became unstable or unavailable.

Fix:

- local ClickHouse tar backups were disabled;
- weekly PostgreSQL metadata backups remain enabled and are pruned after 14 days;
- recovery guidance says to preserve the Docker volumes and remove only generated local ClickHouse tarballs if that specific issue recurs.

Important safety rule:

- Do not use `docker compose down --volumes`, `docker volume prune`, or manual deletion of `uptrace_clickhouse_data` as a recovery step.

### 2. Uptrace config shape could crash the Uptrace container

Date: 2026-05-07

Status: fixed in repo-managed setup.

`setup-telemetry.sh` and local dry-run validation previously generated a top-level `ch:` / `ch.retention.ttl` style config that was not compatible with `uptrace/uptrace:2.0.2`. Redeploying that config could crash the Uptrace container and surface externally as nginx `502 Bad Gateway`.

Fix:

- `setup-telemetry.sh` keeps the `ch_cluster`-based config shape required by Uptrace `2.0.2`;
- retention is controlled via project-level PostgreSQL TTL fields: `spans_ttl`, `logs_ttl`, `events_ttl`, and `metrics_ttl`;
- `build-deploy-telemetry.sh` validates the same config shape that setup writes.

### 3. ClickHouse internal system logs grew to tens of GB

Date: 2026-05-08

Status: fixed in repo-managed setup.

The telemetry VPS disk increase was traced to ClickHouse internal system log tables, not active Uptrace application tables. The `uptrace_clickhouse_data` Docker volume was about 44 GB while active `uptrace.*` tables were under 1 GB. The largest tables were ClickHouse diagnostics such as `system.trace_log` and `system.text_log`.

Fix:

- `setup-telemetry.sh` writes ClickHouse config files with short TTLs for internal system logs;
- query and memory profiler sampling are disabled or reduced so `system.trace_log` does not grow rapidly;
- `text_log` is lowered to warning level;
- existing ClickHouse `system.*_log` tables, including suffixed variants such as `system.trace_log_0`, are discovered and truncated by default during setup;
- cleanup targets ClickHouse internal diagnostics only and must not truncate `uptrace.*` tables.

### 4. ClickHouse filesystem logs grew in the container writable layer

Date: 2026-05-10

Status: fixed/bounded in repo-managed setup.

After system-table retention was fixed, a separate issue appeared: filesystem logs under `/var/log/clickhouse-server` grew to about 933 MB because repeated ClickHouse `MEMORY_LIMIT_EXCEEDED` background-merge stack traces were written to `clickhouse-server.log` and `clickhouse-server.err.log`.

This was container writable-layer growth, not growth of the telemetry data volume.

Fix:

- `setup-telemetry.sh` writes `clickhouse-logger.xml`;
- ClickHouse filesystem log level defaults to `warning`;
- ClickHouse filesystem logs rotate at `CLICKHOUSE_FILE_LOG_SIZE=50M`;
- `CLICKHOUSE_FILE_LOG_COUNT=2` keeps rotation bounded;
- setup truncates existing ClickHouse filesystem logs by default on setup/redeploy;
- `clickhouse-memory.xml` writes `max_server_memory_usage_to_ram_ratio`;
- the default memory ratio was raised to `0.75`;
- setup force-recreates ClickHouse/Uptrace/otelcol so mounted config changes apply on redeploy;
- `build-deploy-telemetry.sh` propagates these defaults to remote redeploys and clean setups.

### 5. Repeated `system.metric_log` merge memory errors remained noisy

Date: 2026-05-12 to 2026-05-14 monitoring

Status: not fully fixed, but bounded by log rotation and not proven to break Uptrace.

After redeploy, the disk and log-growth guardrails worked, but ClickHouse still emitted frequent `MEMORY_LIMIT_EXCEEDED` errors from background merges. The failing table UUID mapped to `system.metric_log`, an internal ClickHouse diagnostic table.

Observed state during follow-up checks:

- root disk stayed healthy, around 11-12% used;
- ClickHouse container writable layer stayed around 100 MB;
- ClickHouse filesystem logs stayed bounded around the configured 50 MB active files plus small compressed rotations;
- `uptrace_clickhouse_data` remained small, from hundreds of MB to about 1 GB;
- active `uptrace.*` tables were small;
- the repeated merge issue appeared to affect ClickHouse diagnostics, not primary Uptrace telemetry tables.

Recommended durable follow-up:

- disable or reduce ClickHouse `system.metric_log` on the small VPS;
- do this later through repo-managed `setup-telemetry.sh`, not by deleting Docker volumes;
- raising ClickHouse memory further is a secondary option, but reducing unnecessary internal diagnostics is preferred.

## Current Incident - 2026-06-03

Status: RESOLVED 2026-06-04. Root cause was memory exhaustion (OOM), not disk.

### What was observed

- The public telemetry URL timed out (no clean `502`); SSH (22) and HTTPS (443) both timed out, ping was 100% loss, and the reg.ru provider console was completely unresponsive — i.e. the OS itself was wedged, not just the Docker/nginx stack.
- The reg.ru panel showed the VPS as "Active" with billing healthy, ruling out a provider-side power-off or suspension.
- A reboot from the reg.ru panel was required to regain access (console was dead, so no graceful in-guest cleanup was possible).

### Root cause (confirmed from server evidence after reboot)

- **Disk was NOT the problem this time** — root filesystem was only 18% used (10 GB / 59 GB). The earlier disk-full hardening (problems 1–4) held.
- The VPS has ~3.8 GB RAM and **shipped with ZERO swap**.
- The previous boot's kernel log contained **19 OOM-kill events, every one killing `clickhouse-serv`** (clustered 2026-05-27 → 05-28), with ClickHouse repeatedly growing to ~17–20 GB virtual / ~2.4 GB resident.
- The largest ClickHouse table was `system.metric_log` at **478 MiB** — a pure internal diagnostic table (the unresolved problem #5). Real Uptrace data was tiny (`uptrace.logs_data` ~8 MB).
- Mechanism: ClickHouse internal-diagnostics growth + background merges spiked memory on a low-RAM box with no swap cushion, so the kernel OOM-killer fired and under sustained pressure the whole host thrashed and froze — unreachable over network and console. This is exactly the "fixed it, died ~2–3 weeks later" pattern: the disk fix worked, but the memory issue was only "bounded, not fixed".

### Resolution applied 2026-06-04

Repo-managed, via `setup-telemetry.sh` + `build-deploy-telemetry.sh` (no parallel scripts):

1. **Added swap** — 4 GB swapfile (`/swapfile`, persisted in `/etc/fstab`, `vm.swappiness=10`). Added live first for immediate stabilization, then baked into `setup-telemetry.sh` (new `TELEMETRY_SWAP_SIZE_GB`, default 4) so a clean reinstall recreates it. This is the key fix — the kernel now has a cushion instead of instantly OOM-ing.
2. **Disabled `system.metric_log` + `system.asynchronous_metric_log`** via `remove="1"` in `clickhouse-system-logs.xml` (new `CLICKHOUSE_DISABLE_METRIC_LOG`, default 1). The existing truncate pass reclaimed the 478 MB.
3. **Lowered the ClickHouse memory cap** from 0.75 → **0.6** (`CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO`), in both `setup-telemetry.sh` and `build-deploy-telemetry.sh` defaults.

### Verified result after redeploy

- ClickHouse memory: 2.4 GiB (63%) → **1.19 GiB (31%)**; RAM available ~0.6 GiB → **1.4 GiB**.
- `system.metric_log`: disabled, 0 rows after `SYSTEM FLUSH LOGS`, `remove="1"` present in the mounted config.
- Swap: 4 GiB active, only ~212 MiB in use.
- All five containers healthy; `https://telemetry.geoconflict.ru/` → HTTP 200.

### Recommended durable follow-up (not yet done)

- Add a lightweight **external uptime check / alert** so an outage is caught in minutes, not 2–3 weeks. The current monitoring is only a local `df` warning log on the box itself (useless when the box is unreachable).

## First Checks To Run On The Telemetry VPS

Run these from the telemetry server:

```bash
cd /opt/uptrace

date
uptime
df -h /
free -h

docker compose ps
docker system df -v

ss -ltnp | grep -E ':(80|443|14318|4317|4318)\b' || true

curl -i --max-time 10 http://127.0.0.1:14318/
curl -k -i --max-time 10 https://127.0.0.1/
curl -i --max-time 10 http://127.0.0.1/
```

Then collect logs:

```bash
cd /opt/uptrace

docker compose logs --tail=120 uptrace
docker compose logs --tail=120 clickhouse
docker compose logs --tail=80 otelcol

systemctl status nginx --no-pager || true
journalctl -u nginx -n 120 --no-pager || true
```

If disk growth is suspected, also check ClickHouse file logs and table sizes:

```bash
docker exec uptrace-clickhouse-1 sh -lc '
du -h /var/log/clickhouse-server/* 2>/dev/null | sort -h
'

docker exec uptrace-clickhouse-1 clickhouse-client -u uptrace --password uptrace -q "
select database, table, count() as parts,
       formatReadableSize(sum(bytes_on_disk)) as size
from system.parts
where active
group by database, table
order by sum(bytes_on_disk) desc
limit 30;"
```

## Operational Guardrails

- Do not delete Docker volumes.
- Do not run `docker compose down --volumes`.
- Do not run `docker volume prune`.
- Do not truncate `uptrace.*` tables.
- If cleanup is needed, identify whether growth is in the root filesystem, Docker writable layer, ClickHouse file logs, ClickHouse internal `system.*_log` tables, or actual `uptrace.*` telemetry data before acting.

## Related Files

- `setup-telemetry.sh`
- `build-deploy-telemetry.sh`
- `ai-agents/knowledge-base/telemetry-recovery-hardening-2026-05-07.md`
- `ai-agents/knowledge-base/telemetry-clickhouse-system-log-retention-2026-05-08.md`
- `ai-agents/knowledge-base/telemetry-clickhouse-file-log-hardening-2026-05-10.md`
- `karpathy-vault/wiki/systems/telemetry.md`
