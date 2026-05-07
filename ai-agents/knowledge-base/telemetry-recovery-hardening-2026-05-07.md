# Telemetry Recovery Hardening — 2026-05-07

## Summary

The Uptrace telemetry VPS outage had two confirmed recurrence risks in repo-managed setup scripts:

1. Local ClickHouse filesystem tar backups were written under `/opt/uptrace/backups` every week. On a 59 GB VPS, these archives can grow until the root disk fills, causing the telemetry stack to fail or become unstable.
2. `setup-telemetry.sh` and the local dry-run in `build-deploy-telemetry.sh` generated a top-level `ch.retention.ttl` block. Uptrace `uptrace/uptrace:2.0.2` rejects that config shape, so redeploying the script can crash the Uptrace container and surface externally as nginx `502 Bad Gateway`.

## Current Repo Contract

- `setup-telemetry.sh` must not generate top-level `ch:` config for Uptrace `2.0.2`.
- `build-deploy-telemetry.sh` must validate the same Uptrace config shape that `setup-telemetry.sh` writes.
- Local ClickHouse tar backups are disabled. The existing `uptrace_clickhouse_data` Docker volume must be preserved; do not use `docker compose down --volumes`, `docker volume prune`, or manual deletion of the ClickHouse volume as a recovery step.
- Weekly PostgreSQL backups remain enabled because they preserve Uptrace metadata: users, project config, tokens, alert rules, and related state.
- PostgreSQL backup pruning keeps 14 days of `pg-*.sql` files.
- The disk warning cron is only a local log warning in `/var/log/disk-warnings.log`; it is not an email, webhook, or active alert.

## Operational Notes

If the telemetry VPS disk is full because of local ClickHouse backup archives, remove only the generated local tarballs:

```bash
rm -f /opt/uptrace/backups/clickhouse-*.tar.gz
```

Keep PostgreSQL backups unless there is a separate reason to remove them:

```bash
ls -lh /opt/uptrace/backups/pg-*.sql
```

After recovery or redeploy, verify:

```bash
cd /opt/uptrace && docker compose ps
df -h
cat /etc/cron.d/uptrace-backups
```

For the public OTLP HTTP route, `GET /v1/traces` through nginx should return `405 Method Not Allowed`; that proves nginx reaches the collector route even though GET is not a valid OTLP submit method.
