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

> # 🔴 UPDATED 2026-09-10 — BACKUPS DEMONSTRABLY RUN. **THE RESTORE PATH HAS STILL NEVER BEEN TESTED.**
>
> Task `0215` re-provisioned the box (adopted, not wiped) and the backup path was verified end to end
> **as far as it goes**:
>
> - `last-smokecheck.json` records `exit_status: 0`.
> - **One encrypted daily object, 19,330 bytes, lead-verified present in the new bucket** via `rclone`.
> - `/etc/cron.d/profile-backups` header reads **`Mode: offbox`** — the real off-box path, not the
>   local skeleton. `backup.env` is 0600, `backup.sh` is 0700.
> - Pre-flight before the deploy: an `rclone` round-trip against the new bucket
>   (`copyto` → `size --json` → `deletefile`, all three passed) and an `age` recipient round-trip
>   (`RECIPIENT OK`). `setup-profile.sh:889-908` **fails the deploy CLOSED** on incomplete backup
>   config — **that guard working is why these pre-flights exist.**
>
> ## 🚨 SAY IT PLAINLY: "BACKUPS ARE WORKING" MEANS **ENCRYPT-AND-UPLOAD ONLY**.
>
> **Nobody has ever proven one restores.** The old bucket is gone and its objects were unreadable, so
> **there is no historical restore to fall back on either.** 🔴 **Task `0218` owns this and it is
> OPEN.** Until it closes, **this box has no proven recovery path** — acceptable at zero rows, and it
> **must not still be true when the first real citizen row is written.** ⛔ **No page may imply a
> proven recovery path.** 📌 The owner ruled 2026-09-10 that `0218` **leads** the remaining profile
> work (`0218` → `0219` → `0217`), for exactly this reason and because a drill is **cheapest now,
> while every table has zero rows**.
>
> ### 🚨 ADDED 2026-09-10 — THE 0-ROWS DRILL CLAIM WAS FLAGGED UNSOURCED, A RETRACTION WAS **RULED BY THE OWNER**, AND IT WAS WRONG
>
> **The "the 2026-07-01 drill ran against an empty DB" claim below came within one step of being
> deleted as fabricated. It was true and properly sourced the whole time.**
>
> `0182`'s brief supported that claim with a **bare `:147-153`** written inside `0182` itself — the
> exact form `conventions/file-line-citations.md` bans. Every later reader, **three of them
> independently (producer, lead and owner)**, resolved it to `0182`'s *own* brief, where that range is
> the `## 4. Configure the deploy` header: real, plausible, and completely unrelated. A 2026-09-10
> sweep then checked every commit of `0182`, found no 0-rows evidence in any of them, and **flagged the
> claim UNSOURCED. That was escalated, and the owner RULED A RETRACTION on it.**
>
> ✅ **The producer searched OUTSIDE the cited file BEFORE executing the retraction, found the real
> source, refused, and escalated — and the owner then WITHDREW the retraction ruling. Nothing was
> deleted.** The source is `ai-agents/knowledge-base/profile-backup-restore-runbook.md` — search for
> `Recorded RTO`; that passage carries *"the prod DB was still **empty** (0 rows) at this point"* and
> the default-deny half, and is **unchanged in every commit checked from `879b2f4` to `589249c`**. The
> bare `:147-153` was numerically **right all along**; only its **file** was missing, and the word
> *"runbook"* in the citing sentences meant the **backup/restore** runbook, not `0182`.
>
> ⛔ **THE GATE NEVER WEAKENED FOR ONE MOMENT.** It now rests on **two properly-cited reasons instead
> of one half-cited one**: the drill ran on an empty DB, **and** it predates the default-deny guard, so
> its command line no longer works. **The restore path is still unproven and `0218` still owns it.**
>
> ⚠️ **Two different 0-rows readings, and they must NOT be conflated.** The **2026-07-01** drill's
> empty DB is a *2026-07-01* observation. `0215`'s **2026-09-08/09** re-read of all four tables at 0
> rows is a separate, later observation taken at execution time. Neither substitutes for the other, and
> **neither is a restore.**
>
> 📌 The transferable rule this produced — *"before declaring a claim unsourced, search OUTSIDE the
> cited file"* — is recorded on [[systems/agent-conventions]] under convention 10. It also drove the
> filing of task `0239`; see [[decisions/sprint-backlog]].
>
> ### ⚠️ B4's historical half stays UNKNOWN
> `last-backup.json` was never read at inventory, so *"has a backup ever completed before, and when"*
> was **answered forward, not backward**: a backup demonstrably completes **now**.
>
> ### 🔴 The `age` key now HAS a recorded home — and a knowingly accepted weakness
> A **new** keypair was generated 2026-09-09 outside the repo. Custodian: **Mark Dolbyrev**. ✅
> **Readability was PROVEN, not assumed** — the owner decrypted a test file using the copy retrieved
> **from storage**, not from the original generated file, and confirmed it against `age-keygen -y`.
> That satisfies `0218`'s live-readability gate. 🚨 **But the plan asked for an OFFLINE second copy and
> what exists is a SECOND CLOUD COPY:** neither store is zero-knowledge, and **both may share a
> phone-number recovery path**, so the two copies **may not be two independent failure modes.** The
> owner was shown this and chose it deliberately — a knowingly accepted residual. **`0218` should
> treat "two copies" as weaker than the count suggests.**
>
> ### 🔴 STORAGE — the bucket is NOT reused (owner ruling 2026-09-08)
> A **brand-new, clean bucket** was created, superseding the 2026-09-04 reuse ruling **as to the
> bucket only**; the VPS half is unchanged. **The owner had already deleted the old bucket.** ⇒ **All
> six backup values are new** and the new path shares nothing with the old one. `0222`'s question
> **changed shape and is STILL UNANSWERED and the owner's** — with the old bucket separable, the
> options are **(a)** purge the objects · **(b)** keep pending a search for the old key · **(c) 🆕**
> abandon the whole old bucket. 🔴 **Separately and unchanged: the OLD S3 ACCESS KEY MUST BE REVOKED
> AT THE PROVIDER, and has not been** — an overwritten local value is a live credential until revoked
> there, required under all three options. ℹ️ The provider console **exposed no versioning or
> lifecycle setting** for the bucket — recorded as **UNKNOWN, not assumed either way**; a
> cost/retention risk, not a deploy blocker.
>
> **The block below is kept as the record of the period when all of this was unknown. Read it as
> history — in particular, its "the bucket is REUSED" premise is superseded.**
>
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
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, which proved this backup path encrypts and uploads, generated the new `age` keypair and the new bucket, and left the restore path unproven
- [[systems/agent-conventions]] — convention 10, whose wrong-FILE recurrence is the citation defect that nearly deleted this page's 0-rows drill claim
- [[systems/project-brief]] — the product ground truth whose "profile host" status this page's unproven restore path qualifies
- [[decisions/sprint-backlog]] — where task `0239`, filed out of that near-deletion, sits on the Backlog board
