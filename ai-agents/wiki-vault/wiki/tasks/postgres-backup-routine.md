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

> # ✅ CORRECTED 2026-09-11 — **A BACKUP RESTORES. PROVEN, TWICE.** ⛔ AND THAT IS NOT "BACKUPS WORK".
>
> **Task `0218` ran the durability drill on 2026-09-11 and closed
> `✅ Done (agent-closed — not owner-verified)`.** 🔴 **The owner personally executed every command on
> the box; no agent touched it.** Full record: [[tasks/profile-durability-restore-drill]].
>
> ## ✅ What is now PROVEN
>
> - **A backup RESTORES against NON-EMPTY data** — **twice**: into a throwaway database, and, **for
>   the first time ever**, **into the LIVE database in place** via the `PROFILE_RESTORE_CONFIRM_LIVE`
>   branch. Both **`IDENTICAL`** on row counts, per-table content digests, **both** sequences, the
>   constraint/index shape and **three behavioural checks**.
> - **The nightly schedule FIRES** — three independent signals, five consecutive days of scheduler
>   records (2026-09-07 → 2026-09-11).
>
> ## ⛔ What must be said in the SAME breath — do NOT write "backups work" full stop
>
> 1. 🔴 **THE SCHEDULE AND THE DATA ARE PROVEN SEPARATELY, NEVER TOGETHER.** **Every cron-produced
>    backup object that has ever existed is a dump of an EMPTY database.** The only non-empty backup
>    was **HAND-RUN**. Closing this needs exactly **one** nightly run after real data exists.
> 2. 🔴 **THE MEASURED RTOs (0.374 s throwaway / 0.435 s live) DO NOT EXTRAPOLATE** — 76 rows,
>    ~21 KB. ⛔ **Never quote them as the project's recovery time.**
> 3. 🔴 **THE WEEKLY-COPY PATH HAS NEVER RUN** against the current bucket. First attempt **Sunday
>    2026-09-13**, tracked as task `0241`.
> 4. ⚠️ **BACKUP HISTORY IS THIN AND WAS MISREAD ONCE ALREADY** — before the drill the current bucket
>    held **two** objects and **only ONE was cron-produced**; the other was a deploy smoke check.
>    Earlier nightly runs went to the **old, now-deleted** bucket. ⛔ **The nightly log's five-day
>    history is NOT five retrievable backups.**
> 5. ⚠️ **The `age` second-copy residual is CARRIED, not closed** — see the `age`-key section below.
>
> ⛔ **`0218` closed with EIGHT residuals. It is not a clean sweep and this page does not render it as
> one.**
>
> 🔧 **Two real defects in `ai-agents/knowledge-base/profile-backup-restore-runbook.md` were found by
> executing it, and both are fixed:** it named a **docker network that does not exist on the box**
> (anyone following it in a real outage fails at `docker run`), and its live-recovery example
> **embedded the real `POSTGRES_PASSWORD` in a URL**, leaking it into shell history and two argv
> lists. **The password-free local-socket target is now the documented form.** ⛔ A third claim — that
> the documented command line no longer works — was **REFUTED BY EXECUTION**; see
> [[tasks/profile-durability-restore-drill]].
>
> **The block below is kept as the record of the period before that drill. Its evidence about
> encrypt-and-upload is unchanged and still accurate; only its "never been tested" verdict is
> superseded.**
>
> # ~~🔴 UPDATED 2026-09-10 — BACKUPS DEMONSTRABLY RUN. **THE RESTORE PATH HAS STILL NEVER BEEN TESTED.**~~ 🚨 **SUPERSEDED 2026-09-11 — struck, not deleted.**
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
> ## ~~🚨 SAY IT PLAINLY: "BACKUPS ARE WORKING" MEANS **ENCRYPT-AND-UPLOAD ONLY**.~~ 🚨 **SUPERSEDED 2026-09-11 — struck, not deleted**
>
> ~~**Nobody has ever proven one restores.**~~ ✅ **PROVEN 2026-09-11 by `0218`, twice, against
> non-empty data — see the corrected banner at the top of this page.** ⚠️ **The replacement is
> narrower, not broader:** what is proven is that **a backup restores**; ⛔ what is still **not**
> proven is that a **SCHEDULED** backup captures **REAL DATA**, because the schedule and the data have
> only ever been proven **separately**.
>
> The old bucket is gone, so **there is no historical restore to fall back on** — that half is
> unchanged. 📌 The owner ruled 2026-09-10 that `0218` **lead** the remaining profile work
> (`0218` → `0219` → `0217`), for exactly this reason and because a drill was **cheapest while every
> table held zero rows**. **It led, and it closed 2026-09-11.**
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
> its command line no longer works. ~~**The restore path is still unproven and `0218` still owns it.**~~
>
> 🚨 **CORRECTED 2026-09-11 BY EXECUTION — the SECOND of those two reasons was WRONG.** The
> **currently documented** drill command line ran **verbatim and succeeded**, default-deny override
> included. The runbook's own claim was narrower and true (*the FIRST drill's* line differed from what
> is documented now); ⛔ **generalising that into "the documented line is broken" was the error**, and
> `0218`'s brief carried it. ✅ **The FIRST reason — the 2026-07-01 drill ran on an empty DB — stands
> untouched, and the gate it supported has now been DISCHARGED rather than weakened:** the non-empty
> restore was performed 2026-09-11. See [[tasks/profile-durability-restore-drill]].
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
> 📌 **Disposition, 2026-09-11: `0218` CARRIED this residual UNCHANGED and did NOT close it.** 🔴
> **Owner ruling 2026-09-10: accepted as-is. ⛔ No remediation is proposed and none is recommended.**
> ⚠️ **Do not read `0218`'s close as having resolved this.**
>
> ### 🔴 STORAGE — the bucket is NOT reused (owner ruling 2026-09-08)
> A **brand-new, clean bucket** was created, superseding the 2026-09-04 reuse ruling **as to the
> bucket only**; the VPS half is unchanged. **The owner had already deleted the old bucket.** ⇒ **All
> six backup values are new** and the new path shares nothing with the old one. ~~`0222`'s question
> **changed shape and is STILL UNANSWERED and the owner's** — with the old bucket separable, the
> options are **(a)** purge the objects · **(b)** keep pending a search for the old key · **(c) 🆕**
> abandon the whole old bucket.~~ ✅ **ANSWERED AND CLOSED 2026-09-10 — struck, not deleted.** Option
> **(c)** is in effect and the owner had **already executed it**; 🚨 **the premise was RETRACTED — the
> old bucket was EMPTY and always had been, so the "permanently unreadable objects" the question was
> about NEVER EXISTED.** ⛔ **Objects only** — the lost old `age` private identity is unchanged, and that
> is luck, not a control. ~~🔴 **Separately and unchanged: the OLD S3 ACCESS KEY MUST BE REVOKED
> AT THE PROVIDER, and has not been** — an overwritten local value is a live credential until revoked
> there, required under all three options.~~
>
> 🔒 **STANDING CORRECTED 2026-09-11 — struck above, not deleted. ⛔ IT WAS NOT SATISFIED. CLOSED BY
> OWNER DECISION: the old storage access key will DELIBERATELY NOT be revoked.** Owner, live in the
> lead session, verbatim: *"Forget about the old S3 keys, mark this task as cancelled."* ⛔ **Not
> outstanding work, not a task, not to be re-raised.** ⚠️ **There was no open task to cancel** — the
> revocation was never re-filed as its own brief after `0222` closed, so the ruling is recorded against
> the residual in `0222`'s brief; **`0222` was already `✅ Done` and stays Done — no task file was moved
> and no mover skill was invoked.**
>
> ⛔ **What that decision does NOT change — do not soften any of this into "revoked", "resolved", "no
> longer live" or "no longer a risk":** the key was **NEVER revoked at the provider**; **nobody ever
> established its scope** — **inert** if it was bucket-scoped to the deleted bucket, **reaching the NEW
> backup bucket** if account-wide, which would mean an untracked live credential able to list,
> overwrite or delete the very backups `0218` proved restorable; and an objection on exactly that point
> was put to the owner and **OVERRULED TWICE**, on **2026-09-10** and **2026-09-11**. ⚠️ **A deliberate
> decision not to act is not the same as the risk not existing.** If an account-wide key on that
> account is ever found: **check the key's policy at the provider first — nothing in this repository
> can answer it** — and it is then a **new owner decision**, not a licence to revoke or to re-file.
> ⛔ **Do NOT move this to `0240`**, which owns the `PROFILE_ID_PEPPER` / obsolete-variable purge
> **only** and remains open and tracked. Full record: [[tasks/profile-cleanup-obsolete-secrets]].
>
> ℹ️ The provider console **exposed no versioning or
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
> *(📌 **Status 2026-09-11:** gap 1 is **DISCHARGED** — see the corrected banner at the top of this
> page; gap 2 is still **OPEN** and owned by `0219`; gap 3 is **answered with a knowingly accepted
> weakness** — see the `age`-key section above.)*
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
> ⛔ **NOT OPEN — this question is history.** It was **answered and closed 2026-09-10** (old bucket
> abandoned and already deleted) and 🚨 **its premise was RETRACTED: the bucket was EMPTY — those
> objects never existed.** See the storage banner above and
> [[tasks/profile-cleanup-obsolete-secrets]].
>
> Disposition is owned by **`0222`** — 📌 renamed to
> `0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects` and **rescoped from decommissioning
> to cleanup**, because nothing is being decommissioned: owner, *"We don't need to cancel any
> billings."* Everything about the **new** key stays with `0218` (P3). **Do not let this slide a
> second time.** Grounding:
> `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md` (§1, §0).

## Related

- [[decisions/sprint-4]]
- [[tasks/profile-cleanup-obsolete-secrets]] — task `0222`, the cleanup phase; 🔒 carries the standing that the **old** storage access key will **deliberately NOT be revoked** — ⛔ closed by owner decision, **not** revoked and **not** scope-established
- [[systems/player-profile-store]]
- [[tasks/profile-match-end-crediting]]
- [[tasks/profile-server-bring-up-runbook]]
- [[decisions/vps-credential-leak-response]]
- [[systems/architecture-overview]] — profile deploy hardening and the two easily-confused Postgres instances
- [[tasks/profile-durability-restore-drill]] — task `0218`, closed 2026-09-11: **a backup restores, proven twice against non-empty data** — ⛔ **and the schedule and the data are still proven only SEPARATELY**
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, which proved this backup path encrypts and uploads, generated the new `age` keypair and the new bucket, and left the restore path unproven until `0218`
- [[systems/agent-conventions]] — convention 10, whose wrong-FILE recurrence is the citation defect that nearly deleted this page's 0-rows drill claim
- [[systems/project-brief]] — the product ground truth whose "profile host" status this page's backup/restore standing qualifies
- [[decisions/sprint-backlog]] — where task `0239`, filed out of that near-deletion, sits on the Backlog board
