# Uptrace Retention Is Not Applied — the configured 7 d / 90 d are inert; everything is deleted at ~14 d

**Source**: `ai-agents/tasks/done/0259-investigate-uptrace-retention-not-applied/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0259`

## Goal

Investigate why data from 2026-09-01..09-04 was still queryable on **2026-09-14** — 10–13 days old,
against a configured retention of **7 days** for spans, logs and events.

**Why it mattered:** the 7-day TTL exists to keep a 59 GB VPS from filling at the previously observed
3–4 GB/day ingest. If retention were silently off, the failure is a **disk-full telemetry outage** — the
same class that already took down game prod once via an unrotated nginx `access.log`. ⚠️ **Ranked Medium
rather than High only because ingest had been near-zero since 2026-09-04** (the expired certificate,
`0257`) — **so the disk was not growing that day, and that changed the moment `0257` landed.**

**Investigation only. Read-only. Nothing on the box was changed** — no restart, no `ALTER`, no config
edit.

## Key Changes

**No code was in scope.** The deliverable is the findings report
`ai-agents/knowledge-base/reports/2026-09-14-0259-uptrace-retention-findings.md`.

## Outcome

### Verdict

**Retention *is* running every day — at a fixed ~14 days for every data class, not the 7 d (spans / logs /
events) / 90 d (metrics) the repo writes.** Uptrace 2.0.2 **without a licence ignores the project TTL
fields in PostgreSQL**; the only evidence-consistent explanation is the vendor's Community-edition
retention cap, with custom retention a paid-licence feature.

⇒ 🚨 **The repo's retention mechanism is INERT AS WRITTEN, and the promised 90-day metrics are being
deleted at ~14 days.**

⚠️ **Evidence classes, kept apart:** the **mechanism is measured**; the **vendor licence gate is
inferred**.

### Hypotheses — verdicts

| # | Hypothesis | Verdict |
|---|---|---|
| 1 | The daily `retention check` cron is failing (OOM) | **Refuted for today; true historically.** The cron fires daily; its log has been silent since 2026-06-04. The failures in it are from May (ClickHouse memory limit) and late May–early June (ClickHouse down — the June OOM outage). ⛔ **And the cron is not what deletes data anyway** |
| 2 | The project TTL fields were reset | **Refuted.** The row still reads 7 / 7 / 7 / 90 days, last updated 2026-06-06 |
| 3 | TTL lag — lazy part expiry awaiting merges | **Refuted.** The telemetry tables carry **no table TTL at all**; deletion is an explicit `ALTER TABLE … DROP PARTITION` issued by Uptrace itself, daily at 00:00 UTC, on a precise 14-day horizon. **No lag involved** |
| 4 | The observation was of group counts, not raw rows | **Refuted — raw rows confirm.** Hundreds of thousands of log rows and tens of thousands of span rows older than 7 d; the oldest row in both was exactly 14 days back |
| — | **New: Uptrace ignores project TTLs and applies a fixed ~14 d cap** | **Holds.** A lower configured value (7) and a higher one (90) **both land on ~14 d**, so the drop horizon is independent of the project row |

📌 **Two details worth keeping:** the TTL fields are in **nanoseconds** and read correctly (not the
`0.007` micro-second unit bug the vault's telemetry page warns about), and **the deleting worker is
Uptrace's own in-process retention worker at 00:00 UTC — not the 01:15 UTC cron** the repo installs. Cron
does not record exit status, so *"silent = success"* on that log is **inferred, not proven** — and E5
shows it is irrelevant either way.

### 📌 Owner ruling on the findings — 2026-09-14

**Owner, verbatim:** *"We will accept the 14 days for now, but we need to create a task and add it to the
backlog sprint to investigate it more."*

- ⇒ **The effective ~14-day retention is ACCEPTED for now.** No change to the box, no change to repo
  retention values under this task.
- ⇒ **Follow-up filed on the Backlog board: `0263`** — confirm whether 2.0.2's ~14 d is a **hard edition
  cap or configurable**. It tests a search/AI claim that a ClickHouse schema TTL key lifts it; the lead
  found **that key is 1.x config and the 2.0.2 binary calls it deprecated**, so **the licence gate stays
  INFERRED.**
- ⚠️ **NOT ruled:** the findings' proposed repo-honesty edits (correcting the 7 d / 90 d wording and the
  inert `retention check` cron). **A possible follow-up, NOT filed** — `0263`'s verdict should shape it.

⇒ **Until `0263` answers, the repo still claims 7 d and 90 d in a place a reader will believe.** That is a
known, accepted, unfiled gap — **not an oversight to re-discover.**

## Related

- [[systems/telemetry]] — the stack and the retention control this corrects
- [[tasks/telemetry-cert-expired-renewal-cron]] — task `0257`, the sibling that restored ingest (and whose landing makes disk growth live again)
- [[tasks/client-source-map-upload-verification]] — task `0260`, the third sibling from the same finding
- [[tasks/container-log-retention]] — the other *"where the retention setting lives"* page
- [[decisions/sprint-4]] — the sprint that owns it
- [[decisions/sprint-backlog]] — the board it was filed on (the owner ruled the board only) and where its follow-up `0263` now sits
