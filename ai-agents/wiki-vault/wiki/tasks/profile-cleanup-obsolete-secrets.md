# Profile Cleanup — Obsolete Secrets and the Old Bucket

**Source**: `ai-agents/tasks/done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — profile clean-slate epic `0213`, Cleanup phase (`0222`)

> 🔒 **THE ONE THING TO READ ON THIS PAGE — STANDING, 2026-09-11: the old storage access key will
> DELIBERATELY NOT be revoked. CLOSED BY OWNER DECISION.**
>
> **Owner ruling, given live in the lead session 2026-09-11. Verbatim:**
> *"Forget about the old S3 keys, mark this task as cancelled."*
>
> ⛔ **This is NOT an open item. It is NOT "still to do". Do not pick it up, do not re-file it as a
> task, do not add it to another task's scope, and do not re-raise it as outstanding work.**
>
> ⚠️ **There was no open task to cancel.** The revocation was never re-filed as its own brief after
> `0222` closed on 2026-09-10, so the owner's word *"cancelled"* is recorded **against the residual in
> `0222`'s brief**, not by moving any task file. ⛔ **`0222` was already `✅ Done` and stays Done — no
> task file was moved and no mover skill was invoked for this ruling.**

## Goal

Clean up after the profile backend rebuild: purge obsolete secrets from the repository, and decide the
fate of the old storage bucket and whatever it held.

📌 **Rescoped and renamed twice, both on the record.** Filed 2026-09-04 as a *decommission*, renamed
the same day to a *cleanup* — ⛔ **nothing is decommissioned, no billing was cancelled** (owner:
*"We don't need to cancel any billings, the VPS and S3 I created will be reused."*). The **bucket** half
of that reuse ruling was then superseded on 2026-09-08 by a **brand-new, clean bucket**; ✅ **the VPS
half is unchanged — the box is still reused in place.** The folder name still reads
`...old-bucket-objects` and is kept unchanged on purpose: the folder is the task's identity.

## Key Changes

**No code changed under this task.** It carried one owner decision and two carve-outs.

- ✅ **The old-bucket question (Q3b) is ANSWERED AND CLOSED, 2026-09-10.** Owner, verbatim: *"I've
  already deleted the old bucket, it was empty, we never had anything there."* Option **(c)** — abandon
  the old bucket entirely — is in effect and **the owner had already executed it**. A decision
  **recorded**, not an agent's choice.
- 🚨 **A premise this task carried was RETRACTED, not merely superseded: the old bucket was EMPTY.**
  The brief had asserted throughout that it held pre-existing encrypted backup objects that were
  *"permanently unreadable"* for want of the old `age` private identity, and were *"dead weight being
  paid for."* **Those objects never existed.** ⛔ **Do not extend the retraction past the objects** —
  the lost old `age` private identity is a real, unchanged problem; what changed is only that the old
  key turns out to have been protecting nothing. **That is luck, not a control**, and no reason to
  relax key custody. The **new** keypair and its custodian / storage / second copy were `0218`'s.
- ➡️ **The repo-side purge was CARVED OUT to `0240`, not closed here.** Deleting a bucket touches no
  line of this repository, so `PROFILE_ID_PEPPER` and the wider obsolete-variable sweep were filed as
  `0240-purge-obsolete-profile-env-variables` on the Backlog board on 2026-09-10. **It remains open
  and tracked.** ⛔ **The access-key residual below is NOT in `0240` and must never be added to it** —
  re-filing it there would quietly reverse the owner's ruling.

## Outcome

Closed `✅ Done (agent-closed — not owner-verified)` on **2026-09-10**, on the owner's ruling, **over a
documented objection.** Both halves are recorded on purpose.

### ⛔ What the decision does NOT change — read this before concluding anything

**A deliberate decision not to act is NOT the same as the risk not existing.** The standing changes who
should act and whether anyone should re-raise it. It changes **nothing** about the facts:

- 🔴 **The key was NEVER REVOKED at the provider.** Not on 2026-09-10, not on 2026-09-11, not since.
  ⛔ Overwriting the local value does not revoke it. Deleting the bucket does not revoke it.
- 🔴 **NOBODY EVER ESTABLISHED ITS SCOPE.** It is **inert** if it was bucket-scoped to the deleted
  bucket. It **reaches the NEW backup bucket** — same account, same credentials — if it is
  account-wide. **Which of the two it is has never been checked and is recorded nowhere in this
  repository.**
- 🔴 **An objection on exactly that point was put to the owner and OVERRULED TWICE** — on
  **2026-09-10** (when this task closed) and again on **2026-09-11** (when the revocation was ruled
  deliberately not done). It is kept because it was overruled, not because it was wrong.

⛔ **Do NOT soften this into "resolved", "revoked", "no longer live", or "no longer a risk."** None of
those is true, and writing any of them would erase the only trace of this.

### 📌 If this ever matters — what to check first

A future reader who ever finds an account-wide key on that account **must be able to see this was a
choice.** If the question reopens:

1. **Check the key's POLICY AT THE PROVIDER first.** Bucket-scoped vs account-wide is the single fact
   that settles whether this residual is inert or live, and it is the fact nobody established. **It is
   a provider-console lookup — nothing in this repository can answer it.**
2. **If bucket-scoped to the deleted bucket:** the owner's reasoning was correct, the key reaches
   nothing. **Record the finding so it stops being unknown.**
3. **If account-wide:** it can list, overwrite or delete the **new** backup bucket — the very backups
   `0218` proved restorable. **That is a NEW decision for the owner.** ⛔ Not a licence for an agent to
   revoke it, and not a licence to quietly re-file it as a task.

⚠️ **Whether the owner's reasoning was right is NOT settled in either direction** — it is correct if
the key was bucket-scoped and wrong if it was account-wide, and nobody checked which. That is the whole
of what is known.

📌 **Related standing hygiene tasks, which do NOT subsume this item:** `0045` (VPS registry credential
hygiene), `0016` (secret management beyond env files).

🔒 **No key, no value, no bucket name, no endpoint, no account identifier appears anywhere in this
record** — naming the residual is the point, exposing it is not.

## Related

- [[systems/player-profile-store]] — the store this cleanup follows, and the ruling table it carries
- [[systems/architecture-overview]] — the profile deploy topology and its ranked risks
- [[systems/project-brief]] — product ground truth; carries this standing in its Gotchas list
- [[tasks/postgres-backup-routine]] — task `0189`, the backup path whose old bucket this task retired
- [[tasks/profile-server-bring-up-runbook]] — task `0182`, the operator runbook for the same box
- [[tasks/profile-durability-restore-drill]] — task `0218`, the new `age` keypair and the proven restore
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, which created the new key and bucket
- [[decisions/sprint-4]] — the sprint board this task sat on
