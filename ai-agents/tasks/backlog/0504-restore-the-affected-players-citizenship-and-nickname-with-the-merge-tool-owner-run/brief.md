# Restore the affected player's citizenship and nickname with the merge tool (owner-run)

## ID
0504

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-26**, relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel;
> ADR-021/037). ⛔ Not producer precedent. The owner picked **"Merge tool + stop consuming"**. Split out of the merge
> tool by the producer: building the tool (`0503`) and using it on one live player are separate acts — the build ships
> and is tested on its own; the use needs `0502`'s evidence and the owner's hand. Full provenance in
> [`0502`](../0502-confirm-the-two-record-cause-of-the-lost-citizenship-report-owner-run-read-only-prod-checks/brief.md).

## Priority
31

> ⚠️ Priority 31 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0503`** (where it sits), because it is the use of that tool and the actual
> fix for the affected player. Appended after the board's highest rank, never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

> The **owner** runs every step on the box. The producer owns the checklist, the worklog and the close.

## Context

**The affected player** reported on 2026-10-25 that his paid citizenship and approved nickname disappeared. `0502`
finds which record is his old paid one and which is his new one; `0503` builds the tool that moves his paid state,
receipts, entitlements, XP and nickname across (or re-points his login — whichever the owner ruled at `0503`'s plan).
This task runs it, once, for him.

**Only if `0502` ends in outcome (A)** (two records confirmed). Any other outcome: do not run; re-plan with the owner.

## What to build

An owner-run checklist (placeholders only — `<OLD_PLAYER_ID>`, `<NEW_PLAYER_ID>`; real values stay in the owner's SSH
session):

1. Entry gates: `0502` outcome (A) recorded; `0503` closed and its tool on the box (by the way the owner ruled in
   `0503`'s plan — script over SSH, or a profile-image deploy).
2. **Dry run** with `<OLD_PLAYER_ID>` → `<NEW_PLAYER_ID>`. The owner reads it and confirms it matches `0502`'s findings
   (paid flag on the old record, receipt count, nickname).
3. **Real run.** Record the tool's summary line (counts only).
4. **Read back** (read-only `SELECT`s): the target record is paid, holds the approved nickname, has the receipts; the
   old record is not paid and holds no nickname.
5. **In-game check** (owner, or by asking the player): after the player's next load he shows as a citizen with his
   nickname. Session tokens last up to 24 h; the check is valid after his next fresh login.
6. **Tell the player** — through the contact channel (`0507`'s popup, or his reply on VK/Telegram if he already wrote
   in). The wording is the owner's.

## Verification steps

1. `worklog.md` records, dated, steps 1–6 with results in words and counts only — no ids, nicknames, tokens or hosts.
   A `grep` of the folder for UUID and Yandex-id shapes finds nothing.
2. Step 4's read-back shows: target paid = yes, nickname present, receipts moved (count matches the dry run); source
   paid = no, nickname absent.
3. Step 5 confirmed (owner's observation or the player's reply), dated.
4. Nothing else in production changed (the tool's summary lists only the two records).

## Notes

- **Depends on:** 0502, 0503
- **Blocks:** nothing
- **Related:** `0507` (how to reach him), `0424` (why the second record exists).
- If Yandex later says ids can change on events like a password change (`0508`), the same checklist serves the next
  case; file a new task per case, never an automatic merge (owner rule in `0424`).
- **No secrets, no personal data:** "the affected player" in every tracked file.
