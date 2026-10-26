# Confirm the two-record cause of the "lost citizenship and nickname" report (owner-run, read-only prod checks)

## ID
0502

> ℹ️ **ID allocation, checked 2026-10-26 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0501`, so this split takes `0502`–`0508` in
> dependency order. No reference to any of them existed in `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-26**, given in the lead's Claude Code session and relayed by `fkit-lead` to a
> spawned `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent. Asked *"Given that not consuming
> can't recover this player's purchase, what do we do first?"*, the owner picked **"Merge tool + stop consuming"** —
> option text: *"Both. Stopping consuming is medium work, needs a new ADR, and touches the purchase flow waiting to
> deploy. Knock-on: may hold that deploy (0493/0497/0498 wait on it)."* Sprint 9 is the lead's instruction for the
> whole incident split.

## Priority
29

> ⚠️ Priority 29 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs at the top of the board's open work, above `0455`**, because a paying player has lost what
> he paid for and every other incident task waits on what this finds. Closed rows sit between, so the highest an
> owner re-rank can reach is **directly below `0496`**. Appended after the board's highest rank (28), never inserted
> (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

> The **owner** runs every check (agent SSH to the boxes is blocked by the permission classifier, 2026-10-13). The
> producer owns the task: the checklist, recording the answers in `worklog.md` without personal data, and closing it.

## Context

### The report

2026-10-25 in-game feedback (category Bug), Yandex platform, game `0.0.165`: **the affected player** says the paid
citizenship he bought on day one and his approved nickname have both disappeared. The feedback reached us by Telegram
and carries his in-game name only.

### What the code says (read-only investigation in another session, 2026-10-26 — NOTHING proven against prod data)

- Citizenship (`players.is_paid_citizen`) and nickname (`players.display_name`) live on **one** `players` row. No code
  path removes both. Nothing expires or refunds paid citizenship.
- **Most likely (suspected):** his login now resolves to a **different** profile record. Either Yandex issued a new
  `getUniqueID()` for the same account — parked task
  [`0424`](../0424-investigate-yandex-returning-a-different-player-id-for-the-same-account-if-it-recurs/brief.md), which
  happened to the owner's own test account on 2026-10-08 — or he is on a different Yandex account. Either way, a fresh
  empty record was created; the old paid record is probably intact but unreachable.
- **Less likely:** profile loads failing for him (task
  [`0474`](../0474-investigate-why-about-2-3-percent-of-logged-in-loads-get-no-profile-login-timeouts/brief.md)), or he
  is playing as a guest / the Yandex SDK failed, so no profile loaded at all.
- Approved nicknames are **unique, case-insensitive** (`players_display_name_uq`, migration `006`), so the approved
  nickname finds at most one record.

### This is `0424`'s trigger

`0424` is parked until *"a player says they lost XP or citizenship after logging in again"*. That has now happened.
This task does **not** absorb `0424`: it answers one question about one player, fast. Its check 5 (tenure-grant spike
by day) is `0424`'s detector idea run once; the result feeds `0424` if the owner un-parks it.

## What to build

A checklist the owner runs on the profile box, read-only. Placeholders only — **no real value is ever written into
this brief, the worklog, a report or git**: `<APPROVED_NICKNAME>` (from the feedback), `<OLD_PLAYER_ID>`,
`<NEW_PLAYER_ID>`, `<MATCH_ID_1..3>` (the three match IDs in the report), `<REPORT_DATE>`. The producer (or a coder,
on request) writes the exact SQL in the worklog before the owner runs it; every statement is a `SELECT`.

1. **Find the old record** by `lower(display_name) = lower('<APPROVED_NICKNAME>')`: its id, `is_paid_citizen`,
   `citizenship_purchased_at`, `xp`, `created_at`, `last_login_at`. Record: found / not found, paid yes/no, last login
   date.
2. **Its purchase receipts:** `processed_purchases` rows where `player_id = <OLD_PLAYER_ID>` — count, product ids,
   `processed_at`. (No tokens or payloads copied out.)
3. **Its name history:** `player_name_history` rows for `<OLD_PLAYER_ID>` — confirms the nickname was approved there and
   was never changed away or cleared.
4. **Which record(s) earned XP in the report's matches:** `player_match_xp_credits` rows for `<MATCH_ID_1..3>`.
   A credit to a player id other than `<OLD_PLAYER_ID>` in a match he played is the new record →
   `<NEW_PLAYER_ID>`.
5. **The new record's fingerprint:** for `<NEW_PLAYER_ID>` — `created_at`, `is_paid_citizen` (expect false), XP, and
   whether a `player_xp_grants` tenure row exists with a large value (a fresh record in a browser with old play
   history, the 2026-10-08 signature). Also: does it have one `player_identities` row, and is it on platform
   `yandex_games`.
6. **Old record's identities:** `player_identities` for `<OLD_PLAYER_ID>` — how many, and their `last_login_at`
   (a stale identity that stopped logging in around the new record's `created_at` fits the id-change theory).
7. **Are others hit?** Tenure-grant rows per day for the last ~60 days, and new-record counts per day. A day well above
   the normal rate is a lead, not proof. Record counts only.
8. **Optional — do stored purchase payloads carry `issuedAt`?** (Added 2026-10-26 for `0505`'s design, spec §14
   item 2: it needs to know whether Yandex's signed purchase envelope carries an `issuedAt` field.) Over
   `processed_purchases`, count rows whose `raw_payload` has a top-level `issuedAt` key, and the total row count.
   **Two numbers only** — never select, print or copy `raw_payload` contents, tokens or player ids. If skipped, the
   profile box's shadow logs answer it after the `0506` deploy.

**Read-only. No `UPDATE`, `INSERT`, `DELETE` or DDL.** Run inside a read-only transaction if the owner prefers.

### Outcomes to record

- **(A) Two records confirmed:** old paid record found, new record created around the time he lost access, credits for
  his matches went to the new one. → `0504` can run once `0503` is built.
- **(B) Old record not found by nickname**, or found but not paid → the two-record theory is wrong or incomplete;
  stop, report to the owner, and re-plan `0503`/`0504` before use.
- **(C) No new record** (his matches credited the old record, or nobody) → points at `0474` or the guest/SDK path;
  report to the owner.
- **Others hit:** the check-7 numbers, and whether they suggest more players than him.

## Verification steps

1. `worklog.md` in this folder records, dated, each of checks 1–7 (and check 8 if run, or "check 8 skipped") as run by the owner, with its result **in words and
   counts only** (found / not found, yes / no, dates, counts) — no player ids, Yandex ids, nicknames, tokens, hosts or
   connection strings. A `grep` of the folder for UUID and Yandex-id shapes finds nothing.
2. The worklog states which outcome (A), (B) or (C) holds, and the owner's words confirming it.
3. The worklog states whether check 7 suggests other players are hit, with the daily counts it rests on.
4. Every statement run was a `SELECT`; nothing in production changed.
5. If the owner ruled on `0424` (un-park, or leave parked) while reading the results, the ruling is recorded here,
   dated, in the owner's words.

## Notes

- **Depends on:** nothing
- **Blocks:** 0504 (the merge is only run once this confirms which record is his).
- **Feeds, not blocks:** `0508` (the evidence paragraph in the message to Yandex), `0424` (its trigger has fired),
  `0505` (check 8's `issuedAt` count; optional, the design does not wait on it).
- **Related:** `0424` (parked Yandex-id-change investigation — this is a new task that relates to it, not a pull of
  it), `0474` (profile-load failures, the less-likely cause), `0503` (merge tool), `0507` (contact popup — its target
  value may come from this task).
- **Where the IDs live while in use:** in the owner's own SSH session and notes, never in a tracked file.
- **No secrets, no personal data:** "the affected player" everywhere in tracked files.
