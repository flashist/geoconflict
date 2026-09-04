# Cleanup — Purge obsolete secrets, and decide the fate of the old encrypted objects in the reused bucket

## ID
0222

> 📌 **RESCOPED AND RENAMED 2026-09-04**, the same day it was filed. It was
> `0222-decommission-old-profile-infra-and-purge-obsolete-secrets` and it scoped a **decommission**.
> ⛔ **NOTHING IS DECOMMISSIONED.** Owner ruling, verbatim: *"We don't need to cancel any billings,
> the VPS and S3 I created will be reused."* The folder was renamed because the old name actively
> misleads; the ID is unchanged.

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
Nothing structurally. ⚠️ **Sequencing judgement: do not delete anything from the bucket until
[`0218`](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) (P3) has proven
the NEW backup path works end to end.** Reusing a bucket is not a reason to be hasty about emptying
it.

## Context

### 🔴 THE `age` KEY QUESTION RE-OPENS — and this corrects an earlier instruction

**This task's first version recorded the old-key question as *"closed by owner decision"*, on the
grounds that a fresh start abandons the old bucket. THAT WAS PREMATURE. It is corrected here, in the
open, rather than quietly dropped.**

**The bucket is reused in place. Any pre-existing encrypted backup objects are STILL IN IT.**

- They were encrypted to an `age` recipient whose **private identity has no recorded home.** Every
  reference in this repository is **policy** — no vault, no entry, no custodian, no second copy, and
  no readability check.
- 🚨 **When asked on 2026-09-04 what the `age` key was, the owner did not know.**
- ⇒ **Without that private identity those objects are PERMANENTLY UNREADABLE.** They are dead weight
  in a bucket that is being paid for.

> 🔴 **LIVE OWNER DECISION, and the whole reason this task has a `Medium` rank rather than a `Low`:**
>
> **Purge the old encrypted objects — or keep them, pending a search for the old key?**

⚠️ **Both options are defensible and the producer is deliberately not choosing:**

| Option | For | Against |
|---|---|---|
| **Purge** | Stops paying to store bytes nobody can read; leaves an unambiguous bucket | If the key later turns up, whatever those objects held is gone for good |
| **Keep pending a search** | Costs little; preserves the option | ⚠️ **A search that is never scheduled is just "keep forever"** — if this is chosen, it needs a date and an owner, or it is not a decision |

🚨 **Do not let this slide a second time.** It has already been closed once on a premise that changed.

### The other cleanup items

**1. `PROFILE_ID_PEPPER` — an obsolete secret still held.**
Still set in the local secret env file, although the ID-hashing approach was **abandoned and
reverted** — [`0187`](../../cancelled/0187-profile-hash-player-ids/brief.md) is cancelled and PR #127
was reverted. ✅ **It protects nothing; holding it is pure liability.**

**2. Stale backup credentials in the local env files.**
`PROFILE_BACKUP_S3_ENDPOINT`, `_BUCKET`, `_PREFIX`, `_ACCESS_KEY`, `_SECRET_KEY` and
`PROFILE_BACKUP_AGE_RECIPIENT` all currently hold **non-empty values from the old setup**.
⚠️ **The BUCKET is reused; the CREDENTIALS and the `age` KEYPAIR are re-issued** — different
decisions, and conflating them is how a half-migrated setup happens. `0215` issues the new ones;
**this task makes sure the OLD access key is revoked at the provider, not merely overwritten
locally.** 🚨 **An overwritten local value is still a live credential at the provider until it is
revoked there.**

### ⛔ What this task is NOT

- **Not a decommission.** Nothing is cancelled, nothing is torn down, no billing is stopped. The VPS
  and the bucket are **kept and reused**.
- **Not a recovery effort.** Searching for the old `age` key is an *option the owner may choose*, not
  work this task performs on its own initiative.

## What to build

1. 🔴 **Put the bucket-object decision to the owner** with the table above, and record the ruling.
   **If "keep pending a search" is chosen, capture a DATE and an OWNER for that search** — otherwise
   record it honestly as *"keep indefinitely"*, which is a different decision and should be named as
   one.
2. **Act on the ruling.** If purge: delete the old encrypted objects, ⚠️ **after `0218` has proven the
   new backup path works**, and record what was removed by count and date. 🔒 **Never by name or
   key.**
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

1. 🔴 **The bucket-object decision is RULED and RECORDED** — purge, or keep with a named date and
   owner. ⚠️ **"We'll figure it out later" is not a recorded decision** and leaves this task open.
2. **If purge was ruled:** the objects are gone, the count and date are recorded, and it happened
   **after** `0218` proved the new backup path. 🔒 **No object names or keys in the record.**
3. **The old S3 credentials are REVOKED AT THE PROVIDER**, not merely overwritten locally. **State
   which of the two was done** — they are not the same act, and the distinction is the whole item.
4. **`PROFILE_ID_PEPPER` is gone** from the local secret env file, and no script or document still
   requires it — confirmed by a search across `setup-profile.sh`, `build-deploy-profile.sh`,
   `example.env.profile` and the knowledge-base.
5. **No script broke** — the deploy harness (`tests/scripts/profile-deploy-hardening.test.sh`) still
   passes and `npm test` is unchanged.
6. **Nothing was decommissioned** — explicitly confirm the VPS and bucket are still in place. ⚠️ **If
   anything was cancelled, that is a defect against this task's scope**, not a bonus.
7. 🔒 **No values, no bucket names, no endpoints, no IPs, no account identifiers** anywhere.

## Notes

- **Effort: ~0.5 day, mostly owner decision. Risk: Low — except the `age` decision, which is
  irreversible in one direction.**
- **Open question this task owns:** 🔴 **Q3b — what happens to the OLD encrypted objects in the
  reused bucket?** Re-opened 2026-09-04 after being closed prematurely. ⚠️ **Distinct from Q3**, which
  is about the **NEW** key's custody and belongs to `0218`.
- ✅ **Q7 is CLOSED** — *"what is still billing, what should be cancelled?"* Owner: *"We don't need to
  cancel any billings."* **Nothing is decommissioned.**
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
