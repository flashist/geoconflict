# Investigate: `UPTRACE_RETENTION_DAYS=7` appears not to be applied — data older than 7 days still queryable on the telemetry box

## ID
0259

## Sprint
Sprint 4

⚠️ **The field above is the bare token `Sprint 4` on purpose** — `dashboard.sh`'s drift rule compares it
against the `➡️ Moved` row's target on the Backlog board; any decoration breaks the match.

🔴 **PULLED INTO SPRINT 4 on 2026-09-14, on an OWNER RULING given live in the lead session
(`AskUserQuestion`) and relayed by `fkit-lead`.** Filed on the Backlog board earlier the same day by a
spawned producer. ⚠️ **The owner ruled the BOARD, NOT the rank** — the rank below stays the producer's.
The Backlog-board row now reads `➡️ Moved` and is kept, not deleted.

~~Backlog~~ *(struck 2026-09-14, kept not deleted)*

## Priority
**Medium — producer's rank, NOT owner-ruled** (the owner ruled the board on 2026-09-14, not the rank). ~~Unscheduled~~

**Producer's rank, if pulled into a sprint: Medium.** Not owner-ruled. The 7-day TTL exists to keep a
59 GB VPS from filling at the previously observed 3–4 GB/day ingest (wiki `systems/telemetry`,
"Retention Control"); if retention is silently off, the failure is a **disk-full telemetry outage**
— the same class that already took down game prod once (nginx `access.log`). Not High because ingest
has been near-zero since 2026-09-04 (`0257`), so the disk is not growing today; that changes the
moment `0257` lands.

## Status
🔄 In progress — driven from the lead session (/fkit-sprint-ship-loop), started 2026-09-14

## Owner
fkit-coder

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` on the ship-loop driver's instruction.** **Not an
owner ruling.** Investigation-first: the cause is unknown and the fix shape depends on it.

### What was observed (`0032`, 2026-09-14)
Data from **2026-09-01..09-04** was still queryable in Uptrace on **2026-09-14** — 10–13 days old,
against a configured retention of **7 days** for spans/logs/events.

### How retention is supposed to work (verified in `setup-telemetry.sh`, 2026-09-14)
- `UPTRACE_RETENTION_DAYS` (default 7, `:58`) → nanoseconds (`:106`) → written to the `geoconflict`
  project's `spans_ttl`/`logs_ttl`/`events_ttl` in Uptrace's PostgreSQL (`:741-751`).
- `uptrace retention check` runs once at deploy (`:782-783`, failure only warns) and **daily at 04:15
  via cron** (`:927`), output to `/var/log/uptrace-retention.log`. **Nothing reads that log either.**
- Wiki caveat: `uptrace retention check` **can fail from ClickHouse memory exhaustion** even when the
  TTL fields are correct — and this box has an OOM history.

### Hypotheses to test — in this order, cheapest first
1. The daily cron is failing (read `/var/log/uptrace-retention.log`; OOM per the wiki note).
2. The project TTL fields were reset (an Uptrace upgrade / UI edit) — query the project row.
3. The TTL only governs ClickHouse part expiry, which is lazy: parts older than TTL survive until a
   merge — so "queryable at 13 days" may be **normal lag**, not a defect. Check the actual table TTL
   and part ages in ClickHouse, and disk usage trend.
4. The observation was of *group counts* in a wide window, not of raw rows — re-check with a raw
   query for rows with a timestamp older than 7 d.

### 🚫 Not in scope
- Changing the retention value — that is an owner decision; this task reports.
- Reading the retention log automatically — fold into `0258`'s signal design if it lands first;
  note it there, do not build a second reader here.

## What to build

An **investigation with a findings file** at
`ai-agents/knowledge-base/reports/<date>-0259-uptrace-retention-findings.md`: which hypothesis held,
the evidence (log lines, the project row's TTL values, ClickHouse TTL/part ages, disk usage now vs
2026-05-07's baseline), and **a proposed fix as a follow-up brief text** — not an implementation.
If hypothesis 1 or 2 holds and the fix is a one-liner on the box, the owner may approve it in-session;
record it if so.

## Verification steps

1. Findings file exists and each hypothesis has a verdict with evidence, not opinion.
2. A raw query over the oldest span/log rows, with its result, is pasted — so "not applied" is
   measured, not inferred from group counts.
3. Disk usage on the box is recorded (`df`, ClickHouse data dir) so the next reader has a baseline.
4. 🔒 No connection strings or credentials in the findings file.

## Notes

- **Depends on:** nothing. (Uptrace is reachable through the expired cert with a browser warning, and
  the box itself over SSH; `0257` is not required to investigate.)
- **Blocks:** nothing.
- **Effort: ~0.25 day.** **Risk: none** — read-only until a fix is approved.
- **Source:** `ai-agents/tasks/backlog/0032-investigate-null-id-errors/worklog.md` (Findings bullet 1,
  "Retention is also not 7 d in practice"; "Follow-up brief text" item 1).
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **Never touch `ai-agents/wiki-vault/`.**
