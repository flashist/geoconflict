# Restore the affected player's citizenship and nickname with the merge tool (owner-run)

## ID
0504

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-26**, relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel;
> ADR-021/037). ⛔ Not producer precedent. The owner picked **"Merge tool + stop consuming"**. Split out of the merge
> tool by the producer: building the tool (`0503`) and using it on one live player are separate acts — the build ships
> and is tested on its own; the use needs `0502`'s evidence and the owner's hand. Full provenance in
> [`0502`](../../done/0502-confirm-the-two-record-cause-of-the-lost-citizenship-report-owner-run-read-only-prod-checks/brief.md).

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
*(2026-10-27: ruled — **re-point**: KEEP = his old paid profile; see the 📌 `0503` plan note below.)* This task runs
it, once, for him (plus any re-run the steps below require).

**Only if `0502` ends in outcome (A)** (two records confirmed). Any other outcome: do not run; re-plan with the owner.

> 📌 **2026-10-27 — `0502` = outcome (A), and this task now waits on Yandex.** OWNER RULING via `AskUserQuestion` in the
> `fkit-lead` session, relayed to a spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). The owner picked
> verbatim **"A now, merge after Yandex (Recommended)"** — option text: *"Call it A on our data; plan the merge tool
> (0503) now; run the restore (0504) only after Yandex confirms. Knock-on: 0503 planning starts; 0504 still waits."*
> - **Runs only after Yandex confirms** the account and purchase link (asked via `0508`; a correction to that message
>   was drafted 2026-10-27, not yet confirmed sent). This is a gate in addition to `0503`.
> - **Three profiles, not two** (`0502` worklog, 2026-10-27): the **old paid profile** (holds the paid flag, the one
>   citizenship receipt and the nickname) → an **intermediate profile** (2026-10-22 to 2026-10-25, not paid) → the
>   **current profile** (since 2026-10-25, not paid). His player ID changed twice, on 2026-10-22 and 2026-10-25.
> - ~~**The target is the current profile** — the one his login reaches today. The intermediate profile is a second
>   source (it holds his XP from 2026-10-22 to 2026-10-25); what happens to it follows `0503`'s ruled XP rule.~~
>   *(Superseded 2026-10-27 by the `0503` plan approval, below: KEEP = the **old paid profile**; the intermediate and
>   current profiles are the two sources.)*
> - ⚠️ **Open point for this task's run plan:** his ID may change again before the run. The run must re-confirm which
>   profile his login reaches **on the day** (for example a fresh match credit or login time just before the dry run),
>   not reuse the 2026-10-27 reading. *(2026-10-27: answered by the `0503` plan — if a newer profile exists, it is an
>   extra source in the same run; see step 1 and step 8.)*

> 📌 **2026-10-27 — `0503`'s plan approved; this checklist follows it.** OWNER RULING via `AskUserQuestion` in the
> `fkit-lead` session, relayed to a spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Question,
> verbatim: *"Approve the 0503 merge tool plan?"* Owner picked verbatim **"Approve, all 7 as recommended
> (Recommended)"** — option text: *"Keep old profile, XP each match once + one gift, record table, ships in profile
> image, no auto message, extra name stays reserved, 24h follow-up required. Then ADR-128, then build."* For this task:
> - **KEEP = the OLD paid profile** (plan Q1). The intermediate and current profiles are the **sources**: their Yandex
>   logins, his XP from them (each match once, the largest tenure gift once — Q2) and their other rows move onto the old
>   profile. The paid flag, the citizenship receipt, the nickname and its history **never move**.
> - **The 24-hour follow-up dry run is a REQUIRED step** (Q7) — step 7 below.
> - **If his ID changes again** (before the run or after it), **re-run with the new profile as an extra source** — step 8.
> - **No automatic in-game message** (Q5): the owner tells him himself — step 9.
> - The tool ships as a command inside the profile image (Q4), so it reaches the box only with a profile-image deploy.
> - **The Yandex-confirms gate stays** (step 1) — unchanged by this ruling.

> 📌 **2026-10-27 — Yandex correspondence is tracked here.** OWNER RULING via `AskUserQuestion` in the `fkit-lead`
> session, relayed to a spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Question: *"Where should we
> track the correction to Yandex and Yandex's answer?"* Owner picked verbatim **"Note on 0504 (Recommended)"** — option
> text: *"0504's gate is 'Yandex confirms'; the send date and answer get recorded there. Knock-on: none (checked)."*
> - **First message:** sent 2026-10-27 (see
>   [`0508` worklog](../../done/0508-draft-the-message-to-yandex-games-player-id-changes-purchase-scope-and-unconsumed-purchases/worklog.md)).
>   It named a **wrong candidate profile** — a different player's (`0502` worklog, 2026-10-27).
> - **Correction:** drafted 2026-10-27 — names the right three-profile chain and the old profile's citizenship receipt,
>   and withdraws the wrong candidate. ~~**Send: not yet confirmed.**~~ **Sent 2026-10-27** — owner's words, typed in the
>   `fkit-lead` session after the lead showed him the correction text: *"I've commited the files, and I already have sent the message to Yandex as soon as you sent it to me"* (relayed by `fkit-lead`;
>   recorded by a spawned `fkit-producer`). Yandex's answer is still pending.
> - **Yandex's answer** to the first message and to the correction is recorded below — date + the answer in words
>   only (no ids, names, ticket numbers or links). **It is this task's entry gate** (step 1).
>
> | What | Date | Recorded in words |
> |---|---|---|
> | First message sent | 2026-10-27 | Sent as drafted (owner's words, `0508` worklog); named the wrong candidate. |
> | Correction sent | 2026-10-27 | Sent to Yandex Games support right after the lead showed the text (owner's words: *"I've commited the files, and I already have sent the message to Yandex as soon as you sent it to me"*). |
> | Yandex's answer | *pending* | — |
>
> - **Check 7 (are other players hit?)** — OWNER RULING the same day, **"Run it now (Recommended)"** — option text:
>   *"I give you the ready query; one read-only run on the profile server; counts only. Knock-on: none (checked)."*
>   The owner is running it now; a later producer adds the results (counts only) to
>   [`0502`'s worklog](../../done/0502-confirm-the-two-record-cause-of-the-lost-citizenship-report-owner-run-read-only-prod-checks/worklog.md).
>   Not a gate for this task.

> 📌 **2026-10-27 — backup check before the real run; undo = restore from that backup.** OWNER RULING via
> `AskUserQuestion` in the `fkit-lead` session during `0503`'s review, relayed to a spawned `fkit-producer`
> (ADR-021/037; ⛔ not producer precedent). Question, verbatim: *"R1: how should undoing a merge work?"* Owner picked
> verbatim **"Backup check + fix wording (Recommended)"** — option text: *"Runbook: confirm today's backup before the
> real run; undo = restore from backup, note as a guide. Knock-on: none (checked)."* For this task:
> - **New step 3** below — confirm a backup from today exists before the real run (the runbook's step 2). The steps
>   after it are renumbered (old 3–8 → 4–9); every live step reference in this brief is updated to match (struck-through history left as written).
> - **Undo = restore from that backup**, into a **throwaway** database, never the live one; the `player_merges` audit
>   note is a **guide only**, not enough to undo the merge.

## What to build

An owner-run checklist (placeholders only — ~~`<OLD_PLAYER_ID>`, `<NEW_PLAYER_ID>`~~ *(2026-10-27:)*
`<KEEP_OLD_PLAYER_ID>`, `<SOURCE_INTERMEDIATE_PLAYER_ID>`, `<SOURCE_CURRENT_PLAYER_ID>`, and `<SOURCE_NEWER_PLAYER_ID>`
if his ID changed again; real values stay in the owner's SSH session). Commands as in `0503`'s runbook
(`profile-merge-runbook.md`, written by `0503`):

1. Entry gates: `0502` outcome (A) recorded *(met 2026-10-27)*; **Yandex has confirmed** the account and purchase
   link *(owner ruling 2026-10-27, above; tracked in the Yandex table above. Producer reading, not an owner
   ruling: an answer about the first message alone cannot meet this gate, since that message named the wrong
   candidate)*; `0503` closed and its tool on the box (by the way the owner ruled in
   `0503`'s plan — ~~script over SSH, or a profile-image deploy~~ *(ruled 2026-10-27: a command inside the profile
   image, so a profile-image deploy that carries it has happened)*); ~~the current target profile re-confirmed on the
   day~~ *(2026-10-27:)* **which profile his login reaches today, re-confirmed on the day** — if it is a profile
   newer than the current one, it joins the run as an extra source.
2. **Dry run**, KEEP = the old paid profile: `--into <KEEP_OLD_PLAYER_ID> --from <SOURCE_INTERMEDIATE_PLAYER_ID>
   --from <SOURCE_CURRENT_PLAYER_ID>` (plus `--from <SOURCE_NEWER_PLAYER_ID>` if step 1 found one). The owner reads it
   and confirms it matches `0502`'s findings (paid flag, receipt count and nickname on the **kept old** profile; the
   sources not paid, no nickname) and shows **nothing moving** for the paid flag, receipt or nickname. Any refusal:
   stop and re-plan with the owner (costs a dry run, not data).
3. **REQUIRED — confirm a backup from today exists** *(owner ruling 2026-10-27, above)*, after the dry run and before
   the real run: follow step 2 of [`profile-merge-runbook.md`](../../../knowledge-base/profile-merge-runbook.md)
   (*Before the real run: confirm a backup from today*) exactly — its commands and the box details live there, not
   here. No good marker from today → take a fresh backup as that step says, and read the marker again. **Do not run
   step 4 without a good marker.** This backup is **the only undo**: to undo the merge, restore it into a **throwaway**
   database (never the live one — an in-place restore also rolls back every other player's changes since the backup),
   read the involved records there and put them back on the live database by hand, each write with the owner's OK. The
   `player_merges` audit note is a **guide only** — it does not record which logins, games, receipts or other rows
   moved from which source. Record in the worklog: the marker read OK (in words), whether a fresh backup was taken,
   and that it was before the real run.
4. **Real run** (with the dry run's fingerprint and the typed confirmation). Record the tool's summary line (counts
   only).
5. **Read back** (read-only `SELECT`s): ~~the target record is paid, holds the approved nickname, has the receipts; the
   old record is not paid and holds no nickname.~~ *(2026-10-27, KEEP = old:)* the **kept old** profile is still paid,
   still holds the approved nickname and the receipt (unchanged), now holds **all** his Yandex identities, and its XP
   is not below the highest XP any of the profiles had before; **each source** holds no identity, no receipt, is not
   paid and holds no nickname; one `player_merges` row was written.
6. **In-game check** (owner, or by asking the player): after the player's next load he shows as a citizen with his
   nickname. Session tokens last up to 24 h; the check is valid after his next fresh login.
7. **REQUIRED — 24-hour follow-up dry run** (`0503` plan Q7), at least 24 h after step 4, same `--into`/`--from`: a
   page left open on a source can still write to it for up to 24 h (a purchase, a match finishing). If the dry run
   shows anything left on a source, **re-run** (steps 2–5, so the backup check of step 3 again) to sweep it; record the result either way.
8. **If his ID changes again** (a new, fresh profile appears for him — before the run or after it): **re-run with the
   new profile as an extra source** (`--from <SOURCE_NEWER_PLAYER_ID>`), KEEP unchanged — steps 2–5 (with step 3's backup check), then step 7 again.
   Same per-case, owner-run rule — never automatic.
9. **Tell the player** — **no automatic in-game message** (`0503` plan Q5); the owner tells him himself, through the
   contact channel: ~~`0507`'s popup, or his reply on VK/Telegram if he already wrote in~~ *(2026-10-27:)* the
   `0507` one-player popup once the held game deploy has shipped it (checked live by `0513`), or his reply on
   VK/Telegram if he already wrote in. The wording is the owner's.

## Verification steps

1. `worklog.md` records, dated, steps 1–9 (step 8 only if it happened) with results in words and counts only — no ids, nicknames, tokens or hosts.
   A `grep` of the folder for UUID and Yandex-id shapes finds nothing.
2. ~~Step 4's read-back shows: target paid = yes, nickname present, receipts moved (count matches the dry run); source
   paid = no, nickname absent.~~ *(2026-10-27, KEEP = old:)* Step 5's read-back shows: kept old profile paid = yes,
   nickname present, receipt count unchanged, all his identities on it; every source paid = no, nickname absent, no
   identity.
3. Step 6 confirmed (owner's observation or the player's reply), dated.
4. Nothing else in production changed (the tool's summary lists only ~~the two records~~ the kept profile and the
   sources given).
5. *(2026-10-27)* Step 7's 24-hour follow-up dry run recorded, dated: nothing left on any source, or the re-run that
   swept it.
6. *(2026-10-27, owner ruling above)* Step 3 recorded, dated, **before** step 4: the backup marker read good for
   today (in words — no hosts, paths or ids), and whether a fresh backup was taken. Same for every re-run of step 4
   (steps 7 and 8).

## Notes

- **Depends on:** 0502, 0503
- **Blocks:** nothing
- **Related:** `0507` (how to reach him) and `0513` (its live check), `0424` (why the second record exists).
- If Yandex later says ids can change on events like a password change (`0508`), the same checklist serves the next
  case; file a new task per case, never an automatic merge (owner rule in `0424`).
- **No secrets, no personal data:** "the affected player" in every tracked file.
