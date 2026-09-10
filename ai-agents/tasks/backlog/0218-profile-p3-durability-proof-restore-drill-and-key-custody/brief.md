# P3 — Durability proof: a restore drill on non-empty data, and a recorded home for the new `age` key

## ID
0218

> 🚨 **PREMISE CORRECTED 2026-09-08 — THE BUCKET IS NOT REUSED.**
>
> **Owner ruling 2026-09-08, given live in session and relayed through the spawning session:**
> **a BRAND-NEW, CLEAN S3 bucket. NOT the existing one.**
>
> This **supersedes the 2026-09-04 reuse ruling AS TO THE BUCKET ONLY.**
> ✅ **The VPS half is UNCHANGED — the box is still reused in place.**
>
> **What this changes for THIS task:** the "backward risk" below is **no longer on the new backup
> path.** The old objects live in a **separate, abandonable bucket**. ⚠️ **The forward risk — the NEW
> key's custody — is UNCHANGED and is still the whole point of this phase.**
>
> ⚠️ Prior text is **struck, not deleted.** Where a struck line and a correction disagree, **the
> correction wins.**

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High — and this is the phase with the highest consequence of being skipped.** Every other phase
degrades a service; this one loses the data.

⚠️ **The `High` label is the producer's.** 🔴 **The POSITION/ORDER is OWNER-RULED — see directly below.**

---

🔴 **WORK ORDER OWNER-RULED 2026-09-10, given live in session and relayed through the spawning
session: `0218` (P3) → `0219` (P4) → `0217` (P2).**

🚨 **THIS RUNS P2 *AFTER* P3 AND P4 — the epic's own P-number sequence is DELIBERATELY INVERTED.
⛔ DO NOT "FIX" IT BACK.** The P-numbers record the order the phases were **written** in on
2026-09-04, not the order they are to be **worked** in.

⚠️ **The owner ruled RANK/ORDER, NOT schedule** — ⛔ **`## Status` below is UNCHANGED, no mover skill
was invoked, and this brief stays under `ai-agents/tasks/backlog/`. SCHEDULED IS NOT STARTED.**
⚠️ **The `High` LABEL above is still the producer's** — the owner ruled position, not label.

**The reasoning, recorded because the order is not the obvious one:**

- **`0218` leads** — the restore path is the **only claim in this epic still resting on faith**.
  Backups **encrypt and upload — proven**; that a backup **RESTORES is UNPROVEN**, and the old
  bucket's objects are permanently unreadable for exactly that reason. ✅ **Cheapest to prove NOW,
  while every table has ZERO rows.**
- **`0219` second** — it owns the monitoring gap for **both** unread signals on that box: the
  **certificate renewal log** and **`/opt/profile/backups/last-backup.json`**. **Capability is proven
  for both; nobody is watching either.** **Dated fuse: the certificate's `notAfter` is 2026-11-20 and
  `setup-profile.sh:983`'s twice-daily `certbot renew` starts attempting from ~2026-10-21.**
- **`0217` last** — it is the step that **ENDS THE FREE WINDOW**: once the game server is wired and
  **real citizen rows exist**, the restore drill and any Postgres work **stop being free**.
  ⛔ **LAST IS NOT DEPRIORITIZED — deliberate sequencing, rank unchanged.**

⚠️ **The `Depends on` relationships are UNCHANGED.** The ruling set the order these are worked in; it
did **not** create or remove a technical dependency. 🔒 **ADR-035: the repositioning lift was granted
for THESE MOVES ONLY — not a standing licence, not precedent.**

📌 **`0220` (P5), `0221` (P6) and `0222` (Cleanup) were NOT ruled** — they keep their existing
positions and the producer's ranks.

## Status
🔲 Backlog

## Owner
fkit-coder / operator — **plus a required owner action** (key custody).

## Depends on
[`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box with the backup path configured
against a **brand-new, clean** bucket (🚨 **owner ruling 2026-09-08 — NOT the old one**) and a
**newly generated** `age` keypair.

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

~~**Owner ruling 2026-09-04, superseding the earlier one:** *"We don't need to cancel any billings,
the VPS and S3 I created will be reused."* — confirmed: *"Both exist — reuse them in place."*~~

~~⇒ 🚨 **The bucket is REUSED, so any pre-existing encrypted backup objects are STILL IN IT** — and
without the old `age` private identity they are **permanently unreadable**, dead weight in a bucket
that is being paid for.~~

🚨 **CORRECTED AGAIN — owner ruling 2026-09-08, given live in session, superseding the 2026-09-04
ruling AS TO THE BUCKET ONLY: a BRAND-NEW, CLEAN bucket. The VPS is still reused in place.**

⇒ **The old encrypted objects sit in a SEPARATE, OLD bucket that the new backup path does not touch.**
They are still **permanently unreadable** without the old `age` private identity, and they are still
being paid for — but they are now **fully separable**, which is a materially easier disposition than
"objects tangled inside the bucket we are actively using."

⚠️ **The old-key question is STILL NOT CLOSED.** It changed shape; it was not answered. See `0222`.

| | Standing now |
|---|---|
| **The OLD key, and the old objects it encrypted** | 🔴 **A LIVE OWNER DECISION — ⛔ still NOT closed, and RESHAPED on 2026-09-08.** ~~purge them, or keep them pending a search for the old key?~~ With a **new** bucket the old one is fully separable, so a **third option** now exists: **delete / abandon the whole old bucket** once the new path is proven. **UNANSWERED. The owner's.** Owned by [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md), **not by this task** |
| **The NEW keypair** | ✅ **THIS TASK. Generate it, and record its custodian, storage location and second copy AT THE MOMENT IT IS CREATED.** |

⚠️ **Keep the two apart.** This task owns the **new** key's custody; `0222` owns the **old** objects'
disposition. **Conflating them is how the first one got closed by accident.**

🚨 **"Custody recorded before the first backup runs" is an ACCEPTANCE CRITERION on this task, not a
note.** A backup that runs before the key's home is written down reproduces the exact failure above —
**for the second time.**

### The restore gate still stands in full — and the 2026-07-01 drill does NOT discharge it

**`ai-agents/knowledge-base/profile-backup-restore-runbook.md`** records a restore drill on
2026-07-01. ⚠️ **It does not count, for two independent reasons — both sourced to the same paragraph,
`profile-backup-restore-runbook.md:147-153` (frame `589249c`, the "Recorded RTO" paragraph; unchanged
in every commit checked from `879b2f4` to `589249c`):**

> 🚨 **THIS GATE WAS ONE STEP FROM BEING RETRACTED ON 2026-09-10. THE FULL ARC IS RECORDED HERE
> DELIBERATELY, BECAUSE THE LESSON IS THE CHECK THAT STOPPED IT — NOT THE BOOKKEEPING.**
>
> | # | What happened | Standing |
> |---|---|---|
> | 1 | This paragraph said *"**`0182`'s** runbook"* and cited a bare **`runbook :147-153`** — **wrong document**. It is the **backup/restore runbook**, not `0182`. | the original defect |
> | 2 | Readers resolved the bare ref to `0182/brief.md:147-153` — that brief's `## 4. Configure the deploy` header. **Real, plausible, unrelated.** One reader propagated it onto the Sprint 4 board as `0182:147-153`. | the defect spreading |
> | 3 | A citation sweep checked **every commit of `0182`'s brief**, found no 0-rows evidence in any of them, and **flagged the claim UNSOURCED**. Correct about `0182`; **it stopped one file too early.** | ⛔ **WRONG — withdrawn** |
> | 4 | **The owner ruled RETRACTION** of the 0-rows claim, on that flag. | ⛔ **WITHDRAWN by the owner 2026-09-10** |
> | 5 | Before executing, the producer grepped the **wider knowledge-base** and found the real source — `profile-backup-restore-runbook.md:147-153`, at **exactly those numbers**, unchanged in every commit from `879b2f4` to `589249c`. **It refused the retraction and escalated instead of complying.** | ✅ the check that worked |
> | 6 | The owner **withdrew the retraction ruling.** Nothing was deleted. The pointer was fixed in four documents. | ✅ **CURRENT** |
>
> ⇒ 🔴 **THE GATE NEVER WEAKENED. It now stands on TWO properly-cited reasons instead of one
> half-cited one.** ⛔ **Do not read the withdrawn retraction as the gate having been in doubt** — what
> was in doubt was a *citation*, and it turned out to be a pointer with a missing filename.
>
> 🚨 **The transferable rule, now in
> [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md):
> BEFORE DECLARING A CLAIM UNSOURCED, SEARCH OUTSIDE THE CITED FILE.** *"Not at the cited location"* is
> **not** *"does not exist"* — and the two remedies are opposite: fix the pointer, or delete the claim.
> **A wrong line number sends you to the wrong text; a wrong FILE makes you conclude the text never
> existed.** Getting that backwards deletes evidence. It nearly did here.

1. **The production DB was still EMPTY — 0 rows**
   (`profile-backup-restore-runbook.md:149` — *"the prod DB was still **empty** (0 rows) at this
   point, so schema + decryption + the full pipeline were verified, but a *non-empty* data round-trip
   was not"*). A round-trip of nothing proves nothing. **A non-empty round-trip has never been
   verified.**
2. **The drill predates the default-deny guard**, so **its command line no longer works**
   (`profile-backup-restore-runbook.md:152-153` — *"the first drill predates the default-deny guard,
   so its command line differed from what is documented here now"*). Anyone repeating it from the
   runbook will hit the guard and may read that as a broken backup.

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
2. 🔴 **The backward risk — still LIVE, but DOWNGRADED on 2026-09-08.** ~~the old objects sit in the
   reused bucket~~ 🚨 **CORRECTED: they sit in a SEPARATE OLD bucket the new path never touches** —
   still unreadable, still being paid for, still with **no decision recorded**. ⚠️ **Owned by `0222`,
   flagged here so this task is not read as covering it.** ✅ **It no longer blocks or contaminates
   the new backup path.**

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
6. **Update `0182`'s known-limitations section** (`0182/brief.md:326` — post-2026-09-10-sweep numbering; see that brief's own citation frame) if any of its
   backup statements are now wrong. ⚠️ The backup limitation was corrected on 2026-09-04 already —
   `0182/brief.md:335-339`, where `0182/brief.md:336` reads *"The cited line `setup-profile.sh:688` has **MOVED**"*
   and `0182/brief.md:337-339` records the off-box path it calls *"deferred to T8"* as **shipped**. Check whether
   anything else drifted.
   📌 *Citation corrected 2026-09-10: this read `0182:219`, which is wrong — at `589249c` that line is
   the section header `## 5. Run the deploy`.*

### 🚫 Not in this phase

- ~~**Any work against the old bucket or the old keypair.** Closed by owner decision.~~
  ~~🔴 **CORRECTED 2026-09-04 — that was premature and the question is LIVE again.** The bucket is
  **reused**, so the old encrypted objects are still in it.~~
  🚨 **CORRECTED AGAIN 2026-09-08 — the bucket is NOT reused; a brand-new one is created.** The old
  objects sit in a **separate, abandonable** bucket. **The disposition decision belongs to
  [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md), not to this
  task** — so it stays out of *this* phase, and it is **STILL NOT CLOSED** and must not be reported
  as closed.
- ⛔ **Deleting or abandoning anything in the OLD bucket.** `0222`, and only after this task proves
  the **new** backup path works. ~~⚠️ **Reusing a bucket is not a reason to be hasty about emptying
  it.**~~ 🚨 **2026-09-08: the sequencing judgement SURVIVES the correction for a different reason —
  prove the new path before discarding the only other copy of anything, separable or not.**
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
7. 🔒 **No values anywhere** — not the recipient, not the identity, **not the bucket (old or new)**,
   not the endpoint, not the credentials. **Names, custodian names, vault names and file names
   only.**

## Notes

- **Effort: 0.5 day + an owner action.** The owner action is the custody decision; it cannot be made
  by an agent and it cannot be skipped.
- **Open question this task owns:** **Q3** — *who is the custodian of the NEW `age` private identity,
  where does it live, and where is the second copy?* 🚨 **This is the question that must not slide.**
  It is due **before the first backup runs**, not at the end of the phase.
- 🔴 **A SECOND open question exists and it is NOT this task's: Q3b — what happens to the OLD
  encrypted objects, now in a SEPARATE OLD bucket?** ~~in the reused bucket~~
  🚨 **RESHAPED 2026-09-08 — three options now, not two:** purge the objects · keep pending a search
  for the old key · **delete / abandon the whole old bucket** (newly possible, because it is no
  longer the bucket in use). **UNANSWERED. The owner's.**
  **Owned by [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md).**
  ⚠️ **It was closed prematurely on 2026-09-04, re-opened the same day, and reshaped 2026-09-08 — it
  has never been answered.** **Q3 (new key custody) and Q3b (old objects) are different questions —
  do not let either absorb the other.**
- **What was established on 2026-09-04 and does not need re-establishing:** the six off-box backup
  variables (`PROFILE_BACKUP_S3_ENDPOINT`, `_BUCKET`, `_PREFIX`, `_ACCESS_KEY`, `_SECRET_KEY` and
  `PROFILE_BACKUP_AGE_RECIPIENT`) were **all non-empty in the local env files** — so a keypair *was*
  generated once and credentials *are* still held. ~~⚠️ **Under the reuse ruling the split is: the
  BUCKET is reused; the CREDENTIALS and the `age` KEYPAIR are re-issued.**~~
  🚨 **CORRECTED 2026-09-08 — ALL SIX are new, the BUCKET included. The VPS alone is reused.** The
  fact is recorded only to explain why the old setup looked configured while nobody could name its
  key.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — no values, no lengths, no endpoints, no bucket names.
</content>
