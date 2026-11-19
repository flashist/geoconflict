# Restore the affected player's citizenship and nickname

**Source**: `ai-agents/tasks/backlog/0504-restore-the-affected-players-citizenship-and-nickname-with-the-merge-tool-owner-run/brief.md`; `ai-agents/tasks/backlog/0504-restore-the-affected-players-citizenship-and-nickname-with-the-merge-tool-owner-run/worklog.md`
**Status**: in-progress
**Sprint/Tag**: Sprint 9 — task 0504

## Goal
Restore the affected player's paid citizenship and approved nickname through a per-case owner-run merge, then verify recovery.

## Key Changes
On 2026-11-04, owner-supplied official support evidence met this case's account and purchase linkage gate; the previously withdrawn wrong candidate was excluded. The owner ran the approved merge into KEEP, the old paid profile, from three sources. Reported pre-merge backup succeeded; its restore was not tested. Support linkage and a reported login do not independently prove a current verified SDK session. Evidence is owner-reported, not independently inspected production. Source: worklog, `Entry evidence and approved records` and `Owner approval and backup`.

## Outcome
Owner-reported immediate dry run and narrow audit passed: KEEP had 173 XP and four identities, with its original paid state, receipt, dates and approved nickname/history retained; each of three retained sources had 50 XP and no identities. One audit row recorded three identities and 49 credit rows moved at 2026-11-04T12:09:08.742023Z. Immediate dry run proposed nothing to move; it is not the required later follow-up. Source: worklog, `continuation: immediate dry run and exact audit reported`.

Player contact and fresh-login confirmation and the ≥24-hour follow-up remain pending. Follow-up is not before 2026-11-05T12:09:08.742023Z; recommended 12:15 UTC / 15:15 Moscow. No reminder was scheduled in the source. Any further real sweep requires a fresh preview, a successful protected backup check and explicit fresh owner approval, followed by readback and its own ≥24-hour follow-up. No cause of the incident is established by the merge.

## Related
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
- [[tasks/profile-merge-tool]]
