# Profile Durability Proof — Restore Drill and `age` Key Custody

**Source**: `ai-agents/tasks/done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md` (evidence packet: the sibling `worklog.md`)
**Status**: done
**Sprint/Tag**: Sprint 4 / profile clean-slate epic `0213` — P3

> # 🔴 READ THIS BEFORE CITING THIS PAGE ANYWHERE
>
> **This page exists because it corrects the largest standing claim in the vault.** Until
> 2026-09-11 every profile page said *"THE RESTORE PATH HAS NEVER BEEN TESTED."* **That is now
> false.** ⛔ **But the honest replacement is NOT "backups work" and NOT "the restore path is
> proven" full stop** — say it in the two halves below and no shorter.
>
> ## ✅ WHAT IS PROVEN (2026-09-11)
>
> - **A backup RESTORES, against NON-EMPTY data.** Proven **twice**: into a throwaway database, and
>   — **for the first time ever** — **into the LIVE database in place**, via the
>   `PROFILE_RESTORE_CONFIRM_LIVE` branch. Both verified **`IDENTICAL`** on row counts, per-table
>   content digests, **both** sequences, the constraint/index shape, and **three behavioural
>   checks** a digest cannot make.
> - **The nightly schedule FIRES**, observed on **three independent signals**, including scheduler
>   records on **five consecutive days** (2026-09-07 → 2026-09-11).
>
> ## ⛔ WHAT IS STILL NOT PROVEN — and the first item is the one that matters most
>
> 1. 🔴 **THE SCHEDULE AND THE DATA ARE PROVEN SEPARATELY, NEVER TOGETHER.** **Every cron-produced
>    backup object that has ever existed is a dump of an EMPTY database.** The only non-empty backup
>    in this drill was **HAND-RUN**. ⛔ **This nuance must survive every restatement of this page.**
>    Closing it needs exactly **one** nightly cron run after real data exists.
> 2. 🔴 **THE MEASURED RTOs DO NOT EXTRAPOLATE.** 0.374 s (throwaway) / 0.435 s (live) on **76 rows,
>    ~21 KB**. ⛔ **Never quote either as the project's recovery time.** Re-measure at real volume.
> 3. 🔴 **THE WEEKLY-COPY PATH HAS NEVER RUN** against the current storage bucket. First-ever attempt
>    **Sunday 2026-09-13**, tracked as task `0241`.
> 4. ⚠️ **BACKUP HISTORY IS THIN, AND IT WAS MISREAD ONCE ALREADY.** Before the drill the current
>    bucket held **two** objects, and **only ONE was cron-produced** — the other was a deploy smoke
>    check. Earlier nightly runs wrote to the **old, now-deleted** bucket.
> 5. ⚠️ **THE `age` KEY SECOND-COPY RESIDUAL IS CARRIED, NOT CLOSED.** Both copies are cloud stores
>    that **may share a phone-number recovery path**, so *"two copies"* is **weaker than the count
>    suggests**. Owner-accepted 2026-09-10; **no remediation proposed and none recommended.**
>
> ⛔ **`0218` closed `✅ Done (agent-closed — not owner-verified)` WITH EIGHT RESIDUALS. It is NOT a
> clean sweep and no page may render it as one.**
>
> 🔴 **Unusual circumstance, recorded because the marker alone understates the evidence: the OWNER
> personally executed every command on the box and observed every result.** No agent touched the
> box, ran a deploy, or held a secret. The marker is applied because the **close itself** was
> performed by a spawned producer with no owner channel (ADR-033 §5) — ⛔ **it must not be read as
> "nobody looked."** What nobody verified is production **use**.

## Goal

Turn the profile store's durability from an assumption into evidence: restore a real backup against
**non-empty** data, confirm the nightly schedule actually fires, and give the `age` private
identity a recorded, demonstrated home — **while the database still held zero rows and a drill was
therefore free**. The owner ruled this phase **leads** the epic's remaining work
(`0218` → `0219` → `0217`) for exactly that reason.

## Key Changes

**No source file, no script, no config, no commit.** `src/` untouched. The box was changed by the
owner, by hand, and every drill row was removed again afterwards.

- **Two verified restores.** A throwaway target and the **live database in place**. Both compared
  against a source fingerprint taken before deletion: per-table row counts **and** md5 content
  digests across **eight** tables, `last_value` + `is_called` on **both** `bigserial` sequences, the
  count of public constraints and the count + digest of public indexes.
- **Three behavioural checks the digests cannot make**, all passed: a partial unique index still
  rejects a second pending name change (**the error is the pass**); referential actions still fire,
  including `on delete set null`, inside a rolled-back transaction; the sequence hands out a
  non-colliding next id. 📌 **That last one legitimately returns `max+2`, not `max+1`** — the failed
  insert in the first check already drew a sequence value, and **sequences are non-transactional**.
  **A future reader seeing `max+2` should not open a bug.**
- **A multibyte encoding check before the digests** — Cyrillic byte length exceeded character length
  in every case, proving real UTF-8 was stored. **This was not ceremony:** a value mangled on insert
  round-trips through a digest comparison as faithfully as a good one, so without it a green drill
  would have meant nothing.
- **Two real defects found in `ai-agents/knowledge-base/profile-backup-restore-runbook.md`, both
  fixed** — see *Outcome*.
- **A defect in this task's own plan, fixed and recorded rather than quietly patched:** a
  verification step read `$?` immediately after a pipe into `tail`, so it reported the **pipe's**
  exit status and would have printed success on a **failed** backup. 🔴 **A verification step that
  cannot fail is worse than no verification step at all.**

## Outcome

### 🚨 The two runbook defects — durable knowledge, and both were found only by executing it

1. 🔴 **The documented drill named a docker network that does not exist on the box.** It hardcoded a
   compose-project-prefixed network name; the real one is derived by Compose v2 from the deploy
   directory's basename, and the deploy scripts set no project name, pass no `-p` and declare no
   `networks:` block. **Anyone following the runbook during a real outage fails at `docker run`,
   with a container that never starts.** Fixed, **and** the runbook now carries a `docker inspect`
   step so the value is **discovered rather than trusted** — a future project rename would move it
   again.
2. 🔴 **The live-recovery example embedded the real `POSTGRES_PASSWORD` in a connection URL**,
   leaking it into root's shell history (which persists on disk) and **two argv lists**, readable
   via `/proc/*/cmdline` — in the middle of a disaster, when nobody is thinking about credential
   hygiene. **Rotating that password is expensive**: the Postgres image applies it only at `initdb`,
   so rotation means destroying the data volume. ✅ **The password-free local-socket target is now
   the documented form** — `pg_restore` runs inside the postgres container, whose socket accepts
   `trust` auth, and the default-deny guard accepts the empty-host form and takes the
   `PROFILE_RESTORE_CONFIRM_LIVE` branch. **Tested on the box before anything destructive ran, so
   the exposure was never incurred: no password appeared in any command line at any point.** The old
   form is **struck, not deleted**, so nobody reinstates it from memory.

### ⛔ One claim in `0218`'s own brief was REFUTED BY EXECUTION

The brief said the 2026-07-01 drill *"predates the default-deny guard, so its command line no longer
works"* and made correcting that part of the task. **False — the currently documented line ran
verbatim and succeeded**, guard override included. The brief **overstated the runbook's own,
narrower claim** (that the *first drill's* line differed from what is documented now — true and
unremarkable) into *the documented line is broken*. ⚠️ **The two real breakages were the network
name and the credential leak, neither of which the brief mentions.**

📌 One further predicted defect — that the storage object prefix would not match the runbook's
literal example — **did not materialise.** Recorded because **a prediction that fails is worth
recording too**: otherwise the next reader inherits a suspicion with no resolution.

### ⛔ D2 was removed — the owner's knowing reversal of their own earlier ruling

**D2** was the step that would have restored **from the cron-produced object**, joining the schedule
to the data. It needed a nightly run *after* the data was seeded. The owner required the whole drill
to run **on one day** (their regular weekend game update is Sat/Sun and they did not want this
alongside it), which makes waiting for the schedule boundary impossible.

🔴 **The owner was shown that the chosen option drops D2 and chose it anyway — a KNOWING TRADE, not
an oversight.** The cost is residual 1 above and a durability claim resting on **two** verified
restores instead of three. The one genuine upside: the `age` private identity touched the box
**twice** instead of three times, and was shredded both times.

### Where the brief's verification steps actually stand

| # | Item | Standing |
|---|---|---|
| 1 | Custody written down **before** the first backup ran | ⚠️ **SUBSTANCE MET — NOT A CLEAN PASS.** The failure it exists to prevent (a backup encrypted to a recipient nobody can name) **cannot have occurred**. But **no timestamped artifact pins the intra-day ordering** — `0215` dates both events from session sequence — and the in-repo written record was authored **after** the deploy. |
| 2 | Custodian demonstrated they can read the key, dated | ✅ **Discharged by `0215`** — decrypted a test file with the copy retrieved **from storage**. ⚠️ Its date is session-sequence, not artifact-read. |
| 3 | Restore against **non-empty** data, verified by counts **and** content | ✅ **FULLY MET.** 76 rows / 7 tables; two restores, both `IDENTICAL`. |
| 4 | Exact commands recorded and **work today**; runbook corrected where wrong | ✅ **FULLY MET.** Two corrections applied; one predicted defect refuted; one brief claim refuted. |
| 5 | Nightly cron **fired** and produced an object — observed, not inferred | ✅ **MET IN ITS LITERAL WORDING** (three signals). ⛔ **The stronger property is NOT met — residual 1. Do not report this as a clean pass.** |
| 6 | `0182`'s backup limitations reflect reality | ✅ **Applied 2026-09-11 by the producer** to `0182`'s brief §8 — the coder drafted it, `done/` is producer-only. |
| 7 | No values anywhere | ✅ **MET.** No key material, key length, fingerprint, bucket name, endpoint, credential or public IP in any artifact — **and no password in any command line either**. |

### Other residuals carried forward

Beyond the five in the banner: **same-key overwrite is real, demonstrated and unrecoverable** — a
manual backup run silently replaces that day's scheduled object at the same key, and provider object
versioning is **UNKNOWN** (`0215` residual 6); **swap was not re-verified** on 2026-09-11 because the
plan's command truncated the output (**unverified, not absent**); and **`/health` + `/ready` after
the live restore were checked over loopback only**, so the public TLS/nginx path was not re-verified
afterwards (low risk — a restore does not touch nginx — but it is **not the same check**).

### Hand-offs

- **`0219`** builds the consumer for the backup-freshness marker. 🔴 **Four things it must not
  assume:** the signal has only ever been observed carrying an **empty-DB** payload; a nightly **log
  line is not a retrievable object**; a **manual** run can satisfy freshness-by-object-date without
  the schedule having fired; and the **weekly** path has never run against this bucket.
- **`0241`** now tracks the first-ever weekly-copy attempt (Sunday 2026-09-13). 🔴 **Owner-ruled
  2026-09-11: it is a CANONICAL `Depends on` entry of `0219`** — the producer had deliberately kept it
  as prose because the canonical form marks the whole row unpullable, and was overruled. ⛔ **The
  ruling changed the RECORDED FORM of the dependency and nothing else.**
  🚨 **`0219` therefore READS AS FULLY BLOCKED on any dependency-aware view, AND IT IS NOT.** `0241`
  gates **one half of one item** — the **weekly-copy** half of `0219`'s backup-freshness work.
  ✅ **Container log rotation, image prune, the external uptime check and the DAILY-object half of
  backup freshness are all startable today.** ⛔ **A reader who sees "blocked" and parks the whole
  task has been misled — that is the named failure mode.** ⚠️ Practical scale: `0241` becomes
  actionable **Sunday 2026-09-13** and is a single observation taking minutes. The gate exists because
  **a freshness monitor built on a producer that does not work manufactures confidence**, which is
  worse than no monitor.
- **`0217`** — ⚠️ **the moment real citizen rows exist, the free window for DB-destructive rehearsals
  closes.** The live-recovery branch is now rehearsed, so that debt is paid; residual 1 should be
  closed by **one** deliberate look at the first nightly run after wiring.
- **`0222`** — ~~untouched, stays **OPEN** on revoking the old storage access key **at the provider**.~~
  🔒 **CORRECTED 2026-09-11 — struck, not deleted. ⛔ IT WAS NOT SATISFIED. CLOSED BY OWNER DECISION:
  the revocation will DELIBERATELY NOT be done.** Owner, live in the lead session, verbatim:
  *"Forget about the old S3 keys, mark this task as cancelled."* ⛔ **Not outstanding work, not a task,
  not to be re-raised.** ⚠️ **There was no open task to cancel** — the revocation was never re-filed as
  its own brief after `0222` closed, so the ruling is recorded against the residual in `0222`'s brief;
  **`0222` was already `✅ Done` and stays Done — no task file was moved and no mover skill was
  invoked.**
  ⛔ **What that decision does NOT change — do not soften it into "revoked", "resolved", "no longer
  live" or "no longer a risk":** the key was **NEVER revoked at the provider**; **nobody ever
  established its scope** — **inert** if it was bucket-scoped to the deleted bucket, **reaching the NEW
  backup bucket** if account-wide, i.e. able to list, overwrite or delete the very backups this drill
  proved restorable; and an objection on exactly that point was put to the owner and **OVERRULED
  TWICE**, on **2026-09-10** and **2026-09-11**. ⚠️ **A deliberate decision not to act is not the same
  as the risk not existing.** If an account-wide key on that account is ever found: **check the key's
  policy at the provider first — nothing in this repository can answer it** — and it is then a **new
  owner decision**, not a licence to revoke or to re-file. ⛔ **Do NOT move this to `0240`**, which owns
  the `PROFILE_ID_PEPPER` / obsolete-variable purge **only** and remains open and tracked. Full record:
  [[tasks/profile-cleanup-obsolete-secrets]].

## Related

- [[tasks/postgres-backup-routine]] — task `0189`, the backup and restore machinery this drill exercised, and the runbook it corrected
- [[tasks/profile-cleanup-obsolete-secrets]] — task `0222`, the cleanup phase; 🔒 carries the standing that the **old** storage access key will **deliberately NOT be revoked** — ⛔ closed by owner decision, **not** revoked and **not** scope-established
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, which stood the box up, generated this key and bucket, and left the restore path unproven until now
- [[tasks/profile-server-bring-up-runbook]] — task `0182`, whose §8 backup limitation this drill superseded
- [[systems/player-profile-store]] — the store whose durability this proves, in the two halves above
- [[systems/project-brief]] — product ground truth; this task retires its "no proven recovery path" qualifier and replaces it with the narrower one
- [[systems/architecture-overview]] — the profile deploy topology and its ranked risks
- [[decisions/sprint-4]] — the sprint, and the owner-ruled `0218` → `0219` → `0217` work order this task led
