# 0504 — worklog

## 2026-11-04 — owner-run recovery: production merge reported; verification pending

**Provenance and boundary.** Recorded by `fkit-producer`, consulted by `fkit-lead` at hop 1 of 2, from the owner's
live recovery evidence relayed on 2026-11-04. The producer did not access production or credentials, run the merge,
or independently inspect the screenshots/database. Task-record edits only; no closure or owner-verification claim.
The owner ran the production command and personally typed `MERGE`.

### Entry evidence and approved records (step 1)

- Official support screenshots supplied by the owner on 2026-11-04 confirm the account/profile linkage and the
  paid, non-refunded purchase. The date of supply is recorded; an exact support-reply timestamp was not supplied.
  The earlier support-pending gate is met for this case. The previous producer assessment, relayed by the lead,
  found this evidence sufficient under the runbook for owner-run restoration.
- **KEEP:** old paid profile. **SRC1 / SRC2:** the two previously established intermediate profiles.
  **SRC3:** the newer, support-linked profile with a November 4 login. Four profiles in this run; three sources.
  The withdrawn wrong candidate is excluded. Private values and the approved fingerprint remain outside artifacts.
- Support linkage plus the reported login is **not independent proof of a current verified SDK session**.
  No such session has been independently proven; player fresh-login verification remains pending.
- `0503`'s tool was deployed according to [[tasks/profile-merge-tool]] in the wiki; the owner-reported merge below
  is evidence of this live invocation, not an independent agent check of the deployed image or database.

### Owner approval and backup (steps 2–4)

**Owner approval, 2026-11-04, live `fkit_roles.fkit_ask_owner`, relayed by `fkit-lead` — verbatim:**

> Approve owner-run real merge (Recommended) — approve the shown KEEP, three sources and fingerprint; accept the open-page risk; confirm the successful pre-merge backup remains protected from same-UTC-day overwrite; complete readback, player fresh-login verification and the ≥24-hour follow-up.

This approves the shown preview and this real merge only. The preview/fingerprint values are deliberately omitted.

- Owner-reported successful pre-merge backup marker: **finished 2026-11-04 02:30:03Z; exit 0; error null**.
  Reported before the merge. A separate fresh hand-run backup was not reported; do not infer one.
- The owner committed to protecting this pre-merge backup from overwrite during the same UTC day, including a
  second backup or a profile deploy that takes one. This is an owner commitment, not independently checked storage
  protection. **No restore of this backup has been tested.**
- Undo remains the runbook's backup-to-throwaway-database procedure; the audit row alone cannot undo the merge.

### Observed command result (step 4; owner-provided output)

- Mode `commit`; outcome `merged`; reason null; **3 sources folded into KEEP; KEEP XP now 173**.
- Tool reported **one `player_merges` audit row**, operator **`root`**. The operator label is self-reported by the
  command; the later owner-run audit is recorded below. No independent agent audit-row inspection has occurred.
- **Exact audit `merged_at`: initially pending; later supplied on November 4**, recorded below. Do not use the
  backup time or the report date as the ≥24-hour follow-up anchor.

| Tool summary field | Observed count |
|---|---:|
| receipts | 0 |
| intents | 0 |
| identities | 3 |
| credits | 49 |
| rewarded | 0 |
| tenureRows | 0 |
| messages | 0 |
| cosmetics | 0 |
| namesMoved | 0 |

These are command-reported counts, not independent database verification. In particular, 49 moved credit rows is
not the final match-XP total. No receipts, intents, rewarded bonuses, tenure rows, messages, cosmetics or names were
reported moved. The original paid receipt, dates and approved nickname/history are expected to remain on KEEP.

### Expected readback — initial checklist (step 5; later owner-reported result below)

| Record | Expected state to check |
|---|---|
| KEEP | XP **173 = 123 XP from distinct match credits + 50 tenure XP**; paid true; citizen true; original paid receipt and original dates retained; original approved nickname and its history retained; **4 identities**. |
| Each of SRC1, SRC2, SRC3 | Profile retained; **50 XP**; no identity; no receipt; unpaid; not citizen; no approved nickname. |
| Audit | Exactly one row for this merge; three sources; moved counts match the table above; obtain exact `merged_at`. |

The owner's private record holds the nickname for exact comparison; it is not copied here.

### Current pending checks and residual (steps 6–9)

1. **Owner readback reported complete:** immediate dry run and narrow audit match the expected state; see the
   continuation below. This is owner-reported evidence, not independent agent production inspection.
2. **Player fresh login:** citizenship and original approved nickname must appear after a fresh login; no report yet.
   An already open page is not this check. The owner can contact the player after the merge; no pre-merge page-close
   confirmation was available. No post-merge message or player reply has yet been reported.
3. **Required ≥24-hour follow-up:** same KEEP and all three sources, same order, owner-run dry run under the
   runbook's owner-approval rule. Pending; not before **2026-11-05T12:09:08.742023Z**. Lead recommends
   **November 5, 12:15 UTC / 15:15 Moscow**, with margin after transaction start. **No reminder scheduled.**
   An active source page can continue writing for up to 24 hours; this risk was explicitly accepted in the approval.
4. **If the follow-up finds rows to sweep:** report the fresh preview, check a successful protected pre-merge backup,
   obtain a fresh fingerprint and explicit owner approval before any further real merge. The command's reminder
   that another commit sweeps leftovers is **not standing authorization**. A further merge needs readback and its
   own ≥24-hour follow-up. A newly linked profile likewise requires a fresh per-case approval.

Status is **🔄 In progress**, owned by `fkit-producer`; fresh-login/contact and ≥24-hour checks remain open. No closer invoked, no task moved,
no dependency or sprint placement changed, no source code/wiki write, no Git commit/push.

**Wiki gap:** [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] still records the older support wait
and unused merge. The watermark check found 0 commits since sync, but that does not cover this new owner evidence
or these uncommitted records. Route this brief/worklog to `fkit-wiki` for ingestion when requested; no wiki write here.

## 2026-11-04 — continuation: immediate dry run and exact audit reported

**Provenance.** Owner-reported live output received November 4, relayed by `fkit-lead` to `fkit-producer`
(hop 1 of 2). The producer did not access or independently inspect production. These checks report read-only
verification after the approved merge; **no new production writes** were reported or authorized.

### Immediate same-four-profile dry run (step 5)

- **KEEP:** XP **173 = 123 match-credit rows + 50 tenure XP**; ledger OK; citizen true; paid true;
  original **September 29** receipt and purchase date retained; earned date **October 14** unchanged;
  approved nickname/history unchanged; **4 identities**.
- **All three sources:** **50 XP each**; no identities; no receipts; unpaid; not citizen; no name.
- **No proposed moves.** Printed **NOTHING TO MOVE**; outcome `nothing_to_move`; all proposed move counts **0**.
- The active-source-last-24-hours warning remains the historical, explicitly accepted open-page risk.
  This immediate result **does not satisfy** the required ≥24-hour follow-up or prove that no later writes occur.

### Narrow exact-profile audit (step 5; READ ONLY / ROLLBACK)

- `matching_audit_rows` **1**; `merged_at` **2026-11-04T12:09:08.742023Z**; operator **`root`**;
  **3 sources**. Operator is the recorded self-reported label, not independent operator authentication.

| Source | Credits moved | Identities moved | Tenure action | Other moved fields | nameMoved |
|---|---:|---:|---|---:|---|
| SRC1 | 8 | 1 | stay | 0 | false |
| SRC2 | 11 | 1 | stay | 0 | false |
| SRC3 | 30 | 1 | stay | 0 | false |

- Totals **49 credits / 3 identities**, matching the real-run summary; **no inconsistencies reported**.
- `followup_not_before` **2026-11-05T12:09:08.742023Z**. Lead recommends the owner run the same-profile
  follow-up on **November 5 at 12:15 UTC / 15:15 Moscow**, leaving margin after transaction start.
  **No reminder scheduled.**

### Still pending and unchanged boundaries

- **Player fresh-login and contact confirmation: PENDING. Required ≥24-hour follow-up: PENDING.**
- **Restore of this pre-merge backup remains untested. A current verified SDK session remains not independently
  proven.** The successful backup marker and same-UTC-day overwrite-protection commitment remain as recorded above.
- Any re-sweep needs a **fresh preview/fingerprint, successful protected backup check and fresh explicit owner
  approval** before a real merge; then readback and its own ≥24-hour follow-up. No standing approval from the reminder.
- No private UUIDs, fingerprints, raw receipts or endpoints recorded. No source/wiki edit, closure, task move,
  dependency/placement change, Git commit or push.
