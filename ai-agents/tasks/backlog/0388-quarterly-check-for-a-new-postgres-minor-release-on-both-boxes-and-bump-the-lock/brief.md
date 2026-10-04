# Quarterly: check for a new Postgres minor release on both boxes and bump the lock

## ID
0388

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer` with
no owner channel (ADR-021/037). The owner was asked, live via `AskUserQuestion` in the `fkit lead` session: *"Locked
means no automatic patches. How should we remember to update Postgres?"* → **"Quarterly backlog item (Recommended)"** —
*"A recurring backlog task each quarter: check for a new Postgres minor release and bump the lock, backup first."*

**Why this exists.** [`0384`](../0384-profile-box-lock-postgres-to-one-exact-image-by-digest/brief.md) (profile box,
Postgres 16) and [`0386`](../0386-telemetry-box-lock-postgres-and-redis-to-one-exact-image-by-digest/brief.md)
(telemetry box — all five outside images: Postgres 17, Redis 7, ClickHouse, Uptrace, OTel collector) lock the images to one exact digest. That stops surprise upgrades —
and it also stops **security and bug-fix patches**, including Alpine base-image fixes that Docker Hub ships under the
same version tag. Without a reminder the lock silently ages. This task is the reminder. Decision record: [ADR-120](../../../knowledge-base/decisions/adr-120-third-party-images-digest-pinned-postgres-upgrades-deliberate-backup-first.md) — §2
sets the routine for every Postgres upgrade (backup first, restore drill against the new image, weekend slot, verify
after); §3 is this reminder; §4 keeps major upgrades out of it.

**When.** PostgreSQL publishes its planned minor releases on the second Thursday of **February, May, August and
November** (postgresql.org versioning policy — the producer's knowledge, verify on the site). Running this check in the
**first weekend slot after each of those dates** lines it up with the releases. The next planned one is
**2026-11-12**. Out-of-cycle security releases also happen; this task does not watch for those (see open question 2).

### How "recurring" works here (producer's proposal — owner confirms, open question 3)

The task system has no repeating task. So: **each quarter is one task instance.** This brief is the **first** instance.
When an instance closes (via `/fkit-task-done`), the producer files the next quarter's instance with a new ID, linking
back to this one. If an instance finds nothing to bump, it still closes — "checked, nothing new" is a valid result.

## What to build

1. **Check (read-only).** For each locked image, find the newest minor release **within the same major**:
   - profile box: Postgres **16.x** (locked at `0384`);
   - telemetry box: Postgres **17.x** (locked at `0386`);
   - telemetry box: **Redis 7.x**, and **report only** whether ClickHouse, Uptrace or the OTel collector have newer
     releases — **only if the owner confirms** (open question 1; the ruling named Postgres only).
   Record the current lock, the newest release, and whether it carries security fixes (release notes).
2. **If nothing newer:** record that and close.
3. **If newer:** plan the bump and get owner approval, then:
   a. **Backup first** — confirm a fresh backup on that box (profile: nightly encrypted backup marker; telemetry: the
      weekly Postgres dump) **before** the deploy, and record its date.
   b. Bump the locked reference (new version tag + its multi-arch index digest) in every place it lives — for the
      profile box that is `setup-profile.sh`, the restore runbook and `tests/profile-backup-dryrun.sh` (the four places
      `0384` aligned); for telemetry, `setup-telemetry.sh`.
   c. Harness green; per ADR-120 §2, run the restore drill against the new image (`npm run test:scripts:docker`
      where Docker and its tools are available) so the version the box will run is the one the restore was tested on.
   d. Owner deploys in a weekend slot; a verify step (same shape as `0385` / `0387`) confirms the new digest is running
      and data is intact. Per the owner's build/verify rule, that check may be its own task.
4. **Major version is NOT this task.** If a major is near its end of life (Postgres 16 and 17 each get about five years
   of support — check the dates on postgresql.org), **flag it to the owner** as a separate dump/restore project. Never
   bump across a major here: minors share the on-disk format, majors do not.

## Verification steps

1. The worklog lists, per image: current lock, newest same-major release, and the decision (bump / nothing new), with
   a link to the release notes.
2. If bumped: harness passes; the new digest appears identically in every place listed in step 3b; the pre-deploy
   backup date is recorded; the profile restore drill result is recorded (or "not run — tools unavailable", stated
   plainly).
3. If bumped and deployed: the verify check passed (digest on the box = digest in the file; version as expected; data
   intact).
4. The next quarter's instance is filed (or the owner has ruled a different reminder mechanism).

## Notes

- **Depends on:** 0384, 0386
- **Blocks:** nothing
- **Why one brief per quarter, and why it waits for both locks.** Each quarter's check is shippable alone; until the
  locks exist there is nothing to bump (the moving labels still patch themselves).
- **Rollback reminder.** On the profile box the deploy's auto-rollback covers `profile-api` only
  (`setup-profile.sh:1221-1250`); a bad Postgres bump is a hand revert to the previous locked reference. Same on
  telemetry. Keep the previous reference in the worklog.
- **Related:** [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) (the
  unplanned upgrade that led to the lock), `0275` (the proven restore path).
- **Open questions for the owner** (producer could not ask — spawned without an owner channel):
  1. **Which images does the quarterly check cover?** The ruling said *"check for a new Postgres minor release"*;
     ADR-120 §3 words the reminder more widely (*"whether the pinned digests are behind on security fixes"*), and
     `0386` now locks five telemetry images. Recommended: **Postgres (both boxes) and Redis** checked and bumped here;
     **ClickHouse, Uptrace, OTel collector report-only** — a newer version is flagged to the owner as its own task,
     because an Uptrace bump re-opens `0285`'s schema check and is not a routine patch.
  2. **Out-of-cycle security releases?** This quarterly check would see them up to three months late. Recommended:
     **accept that** for now, and revisit if a serious one appears. It leans on neither database being
     internet-reachable — ADR-120 records the profile Postgres as loopback-only (`setup-profile.sh:1031-1033`) and the
     telemetry Postgres/Redis as publishing no ports; re-check if that ever changes.
  3. **Recurrence mechanism.** Recommended: one task per quarter, the next one filed when this one closes (above).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
