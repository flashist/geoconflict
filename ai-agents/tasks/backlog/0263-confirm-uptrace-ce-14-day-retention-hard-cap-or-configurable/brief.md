# Confirm whether Uptrace self-hosted 2.0.2's ~14-day retention is a hard edition cap or configurable

## ID
0263

> ℹ️ **ID allocation, checked 2026-09-14 before filing.** Highest ID across `backlog/`, `done/`,
> `cancelled/` was `0262` (folder prefixes and `## ID` fields agree). `0263` has no folder and no
> `## ID` hit; duplicate-prefix check (`uniq -d`) empty.

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Low** — not owner-ruled. The owner has accepted 14 days
for now, and the disk risk is low today: measured ingest is ~9–13 MiB/day of logs+spans, so 14 d is
~150–180 MiB (`0259` findings, "Disk"). It would rise if ingest grows toward GB/day, or if someone needs
metrics trends older than 14 days (the repo promises 90; none exist past ~13 d).

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` on an OWNER RULING given live in the lead session
(`AskUserQuestion`) and relayed by `fkit-lead`.** The owner, verbatim:
*"We will accept the 14 days for now, but we need to create a task and add it to the backlog sprint to
investigate it more."* ⇒ **The ruling covers two things only:** 14 d is accepted for now, and this
investigation goes on the Backlog board. It rules nothing about a fix, a licence, or the repo's 7/90
wording.

**Source:** [`0259`](../../done/0259-investigate-uptrace-retention-not-applied/brief.md) and its findings,
[`2026-09-14-0259-uptrace-retention-findings.md`](../../../knowledge-base/reports/2026-09-14-0259-uptrace-retention-findings.md).

### What `0259` measured (read the report — this is the short form)
- Uptrace itself drops every daily ClickHouse partition older than ~14 d (spans/logs) / ~13 d
  (metrics), at **00:00 UTC**, via `ALTER TABLE … DROP PARTITION` (E5). No ClickHouse table TTL is
  involved (E4).
- The project row in Uptrace's PostgreSQL says **7 / 7 / 7 / 90 days** and is **ignored**: a value
  below 14 (7) and one above it (90) both land at ~14 d (E3, E5).
- The box runs `uptrace/uptrace:2.0.2` with **no licence block** in `uptrace.yml`. The binary contains
  `featflag.Premium`, `LicenseFromConfig` and the message
  *"ttl_delete is deprecated; use UI to set retention for a project"* (E7).
- Vendor statements: the editions page lists Community as "14 days data retention", custom retention
  in paid tiers. **The licence gate itself is inferred** — the retention code is closed, not read.

### Why this task exists — the claim to test
The owner found a search/AI summary saying the 14-day cap is only a default, changeable via
`ch_schema.spans.ttl_delete` in `uptrace.yml`. `fkit-lead` checked it against `0259`'s evidence:
that key is **Uptrace 1.x** config, and 2.0.2's own binary calls it deprecated. That makes the
summary **likely wrong for 2.0.2 — but "likely" is not "tested"**, and the gate is inferred. This task
turns the inference into a measured answer.

### ⚠️ Things that bear on the method — read before planning
- **A value above 14 has, in effect, already been tried once, and it failed:** the metrics field says
  **90** and metrics are dropped at ~13 d. So a UI test only adds evidence if the UI **stores retention
  somewhere other than** those four PostgreSQL fields — or if the CE UI does not offer the control at
  all (which is itself a verdict). **Diff the project row, and any settings tables, before and after
  the UI change.**
- **The legacy key is not free to try.** It needs an `uptrace.yml` edit and a container restart, and
  the wiki (`systems/telemetry`, "Retention Control") records that the old top-level `ch:` retention
  block **can crash 2.0.2 at startup**. A crash is a telemetry outage. Back up the file first, have a
  rollback ready, and run it **only after** the UI test, never at the same time — otherwise a result
  cannot be attributed to either method.
- **A redeploy would undo the experiment.** Per the wiki, `setup-telemetry.sh` generates `uptrace.yml`
  and writes the project TTL fields (7/90) on every deploy. **No `build-deploy-telemetry.sh` run during
  the observation window**, or the result is void.
- **`system.query_log` keeps only ~3 days** on this box (`CLICKHOUSE_QUERY_LOG_RETENTION_DAYS=3`). The
  00:00 UTC `DROP PARTITION` evidence must be captured the **morning after each night**, not at the end.
- **Raising retention cannot lose data; lowering it later can.** Anything older than 14 d is already
  gone, so a raise only shows its effect from the next night on. Restoring the original setting at the
  end is the owner's call — reverting a raise that *did* work would drop the extra days.
- **Every change on the box is the owner's production write.** The coder prepares the exact change
  and rollback, and verifies read-only (SSH + ClickHouse `SELECT`s on `system.*`, as `0259` did).

### 🚫 Not in scope
- **Buying or requesting an Uptrace licence.**
- **The repo-honesty fix** — `setup-telemetry.sh`, `build-deploy-telemetry.sh` and the docs still say
  7 d / 90 d, and the daily `retention check` cron does nothing. `0259`'s findings carry draft brief
  text for it. **It is a possible follow-up, NOT ruled and NOT filed** — this task's verdict decides
  what that fix should say (e.g. "hard cap" vs "set it in the UI").
- Changing retention permanently — this task reports; the owner decides.
- Reading the retention log automatically — `0258`'s signal design.
- Wiki edits — flag the correction for `fkit-wiki` at close; never write the vault.

## What to build

An **investigation with a findings file** at
`ai-agents/knowledge-base/reports/<date>-0263-uptrace-retention-cap-findings.md`, ending in **one
verdict**: **hard edition cap** · **configurable — via <exact method>** · **inconclusive** (with what
would settle it).

Proposed method, cheapest first — the coder's plan may reorder or trim, with a reason:

1. **Desk research.** Uptrace release notes / changelog across 2.x, the retention and editions docs,
   and GitHub issues/discussions about retention on the self-hosted Community edition. Quote and link
   what is found; mark vendor statement vs third-party vs forum claim.
2. **Historical check in the repo.** The 2026-05-07 telemetry review found a **28-day** project default
   on the box. Did anything then show data **older than 14 d** surviving on 2.0.2? If yes, the cap is
   not a fixed property of this binary — say so. (Read `ai-agents/knowledge-base/` reports only.)
3. **Baseline on the box (read-only).** Oldest partition per table class, the project row, any other
   retention-bearing rows/settings, `uptrace.yml` checksum, and the last 00:00 UTC `DROP PARTITION`
   set from `system.query_log`.
4. **Experiment A — UI (owner applies).** Raise one project's retention above 14 d (e.g. 30 d) in the
   Uptrace UI — or record that CE offers no such control. Diff what changed in PostgreSQL. Then observe
   **2–3 nights**: a honoured setting shows **no** drop at 00:00 UTC and the oldest partition reaching
   15, 16, 17 d; a cap shows the drop horizon still at ~14 d.
5. **Experiment B — legacy `ch_schema` `ttl_delete` key (owner applies; only if A did not settle it,
   and only after A's window closes).** Backup, edit, restart, confirm Uptrace is healthy and ingesting,
   then observe 2–3 nights the same way. If startup fails, roll back at once and record it.
6. **Restore or keep** — put the result to the owner; record the ruling and the box's final state.

## Verification steps

1. The findings file exists and states **one** of the three verdicts, each backed by measured
   evidence or a quoted source — not opinion.
2. Desk research lists every source consulted with a link, and says which claim each one supports.
3. A **before** baseline is pasted: oldest partition per table class, the project row, and the last
   night's `DROP PARTITION` IDs.
4. For each experiment run: the exact change, who applied it, when (UTC), and the rollback prepared.
5. For each night observed (at least 2 per experiment run): the 00:00 UTC `DROP PARTITION` IDs from
   `system.query_log` (captured that morning) and the oldest row time in `logs_index` and
   `spans_index` — so "survived past 14 d" or "still dropped at 14 d" is measured.
6. The box's final state is recorded — restored to the pre-experiment setting, or kept on an owner
   ruling — and Uptrace is shown healthy and ingesting afterwards.
7. No telemetry redeploy happened inside an observation window (or the window is declared void and
   re-run).
8. 🔒 No hostnames, IPs, tokens, connection strings or credentials in the findings file or the brief.

## Notes

- **Depends on:** nothing — `0259`'s findings are the input and already exist.
- **Blocks:** nothing filed. Its verdict would shape the unfiled, unruled repo-honesty follow-up
  (see Not in scope).
- **Effort: ~0.5 day of hands-on work, spread over ~1 week of calendar time** (2–3 nights per
  experiment, captured each morning). **Risk: low** for A (a raise loses no data); **medium** for B (a
  config the wiki says can crash startup — a telemetry outage until rolled back).
- **Related:** [`0258`](../0258-telemetry-cert-renewal-failure-signal/brief.md) (signals on the same
  box), [`0257`](../../done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/brief.md)
  (restored ingest on 2026-09-14).
- **Wiki gap at close:** `systems/telemetry` "Retention Control" still says 7 d / 90 d and "3–4 GB/day"
  — route the correction to `fkit-wiki`; do not write the vault.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
