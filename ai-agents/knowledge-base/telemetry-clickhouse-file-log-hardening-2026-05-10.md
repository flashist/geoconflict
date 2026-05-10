# Telemetry ClickHouse File Log Hardening - 2026-05-10

## Context

A follow-up telemetry check found the previous ClickHouse system-table retention fix was working: the `uptrace_clickhouse_data` Docker volume stayed around 500 MB and active `uptrace.*` / `system.*` table parts were only tens of MB. However, the ClickHouse container writable layer grew to nearly 1 GB because filesystem logs under `/var/log/clickhouse-server` accumulated repeated merge-memory stack traces.

Observed on the telemetry VPS:

- root disk remained healthy at about 12% used;
- `uptrace_clickhouse_data` was about 533 MB;
- `/var/log/clickhouse-server` was about 933 MB;
- `clickhouse-server.err.log` was about 486 MB;
- `clickhouse-server.log` was about 209 MB;
- the repeated error was `MEMORY_LIMIT_EXCEEDED` from `MergeTreeBackgroundExecutor` background merge tasks near the existing 3.44 GiB ClickHouse memory cap.

## Findings

The old high-risk issue, ClickHouse internal system tables growing to tens of GB, was not present. The new issue was filesystem log hygiene:

- ClickHouse file logs were not explicitly capped by the repo-managed setup.
- Repeated background merge failures emitted large stack traces into the container writable layer.
- The generated Docker Compose config hard-coded `CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO` to `0.6`, which matched the observed merge-failure threshold closely enough that background merges could fail repeatedly. The durable fix must write ClickHouse's server setting in XML, not rely on an image-specific environment variable.

## Decision

`setup-telemetry.sh` now manages ClickHouse filesystem logs and memory headroom in addition to ClickHouse system table retention:

- writes `clickhouse-logger.xml` with a default filesystem log level of `warning`;
- caps ClickHouse log rotation to `CLICKHOUSE_FILE_LOG_SIZE=50M` and `CLICKHOUSE_FILE_LOG_COUNT=2`;
- writes `clickhouse-memory.xml` with `max_server_memory_usage_to_ram_ratio`;
- mounts that config into ClickHouse via Docker Compose;
- force-recreates ClickHouse/Uptrace/otelcol during setup so regenerated mounted configs are actually applied on redeploy;
- truncates existing ClickHouse filesystem logs during setup/redeploy by default through `CLICKHOUSE_TRUNCATE_FILE_LOGS=1`;
- makes `CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO` configurable and raises its default from `0.6` to `0.75`;
- propagates the new settings through `build-deploy-telemetry.sh` so remote redeploys and clean setups receive the same defaults.

Defaults:

- `CLICKHOUSE_TRUNCATE_FILE_LOGS=1`
- `CLICKHOUSE_FILE_LOG_LEVEL=warning`
- `CLICKHOUSE_FILE_LOG_SIZE=50M`
- `CLICKHOUSE_FILE_LOG_COUNT=2`
- `CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO=0.75`

## Operational Notes

This hardening affects ClickHouse filesystem logs and ClickHouse memory headroom only. It does not delete ClickHouse data volumes and does not truncate `uptrace.*` telemetry data.

After redeploy, verify:

```bash
df -h /
docker system df -v
docker exec uptrace-clickhouse-1 sh -lc 'ls -lh /var/log/clickhouse-server && du -h /var/log/clickhouse-server/* 2>/dev/null | sort -h'
docker exec uptrace-clickhouse-1 clickhouse-client -u uptrace --password uptrace -q "
select name, value
from system.server_settings
where name = 'max_server_memory_usage_to_ram_ratio';"
docker exec uptrace-clickhouse-1 clickhouse-client -u uptrace --password uptrace -q "
select database, table, elapsed, progress, num_parts,
       formatReadableSize(total_size_bytes_compressed) as compressed,
       formatReadableSize(memory_usage) as memory
from system.merges
order by memory_usage desc;"
docker exec uptrace-clickhouse-1 clickhouse-client -u uptrace --password uptrace -q "
select database, table, count() as parts,
       formatReadableSize(sum(bytes_on_disk)) as size
from system.parts
where active
group by database, table
order by parts desc
limit 30;"
```
