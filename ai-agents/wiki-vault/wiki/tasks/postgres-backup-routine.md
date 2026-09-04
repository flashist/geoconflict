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

> 🔴 **CORRECTED 2026-09-04 — WHETHER ANY BACKUP IS RUNNING IS UNKNOWN.** ⚠️ **This supersedes an
> earlier same-day annotation here reading "NO BACKUPS ARE RUNNING, BECAUSE THERE IS NO BOX"; that
> overstated the owner's position and is withdrawn.** Owner rulings, both given live in session
> 2026-09-04 and **both standing**: *"We don't have ANY profile-related VPS yet, we would need to have
> a full-scale setup for it (whatever is needed)"*, then, on a direct follow-up, *"We don't need to
> cancel any billings, the VPS and S3 I created will be reused."* 🔴 **Reconciled: the profile VPS and
> the S3 bucket PHYSICALLY EXIST and are REUSED IN PLACE; whether a backup has ever completed, when,
> and what objects the bucket holds are UNKNOWN AND UNVERIFIED** — two of the fields `0215`'s
> inspection must read (`last-backup.json`, and a bucket listing). ⛔ **The backup MACHINERY is not in
> question** — `profile-backup.sh` exists, **including a scripted restore path**, and off-box encrypted
> backups are wired to **fail closed at deploy**.
>
> 🚨 **Three gaps the rebuild's durability phase (`0218`) owns, recorded 2026-09-04:**
> - **The restore path has never been exercised against non-empty data.** The 2026-07-01 drill ran
>   against an **empty (0 rows)** production DB, and it **predates the restore path's default-deny
>   guard**, so **its command line no longer works**. The runbook's own gate stands: *"A backup that has
>   never been restored is not a backup."*
> - **Nothing reads the backup-freshness marker, and there is no monitoring or alerting of any kind** —
>   no uptime check, no OTEL by design, and cron mails root only with an MTA that nothing installs. **A
>   backup that stops is invisible while the 14-day prune keeps deleting.**
> - 🔴 **The `age` private key has NO recorded home** — every reference to it is policy: no vault, no
>   entry, no custodian, no second copy, no readability check. **When asked on 2026-09-04 the owner did
>   not know what the `age` key was.** That is the signal, and designing it out is an **acceptance
>   criterion** of the rebuild, not a note: **who holds the new key, where it lives, and where the second
>   copy is must be answered BEFORE the first backup runs.**
>
> 🔴 **THE `age`-KEY QUESTION IS RE-OPENED — IT IS A LIVE OWNER DECISION (2026-09-04).**
> ⚠️ **This supersedes an earlier same-day annotation here that recorded it as CLOSED by the
> clean-slate ruling ("the old bucket, the old `age` keypair and any surviving backup objects are OUT
> OF SCOPE … closed by decision, not by investigation"). That was premature, and it is corrected here
> rather than quietly dropped.** 🔴 **Because the bucket is REUSED rather than replaced, any
> pre-existing encrypted objects are STILL IN IT.** Those objects were encrypted to an `age` recipient
> whose private identity has no recorded home, and **the owner did not know what the `age` key was
> when asked on 2026-09-04** ⇒ **without that private identity they are PERMANENTLY UNREADABLE**, and
> they are dead weight in a bucket that is being paid for.
>
> > **The open decision: PURGE the old encrypted objects, or KEEP them pending a search for the old
> > private key?**
>
> Disposition is owned by **`0222`** — 📌 renamed to
> `0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects` and **rescoped from decommissioning
> to cleanup**, because nothing is being decommissioned: owner, *"We don't need to cancel any
> billings."* Everything about the **new** key stays with `0218` (P3). **Do not let this slide a
> second time.** Grounding:
> `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md` (§1, §0).

## Related

- [[decisions/sprint-4]]
- [[systems/player-profile-store]]
- [[tasks/profile-match-end-crediting]]
- [[tasks/profile-server-bring-up-runbook]]
- [[decisions/vps-credential-leak-response]]
- [[systems/architecture-overview]] — profile deploy hardening and the two easily-confused Postgres instances
