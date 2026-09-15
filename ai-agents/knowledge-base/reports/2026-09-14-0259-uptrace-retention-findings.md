# 0259 — Uptrace retention findings (2026-09-14)

Task: `ai-agents/tasks/done/0259-investigate-uptrace-retention-not-applied/brief.md`.
Read-only investigation. Nothing on the box was changed (no restart, no ALTER, no config edit). No
repo source or config changed. Evidence gathered over SSH with read-only commands and ClickHouse
`SELECT`s on `system.*`; run 2026-09-14 ~11:37–11:50 UTC.

## Verdict (one line)

**Retention *is* running every day — at a fixed ~14 days for every data class, not the 7 d
(spans/logs/events) / 90 d (metrics) the repo writes.** Uptrace 2.0.2 without a license ignores the
project TTL fields in PostgreSQL; the only evidence-consistent explanation is the vendor's
Community-edition retention cap (14 days; custom retention is a paid-license feature). The repo's
retention mechanism is therefore **inert as written**, and the promised **90-day metrics are being
deleted at ~14 days**.

## Hypotheses — verdicts

| # | Hypothesis | Verdict | Evidence (below) |
|---|---|---|---|
| 1 | Daily `retention check` cron is failing (OOM) | **Refuted for today; true historically.** Cron fires daily (journal, 09-07..09-14). Log has been silent since 2026-06-04 (no errors). The failures in the log are May 16–24 (ClickHouse memory limit) and May 26–Jun 4 (ClickHouse down — the June outage). But the cron is also **not what deletes data** — see E5. | E1, E2, E5 |
| 2 | Project TTL fields were reset | **Refuted.** Row reads 7 / 7 / 7 / 90 days, last `updated_at` 2026-06-06 07:13 UTC (the swap-fix redeploy). | E3 |
| 3 | TTL lag — lazy part expiry awaiting merges | **Refuted.** The telemetry tables carry **no table TTL** at all; deletion is an explicit `ALTER TABLE … DROP PARTITION` issued by Uptrace itself, daily at 00:00 UTC, on a precise 14-day horizon. No lag involved. | E4, E5 |
| 4 | Observation was of group counts, not raw rows | **Refuted — raw rows confirm.** 442,082 log rows and 21,466 span rows are older than 7 d; the oldest row in both is 2026-08-31 00:0x UTC (14 d). | E6 |
| — | **New: Uptrace ignores project TTLs; applies a fixed ~14 d cap** | **Holds (mechanism measured; vendor gate inferred).** A lower configured value (7) and a higher one (90) both land on ~14 d, so the drop horizon is independent of the project row. | E5, E7 |

## Evidence

### E1 — cron entry and journal
`/etc/cron.d/uptrace-backups:22`: `15 4 * * * root cd /opt/uptrace && docker compose exec -T uptrace /uptrace --config=/etc/uptrace/config.yml retention check >> /var/log/uptrace-retention.log 2>&1`
(box TZ is Europe/Moscow, so 04:15 MSK = 01:15 UTC). `journalctl -u cron` shows it executing every day
2026-09-07 → 2026-09-14 at 04:15:01.

### E2 — `/var/log/uptrace-retention.log`
254 lines, 44,552 bytes, **mtime 2026-06-04 04:15 MSK** — nothing written in 102 days.
- 2026-05-08/09: `WARN ch.max_execution_time can't be empty` (config warning, since fixed).
- 2026-05-16, 17, 23, 24: `ERROR msg="checkTableGroup failed" err="DB::Exception: (total) memory limit exceeded: would use 2.87 GiB … maximum: 2.87 GiB …"` → `app.Run failed`.
- 2026-05-26 → 2026-06-04: `ERROR msg="selectPartitions failed" err="dial tcp <clickhouse-container>:9000: connect: connection refused"` (ClickHouse down — the June OOM outage).
- After 2026-06-04: silent. The command exits without output. (Cron does not record exit status, so
  "silent = success" is inferred, not proven; E5 shows it is irrelevant either way.)

### E3 — project row in Uptrace PostgreSQL
```
 id |    name     | spans_d | logs_d | events_d | metrics_d |          updated_at
  1 | geoconflict |  7.0000 | 7.0000 |   7.0000 |   90.0000 | 2026-06-06 07:13:03+00
```
Nanosecond fields; 7.000 confirms the right unit (not the `0.007` micro-second bug the wiki warns of).
Uptrace binary schema default for these columns is `2419200000000000` (28 d) — matches the 2026-05-07
review.

### E4 — ClickHouse table TTLs (`system.tables.create_table_query`)
All telemetry tables are `PARTITION BY toDate(time)`. **No table-level TTL** on `spans_index`,
`spans_data` (only a column TTL on `edge_data`), `logs_index`, `logs_data`, `events_*`, `datapoints`,
`timeseries`, `preagg_datapoints`, `*_group_minutes/hours` (span/log/event). Table TTLs that do exist:
`tracing_group_hours`/`tracing_group_minutes` `toDate(time) + 14 day` (`ttl_only_drop_parts = 1`),
`notifications` 30 d, `project_metrics` 365 d. Nothing in ClickHouse reflects 7 d or 90 d.

### E5 — who actually deletes, and at what horizon (`system.query_log`, retained 09-12 → 09-14)
Every day at **00:00:00–00:00:03 UTC** (Uptrace's in-process retention worker — not the 01:15 UTC cron),
`QueryFinish` for:

| day (UTC) | spans_* / span_links / service_graph_edges / logs_* / log_group_* | datapoints / preagg_datapoints / timeseries |
|---|---|---|
| 2026-09-12 | `DROP PARTITION ID '20260828'` | `'20260829'` |
| 2026-09-13 | `'20260829'` | `'20260830'` |
| 2026-09-14 | `'20260830'` | `'20260831'` |

So spans/logs keep today + 14 prior days; **metrics keep today + 13 prior days — configured 90**.
At 01:15 UTC (the cron) query_log shows only ordinary ingest/query traffic (486–526 queries/min), no
`DROP PARTITION`: the cron finds nothing left to drop.

### E6 — raw oldest rows (verification step 2)
```sql
select 'spans_index', project_id, min(time), max(time),
       countIf(time < now() - interval 7 day), count() from uptrace.spans_index group by project_id
union all … logs_index … union all … events_index …
```
```
 t           | project_id | oldest                     | newest                     | rows_older_7d | total
 spans_index |          1 | 2026-08-31 00:03:13.181000 | 2026-09-14 12:39:33.523000 |        21466 |  21578
 logs_index  |          1 | 2026-08-31 00:00:02.184000 | 2026-09-14 12:39:33.526000 |       442082 | 454123
```
(`events_index` returned no rows — empty.) Active partitions per table: `logs_*` / `spans_*`
2026-08-31 → 2026-09-14; `datapoints`, `timeseries`, `preagg_datapoints` 2026-09-01 → 2026-09-14;
`project_metrics` 2026-04-16 → (365 d table TTL, 1.44 MiB).

### E7 — why the project TTL is ignored
- Box runs `uptrace/uptrace:2.0.2`; `uptrace.yml` has **no license/premium block**.
- Binary contains `glue.(*RetentionChecker).selectProjectRetention`, `glue.newDefaultRetention`,
  `pkg/featflag.Premium`, `bunapp.LicenseFromConfig`, and the message
  `ttl_delete is deprecated; use UI to set retention for a project`.
- Uptrace pricing page (first-party) lists "Custom retention policies" as a feature of the paid
  on-premises license. A third-party comparison (dash0.com) states the Community edition "caps data
  retention at 14 days" with custom retention behind paid tiers.
- The retention source (`glue/`) is not in the public `uptrace/uptrace` repo, so the exact gate was
  **not read in code**. The conclusion rests on the measured behaviour (7 → 14, 90 → ~14) plus the
  vendor statements. Confidence: high on *what* happens, medium-high on *why*.

## Disk (verification step 3 — baseline)

| Item | 2026-09-14 |
|---|---|
| `df /` | 59 G total, **16 G used (28 %)**, 41 G free |
| RAM / swap | 3.8 Gi total, 1.0 Gi available; swap 4.0 Gi, 1.0 Gi used; uptime 100 d |
| `uptrace_clickhouse_data` volume | **299 M** (uptrace DB 51.87 MiB active parts; system DB 12.62 MiB) |
| `uptrace_postgres_data` volume | **1.1 G** — `alert_events` 526 MB, `emails` 202 MB, `alerts` 196 MB |
| `/opt/uptrace/backups` (weekly `pg_dump`) | **4.5 G** — 3 dumps × ~1.6 G (08-30, 09-06, 09-13) |
| `/var/log` | 2.6 G, of which `/var/log/journal` **2.5 G** |
| `/var/lib/docker/overlay2` | 3.1 G |
| `/var/log/disk-warnings.log` | absent (usage never crossed 60 %) |

**Ingest rate, measured** (logs+spans, data+index, on disk): 8.7–13.0 MiB/day on 08-31..09-03 (last
full-ingest days), ≤ 25 KiB/day 09-05..09-13 (cert outage, `0257`). At 14 d that is ~150–180 MiB of
telemetry — **the 7 d vs 14 d gap costs ~70–90 MiB today.**

**Disk risk from the retention gap: low today.** The wiki's "3–4 GB/day" baseline is stale — the
2026-05-08 finding already showed that volume was ClickHouse *system* logs, not telemetry. Conditional
risk: if real ingest ever reached ~3 GB/day, 14 d would need ~42 G against 41 G free — a disk-full
outage that 7 d would have avoided. Nothing in the repo can enforce 7 d as-is.

Larger disk consumers than telemetry data, noted (out of scope): PG backups 4.5 G (the prune
`-mtime +14` keeps **3** weekly dumps, not the 2 its comment says — a 14-day-old file at 05:00 Sunday
is not yet `+14`), journald 2.5 G uncapped, PG `alert_events` 526 MB.

## Proposed fix — follow-up brief text (not implemented)

**Needs an owner decision first** (see options). Assuming option A (recommended):

> **Title:** Make telemetry retention config match what Uptrace CE actually enforces (14 d cap)
>
> **Context:** `0259` measured that Uptrace 2.0.2 without a license ignores project `*_ttl` and drops
> every daily partition older than ~14 d (spans/logs) / ~13 d (metrics) at 00:00 UTC. The repo's
> `UPTRACE_RETENTION_DAYS=7` / `UPTRACE_METRICS_RETENTION_DAYS=90` and the 04:15 `retention check`
> cron are inert and misleading.
>
> **Change:**
> 1. `setup-telemetry.sh` — header comment + "Retention control" block: state that on CE the project
>    TTL is not enforced and the effective horizon is Uptrace's 14-day cap; keep writing the PG fields
>    (harmless, and correct if a license is ever added) but stop printing "✅ Retention updated" as if
>    it governed deletion. Re-label or drop the daily `retention check` cron (Uptrace's own worker
>    already drops at 00:00 UTC; the cron has had nothing to do since June). Defaults: leave or align
>    to 14 — owner's call.
> 2. `build-deploy-telemetry.sh` — same variables propagate; update help text only.
> 3. Harness: `tests/scripts/profile-deploy-hardening.test.sh` greps `setup-telemetry.sh` — run
>    `npm test` and update any structural assertion touched.
> 4. Wiki (via `fkit-wiki`): correct `systems/telemetry` "Retention Control" (7 d / 90 d claims,
>    "3–4 GB/day" baseline) and record that metrics trends beyond 14 d do not exist.
>
> **Verify:** after deploy, the next 00:00 UTC run drops partition *today − 15*; oldest `logs_index`
> row stays ≈ now − 14 d; `npm test` green.
>
> **Owner-side on the box:** a redeploy via `build-deploy-telemetry.sh` (recreates clickhouse,
> uptrace, otelcol). No data deletion is needed under option A.

Retention-log reading remains `0258`'s signal design, not this task's.
