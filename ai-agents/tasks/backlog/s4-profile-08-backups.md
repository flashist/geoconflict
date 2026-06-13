# Task — Player Profile: Database Backups (T8)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — child slice 8 of 8. Implements **Part D step 7**.

## Sprint
Sprint 4

## Priority
High — **prerequisite for paid citizenship.** Not required for earned-XP go-live, but must be live and tested before the Yandex Payments task ships paid entitlements. Lost profiles/entitlements are unrecoverable.

## Depends on
T4 (the profile box + Postgres).

## Blocks
Paid citizenship (Yandex Payments task).

## Context
The profile DB holds the durable, unrecoverable-loss-sensitive record (XP, citizenship, and later paid flags). It needs off-box backups with a tested restore path. The sprint plan flags this as a separate task — this is it.

## Scope
1. **Nightly `pg_dump`** of the profile database, shipped to reg.ru S3-compatible storage (reuse the existing `STORAGE_*` env wiring where possible).
2. **PITR option:** evaluate WAL archiving for point-in-time recovery before paid citizenship ships (RPO < 24h). Decide and document whether nightly dumps suffice for launch or PITR is required.
3. **Restore drill:** a documented, tested runbook that restores a backup into a scratch database and verifies row counts / key tables.
4. **Retention policy** for backup artifacts; monitoring/alert if a nightly backup fails.

## Out of scope
- The schema/data itself (T5).
- Game-server changes.

## Acceptance / Verification
- The backup job runs on schedule and the artifact lands in S3.
- A restore into a scratch DB succeeds and is verified (row counts match).
- RPO is documented; a failed backup raises an alert.

## Notes
- Reference `project_telemetry_deploy.md` for the deploy/secret patterns and `project_vps_hosting_region.md` (reg.ru, RU residency).
- Backups must stay on RU-resident storage to remain 152-FZ compliant.
