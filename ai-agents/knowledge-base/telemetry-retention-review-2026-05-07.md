# Telemetry Retention Review - 2026-05-07

## Context

PR review flagged that removing the old Uptrace `ch:` block also removed explicit telemetry TTL configuration. The concern was valid: `setup-telemetry.sh` no longer generated any retention setting, and the telemetry VPS has only about 59 GB of disk while observed trace volume was previously about 3-4 GB/day.

## Findings

- Uptrace `uptrace/uptrace:2.0.2` rejects the old top-level `ch:` config shape used by earlier retention examples.
- The current `uptrace/uptrace:2.0.2 config create` output uses `ch_cluster` and does not include YAML retention keys.
- The live Uptrace PostgreSQL `projects` table has project-level TTL fields:
  - `spans_ttl`
  - `logs_ttl`
  - `events_ttl`
  - `metrics_ttl`
- The live default values on 2026-05-07 were 28 days for all four TTLs.
- Uptrace 2.0.2 includes `uptrace retention check`, which applies storage retention.

## Decision

Keep the Uptrace 2.x-compatible YAML shape and restore explicit retention control by setting project-level TTL fields in PostgreSQL during telemetry setup.

`UPTRACE_RETENTION_DAYS` now defaults to 7. `setup-telemetry.sh` converts that to microseconds and writes it to `spans_ttl`, `logs_ttl`, `events_ttl`, and `metrics_ttl` for the `geoconflict` project. The setup script also runs `uptrace retention check` once and installs a daily cron retry.

## Files Changed

- `setup-telemetry.sh`
- `build-deploy-telemetry.sh`

## Operational Note

The repo fix does not by itself change the already-running telemetry VPS until the setup/deploy path is run, or until the equivalent SQL update is applied manually. Before the fix, the live telemetry project had 28-day TTLs.
