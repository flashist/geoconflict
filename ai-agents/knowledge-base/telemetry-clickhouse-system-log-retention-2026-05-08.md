# Telemetry ClickHouse System Log Retention - 2026-05-08

## Context

The telemetry VPS disk rose from 74% to 86% used even after Uptrace project TTLs were set to 7 days for spans, logs, and events. Running `uptrace retention check` still failed with a ClickHouse memory error, and `/var/lib/docker/volumes` accounted for almost all disk usage.

## Findings

- Uptrace project TTLs were correct: spans, logs, and events were 7 days; metrics were 90 days.
- The Uptrace ClickHouse application tables were small, with active `uptrace.logs_data`, `uptrace.logs_index`, `uptrace.spans_data`, and related tables totaling well under 1 GB.
- The Docker volume `uptrace_clickhouse_data` was about 44 GB.
- The large tables were ClickHouse internal system log tables:
  - `system.trace_log` was about 30 GB.
  - `system.text_log` was about 7 GB.
  - other `system.*_log` tables accounted for additional smaller usage.
- The `uptrace retention check` command emitted `WARN ch.max_execution_time can't be empty`, showing the generated Uptrace `ch_cluster` replica config was missing `max_execution_time`.
- The fatal retention failure was still ClickHouse memory exhaustion, not the missing timeout warning.

## Decision

`setup-telemetry.sh` now manages ClickHouse internal log growth in addition to Uptrace project retention:

- adds `max_execution_time: 15s` to the Uptrace `ch_cluster` replica config;
- writes ClickHouse server config with short TTLs for internal system log tables;
- lowers `text_log` capture to `warning`;
- disables default query and memory profiling samples in the ClickHouse default profile to stop `system.trace_log` from growing rapidly on a small VPS;
- mounts those ClickHouse config files into the ClickHouse container;
- applies TTLs to already-created `system.*_log` tables during setup, including numeric suffix tables such as `system.trace_log_0` and `system.text_log_0` that ClickHouse can leave behind when system log table definitions change;
- truncates existing ClickHouse system log tables by default during setup, controlled by `CLICKHOUSE_TRUNCATE_SYSTEM_LOGS`.

Defaults:

- `CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS=1`
- `CLICKHOUSE_QUERY_LOG_RETENTION_DAYS=3`
- `CLICKHOUSE_TRUNCATE_SYSTEM_LOGS=1`

## Operational Notes

This cleanup affects ClickHouse internal diagnostic logs only. It must not truncate any `uptrace.*` telemetry tables or delete Docker volumes.

After the first redeploy with ClickHouse system log config, ClickHouse preserved the old bloated diagnostic tables as suffixed tables (`system.trace_log_0`, `system.text_log_0`, etc.). Cleanup code must discover known ClickHouse system log names from `system.tables` and include numeric suffix variants, not only hardcoded base names.

After redeploy, verify:

```bash
df -h /
docker system df -v
docker compose exec -T clickhouse clickhouse-client -u uptrace --password uptrace -q "
select database, table, active, formatReadableSize(sum(bytes_on_disk)) as size
from system.parts
group by database, table, active
order by sum(bytes_on_disk) desc
limit 20;"
docker compose exec -T uptrace /uptrace --config=/etc/uptrace/config.yml retention check
```
