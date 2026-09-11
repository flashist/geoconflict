# Cleanup — Purge obsolete secrets, and decide the fate of the OLD, now-separable bucket and its encrypted objects

## ID
0222

> 📌 **RESCOPED AND RENAMED 2026-09-04**, the same day it was filed. It was
> `0222-decommission-old-profile-infra-and-purge-obsolete-secrets` and it scoped a **decommission**.
> ⛔ **NOTHING IS DECOMMISSIONED.** Owner ruling, verbatim: *"We don't need to cancel any billings,
> the VPS and S3 I created will be reused."* The folder was renamed because the old name actively
> misleads; the ID is unchanged.

> 🚨 **PREMISE CORRECTED 2026-09-08 — THE BUCKET IS NOT REUSED. THIS TASK'S CENTRAL QUESTION CHANGED
> SHAPE.**
>
> **Owner ruling 2026-09-08, given live in session and relayed through the spawning session:**
> **a BRAND-NEW, CLEAN S3 bucket. NOT the existing one.**
> This **supersedes the 2026-09-04 reuse ruling AS TO THE BUCKET ONLY.**
> ✅ **The VPS half is UNCHANGED — the box is still reused in place. Still no decommission of the box,
> still no billing cancelled by this task.**
>
> **Consequence for this task — read before doing anything here:** the old bucket is now **fully
> separable** from the working setup. **Q3b was written on the reuse premise and had two options; it
> now has three.** See the reshaped decision below. ⚠️ **It is UNANSWERED and it is the OWNER'S — the
> producer has NOT answered it and must not.**
>
> ⚠️ The folder name still reads `...old-bucket-objects`. **Kept unchanged on purpose** — the folder
> is the task's identity and other files link to it. The scope is what the text says, not the folder.
>
> ⚠️ Prior text is **struck, not deleted.** Where a struck line and a correction disagree, **the
> correction wins.**

> ✅🚨 **2026-09-10 — Q3b IS ANSWERED AND CLOSED, *AND* A PREMISE THIS BRIEF CARRIED IS RETRACTED.
> TWO SEPARATE THINGS. DO NOT MERGE THEM.**
>
> **Owner ruling, given live in session and relayed through the spawning session. Verbatim:**
> *"I've already deleted the old bucket, it was empty, we never had anything there."*
>
> **(a) ✅ Q3b — CLOSED. Option (c) — delete / abandon the OLD BUCKET ENTIRELY — is in effect, and the
> owner has ALREADY EXECUTED IT.** The old bucket is deleted. Nothing remains for this task to decide
> or to do about it. ⛔ **This is a decision RECORDED, not an agent's choice** — the owner made it and
> carried it out.
>
> **(b) 🚨 A PREMISE IS RETRACTED — NOT MERELY SUPERSEDED. THE OLD BUCKET WAS EMPTY.** This brief
> asserted throughout that the old bucket held pre-existing encrypted backup objects which were
> **"permanently unreadable"** for want of the old `age` private identity, and that they were **"dead
> weight being paid for."** 🚨 **THAT IS FALSE. THOSE OBJECTS NEVER EXISTED.** There was nothing in
> the bucket, there never had been, and so there was never anything the missing key was withholding.
> Every such claim below is **struck, not deleted**, with this correction and its date, so the old
> story cannot be re-derived from the leftovers.
>
> ⚠️ **DO NOT EXTEND THIS RETRACTION BEYOND THE OBJECTS. THE LOST-`age`-KEY PROBLEM IS UNCHANGED AND
> STILL REAL.** The old private identity still has no recorded home, and
> [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) still owns
> generating a **NEW** keypair and recording **custodian, storage location and second copy** as an
> acceptance criterion. **What changed is only this: the old key turns out to have been protecting
> nothing.** ⛔ **That is not a reason to relax key custody — it is luck, not a control.**
>
> ~~🔴 **EXPLICITLY *NOT* CLOSED BY THIS RULING, AND STILL OWNED BY THIS TASK: THE OLD S3 ACCESS KEY
> MUST BE REVOKED AT THE PROVIDER.** ⛔ **Overwriting the local value does not revoke it. Deleting the
> bucket does not revoke it.** A live credential at the provider stays live until it is revoked
> there. 🚨 **Do NOT let this item be swept away with Q3b — closing Q3b does NOT close this.**~~
>
> 🚨 **SUPERSEDED LATER THE SAME DAY — 2026-09-10 — BY A SEPARATE OWNER RULING THAT CLOSES THIS TASK
> WITH THE KEY STILL UNREVOKED. Struck above, not deleted. ⛔ IT WAS NOT SATISFIED. READ THE NEXT
> SECTION BEFORE CONCLUDING ANYTHING ABOUT THIS KEY.**

---

## 🔴 CLOSED BY OWNER DECISION — THE OLD S3 ACCESS KEY WILL DELIBERATELY NOT BE REVOKED

> ⛔ **THIS SECTION IS THE REASON THIS TASK IS IN `done/`. READ IT BEFORE ANY OTHER PART OF THIS
> BRIEF.** ⛔ **The old S3 access key was NEVER REVOKED. It is NOT "resolved". It is NOT "revoked". It
> is NOT "no longer live." Nobody established what it can reach.** This task closed **on the owner's
> ruling, over a documented objection**, and both halves are recorded here on purpose.

### 🔒 STANDING — **CLOSED BY OWNER DECISION. DELIBERATELY NOT DONE. NOT OUTSTANDING WORK.**

> **STANDING (2026-09-11): CLOSED BY OWNER DECISION — deliberately not done.**
> ⛔ **This is NOT an open item. It is NOT "still to do". Do NOT pick it up, do NOT re-file it as a
> task, do NOT add it to another task's scope, and do NOT re-raise it as outstanding work.**

**Owner ruling, given live in the lead session 2026-09-11. Verbatim:**
*"Forget about the old S3 keys, mark this task as cancelled."*

**What the owner ruled:** the revocation **will not be done.** The residual recorded below on
2026-09-10 as an accepted-but-outstanding item is now **deliberately dropped**, by decision.

⚠️ **There was no open task to cancel.** The revocation was never re-filed as its own brief after
`0222` closed on 2026-09-10, so the owner's word *"cancelled"* is recorded here, against the residual
in this brief, rather than by moving any task file. ⛔ **No task file was moved and no mover skill was
invoked for this ruling — `0222` was already `Done` and stays `Done`.**

### 🚨 WHAT A DECISION NOT TO ACT DOES **NOT** CHANGE — read this before concluding anything

⛔ **A deliberate decision not to act is NOT the same as the risk not existing.** The standing above
changes who should act and whether anyone should re-raise it. It changes **nothing** about the facts,
which remain exactly as recorded:

- 🔴 **The key was NEVER REVOKED at the provider.** Not on 2026-09-10, not on 2026-09-11, not since.
- 🔴 **NOBODY ESTABLISHED ITS SCOPE.** It is **inert** if it was bucket-scoped to the deleted bucket.
  It **reaches the NEW backup bucket** — same account, same credentials — if it is account-wide.
  **Which of the two it is has never been checked and is recorded nowhere in this repository.**
- 🔴 **An objection on exactly that point was put to the owner and OVERRULED TWICE** — on
  **2026-09-10** (when this task closed) and again on **2026-09-11** (when the revocation was ruled
  deliberately not done). The objection is recorded in full below; it is kept because it was
  overruled, not because it was wrong.

⛔ **Do NOT soften this entry into "resolved", "revoked", "no longer live", or "no longer a risk."**
None of those is true, and writing any of them would erase the only trace of this.

### 📌 If this ever matters — what to check, and where the reasoning lives

**A future reader who finds an account-wide key on this account should be able to land here and
understand it was a choice.** If the question ever reopens:

1. **Check the key's POLICY AT THE PROVIDER first.** That single fact — bucket-scoped vs account-wide
   — settles whether this residual is inert or live, and it is the fact nobody ever established. **It
   is a provider-console lookup, not a repository question; nothing in this repo can answer it.**
2. **If it is bucket-scoped to the deleted bucket:** the owner's reasoning was correct, the key
   reaches nothing, and there is nothing to do. **Record the finding so it stops being unknown.**
3. **If it is account-wide:** it can list, overwrite or delete the **new** backup bucket. **That is a
   NEW decision for the owner** — argued in the open, on the record this brief carries. ⛔ **Not a
   licence for an agent to revoke it, and not a licence to quietly re-file it as a task.**
4. **The original reasoning, the objection as it was put, and the ruling that overruled it** are in
   the two sections immediately below, and the 2026-09-11 ruling is the section above. **Related
   standing hygiene tasks** (not this item, and they do not subsume it):
   [`0045`](../../backlog/0045-vps-registry-credential-hygiene/brief.md),
   [`0016`](../../backlog/0016-secret-management-beyond-env-files/brief.md).

🔒 **No key, no value, no bucket name, no endpoint, no account identifier appears anywhere in this
record** — naming the residual is the point, exposing it is not.

---

### The 2026-09-10 record, kept in full — the close, the objection, and what it rests on

**Owner ruling, given live in session 2026-09-10 and relayed through the spawning session. Verbatim:**
*"Mark the task as done: I've already deleted the old S3 bucket, meaning, the old credentials are
useless now."*

### The objection, as it was put to the owner — recorded because it was overruled, not because it was wrong

An objection was put to the owner **before** the ruling, and the owner ruled anyway. It said:

- **An S3 access key is a credential at the ACCOUNT level, not the bucket level.** Deleting a bucket
  removes the thing the key pointed at. **The key still exists and still authenticates.**
- **What it can still reach depends on the policy attached to it — and NOTHING IN THIS REPOSITORY
  RECORDS THAT POLICY.** This brief asserts in **five** places that the key must be revoked at the
  provider, and **never once records its scope.**
- 🚨 **If the key is account-wide, it can reach the NEW backup bucket** — same account, same
  credentials. That would mean **an untracked live credential able to list, overwrite or delete the
  very backups [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) is
  about to prove work.**

### The ruling, and what it rests on

The owner ruled: **close it anyway**, on the reasoning that the deleted bucket makes the credentials
useless.

### ⚠️ WHETHER THAT REASONING IS CORRECT IS NOT SETTLED — IN EITHER DIRECTION

⛔ **Do not read this section as saying the owner was wrong. Do not read it as saying the owner was
right.** Both readings are unsupported, for the same reason:

- **The owner's reasoning is CORRECT if the key was bucket-scoped.** A key scoped to a bucket that no
  longer exists really does reach nothing.
- **The owner's reasoning is WRONG if the key was account-wide.** Then it still reaches the account,
  the new bucket included.
- 🚨 **NOBODY CHECKED WHICH.** The scope was never established, and it is not recorded anywhere in
  this repository. **That is the whole of what is known.**

### How this is recorded, and why — for the future reader

**This is a KNOWINGLY ACCEPTED RESIDUAL:** an **unrevoked S3 access key of unknown scope**, objection
raised, objection overruled, task closed on the owner's ruling.

> 🚨 **STANDING UPDATED 2026-09-11 — this residual is no longer an open item.** As recorded on
> 2026-09-10 it read as *accepted but still to do*. The owner has since ruled the revocation
> **deliberately not done**: **CLOSED BY OWNER DECISION.** ⛔ **The facts below are UNCHANGED — the key
> was never revoked and its scope was never established.** See the
> `STANDING — CLOSED BY OWNER DECISION` section at the top of this brief.

⛔ **It is deliberately NOT recorded as "resolved", "revoked", or "no longer live",** because none of
those is true and writing any of them would erase the only trace of this.

🔴 **If it ever turns out that the key was account-wide, THIS ENTRY IS WHERE YOU LOOK.** It tells you:
the key was never revoked at the provider; nobody established its scope; and the decision to accept
that was the owner's, made with the objection in front of them on 2026-09-10.

🔒 **No key, no value, no bucket name, no endpoint, no account identifier appears anywhere in this
record** — naming the residual is the point, exposing it is not.

### 📌 The repo-side purge did NOT close with this task — it was carved out to `0240`

**Owner ruling, same session, 2026-09-10: *keep as a small open task.*** Deleting a bucket does not
touch a line of this repository, so **`PROFILE_ID_PEPPER` and the wider obsolete-variable sweep
(items 4 and 5 below) survive this close** as their own brief:

➡️ [`0240-purge-obsolete-profile-env-variables`](../../backlog/0240-purge-obsolete-profile-env-variables/brief.md)
— filed on the **Backlog board** on **2026-09-10**, at this task's close. Ranked **Low** *(producer's
rank — the owner ruled that it stays tracked, not what it is worth)*.

⛔ **The S3-key residual above is NOT in `0240` and must not be added to it.** It is closed here, on
the owner's ruling. **Re-filing it as a new task would quietly reverse that ruling.**

---

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**Medium** — small work, but it carries one **CRITICAL** owner decision (below) that has already been
closed prematurely once.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
Owner (the bucket-object decision) — fkit-coder for the repo-side purge.

## Depends on
Nothing structurally. ⚠️ **Sequencing judgement: do not delete or abandon anything in the OLD bucket
until [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) (P3) has
proven the NEW backup path works end to end.**
~~Reusing a bucket is not a reason to be hasty about emptying it.~~
~~🚨 **2026-09-08 — the sequencing judgement SURVIVES the correction, for a changed reason:** a
**separable** old bucket is *easier* to discard, which makes it *more* tempting to discard early.
**Prove the new path first. Do not discard the only other copy of anything before there is a proven
new one.**~~

🚨 **MOOT AS OF 2026-09-10 — struck, not deleted, and worth reading for why.** The owner deleted the
old bucket **before** `0218` proved the new backup path. **The guard above was not satisfied — it was
overtaken.** ✅ **No data was risked, because the bucket was EMPTY** (owner, 2026-09-10, verbatim:
*"I've already deleted the old bucket, it was empty, we never had anything there."*) — there was no
"only other copy" to lose. ⛔ **Do NOT read this as the guard having been wrong.** It was the right
rule on the information available; it simply guarded nothing. ⚠️ **The underlying rule — never discard
the only other copy of anything before a new path is proven — STANDS for every future bucket, and
`0218` is still unproven.**

## Context

### 🔴 THE `age` KEY QUESTION RE-OPENS — and this corrects an earlier instruction

**This task's first version recorded the old-key question as *"closed by owner decision"*, on the
grounds that a fresh start abandons the old bucket. THAT WAS PREMATURE. It is corrected here, in the
open, rather than quietly dropped.**

~~**The bucket is reused in place. Any pre-existing encrypted backup objects are STILL IN IT.**~~

🚨 **CORRECTED 2026-09-08 — owner ruling, live in session, superseding the 2026-09-04 reuse ruling as
to the bucket only: A BRAND-NEW, CLEAN BUCKET IS CREATED. The VPS is still reused in place.**

**The pre-existing encrypted objects sit in an OLD bucket that nothing on the new path touches.**

- They were encrypted to an `age` recipient whose **private identity has no recorded home.** Every
  reference in this repository is **policy** — no vault, no entry, no custodian, no second copy, and
  no readability check.
- 🚨 **When asked on 2026-09-04 what the `age` key was, the owner did not know.**
- ⇒ ~~**Without that private identity those objects are PERMANENTLY UNREADABLE.** They are dead weight
  in a bucket that is being paid for.~~
  🚨 **RETRACTED 2026-09-10 — owner ruling, verbatim: *"I've already deleted the old bucket, it was
  empty, we never had anything there."* THERE WERE NO OBJECTS.** The premise that the old bucket held
  pre-existing encrypted backups was **false** — nothing was ever stored there, so nothing was ever
  unreadable and nothing was ever being paid to store. ⛔ **This is a RETRACTION, not a supersession:
  the claim was not overtaken by events, it was never true.**
  ⚠️ **The two bullets ABOVE this one STAND UNCHANGED and are NOT retracted** — the old `age` private
  identity really does have no recorded home, and the owner really did not know what the key was when
  asked on 2026-09-04. **The key problem is real; what it was guarding was empty.**

> 🔴 ~~**LIVE OWNER DECISION...** **Purge the old encrypted objects — or keep them, pending a search
> for the old key?**~~
>
> 🚨 **RESHAPED 2026-09-08 — THE QUESTION CHANGED, IT WAS NOT ANSWERED.** The two-option framing above
> was written on the premise that the objects lived **inside the bucket we would keep using.** With a
> **brand-new** bucket in play, the old bucket is **fully separable**, so a **THIRD option exists**:
>
> 🔴 ~~**LIVE OWNER DECISION — Q3b, UNANSWERED, and the reason this task ranks `Medium` not `Low`:**~~
>
> ~~**(a) purge the old encrypted objects · (b) keep them pending a search for the old key ·
> (c) 🆕 delete / abandon the OLD BUCKET ENTIRELY, once the new path is proven.**~~
>
> ✅ **ANSWERED AND CLOSED 2026-09-10 — OPTION (c), ALREADY EXECUTED BY THE OWNER.** Struck above, not
> deleted. The owner deleted the old bucket. 🚨 **And the question turns out to have rested on a false
> premise: the bucket was EMPTY — options (a) and (b) were about objects that never existed.**

⚠️ ~~**All three options are defensible and the producer is deliberately not choosing:**~~
✅ **CLOSED 2026-09-10 — option (c) ruled and executed by the owner. The table below is kept as the
record of what was weighed, and is no longer a live choice.** ⚠️ **Read it knowing its "objects"
column was false throughout — the bucket was empty.**

| Option | For | Against |
|---|---|---|
| **(a) Purge the objects** | Stops paying to store bytes nobody can read; leaves an unambiguous bucket | If the key later turns up, whatever those objects held is gone for good |
| **(b) Keep pending a search** | Costs little; preserves the option | ⚠️ **A search that is never scheduled is just "keep forever"** — if this is chosen, it needs a date and an owner, or it is not a decision |
| **(c) 🆕 Abandon the whole OLD bucket** — newly possible on 2026-09-08, because it is no longer the bucket in use | Cleanest end state: one deletion, no residue, no half-emptied bucket to explain later; stops the storage bill outright | Same irreversibility as (a), and **wider** — the bucket goes with the objects. ⚠️ **Only after `0218` proves the new path.** ⚠️ **Confirm nothing else uses that bucket before choosing it** |

~~🚨 **Do not let this slide a THIRD time.** It was closed prematurely on 2026-09-04, re-opened the same
day, and **reshaped on 2026-09-08 — it has never once been answered.**~~
~~⛔ **An agent must NOT answer it.** It is the owner's, and it is irreversible in two of three
directions.~~

✅ **ANSWERED 2026-09-10 BY THE OWNER, on the owner's own initiative and already carried out.** The
full history is kept above rather than tidied away: closed prematurely 2026-09-04 → re-opened the same
day → reshaped 2026-09-08 → **answered 2026-09-10 as option (c)**. ⛔ **The 2026-09-04 premature close
was still a mistake at the time and is still recorded as one** — this later answer does not
retroactively excuse it.

### The other cleanup items

**1. `PROFILE_ID_PEPPER` — an obsolete secret still held.**
Still set in the local secret env file, although the ID-hashing approach was **abandoned and
reverted** — [`0187`](../../cancelled/0187-profile-hash-player-ids/brief.md) is cancelled and PR #127
was reverted. ✅ **It protects nothing; holding it is pure liability.**

**2. Stale backup credentials in the local env files.**
`PROFILE_BACKUP_S3_ENDPOINT`, `_BUCKET`, `_PREFIX`, `_ACCESS_KEY`, `_SECRET_KEY` and
`PROFILE_BACKUP_AGE_RECIPIENT` all currently hold **non-empty values from the old setup**.
~~⚠️ **The BUCKET is reused; the CREDENTIALS and the `age` KEYPAIR are re-issued** — different
decisions, and conflating them is how a half-migrated setup happens.~~
🚨 **CORRECTED 2026-09-08 — ALL SIX values are new, the BUCKET included. The VPS alone is reused.**
`0215` issues the new ones;
~~**this task makes sure the OLD access key is REVOKED AT THE PROVIDER, not merely overwritten
locally.** 🚨 **An overwritten local value is still a LIVE credential at the provider until it is
revoked there.**~~
🔒 **STALE — struck, not deleted. NOBODY makes sure of this: CLOSED BY OWNER DECISION 2026-09-11 — the
revocation will DELIBERATELY NOT BE DONE.** ⚠️ **The technical point in the struck sentence was never
refuted, only overruled** — an overwritten local value really is a live credential until revoked, and
it was never revoked.
~~🔴 **THIS ITEM IS UNCHANGED BY THE 2026-09-08 RULING AND IS STILL NOT DONE.** It is **independent of
whatever is decided about the old bucket** — revoking the key is required whether the old bucket is
purged, kept, or abandoned.~~

🚨 **CLOSED 2026-09-10 AS A KNOWINGLY ACCEPTED RESIDUAL — NOT DONE, NOT REVOKED. Struck above, not
deleted.** The owner ruled this task closed with the key still unrevoked, over a documented objection,
on the reasoning that the deleted bucket makes the credentials useless. ⛔ **The key still exists,
still authenticates, and NOBODY ESTABLISHED ITS SCOPE — the owner's reasoning is correct if the key
was bucket-scoped and wrong if it was account-wide, and that was never checked.**
🔒 **STANDING, 2026-09-11 — CLOSED BY OWNER DECISION: DELIBERATELY NOT DONE, NOT OUTSTANDING WORK.**
🔴 **Full record, including the objection and both rulings: the `CLOSED BY OWNER DECISION` section at
the top of this brief. Read it before relying on anything in this paragraph.**

### ⛔ What this task is NOT

- **Not a VPS decommission.** The **VPS** is kept and reused; no box is torn down.
  ~~The VPS and the bucket are **kept and reused**.~~
  🚨 **CORRECTED 2026-09-08 — the BUCKET half is no longer true.** A **new** bucket is created, and
  ~~**whether the OLD bucket survives at all is exactly the open decision above (option c).**~~
  ✅ **SETTLED 2026-09-10: it did not survive — the owner deleted it (option c).** **No billing is
  stopped by this task on its own initiative**, and the box is still untouched. ⚠️ **The bucket was
  empty, so its deletion stopped no meaningful storage cost either** — the earlier expectation that it
  would rested on the retracted premise.
- **Not a recovery effort.** Searching for the old `age` key is an *option the owner may choose*, not
  work this task performs on its own initiative.

## What to build

1. ~~🔴 **Put the RESHAPED Q3b decision to the owner** — **all THREE options** from the table above
   (purge objects · keep pending a search · **abandon the whole old bucket**) — and record the
   ruling. **If "keep pending a search" is chosen, capture a DATE and an OWNER for that search** —
   otherwise record it honestly as *"keep indefinitely"*, which is a different decision and should be
   named as one. ⚠️ **State plainly to the owner that the third option only exists because of the
   2026-09-08 new-bucket ruling.**~~
   ✅ **DONE 2026-09-10 — the owner ruled option (c) unprompted. Nothing left to put to anyone.**
2. ~~**Act on the ruling.** If purge **or** bucket-abandonment: ⚠️ **only after `0218` has proven the
   new backup path works**; record what was removed **by count and date** — and if the whole bucket
   went, say so as its own line. 🔒 **Never by name or key. 🔒 Never name the bucket.**
   ⚠️ **Before abandoning the bucket, confirm nothing else writes to or reads from it.**~~
   ✅ **DONE 2026-09-10 — by the OWNER, not by this task.** The old bucket is **deleted**. **Count of
   objects removed: ZERO — the bucket was empty and always had been.** 🔒 Bucket not named, here or
   anywhere.
3. ~~🔴 **STILL OPEN — THE ONLY REMAINING BUCKET-SIDE ITEM. Revoke the OLD S3 credentials at the
   provider.** ⚠️ **Overwriting the local value revokes nothing. Deleting the bucket revokes nothing
   either.** 🚨 **Item 2 closing does NOT close this one** — they are different acts against different
   systems, and the access key is a live credential at the provider until revoked there.~~
   🚨 **NOT DONE. CLOSED 2026-09-10 AS A KNOWINGLY ACCEPTED RESIDUAL, ON THE OWNER'S RULING, OVER A
   DOCUMENTED OBJECTION.** ⛔ **The key was never revoked and its scope was never established.** Full
   record at the top of this brief. ⛔ **Do not re-file this item as a new task — that would reverse
   the owner's ruling.**
   🔒 **STANDING, 2026-09-11: CLOSED BY OWNER DECISION — DELIBERATELY NOT DONE.** Owner, verbatim:
   *"Forget about the old S3 keys, mark this task as cancelled."* ⛔ **This item is NOT outstanding
   work. Nobody should pick it up or re-raise it.** ⚠️ **And that changes no fact: the key was never
   revoked, and its scope — inert if bucket-scoped, reaching the NEW bucket if account-wide — was
   never established.**
4. ➡️ **CARVED OUT 2026-09-10 TO
   [`0240`](../../backlog/0240-purge-obsolete-profile-env-variables/brief.md) — NOT closed with this task.**
   ~~**Remove `PROFILE_ID_PEPPER`** from the local secret env file, and from any documentation still
   listing it as required. Check `example.env.profile`, `setup-profile.sh` and
   `build-deploy-profile.sh` for references. ⚠️ **If a script still reads it, removing the value
   silently changes behaviour** — check before deleting.~~
   **Owner ruling 2026-09-10: *keep as a small open task.*** The bucket deletion this task closed on
   touches no line of this repository, so the purge is still real work — it now lives in `0240`,
   ranked `Low` *(producer's rank)*, on the **Backlog board**.
5. ➡️ **CARVED OUT 2026-09-10 TO
   [`0240`](../../backlog/0240-purge-obsolete-profile-env-variables/brief.md) — NOT closed with this task.**
   ~~**Sweep for other variables belonging to reverted or cancelled approaches.** `0187` is the known
   one; `0169`/`0171` (the cancelled guest-first story) may have left others. **Report what is found;
   do not delete anything whose consumer you have not checked.**~~
   🚨 **The consumer check carried over into `0240` as a hard acceptance criterion**, not a note — it
   is the `0062`/`0063`/`0195` class of silent deploy break.
6. **Record the whole thing in the worklog** — what was found, what was ruled, what was revoked, what
   was deleted, and on what date. 🚨 **This record IS the point of the task.** The reason any of this
   was confusing is that the previous setup's state was never written down.

## Verification steps

1. ✅ **SATISFIED 2026-09-10 — Q3b is RULED and RECORDED: option (c), abandon the whole old bucket**,
   ruled and executed by the owner. Recorded in this brief, in
   [`0213`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md), in
   [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) and on the
   [Sprint 4](../../../sprints/plan-sprint-4.md) rows. **Which of the three: (c).** No paraphrase.
2. ✅ **SATISFIED 2026-09-10 — the bucket is gone. Count: ZERO objects (it was empty).** 🔒 No object
   names, no keys, no bucket names in the record.
   ⚠️ **HONEST DEVIATION, recorded not hidden: it did NOT happen after `0218` proved the new backup
   path — `0218` is still open and the new path is still unproven.** The owner deleted the bucket
   first. **This cost nothing only because the bucket was empty.** ⛔ **Do not cite this as precedent
   for deleting a non-empty bucket ahead of a proven restore.**
3. 🚨 **NOT SATISFIED. WAIVED 2026-09-10 BY OWNER RULING, OVER A DOCUMENTED OBJECTION.**
   ~~🔴 **STILL OPEN — the old S3 credentials are REVOKED AT THE PROVIDER**, not merely overwritten
   locally. **State which of the two was done** — they are not the same act, and the distinction is
   the whole item. 🚨 **Unchanged by the 2026-09-10 Q3b close; the deleted bucket does not satisfy
   this. THIS IS WHAT KEEPS `0222` OPEN.**~~
   ⛔ **State plainly which of the two was done: NEITHER.** The key was **not revoked at the provider**
   and the local value's fate is not what this step was about. **The bucket was deleted; the key was
   not touched.** ⚠️ **Whether that suffices is UNSETTLED — correct if the key was bucket-scoped,
   wrong if it was account-wide, and nobody checked.** Recorded as a **knowingly accepted residual**;
   full record at the top of this brief.
   🔒 **STANDING, 2026-09-11 — CLOSED BY OWNER DECISION, DELIBERATELY NOT DONE.** This step will never
   be satisfied, by the owner's choice, and it is **not** a gap anyone is expected to close. ⛔ **Not
   satisfied ≠ resolved.**
4. ➡️ **CARVED OUT TO [`0240`](../../backlog/0240-purge-obsolete-profile-env-variables/brief.md) 2026-09-10 —
   this step is `0240`'s to satisfy, not this task's.**
   ~~**`PROFILE_ID_PEPPER` is gone** from the local secret env file, and no script or document still
   requires it — confirmed by a search across `setup-profile.sh`, `build-deploy-profile.sh`,
   `example.env.profile` and the knowledge-base.~~
   ⛔ **NOT satisfied here, and NOT waived** — it moved, on the owner's ruling that it stay tracked.
5. ➡️ **CARVED OUT TO [`0240`](../../backlog/0240-purge-obsolete-profile-env-variables/brief.md) 2026-09-10.**
   ~~**No script broke** — the deploy harness (`tests/scripts/profile-deploy-hardening.test.sh`) still
   passes and `npm test` is unchanged.~~
   ⚠️ **This task changed no script and ran no build**, so there was nothing here to break. The check
   belongs with the edits, which are now `0240`'s.
6. **The VPS was NOT decommissioned** — explicitly confirm the box is still in place. ⚠️ **If the box
   or its billing was cancelled, that is a defect against this task's scope**, not a bonus.
   ~~explicitly confirm the VPS and bucket are still in place~~ 🚨 **CORRECTED 2026-09-08 — the OLD
   BUCKET is exempt from this check**, because its removal is a legitimate outcome of the Q3b ruling.
   **State which outcome was ruled, and that the VPS is untouched either way.**
7. 🔒 **No values, no bucket names, no endpoints, no IPs, no account identifiers** anywhere.

## Notes

- **Effort: ~0.5 day, mostly owner decision. Risk: Low — except the `age` decision, which is
  irreversible in one direction.**
- ✅ **Q3b — CLOSED 2026-09-10. Option (c): the OLD BUCKET IS DELETED**, ruled and executed by the
  owner. *(Was: what happens to the OLD encrypted objects, and to the OLD BUCKET itself?* ~~in the
  reused bucket~~ *reshaped 2026-09-08 from two options to three.)* Full trail, kept: closed
  prematurely 2026-09-04 → re-opened the same day → reshaped 2026-09-08 → **answered 2026-09-10.**
  🚨 **AND THE QUESTION RESTED ON A FALSE PREMISE — THE BUCKET WAS EMPTY.** There were no encrypted
  objects, so nothing was ever "permanently unreadable" and nothing was ever "dead weight being paid
  for." **Retracted, not superseded.** ⚠️ **Distinct from Q3**, which is about the **NEW** key's
  custody, belongs to `0218`, and is **untouched by any of this**.
- 🔴🚨 **THE RESIDUAL THIS TASK CLOSED WITH — AN UNREVOKED S3 ACCESS KEY OF UNKNOWN SCOPE.**
  ~~**STILL OPEN AND STILL NOT DONE — unchanged by the 2026-09-08 ruling AND unchanged by the
  2026-09-10 Q3b close: the OLD S3 ACCESS KEY MUST BE REVOKED AT THE PROVIDER.** An overwritten local
  value is a **live credential** until revoked there, and **deleting the bucket does not revoke it
  either**. 🚨 **This item is NOT swept away with Q3b** — it was always independent of the old
  bucket's fate, and now that the bucket is gone it is **the item keeping this task open.**~~
  🚨 **CLOSED 2026-09-10 ON THE OWNER'S RULING, OVER A DOCUMENTED OBJECTION — as a KNOWINGLY ACCEPTED
  RESIDUAL. ⛔ NOT "resolved", NOT "revoked", NOT "no longer live."** The key was never revoked at the
  provider, and **nobody established its scope.** ⚠️ **The owner's reasoning — a deleted bucket makes
  the credentials useless — is correct if the key was bucket-scoped and wrong if it was account-wide.
  Which it is was never checked, and this brief does not claim either.** 🔴 **Full record, with the
  objection as it was put and the ruling that overruled it: the
  `CLOSED BY OWNER DECISION` section at the top of this brief.**
  🔒 **STANDING, 2026-09-11 — CLOSED BY OWNER DECISION, DELIBERATELY NOT DONE.** Owner, verbatim:
  *"Forget about the old S3 keys, mark this task as cancelled."* **The revocation will not be done.**
  ⛔ **It is NOT outstanding work — do not pick it up, re-file it, or re-raise it.** ⚠️ **The
  objection was overruled TWICE, on 2026-09-10 and again on 2026-09-11, and the facts are unchanged:
  never revoked, scope never established.** ⛔ **A decision not to act is not the risk not existing.**
- ➡️ **The repo-side purge did NOT close with this task.** `PROFILE_ID_PEPPER` and the wider
  obsolete-variable sweep were **carved out to
  [`0240`](../../backlog/0240-purge-obsolete-profile-env-variables/brief.md) on 2026-09-10**, at this close, on
  the owner's ruling *"keep as a small open task."* Filed on the **Backlog board**, ranked `Low`
  *(producer's rank)*. ⛔ **The S3-key residual is NOT in `0240` and must not be added to it.**
- ⚠️ **The lost old `age` key is NOT retracted.** Only the claim about *what it was protecting* is.
  The old private identity still has no recorded home; `0218` still owns generating a **new** keypair
  and recording **custodian, storage location and second copy** as an acceptance criterion. **The old
  key protected nothing — that is luck, not a control, and it changes no requirement.**
- ✅ **Q7 is CLOSED as to the VPS** — *"what is still billing, what should be cancelled?"* Owner
  2026-09-04: *"We don't need to cancel any billings."* **The box is not decommissioned.**
  ⚠️ ~~**2026-09-08 caveat:** with a new bucket in use, **the OLD bucket's storage line is now in scope
  of the Q3b ruling** (option c). That is not a reopening of Q7 — it is the consequence of the
  new-bucket ruling, and only the owner may rule it.~~
  ✅ **RESOLVED 2026-09-10 — the owner ruled it and deleted the old bucket.** ⚠️ **The "storage line"
  framing was itself part of the false premise: an empty bucket was storing nothing.** The box's
  billing is still untouched, exactly as Q7 records.
- **Why this is a separate task:** its principal actor is the **owner making a judgement call**, and
  folding it into an engineering task is how it would get quietly dropped — which is exactly what
  happened to it once already.
- **Related:** [`0016`](../../backlog/0016-secret-management-beyond-env-files/brief.md),
  [`0045`](../../backlog/0045-vps-registry-credential-hygiene/brief.md),
  [`0047`](../../backlog/0047-deploy-transport-secret-hygiene/brief.md). **This task does not subsume any of
  them** — the standing hygiene questions stay where they are.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — no values, no lengths, no IPs, no hostnames, no bucket names.
</content>
