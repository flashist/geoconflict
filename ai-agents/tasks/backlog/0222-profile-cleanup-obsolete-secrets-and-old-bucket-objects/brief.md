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

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**Medium** — small work, but it carries one **CRITICAL** owner decision (below) that has already been
closed prematurely once.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🔲 Backlog

## Owner
Owner (the bucket-object decision) — fkit-coder for the repo-side purge.

## Depends on
Nothing structurally. ⚠️ **Sequencing judgement: do not delete or abandon anything in the OLD bucket
until [`0218`](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) (P3) has
proven the NEW backup path works end to end.**
~~Reusing a bucket is not a reason to be hasty about emptying it.~~
🚨 **2026-09-08 — the sequencing judgement SURVIVES the correction, for a changed reason:** a
**separable** old bucket is *easier* to discard, which makes it *more* tempting to discard early.
**Prove the new path first. Do not discard the only other copy of anything before there is a proven
new one.**

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
- ⇒ **Without that private identity those objects are PERMANENTLY UNREADABLE.** They are dead weight
  in a bucket that is being paid for.

> 🔴 ~~**LIVE OWNER DECISION...** **Purge the old encrypted objects — or keep them, pending a search
> for the old key?**~~
>
> 🚨 **RESHAPED 2026-09-08 — THE QUESTION CHANGED, IT WAS NOT ANSWERED.** The two-option framing above
> was written on the premise that the objects lived **inside the bucket we would keep using.** With a
> **brand-new** bucket in play, the old bucket is **fully separable**, so a **THIRD option exists**:
>
> 🔴 **LIVE OWNER DECISION — Q3b, UNANSWERED, and the reason this task ranks `Medium` not `Low`:**
>
> **(a) purge the old encrypted objects · (b) keep them pending a search for the old key ·
> (c) 🆕 delete / abandon the OLD BUCKET ENTIRELY, once the new path is proven.**

⚠️ **All three options are defensible and the producer is deliberately not choosing:**

| Option | For | Against |
|---|---|---|
| **(a) Purge the objects** | Stops paying to store bytes nobody can read; leaves an unambiguous bucket | If the key later turns up, whatever those objects held is gone for good |
| **(b) Keep pending a search** | Costs little; preserves the option | ⚠️ **A search that is never scheduled is just "keep forever"** — if this is chosen, it needs a date and an owner, or it is not a decision |
| **(c) 🆕 Abandon the whole OLD bucket** — newly possible on 2026-09-08, because it is no longer the bucket in use | Cleanest end state: one deletion, no residue, no half-emptied bucket to explain later; stops the storage bill outright | Same irreversibility as (a), and **wider** — the bucket goes with the objects. ⚠️ **Only after `0218` proves the new path.** ⚠️ **Confirm nothing else uses that bucket before choosing it** |

🚨 **Do not let this slide a THIRD time.** It was closed prematurely on 2026-09-04, re-opened the same
day, and **reshaped on 2026-09-08 — it has never once been answered.**
⛔ **An agent must NOT answer it.** It is the owner's, and it is irreversible in two of three
directions.

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
**this task makes sure the OLD access key is REVOKED AT THE PROVIDER, not merely overwritten
locally.** 🚨 **An overwritten local value is still a LIVE credential at the provider until it is
revoked there.**
🔴 **THIS ITEM IS UNCHANGED BY THE 2026-09-08 RULING AND IS STILL NOT DONE.** It is **independent of
whatever is decided about the old bucket** — revoking the key is required whether the old bucket is
purged, kept, or abandoned.

### ⛔ What this task is NOT

- **Not a VPS decommission.** The **VPS** is kept and reused; no box is torn down.
  ~~The VPS and the bucket are **kept and reused**.~~
  🚨 **CORRECTED 2026-09-08 — the BUCKET half is no longer true.** A **new** bucket is created, and
  **whether the OLD bucket survives at all is exactly the open decision above (option c).** So:
  **no billing is stopped by this task on its own initiative** — but the owner's ruling on Q3b may
  itself stop the old bucket's storage cost. **That is a ruling to record, not a scope creep.**
- **Not a recovery effort.** Searching for the old `age` key is an *option the owner may choose*, not
  work this task performs on its own initiative.

## What to build

1. 🔴 **Put the RESHAPED Q3b decision to the owner** — **all THREE options** from the table above
   (purge objects · keep pending a search · **abandon the whole old bucket**) — and record the
   ruling. **If "keep pending a search" is chosen, capture a DATE and an OWNER for that search** —
   otherwise record it honestly as *"keep indefinitely"*, which is a different decision and should be
   named as one. ⚠️ **State plainly to the owner that the third option only exists because of the
   2026-09-08 new-bucket ruling.**
2. **Act on the ruling.** If purge **or** bucket-abandonment: ⚠️ **only after `0218` has proven the
   new backup path works**; record what was removed **by count and date** — and if the whole bucket
   went, say so as its own line. 🔒 **Never by name or key. 🔒 Never name the bucket.**
   ⚠️ **Before abandoning the bucket, confirm nothing else writes to or reads from it.**
3. **Revoke the OLD S3 credentials at the provider.** ⚠️ **Overwriting the local value revokes
   nothing.**
4. **Remove `PROFILE_ID_PEPPER`** from the local secret env file, and from any documentation still
   listing it as required. Check `example.env.profile`, `setup-profile.sh` and
   `build-deploy-profile.sh` for references. ⚠️ **If a script still reads it, removing the value
   silently changes behaviour** — check before deleting.
5. **Sweep for other variables belonging to reverted or cancelled approaches.** `0187` is the known
   one; `0169`/`0171` (the cancelled guest-first story) may have left others. **Report what is found;
   do not delete anything whose consumer you have not checked.**
6. **Record the whole thing in the worklog** — what was found, what was ruled, what was revoked, what
   was deleted, and on what date. 🚨 **This record IS the point of the task.** The reason any of this
   was confusing is that the previous setup's state was never written down.

## Verification steps

1. 🔴 **Q3b is RULED and RECORDED** — purge the objects, keep with a named date and owner, **or
   abandon the whole old bucket**. ⚠️ **"We'll figure it out later" is not a recorded decision** and
   leaves this task open. ⚠️ **The record states which of the THREE options was chosen**, not a
   paraphrase.
2. **If purge or bucket-abandonment was ruled:** the objects (or the bucket) are gone, the count and
   date are recorded, and it happened **after** `0218` proved the new backup path. 🔒 **No object
   names, no keys, no bucket names in the record.**
3. **The old S3 credentials are REVOKED AT THE PROVIDER**, not merely overwritten locally. **State
   which of the two was done** — they are not the same act, and the distinction is the whole item.
4. **`PROFILE_ID_PEPPER` is gone** from the local secret env file, and no script or document still
   requires it — confirmed by a search across `setup-profile.sh`, `build-deploy-profile.sh`,
   `example.env.profile` and the knowledge-base.
5. **No script broke** — the deploy harness (`tests/scripts/profile-deploy-hardening.test.sh`) still
   passes and `npm test` is unchanged.
6. **The VPS was NOT decommissioned** — explicitly confirm the box is still in place. ⚠️ **If the box
   or its billing was cancelled, that is a defect against this task's scope**, not a bonus.
   ~~explicitly confirm the VPS and bucket are still in place~~ 🚨 **CORRECTED 2026-09-08 — the OLD
   BUCKET is exempt from this check**, because its removal is a legitimate outcome of the Q3b ruling.
   **State which outcome was ruled, and that the VPS is untouched either way.**
7. 🔒 **No values, no bucket names, no endpoints, no IPs, no account identifiers** anywhere.

## Notes

- **Effort: ~0.5 day, mostly owner decision. Risk: Low — except the `age` decision, which is
  irreversible in one direction.**
- **Open question this task owns:** 🔴 **Q3b — what happens to the OLD encrypted objects, and now to
  the OLD BUCKET itself?** ~~in the reused bucket~~
  🚨 **RESHAPED 2026-09-08 — three options, not two** (purge objects · keep pending a search ·
  **abandon the whole old bucket**), because the 2026-09-08 new-bucket ruling made the old bucket
  fully separable.
  🔴 **STATUS: UNANSWERED. It is the OWNER'S.** Closed prematurely 2026-09-04, re-opened the same day,
  reshaped 2026-09-08 — **never once answered.** ⚠️ **Distinct from Q3**, which is about the **NEW**
  key's custody and belongs to `0218`.
- 🔴 **STILL OPEN AND STILL NOT DONE, unchanged by the 2026-09-08 ruling: the OLD S3 ACCESS KEY MUST
  BE REVOKED AT THE PROVIDER.** An overwritten local value is a **live credential** until revoked
  there. **This is independent of whatever happens to the old bucket** — it is required under all
  three Q3b outcomes.
- ✅ **Q7 is CLOSED as to the VPS** — *"what is still billing, what should be cancelled?"* Owner
  2026-09-04: *"We don't need to cancel any billings."* **The box is not decommissioned.**
  ⚠️ **2026-09-08 caveat:** with a new bucket in use, **the OLD bucket's storage line is now in scope
  of the Q3b ruling** (option c). That is not a reopening of Q7 — it is the consequence of the
  new-bucket ruling, and only the owner may rule it.
- **Why this is a separate task:** its principal actor is the **owner making a judgement call**, and
  folding it into an engineering task is how it would get quietly dropped — which is exactly what
  happened to it once already.
- **Related:** [`0016`](../0016-secret-management-beyond-env-files/brief.md),
  [`0045`](../0045-vps-registry-credential-hygiene/brief.md),
  [`0047`](../0047-deploy-transport-secret-hygiene/brief.md). **This task does not subsume any of
  them** — the standing hygiene questions stay where they are.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — no values, no lengths, no IPs, no hostnames, no bucket names.
</content>
