# Profile backup `age` identity: move the operator's local copies into the password manager

## ID
0281

## Sprint
Backlog

## Priority
Unscheduled

⚠️ **Producer's rank if this is ever pulled into a sprint: Medium — NOT owner-ruled.** The *finding* is
real and was raised with the owner live; the rank, the board and the scope below are the producer's.

## Status
🔲 Backlog

## Owner
fkit-coder

🔒 **But the key steps are OWNER-ONLY and no agent can or should perform them.** No agent holds this
identity, and none should ever be given it. The coder's share of this task is the runbook edit
(item 3) — nothing else. If that makes a coder-owned brief read oddly, that is the honest shape of the
work, not a filing error.

## Context

**Found 2026-09-16 by `fkit-lead` while helping the owner run
[`0275`](../../done/0275-profile-backup-restore-reproof-on-006-schema/brief.md)'s restore drill.** Not
an owner ruling — the owner was told, and the fix has not been scheduled.

**The finding.** **Three unencrypted copies of the profile backup's `age` private identity exist on the
operator's own machine** — one in the home area and **two in the downloads area**. All three are mode
`0600`, and all three match the box's configured recipient. ⚠️ **That match was established by comparing
PUBLIC keys only** (`age-keygen -y` output against the configured recipient value); **no private key
material was read, printed, copied or logged**, by any agent, at any point.

**Why it matters.** This identity is the **only** thing standing between a stolen backup object and the
whole player database. The design is explicitly that **the box never holds it** — see
`ai-agents/knowledge-base/profile-backup-restore-runbook.md:19` — and the runbook's own one-time-setup
instruction (`:43`) is to keep it **off the box, in a password manager**. Three loose plaintext copies
weaken exactly the property the design depends on, and **two of them sit in the folder most likely to be
bulk-synced to cloud storage or bulk-copied to a new machine**. Nothing about them is an active breach;
what they are is a quiet widening of the blast radius, in the one place where the blast radius is the
entire database.

⚠️ **Mode `0600` is not the protection here.** It stops another local account reading the file. It does
nothing about a machine backup, a sync client, a migration to a new Mac, or the machine being lost — all
of which copy a `0600` file exactly as readily as any other.

**Related but NOT the same thing.** [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md)
residual 8 asks whether the *second* stored copy is genuinely an independent failure mode (owner ruled
2026-09-10: **accepted as-is and carried**). That question is about the **archived** copies and is
untouched here. This task is about the **loose working copies left behind on the operator's machine**.
Closing this does not close residual 8, and residual 8's acceptance does not cover this.

## What to build

⛔ **No code. No deploy. No box command. Nothing an agent runs.** Three steps, the first two owner-only:

1. **🔒 OWNER — consolidate into the password manager.** Store the identity in the owner's password
   manager (the store the runbook already names), if a copy is not already there.

2. **🔒 OWNER — verify, then securely delete the loose copies.** Before deleting anything, confirm the
   stored copy is still the right key: derive its **public** key with `age-keygen -y` and compare that
   against the box's configured `PROFILE_BACKUP_AGE_RECIPIENT`. ⛔ **A public-key comparison only —
   never the private key, and never paste either into a chat, a worklog, a report or a terminal that is
   being recorded.** Only once that check matches, securely delete the operator's local copies.

   🚨 **Order is load-bearing and there is no undo.** Delete before verifying and a mismatch means every
   existing backup object is permanently unreadable. **Verify first. Delete second.**

3. **`fkit-coder` — add one line to the runbook's setup section.** In
   `ai-agents/knowledge-base/profile-backup-restore-runbook.md`, next to the existing "store it in a
   password manager" instruction, state plainly that **loose local copies of the identity are a
   finding**, not a convenience, and that the password manager is the only place it belongs. One or two
   sentences; do not restructure the section.

### 🚫 Not in this task

- Rotating or re-keying the identity. Nothing suggests this key is compromised; **re-keying would
  invalidate every existing backup object** and is a separate, much larger decision.
- `0218` residual 8 (whether the archived copies are two independent failure modes) — owner-accepted and
  carried, untouched here.
- Any change to `profile-backup.sh`, `setup-profile.sh`, or the restore path.

## Verification steps

1. **🔒 Owner confirms** the identity is in the password manager.
2. **🔒 Owner confirms** the stored copy's **public** key matched the box's configured recipient
   **before** any deletion, and reports only *"matched"* / *"did not match"* — **never the value**.
3. **🔒 Owner confirms** the loose local copies are gone.
4. The runbook's setup section carries the new line, and `git diff` on that file shows **only** that
   addition.
5. 🔒 **Nothing about the key is written anywhere.** No key material, no key length, no fingerprint, no
   recipient value, no file path, directory or filename, in this brief, its worklog, any report, or the
   wiki. "The operator's local copies" is the full permitted description.
6. A restore still works after the cleanup — **do not run a drill just for this.** The next scheduled
   drill is the check; if it ever fails to decrypt, this task is the first place to look.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related:** [`0275`](../../done/0275-profile-backup-restore-reproof-on-006-schema/brief.md) (the drill
  that surfaced it — its Part B residual 4), [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md)
  (residual 8, the *archived*-copy question — **distinct, and not closed by this**).
- **Effort:** small. The owner's part is minutes; the runbook line is minutes.
- ⚠️ **Scope above is the PRODUCER's suggestion, not an owner ruling.** The owner was shown the finding;
  they have not ruled on the remedy, the board or the rank. 🚩 **Open question for the owner:** is
  consolidating into the password manager the remedy you want, or would you rather keep a deliberate
  offline copy somewhere and simply remove the accidental ones?
- 🔒 No secrets, hosts, IPs, bucket names, endpoints or key material in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
