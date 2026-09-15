# Worklog — 0259 investigate Uptrace retention not applied

Run: 2026-09-14, spawned by `/fkit-sprint-ship-loop` (fkit-lead, Sprint 4) as a **read-only
investigation** unit. No source/config written, nothing changed on the box, no commit, no wiki write,
no task-file move.

Full evidence and verdicts: `ai-agents/knowledge-base/reports/2026-09-14-0259-uptrace-retention-findings.md`.

## Headline

- Retention runs daily, but at a **fixed ~14 d** for all data classes. Configured 7 d (spans/logs/events)
  and 90 d (metrics) are **ignored** by Uptrace 2.0.2 without a license. Metrics are deleted at ~14 d,
  not kept 90.
- Brief hypotheses 1–4 all refuted as the *cause* (1 was true in May/June only). New cause measured.
- Disk risk from the gap: low today (~10 MiB/day telemetry; CH volume 299 M; disk 28 %).

## Access path

- Telemetry box reachable directly (route via physical interface, VPN not intercepting).
- SSH via a scratchpad helper: host/login read from `.env.telemetry`, password passed to
  `sshpass -e` through the environment only — never argv, never echoed, never written to a file.
  Remote commands piped as a `bash -s` script.
- Gotcha hit and fixed: `docker compose exec -T` inside a `bash -s` heredoc **consumes the rest of
  stdin**, silently truncating the script after the first exec. Fixed with `</dev/null` on every exec.
  Two early queries produced no output for that reason and were re-run.

## Steps and results

1. Repo read: `setup-telemetry.sh` `:58-59` defaults, `:106-107` ns conversion, `:741-783` PG update +
   one-shot `retention check`, `:927` daily cron. Wiki `systems/telemetry` Retention Control + gotchas.
2. Box host checks: `df /` 16 G/59 G (28 %); RAM 3.8 Gi, 1.0 Gi avail; swap 1.0/4.0 Gi; uptime 100 d.
3. H1: cron entry present, journal shows daily execution 09-07..09-14. Retention log mtime 2026-06-04,
   errors only May 16–24 (CH memory limit) and May 26–Jun 4 (CH connection refused). Silent since.
4. H2: PG `projects` row id 1 = 7/7/7/90 d, `updated_at` 2026-06-06 07:13 UTC. Not reset.
5. H3: ClickHouse telemetry tables have no table TTL (partitioned by `toDate(time)`); only
   `tracing_group_*` 14 d, `notifications` 30 d, `project_metrics` 365 d.
6. `system.query_log` (09-12..09-14): Uptrace drops partitions at 00:00 UTC daily — spans/logs
   partition *today − 15*, metrics *today − 14*. Cron minute (01:15 UTC) shows no drops.
7. H4: raw rows — `logs_index` 442,082 of 454,123 rows older than 7 d; `spans_index` 21,466 of 21,578;
   oldest both 2026-08-31 00:0x UTC.
8. Why: no license block in `uptrace.yml`; binary has `RetentionChecker.selectProjectRetention`,
   `newDefaultRetention`, `featflag.Premium`; vendor pricing lists custom retention as paid license;
   third-party source says CE caps at 14 d. Retention source is closed (not in public repo) — gate
   not read in code.
9. Disk baseline: CH volume 299 M, PG volume 1.1 G, PG dumps 4.5 G (3 kept), journald 2.5 G,
   overlay2 3.1 G. Telemetry on-disk ingest 8.7–13.0 MiB/day pre-outage.

## Decision log (unattended fixes / obvious-winner calls)

none — read-only investigation, no fix applied, no obvious-winner call made.

## Open for owner

- Accept Uptrace CE's 14 d as the retention (and lose the 90 d metrics expectation), vs. enforce 7 d
  ourselves, vs. license. See findings file, "Proposed fix".
- Side notes (not in scope): PG backup prune keeps 3 dumps not 2; journald 2.5 G uncapped.
