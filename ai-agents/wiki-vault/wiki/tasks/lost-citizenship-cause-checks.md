# Confirm the Two-Record Cause of the "Lost Citizenship and Nickname" Report — Owner-Run Read-Only Prod Checks (task 0502)

**Source**: `ai-agents/tasks/done/0502-confirm-the-two-record-cause-of-the-lost-citizenship-report-owner-run-read-only-prod-checks/brief.md` (`worklog.md` in the same folder read as evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9 — live player incident (rank 29, append rank flagged)

## Goal

Answer one question about one player, fast: does the affected player's login now land on a **different** profile
record than the one holding his paid citizenship and nickname? A checklist the **owner** runs on the profile box, every
statement a `SELECT` (agent SSH to the boxes is blocked by the permission classifier). Results go into the worklog in
**words and counts only**. Hub: [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]].

## Key Changes

- Eight checks with placeholders only: find the old record by approved nickname (case-insensitive — approved names are
  unique, `players_display_name_uq`); its receipts; its name history; which record(s) earned XP in his reported
  matches; the newer record's fingerprint (created date, paid, tenure grant); identities; **check 7** — are others hit
  (tenure grants / new records per day); optional **check 8** — do stored payloads carry `issuedAt` (counts only, for
  `0505`).
- Outcomes defined in advance: **(A)** two records confirmed; **(B)** old record not found or not paid → re-plan;
  **(C)** no new record → points at `0474` (profile-load failures) or the guest/SDK path.
- Not an absorb of parked task `0424` (can a Yandex id change, how often) — its trigger (*"a player says they lost XP
  or citizenship after logging in again"*) has fired; check 7 is its detector idea run once.

## Outcome

- **Outcome (A) on a three-profile chain** — owner ruling 2026-10-27, *"A now, merge after Yandex (Recommended)"*
  (option text: *"Call it A on our data; plan the merge tool (0503) now; run the restore (0504) only after Yandex
  confirms."*). Superseded an earlier *"Hold open until Yandex"* ruling the same day.
- **Correction mid-task:** the first searches used his **current display name** from the feedback, not the nickname he
  had set, and found nothing; a different player's profile was briefly taken as the candidate. Re-run with the right
  nickname: the old paid profile was found (created 2026-09-29, citizenship bought the same minute, 1 receipt). His
  three reported matches (2026-10-22 → 2026-10-24) all credited the **intermediate** profile. Browser history rises
  across the three (daysPlayed 54 → 75 → 77) and each profile starts shortly after the previous one stops → **one
  browser, ID changed twice** (2026-10-22, 2026-10-25).
- **Check 7 (run after the close, simplified):** tenure gifts per UTC day to new profiles, and how many had 30+ days of
  history. After the 2026-09-26 fresh start (hundreds a day), a steady **~5–15 a day** in the 30+ column since about
  2026-10-06 (range 5–24, max on 10-09); **no spike** on 10-22 or 10-25. Each such row is a long-time guest logging in
  **or** an ID change — the data cannot tell them apart. **Number of other affected players: unknown.** The reading is
  `fkit-lead`'s, relayed; not verified by the wiki.
- **Gaps, as closed:** checks 3 and 6 recorded in substance only; check 8 skipped. ⚠️ Closed on `fkit-lead`'s
  instruction that they may be recorded as not run — **not** an owner ruling. The folder grep for UUID / Yandex-id
  shapes was run at close: clean.
- **`0424`: kept parked** — *"Keep parked until Yandex (Recommended)"*.
- **Feeds:** `0503` (the chain shape), `0504` (the restore, which waits on this and on Yandex), `0508` (the evidence
  paragraph), `0424`.

## Related

- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] — the incident hub
- [[tasks/profile-merge-tool]] — task `0503`, the tool its outcome shaped
- [[tasks/yandex-player-id-change-message]] — task `0508`, which carries its evidence to Yandex
- [[tasks/one-player-message-popup]] — task `0507`, the way to reach the player
- [[decisions/adr-128-owner-run-profile-merge]] — cites its outcome
- [[decisions/adr-113-internal-player-id]] — the identities model a changed Yandex id breaks
- [[tasks/tenure-xp-grant]] — the tenure gift check 7 counts
- [[systems/player-profile-store]] · [[decisions/sprint-9]]
- [[tasks/feedback-message-player-yandex-id]] — task `0509`: a Yandex id in feedback reports, so the next case is not a name hunt
