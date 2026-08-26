# PostgreSQL Backup Routine

**Source**: `ai-agents/tasks/done/0189-postgres-backup-routine/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T8

## Goal

Replace the same-disk interim profile DB dump with a daily encrypted off-box backup and a documented restore path before paid citizenship can create irreplaceable entitlement records.

## Key Changes

- Added `profile-backup.sh`, a host-side backup/restore script deployed through the existing profile deploy path rather than a parallel operations pipeline.
- `build-deploy-profile.sh` now ships the backup script and threads `PROFILE_BACKUP_*` settings into the staged remote environment.
- `setup-profile.sh` installs `age` and `rclone`, stages `/opt/profile/backup.sh.new` plus `backup.env.new`, smoke-tests the candidate backup before promotion, and schedules `/etc/cron.d/profile-backups` for daily 02:30 UTC off-box backups.
- Backups use `pg_dump -Fc`, encrypt dumps with an age recipient before upload, verify the uploaded S3 object size before deleting local temp files, and retain daily plus weekly objects.
- The backup path writes `/opt/profile/backups/last-backup.json` with exit status, object key, size, and error text so the monitoring Phase 2 task can alert on stale or failed backups.
- Restore is default-deny: `profile-backup.sh restore` refuses every target unless the operator declares a distinct remote host or explicitly confirms same-day live recovery.
- Added dry-run and redeploy hardening tests in `tests/profile-backup-dryrun.sh` and `tests/profile-backup-redeploy.sh`.
- Authored `ai-agents/knowledge-base/profile-backup-restore-runbook.md` with setup, restore, forced-failure, and restore-drill instructions.

## Outcome

T8 is complete. The profile store now has an encrypted off-box daily backup path with deploy-time smoke validation, failure markers, retention handling, and restore documentation. The first recorded restore drill verified schema, decryption, and restore flow on an empty production DB; it must be repeated with non-empty real player/entitlement data before or after paid citizenship starts carrying real value.

## Related

- [[decisions/sprint-4]]
- [[systems/player-profile-store]]
- [[tasks/profile-match-end-crediting]]
- [[tasks/profile-server-bring-up-runbook]]
- [[decisions/vps-credential-leak-response]]
- [[systems/architecture-overview]] — profile deploy hardening and the two easily-confused Postgres instances
