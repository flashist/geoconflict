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
[`0213-profile-backend-clean-slate-rebuild`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md)

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
  Backups **encrypt and upload — proven**; that a backup **RESTORES is UNPROVEN**, ~~and the old
  bucket's objects are permanently unreadable for exactly that reason.~~ 🚨 **THAT SUPPORTING EXAMPLE
  IS RETRACTED 2026-09-10 — the old bucket was EMPTY; there were no objects** (owner, verbatim:
  *"I've already deleted the old bucket, it was empty, we never had anything there."*). ⛔ **The
  CONCLUSION IS UNCHANGED AND `0218` STILL LEADS:** restore is still unproven, and losing the
  illustration does not make it proven. ✅ **Cheapest to prove NOW, while every table has ZERO rows.**
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
✅ Done (agent-closed — not owner-verified)

---

## 🚨 CLOSING RECORD — 2026-09-11. READ BEFORE CITING THIS TASK AS "DONE".

⛔ **THIS IS NOT A CLEAN SWEEP. THE TASK CLOSES *WITH* EIGHT RESIDUALS, NOT DESPITE THEM.**
Full evidence: [`worklog.md`](worklog.md). Everything below is sourced to it.

> 🔴 **Unusual circumstance, recorded because the marker alone would understate the evidence.**
> **The OWNER personally executed every command on the profile VPS and observed every result**,
> step-by-step. No agent touched the box, ran a deploy, or held a secret. The
> `(agent-closed — not owner-verified)` marker is applied because the **close itself** was performed by
> a spawned producer with no owner channel (ADR-033 §5) — ⛔ **it must NOT be read as "nobody looked."**
> Nobody verified this in **production use**; the execution evidence is stronger than a typical
> agent close.

### Verification steps — where each one actually stands

| # | Item | Standing |
|---|---|---|
| 1 | Custody written down **before** the first backup ran | ⚠️ **SUBSTANCE MET — NOT A CLEAN PASS.** See below. |
| 2 | Custodian demonstrated they can read it, dated | ✅ **Discharged by `0215`** — decrypted a test file using the copy retrieved **from storage**, confirmed via `age-keygen -y`. ⚠️ Its date is session-sequence, not artifact-read. |
| 3 | Restore against **NON-EMPTY** data, verified by counts **and** content | ✅ **FULLY MET.** 76 rows / 7 tables. Two restores — a throwaway (C4/C5) and **the live DB in place** (E4/E5) — both `IDENTICAL` across 8 tables, both `bigserial` sequences, the constraint/index shape (23 constraints · 15 indexes) and three behavioural checks. |
| 4 | Exact commands recorded and **work today**; runbook corrected where wrong | ✅ **FULLY MET.** Two corrections applied to `ai-agents/knowledge-base/profile-backup-restore-runbook.md` (network name; password-free live-restore target). One predicted defect **refuted** (the object prefix was right). One **claim in THIS brief refuted** — see below. |
| 5 | Nightly cron **FIRED** and produced an object — observed, not inferred | ✅ **MET IN ITS LITERAL WORDING** — three independent signals (scheduler lines at 02:30:01 on **five consecutive days**, 2026-09-07 → 2026-09-11; `last-backup.json` `exit_status 0`; the script log ending `backup OK`). ⛔ **The stronger property is NOT met — see residual 1. Do not report this as a clean pass.** |
| 6 | `0182`'s backup limitations reflect reality | ✅ **APPLIED 2026-09-11 by the producer** to `ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md` §8 (the coder drafted it; `done/` is producer-only). |
| 7 | No values anywhere | ✅ **MET.** No key material, key length, fingerprint, bucket name, endpoint, credential or public IP in any artifact — **and no password appeared in any command line either.** |

#### ⚠️ Step 1, stated in both halves — do not quote only one

- **Substance MET.** The failure this criterion exists to prevent — a backup encrypted to a recipient
  whose private identity nobody can name — **cannot have occurred.** The keypair existed before the
  deploy (a pre-flight recipient round-trip returned `RECIPIENT OK`), the first backup under the new
  key was the deploy smoke check, and the storage copy existed before the readability proof (that
  proof decrypted the copy **retrieved from storage**).
- **NOT a clean pass.** No timestamped artifact pins the intra-day ordering — `0215` dates both events
  from **session sequence only**. And the **in-repo written record** (`0215`'s worklog) was authored
  **after** the deploy, so on the strictest reading the repository record does not satisfy *"written
  down before the first backup ran."*

#### ⛔ A claim in THIS brief was REFUTED BY EXECUTION

This brief stated the 2026-07-01 drill *"predates the default-deny guard, so **its command line no
longer works**"*. **False — the documented line ran verbatim and succeeded.** The brief **overstated**
the runbook's own narrower claim (that the *first drill's* line differed from what is documented now —
true and unremarkable). ⚠️ The two real breakages were the **network name** and the **live-restore
credential leak**, **neither of which this brief mentions**.

### 🚨 THE EIGHT RESIDUALS — CARRIED FORWARD, NOT CLOSED

1. 🔴 **THE SCHEDULE AND THE DATA ARE PROVEN SEPARATELY, NEVER TOGETHER.** Every cron-produced object
   that has ever existed in the current bucket is a dump of an **EMPTY** database; the only non-empty
   backup was **hand-run**. Closing this needs **exactly one** nightly cron run after real data
   exists — cheap, but it must be deliberately looked at. ➡️ `0217` / `0219`.
2. 🔴 **THE RTOs DO NOT EXTRAPOLATE.** 0.374 s (throwaway) / 0.435 s (live) on **76 rows, ~21 KB**.
   **Re-measure at real volume.** Quoting these as "the RTO" is the same class of error as "five days
   of backups".
3. 🔴 **THE WEEKLY-COPY PATH HAS NEVER RUN** against the current bucket — `weekly/` was empty on
   2026-09-11. First-ever attempt is **Sunday 2026-09-13, 02:30 UTC**, and nobody is watching it.
   ➡️ **now tracked as [`0241`](../../backlog/0241-profile-verify-first-weekly-backup-copy/brief.md)**,
   which **gates** `0219`'s consumer work.
4. ⚠️ **BACKUP HISTORY IS THIN AND MISLEADING.** Before this drill the current bucket held **TWO**
   objects — and **only ONE was cron-produced**; the other was the deploy smoke check. The nightly
   log's five-day history is **NOT** five retrievable backups (four went to a bucket that no longer
   exists). ➡️ `0219`'s monitor must not infer retrievability from log lines.
5. ⚠️ **SAME-KEY OVERWRITE IS REAL, DEMONSTRATED, AND UNRECOVERABLE.** C1 replaced that day's cron
   object at the same key (19 330 B → 21 339 B, observed). With reg.ru object versioning **UNKNOWN**
   (`0215` residual 6), the replaced object does not come back. **A manual `backup.sh` run silently
   replaces that day's scheduled backup.**
6. ⚠️ **SWAP NOT RE-VERIFIED 2026-09-11** — the plan's `free -h | head -2` truncated the swap line.
   `0215`'s reading stands. **Unverified, not absent.**
7. ⚠️ **POST-RESTORE HEALTH CHECKED OVER LOOPBACK ONLY** — `/health` and `/ready` returned 200, but
   the **public TLS / nginx path was not re-verified** after the live restore.
8. 🔒 **THE `age` SECOND-COPY RESIDUAL — CARRIED UNCHANGED FROM `0215`, NO REMEDIATION PROPOSED.**
   `0215`'s plan asked for an **OFFLINE** second copy; what exists is a **second CLOUD copy**. Neither
   store is zero-knowledge, and **both may share a phone-number recovery path — so the two copies may
   not be two independent failure modes.** 🔴 **Owner ruling 2026-09-10: accepted as-is and CARRIED.
   ⛔ No remediation is proposed and none is recommended.** A knowingly accepted residual.

### ⛔ D2 WAS REMOVED — the owner's knowing reversal of their own earlier ruling

**D2** was the step that would have restored **from the cron-produced object**, joining the schedule to
the data. It required a nightly cron run *after* Phase B seeded the data.

- **Q1 was approved 2026-09-10**, then ⛔ **REVERSED by the owner on 2026-09-11.**
- **Why:** the owner required the whole drill to run **on one day** (their regular weekend game update
  is Sat/Sun and they did not want this running alongside it). A same-day drill cannot wait for a
  02:30 UTC boundary after seeding, so D2 becomes impossible.
- 🔴 **The owner was shown that the chosen option drops D2 and chose it anyway — a KNOWING TRADE, not
  an oversight.**
- **Cost:** the durability claim rests on **two** verified restores (C4 throwaway, E4 live) instead of
  three, and residual 1 (schedule × data) exists because of it.
- **The one genuine upside:** the `age` private identity touched the box **twice** instead of three
  times, and was shredded both times.

---

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

⇒ ~~**The old encrypted objects sit in a SEPARATE, OLD bucket that the new backup path does not touch.**
They are still **permanently unreadable** without the old `age` private identity, and they are still
being paid for — but they are now **fully separable**, which is a materially easier disposition than
"objects tangled inside the bucket we are actively using."~~

🚨 **RETRACTED 2026-09-10 — THE OLD BUCKET WAS EMPTY. THE OLD ENCRYPTED OBJECTS NEVER EXISTED.** Owner
ruling, given live in session and relayed through the spawning session, verbatim: *"I've already
deleted the old bucket, it was empty, we never had anything there."* ⛔ **A RETRACTION, not a
supersession** — the claim was never true. Nothing was unreadable, nothing was being paid for, and
there was nothing to dispose of. **Struck, not deleted, so nobody re-derives the old story.**

⚠️ **DO NOT EXTEND THE RETRACTION BEYOND THE OBJECTS. THE LOST-`age`-KEY PROBLEM IS UNCHANGED AND
STILL REAL** — see "The single failure this phase exists to prevent" above, which **stands in full**.
🔴 **THIS TASK STILL OWNS generating a NEW keypair and recording its custodian, storage location and
second copy — as an ACCEPTANCE CRITERION, not a note.** **The old key turns out to have been
protecting nothing. That is luck, not a control, and it relaxes nothing here.**

✅ **The old-key question IS NOW CLOSED — 2026-09-10, by the owner, as option (c): the whole old bucket
deleted.** ~~⚠️ **The old-key question is STILL NOT CLOSED.** It changed shape; it was not answered.~~
~~See `0222`, which **remains OPEN** on a different item — 🔴 **the OLD S3 ACCESS KEY still has to be
REVOKED AT THE PROVIDER**; overwriting the local value does not revoke it, and deleting the bucket does
not revoke it either.~~
🚨 **CORRECTED 2026-09-10, LATER THE SAME DAY — struck, not deleted: `0222` IS CLOSED** (agent-closed — not owner-verified), **and it closed with THIS ITEM AS A KNOWINGLY ACCEPTED RESIDUAL.** ⛔ **THE KEY WAS NEVER REVOKED — NOT "resolved", NOT "revoked", NOT "no longer live."** The owner ruled it closed on the reasoning that the deleted bucket makes the credentials useless; **a documented objection — an S3 access key is an ACCOUNT-level credential, and nothing in this repository records its scope — was put to the owner and OVERRULED.** ⚠️ **Whether that reasoning holds is UNSETTLED: correct if the key was bucket-scoped, wrong if it was account-wide, and NOBODY CHECKED.** ⚠️ **If account-wide it can still reach the NEW backup bucket — the very backups this task is about to prove work.** Full record in [`0222`](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md).
🔒 **STANDING UPDATED 2026-09-11 — CLOSED BY OWNER DECISION: the revocation will DELIBERATELY NOT BE DONE** (owner, verbatim: *"Forget about the old S3 keys, mark this task as cancelled."*). ⛔ **NOT an open item, NOT outstanding work — do not pick it up, re-file it, or add it to this task.** ⚠️ **Every fact above stands: never revoked at the provider, scope never established, objection OVERRULED TWICE (2026-09-10, 2026-09-11).** ⛔ **A decision not to act is not the risk not existing** — if this ever matters, check the key's policy at the provider first.

| | Standing now |
|---|---|
| **The OLD key, and ~~the old objects it encrypted~~ *(there were none)*** | ✅ **CLOSED 2026-09-10 — the owner deleted the whole old bucket.** ~~🔴 **A LIVE OWNER DECISION — ⛔ still NOT closed, and RESHAPED on 2026-09-08.** purge them, or keep them pending a search for the old key? With a **new** bucket the old one is fully separable, so a **third option** now exists: **delete / abandon the whole old bucket** once the new path is proven. **UNANSWERED. The owner's.**~~ 🚨 **The bucket was EMPTY — the objects never existed.** Owned by [`0222`](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md), **not by this task** |
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
2. ~~🔴 **The backward risk — still LIVE, but DOWNGRADED on 2026-09-08.** ~~the old objects sit in the
   reused bucket~~ 🚨 **CORRECTED: they sit in a SEPARATE OLD bucket the new path never touches** —
   still unreadable, still being paid for, still with **no decision recorded**. ⚠️ **Owned by `0222`,
   flagged here so this task is not read as covering it.** ✅ **It no longer blocks or contaminates
   the new backup path.**~~
   ✅🚨 **GONE 2026-09-10 — THE "BACKWARD RISK" NEVER EXISTED.** The old bucket was **empty** and the
   owner has deleted it (verbatim: *"I've already deleted the old bucket, it was empty, we never had
   anything there."*). There were no old objects to be unreadable, to pay for, or to decide about.
   **Struck, not deleted.** ⚠️ **RISK 1 ABOVE — the FORWARD risk — is UNCHANGED and is the whole point
   of this task.** ⛔ **Nothing here reduces the new-key custody requirement.**

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
  🚨 **CORRECTED AGAIN 2026-09-08 — the bucket is NOT reused; a brand-new one is created.** ~~The old
  objects sit in a **separate, abandonable** bucket.~~ **The disposition decision belongs to
  [`0222`](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md), not to this
  task** — so it stays out of *this* phase, ~~and it is **STILL NOT CLOSED** and must not be reported
  as closed.~~
  ✅ **CLOSED 2026-09-10 by the owner: the old bucket is deleted, and it was EMPTY — there never were
  any old objects.** ~~⚠️ **Still not this task's, and still not a licence to report `0222` closed —
  `0222` stays OPEN on the OLD S3 ACCESS KEY, which must be REVOKED AT THE PROVIDER.**~~
  🚨 **CORRECTED 2026-09-10, later the same day — `0222` IS CLOSED (agent-closed — not owner-verified), and it
  closed with the S3-key item as a KNOWINGLY ACCEPTED RESIDUAL. ⛔ THE KEY WAS NEVER REVOKED — not "resolved", not
  "revoked", not "no longer live" — and its scope was never established.** Objection raised, owner overruled.
  ⚠️ **Unsettled either way: correct if the key was bucket-scoped, wrong if account-wide, and nobody checked.**
  ⚠️ **If account-wide it can still reach the NEW backup bucket — the backups THIS task is about to prove work.**
  ⚠️ **Still not this task's item.**
  🔒 **STANDING UPDATED 2026-09-11 — CLOSED BY OWNER DECISION: the revocation will DELIBERATELY NOT BE DONE**
  (owner, verbatim: *"Forget about the old S3 keys, mark this task as cancelled."*). ⛔ **Not outstanding work;
  nobody should pick it up or re-file it.** ⚠️ **Facts unchanged — never revoked, scope never established,
  objection OVERRULED TWICE.**
- ~~⛔ **Deleting or abandoning anything in the OLD bucket.** `0222`, and only after this task proves
  the **new** backup path works.~~ ~~⚠️ **Reusing a bucket is not a reason to be hasty about emptying
  it.**~~ ~~🚨 **2026-09-08: the sequencing judgement SURVIVES the correction for a different reason —
  prove the new path before discarding the only other copy of anything, separable or not.**~~
  🚨 **MOOT 2026-09-10 — the owner deleted the old bucket BEFORE this task proved anything.** The
  sequencing guard was **overtaken, not satisfied**. ✅ **No data was risked: the bucket was empty.**
  ⛔ **The guard was NOT wrong — it was right on the information available and simply guarded nothing.
  The underlying rule STANDS for every future bucket: never discard the only other copy of anything
  before a new path is proven. Do not cite 2026-09-10 as precedent.**
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
- ✅ **A SECOND open question existed and was NOT this task's: Q3b — what happens to the OLD
  encrypted objects, now in a SEPARATE OLD bucket?** ~~in the reused bucket~~
  ~~🚨 **RESHAPED 2026-09-08 — three options now, not two:** purge the objects · keep pending a search
  for the old key · **delete / abandon the whole old bucket** (newly possible, because it is no
  longer the bucket in use). **UNANSWERED. The owner's.**~~
  ✅ **ANSWERED AND CLOSED 2026-09-10 by the owner — the third option: the whole old bucket is
  DELETED, already executed.** 🚨 **And the question rested on a false premise: THE BUCKET WAS EMPTY —
  there were no old encrypted objects at all.** Retracted, not superseded.
  **Owned by [`0222`](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md)**,
  ~~which **remains OPEN** on a separate item: 🔴 **the OLD S3 ACCESS KEY must still be REVOKED AT THE
  PROVIDER.**~~
  🚨 **CORRECTED 2026-09-10 — `0222` IS CLOSED (agent-closed — not owner-verified) with that item as a KNOWINGLY
  ACCEPTED RESIDUAL. ⛔ THE KEY WAS NEVER REVOKED; its scope was never established.** Objection raised, owner
  overruled; **whether the reasoning holds is UNSETTLED in either direction.**
  🔒 **STANDING UPDATED 2026-09-11 — CLOSED BY OWNER DECISION: the revocation will DELIBERATELY NOT BE
  DONE** (owner, verbatim: *"Forget about the old S3 keys, mark this task as cancelled."*). ⛔ **Not an
  open item and not outstanding work.** ⚠️ **Facts unchanged — never revoked, scope never established,
  objection OVERRULED TWICE (2026-09-10, 2026-09-11).**
  ⚠️ **History kept: closed prematurely 2026-09-04, re-opened the same day, reshaped 2026-09-08,
  answered 2026-09-10.** **Q3 (new key custody) and Q3b (old objects) are different questions — do not
  let either absorb the other.** 🔴 **Q3 IS STILL OPEN AND STILL THIS TASK'S. Q3b closing does NOT
  touch it.**
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
