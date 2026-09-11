# Purge `PROFILE_ID_PEPPER` and the other obsolete profile env variables from local secret and example files

## ID
0240

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares
it against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**
Any qualifier goes in prose below the field, never in the field.

⛔ **This is NOT Sprint 4.** The owner ruled 2026-09-10 (given live in session and relayed through the
spawning session) that this work **stays tracked** when
[`0222`](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md) closed —
*"keep as a small open task."* **The owner ruled that it be TRACKED. The owner did NOT rule where it
sits, what it is worth, or when it runs.** It is filed on the unranked Backlog board.

## Priority
**Low** — *(producer's rank, NOT owner-ruled)*

⚠️ **State the authority before the label, because they differ here.** The **owner** ruled only that
this survives `0222`'s close as its own open task. The **`Low`** rank is the **producer's** judgement:
the variables protect nothing and hold no live value, so the liability is real but small and nothing
is blocked on it. ⛔ **Do not cite this rank as an owner ruling.**

🔒 **ADR-035 — this row was APPENDED at the bottom of
[`backlog.md`](../../../sprints/backlog.md).** No row moved, nothing was renumbered, no closed row was
touched. **Bottom-of-board means "added last", and nothing more** — it is not a ranking statement.

## Status
🔲 Backlog

## Owner
fkit-coder (the sweep and the deletions) — with the consumer check below as a hard gate, not a
courtesy.

## Depends on
Nothing.

⚠️ **Sequencing note, not a dependency:**
[`0220`](../0220-profile-p5-secret-persistence-and-value-parity/brief.md) (P5 — secret persistence
and value parity) touches the same env files. If both run, run them in either order but **re-read the
files between them** — this task deletes variables and `0220` reconciles values, and each invalidates
the other's snapshot.

## Context

### Lineage — carved out of `0222` at its close, 2026-09-10

🔴 **This task did not exist before 2026-09-10.** It is the **repo-side purge half** of
[`0222`](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md), carved out
at the moment `0222` was closed, on an **owner ruling** given live in session and relayed through the
spawning session: **keep it as a small open task** rather than let it close with the parent.

`0222` closed on a different question entirely — the fate of the OLD S3 bucket, which the owner had
already deleted. **Bucket deletion does not touch a single line of this repository.** The obsolete
variables were still sitting in the local secret env file when `0222` closed, and would have been
closed with it had the owner not ruled otherwise.

📌 **The pointer is reciprocal:** `0222`'s brief records that this purge was carved out to `0240` at
close, and this brief records where it came from. **Lineage must be visible from both ends** — a
carve-out that is only recorded on one side reads, from the other side, as work that was silently
dropped.

### ⛔ What this task does NOT include — and why saying so matters

🚨 **THE OLD S3 ACCESS KEY IS NOT IN SCOPE. DO NOT ADD IT.**

`0222` also carried an item requiring the **old S3 access key to be revoked at the provider**. That
item was **closed with `0222` as a knowingly accepted residual, on the owner's own ruling** — an
objection was put to the owner and the owner overruled it. The full record, including the objection,
is in
[`0222`'s brief](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md).

⛔ **Re-filing that item here would quietly reverse the owner's ruling.** If a future reader believes
the residual should be re-opened, that is a **new decision for the owner**, argued in the open on the
record `0222` carries — **not** something to be smuggled back in as an acceptance criterion of a
different task.

> 🔒 **STANDING UPDATED 2026-09-11 — the exclusion above is now STRONGER, not weaker.** The owner has
> ruled the revocation **DELIBERATELY NOT DONE — CLOSED BY OWNER DECISION** (verbatim: *"Forget about
> the old S3 keys, mark this task as cancelled."*). ⛔ **It is not outstanding work on `0222`, on this
> task, or anywhere else.**
> ✅ **THIS TASK'S OWN SCOPE IS UNCHANGED AND STILL OPEN:** `0240` owns the `PROFILE_ID_PEPPER` and
> obsolete-variable purge, and **only** that. ⛔ **The 2026-09-11 ruling does NOT transfer the S3 key
> to `0240`.**
> ⚠️ **And "not done by decision" is NOT "no risk":** the key was never revoked at the provider and
> **nobody established its scope** — inert if bucket-scoped to the deleted bucket, reaching the **new**
> backup bucket if account-wide. The objection was **overruled twice**, 2026-09-10 and 2026-09-11.

### The variables in question

**1. `PROFILE_ID_PEPPER` — the known one.**
Still set in the **local secret env file**, left over from the Yandex-ID hashing approach that was
**abandoned and reverted**:
[`0187`](../../cancelled/0187-profile-hash-player-ids/brief.md) is cancelled and PR #127 was reverted.
✅ **It protects nothing. Holding it is pure liability and nothing else.**

**2. The wider sweep — variables belonging to reverted or cancelled approaches.**
`0187` is the known one. The cancelled guest-first story —
[`0169`](../../cancelled/0169-profile-02-guest-localstorage/brief.md) and
[`0171`](../../cancelled/0171-profile-07-guest-migration/brief.md) — may have left others.
⚠️ **This half is a SURVEY first.** Report what is found; delete only what passes the gate below.

## What to build

> 🚨 **READ STEP 1 BEFORE STEP 2. THE CONSUMER CHECK IS THE POINT OF THIS TASK, NOT ITS PREAMBLE.**

1. 🚨 **Check for a live consumer BEFORE deleting anything.** For **every** variable considered for
   removal, search for a reader across at minimum:
   - `setup-profile.sh`
   - `build-deploy-profile.sh`
   - `Dockerfile.profile`
   - `src/profile-server/` and `src/server/`
   - `example.env.profile` and any other example/template env file
   - `tests/scripts/profile-deploy-hardening.test.sh` (its grep-level structural assertions can fail
     on an edit to any of the deploy scripts — see `CLAUDE.md`)
   - the knowledge-base runbooks

   **Record the search and its result for each variable.** A variable with **no** reader anywhere is
   safe to delete. A variable with **any** reader is **NOT deleted by this task** — it is reported,
   with the reader named, as a separate finding.

2. **Delete the variables that passed step 1** from the local secret env file and from the example /
   template files, and from any documentation still listing them as required.

3. **Report what was found but NOT deleted**, with the consumer that saved it. This list is a
   deliverable, not an exception report.

4. **Record the sweep in the worklog** — variables checked, readers found, what was deleted, what was
   kept and why, and the date.

## Verification steps

1. **`PROFILE_ID_PEPPER` is gone** from the local secret env file and from every example/template env
   file, and no script or document still requires it — confirmed by a repository search across
   `setup-profile.sh`, `build-deploy-profile.sh`, `Dockerfile.profile`, `example.env.profile`, `src/`
   and the knowledge-base.

2. 🚨 **The consumer check is EVIDENCED, not asserted.** For every variable this task removed, the
   worklog names the search that was run and shows it returned no reader. ⛔ **"I checked" is not
   evidence.** A brief that records only the deletions and not the searches has failed this step even
   if every deletion happened to be correct.

   > 🔴 **This is the `0062` / `0063` / `0195` class of failure, and this project keeps rediscovering
   > it.** A variable that *looks* dead and is in fact read somewhere breaks a deploy **silently** —
   > the deploy succeeds, the value is absent, and the symptom appears somewhere else entirely,
   > usually much later. That is precisely why the check is an acceptance criterion here and not a
   > note.

3. **The wider sweep is REPORTED, not silently empty.** The worklog lists which cancelled/reverted
   approaches were swept (`0187`, `0169`, `0171` at minimum) and what each turned up — **including
   "nothing"**, stated explicitly. An absent finding and an unperformed search look identical in a
   worklog unless one of them is written down.

4. **No script broke.** `npm test` is unchanged and the deploy harness
   (`tests/scripts/profile-deploy-hardening.test.sh`) still passes. ⚠️ **That harness carries
   grep-level structural assertions over `setup-profile.sh` and friends** — an edit to a deploy
   script can turn `npm test` red. **That is the gate working, not a broken test.**

5. ⛔ **The S3 access key was NOT touched, revoked, re-filed, or re-litigated by this task.** Confirm
   explicitly. Per the owner's 2026-09-10 ruling it is a **closed, knowingly accepted residual on
   `0222`** — and per the owner's **2026-09-11** ruling the revocation is **CLOSED BY OWNER DECISION,
   deliberately not done.** See the scope exclusion above. ⚠️ **Closed by decision ≠ no risk — never
   revoked, scope never established.**

6. 🔒 **No values, no lengths, no endpoints, no IPs, no bucket names, no account identifiers** in the
   brief, the worklog, or any commit message. **Naming a variable is fine; showing what it holds is
   not.**

## Notes

- **Effort: ~0.5 day. Risk: Low if step 1 is honoured; Medium if it is skipped** — the failure mode of
  skipping it is a silent deploy break, not a visible one.
- 📌 **Carved out of [`0222`](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md)
  on 2026-09-10**, at `0222`'s close, on the owner's ruling that it stay tracked. `0222` carries the
  reciprocal pointer.
- ⛔ **The old S3 access-key revocation is NOT here** — closed with `0222` as an accepted residual on
  the owner's ruling, and **ruled DELIBERATELY NOT DONE (CLOSED BY OWNER DECISION) on 2026-09-11.**
  Re-filing it would reverse that ruling. ⚠️ **Not done by decision is not the same as no risk.**
- **Related:** [`0016`](../0016-secret-management-beyond-env-files/brief.md),
  [`0045`](../0045-vps-registry-credential-hygiene/brief.md),
  [`0047`](../0047-deploy-transport-secret-hygiene/brief.md),
  [`0220`](../0220-profile-p5-secret-persistence-and-value-parity/brief.md). **This task subsumes none
  of them.**
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact.**
