# P3 — Durability proof: a restore drill on non-empty data, and a recorded home for the new `age` key

## ID
0218

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High — and this is the phase with the highest consequence of being skipped.** Every other phase
degrades a service; this one loses the data.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🔲 Backlog

## Owner
fkit-coder / operator — **plus a required owner action** (key custody).

## Depends on
[`0215`](../0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box with the backup path configured
against a **newly issued** bucket and a **newly generated** `age` keypair.

## Context

### 🔴 The single failure this phase exists to prevent, stated plainly

**The previous `age` private key had no recorded home.** Every reference to it in this repository is
**policy** — no vault, no entry, no custodian, no location, no second copy, and no readability check.
**When asked on 2026-09-04 what the `age` key was, the owner did not know.**

🚨 **That is not a lapse to apologise for. It is the design defect this phase must close.** An
encrypted off-box backup whose private identity nobody can name is **not a backup** — it is
storage costs.

### 🔴 THE OLD-KEY QUESTION RE-OPENS — and this brief closed it prematurely

**This brief's first version, written earlier the same day, recorded the old-key question as *"closed
by owner decision"*, on the grounds that a fresh start abandons the old bucket. THAT WAS PREMATURE.
It is corrected here, in the open, rather than quietly dropped.**

**Owner ruling 2026-09-04, superseding the earlier one:** *"We don't need to cancel any billings, the
VPS and S3 I created will be reused."* — confirmed: *"Both exist — reuse them in place."*

⇒ 🚨 **The bucket is REUSED, so any pre-existing encrypted backup objects are STILL IN IT** — and
without the old `age` private identity they are **permanently unreadable**, dead weight in a bucket
that is being paid for.

| | Standing now |
|---|---|
| **The OLD key, and the old objects it encrypted** | 🔴 **A LIVE OWNER DECISION — purge them, or keep them pending a search for the old key?** ⛔ Not closed. Owned by [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md), **not by this task** |
| **The NEW keypair** | ✅ **THIS TASK. Generate it, and record its custodian, storage location and second copy AT THE MOMENT IT IS CREATED.** |

⚠️ **Keep the two apart.** This task owns the **new** key's custody; `0222` owns the **old** objects'
disposition. **Conflating them is how the first one got closed by accident.**

🚨 **"Custody recorded before the first backup runs" is an ACCEPTANCE CRITERION on this task, not a
note.** A backup that runs before the key's home is written down reproduces the exact failure above —
**for the second time.**

### The restore gate still stands in full — and the 2026-07-01 drill does NOT discharge it

`0182`'s runbook records a restore drill on 2026-07-01. ⚠️ **It does not count, for two independent
reasons:**

1. **The production DB was still EMPTY — 0 rows** (runbook `:147-153`). A round-trip of nothing
   proves nothing. **A non-empty round-trip has never been verified.**
2. **The drill predates the default-deny guard**, so **its command line no longer works.** Anyone
   repeating it from the runbook will hit the guard and may read that as a broken backup.

The runbook's own gate, quoted because it is the right standard:

> **"A backup that has never been restored is not a backup."**

⛔ **Do not soften this.** This phase **rehearses a restore on fresh data** — it is not a recovery,
because there is nothing to recover. That change of framing does **not** relax the gate; it only
means the data being restored is data this task created.

### What already exists and must not be rebuilt

- **A scripted restore path** — `profile-backup.sh:192-262`.
- **Off-box encrypted backups that fail CLOSED at deploy** — `setup-profile.sh:889-908`. ⚠️ That
  guard will stop a deploy whose backup config is incomplete. **That is the guard working.**
- **A nightly cron** wired by the provisioning script.

### Risk

**High**, and now on two fronts:

1. **The forward risk** — a new keypair is generated and its home is **again** not written down, and
   this whole conversation happens once more in six months. **That is what this task exists to
   prevent.**
2. 🔴 **The backward risk, which is LIVE again** — the old objects sit in the reused bucket,
   unreadable, being paid for, with **no decision recorded**. ⚠️ **Owned by `0222`, flagged here so
   this task is not read as covering it.**

## What to build

1. **Generate the new `age` keypair** (if `0215` has not already), and **immediately** record:
   - **who holds the private identity** (a named custodian, not "the team");
   - **where it lives** (a named vault and entry, not "the password manager");
   - **where the second copy is** — a different location, with its own custodian if different;
   - **the date it was generated.**
   🔒 **Record the LOCATION, never the value.** The recipient and the identity are both secrets;
   what goes in writing is where to find them and who to ask.
2. **Prove the recorded identity is READABLE** by the named custodian — a live check, not an
   assertion. ⚠️ *"It should be in the vault"* is exactly the state that produced this task.
3. **Populate the database with real, non-empty data** — enough rows across the tables the restore
   actually has to reconstruct, not a single smoke row.
4. **Run a backup, then run the scripted restore** (`profile-backup.sh:192-262`) **using the
   commands as they are documented TODAY.** ⚠️ **If the documented command line does not work against
   the default-deny guard, that is a finding — fix the documentation as part of this task**, so the
   next drill does not rediscover it.
5. **Confirm the nightly cron actually fired** — not that it is installed, that it **ran and produced
   an object**.
6. **Update `0182`'s known-limitations section** if any of its backup statements are now wrong. ⚠️
   `0182:219` was corrected on 2026-09-04 already (a moved line reference, and an off-box path it
   calls "deferred to T8" that has since shipped) — check whether anything else drifted.

### 🚫 Not in this phase

- ~~**Any work against the old bucket or the old keypair.** Closed by owner decision.~~
  🔴 **CORRECTED 2026-09-04 — that was premature and the question is LIVE again.** The bucket is
  **reused**, so the old encrypted objects are still in it. **The disposition decision belongs to
  [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md), not to this
  task** — so it stays out of *this* phase, but it is **not closed** and must not be reported as
  closed.
- ⛔ **Deleting anything from the bucket.** `0222`, and only after this task proves the **new** backup
  path works. ⚠️ **Reusing a bucket is not a reason to be hasty about emptying it.**
- Alerting on backup freshness — that is P4 (`0219`), which builds the consumer for
  `last-backup.json`. This task only confirms the cron fired.

## Verification steps

1. 🚨 **The new `age` private identity's custodian, storage location and second copy are WRITTEN
   DOWN, and were written down BEFORE the first backup ran.** The worklog records the order of
   events, not just the outcome.
2. **The custodian demonstrated they can actually read it** — a live check, dated.
3. **A restore was performed against NON-EMPTY data** and the restored database was verified by row
   counts and spot-checked content, not by "the command exited 0".
4. **The exact commands used are recorded and WORK TODAY.** If the runbook's command line was wrong,
   the corrected one is written back into the runbook. ⚠️ **A drill whose commands are not repeatable
   has to be repeated.**
5. **The nightly cron is confirmed to have FIRED** and produced an object — observed, not inferred
   from crontab content.
6. **`0182`'s backup limitations section reflects reality** after this task.
7. 🔒 **No values anywhere** — not the recipient, not the identity, not the bucket, not the endpoint,
   not the credentials. **Names, custodian names, vault names and file names only.**

## Notes

- **Effort: 0.5 day + an owner action.** The owner action is the custody decision; it cannot be made
  by an agent and it cannot be skipped.
- **Open question this task owns:** **Q3** — *who is the custodian of the NEW `age` private identity,
  where does it live, and where is the second copy?* 🚨 **This is the question that must not slide.**
  It is due **before the first backup runs**, not at the end of the phase.
- 🔴 **A SECOND open question exists and it is NOT this task's: Q3b — what happens to the OLD
  encrypted objects in the reused bucket?** Purge, or keep pending a search for the old key?
  **Owned by [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md).**
  ⚠️ **It was closed prematurely on 2026-09-04 and re-opened the same day** when the reuse ruling
  landed. **Q3 (new key custody) and Q3b (old objects) are different questions — do not let either
  absorb the other.**
- **What was established on 2026-09-04 and does not need re-establishing:** the six off-box backup
  variables (`PROFILE_BACKUP_S3_ENDPOINT`, `_BUCKET`, `_PREFIX`, `_ACCESS_KEY`, `_SECRET_KEY` and
  `PROFILE_BACKUP_AGE_RECIPIENT`) were **all non-empty in the local env files** — so a keypair *was*
  generated once and credentials *are* still held. ⚠️ **Under the reuse ruling the split is: the
  BUCKET is reused; the CREDENTIALS and the `age` KEYPAIR are re-issued.** Those are different
  decisions and 🚨 **conflating them is how a half-migrated setup happens.** The fact is recorded
  only to explain why the old setup looked configured while nobody could name its key.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — no values, no lengths, no endpoints, no bucket names.
</content>
