# Owner-Run Manual Profile Merge Tool — SSH-Only, Dry Run First, Audited (task 0503)

**Source**: `ai-agents/tasks/done/0503-build-an-owner-run-manual-profile-merge-tool-ssh-only-dry-run-first-logged/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as evidence)
**Status**: done (agent-closed — not owner-verified) — committed `962f427`, **deployed 2026-10-27** (profile `0.0.165-profile.1`; ~~not deployed~~)
**Sprint/Tag**: Sprint 9 — live player incident (rank 30, append rank flagged)

> 🚀 **2026-10-28 sync (`7a2ef92`) — DEPLOYED 2026-10-27** in profile **`0.0.165-profile.1`** (`git tag --contains
> 962f427`); migration `012` applied 14:04:45 UTC; `player_merges` read **0** rows on 2026-10-27 (`0511` worklog). The
> restore `0504` is still `🔲 Backlog`. The "not deployed" text below is history.

## Goal

A generic, owner-run way back for a player whose login now lands on a fresh record after a Yandex id change: fold one
or more source profiles into a kept one, by hand, per case, on evidence. **Never automatic** (`0424`). Its first use
is `0504`, the affected player's restore. Hub: [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]].

## Key Changes

- **The approved plan** (owner, 2026-10-27, *"Approve, all 7 as recommended (Recommended)"*) is the build spec; its
  seven answers became [[decisions/adr-128-owner-run-profile-merge]]: Q1 keep the **old** paid profile; Q2 every match
  once, the largest tenure gift once, every ad bonus once; Q3 a `player_merges` audit table (migration `012`); Q4 a
  command **inside the profile image** (not a `psql` script); Q5 no automatic player message; Q6 a source's extra name
  stays reserved; Q7 the 24 h follow-up dry run is **required** in `0504`.
- **The chain:** `0502` found three records, so the tool takes 1–5 `--from` sources in one transaction.
- **Code at HEAD** (matched by ls/grep): `src/profile-server/mergeProfiles.ts` (entry), `ProfileMergeCommand.ts`,
  `ProfileMergeRepository.ts`; `transferPurchase` in `PaymentsRepository.ts` (the single receipt-moving primitive that
  ADR-126 D7 assigned here — its header now names *"transferPurchase, used only by the SSH-only merge command"*);
  `migrations/012_player_merges.sql`; npm script `merge-profiles`.
- **Docs:** new `ai-agents/knowledge-base/profile-merge-runbook.md` (find the internal ids, dry run, confirm today's
  backup, real run with `--expect <fingerprint>` and a typed `MERGE`, the required 24 h follow-up, exit codes, audit
  query — placeholders only); `profile-junk-cleanup-runbook.md` gains a `not exists player_merges` clause (and a note
  to drop it on a box without `012`); `profile-backup-restore-runbook.md` inventory → **15 tables**, with a STOP rule
  for a box missing `011` or `012`.
- **Review (stateful, owner rulings R1–R3):** R1 — undo is **restore a same-day backup into a throwaway database**, the
  audit row is a guide only, and a "confirm today's backup" step precedes every real run; R2 — a junk-cleanup runbook
  line; R3 — purchase dates taken from receipts, never re-stamped. R1 and R3 were written into ADR-128 as dated
  clarifications.

## Outcome

- **Tests (worklog):** `npm run test:integration` 15 suites, 235/235 (new `ProfileMerge.it.test.ts`);
  `npm run test:scripts:docker` 55 passed, restore-drill fingerprint identical over 15 tables; full `npm test` 242
  suites, 5402/5402. Run by the coder; **not re-run by the wiki**.
- **Not deployed.** The command reaches the box only with a profile-image deploy, which carries whatever profile code
  is committed then — the held `0491`/`0492`/`0496`, `0506` (S1), and this. Until then it does not exist on the box.
- **Not used yet.** `0504` (`🔲 Backlog`) runs it for the affected player with KEEP = the old paid profile and both
  newer profiles as sources — **only after Yandex confirms** the account and purchase link. No live verify task was
  split out; `0504` is the live use.

## Related

- [[decisions/adr-128-owner-run-profile-merge]] — the decision this builds
- [[decisions/adr-113-internal-player-id]] — superseded in part by it
- [[decisions/adr-126-permanent-purchases-not-consumed]] — D7, the `transferPurchase` rule
- [[tasks/lost-citizenship-cause-checks]] — task `0502`, the evidence and chain shape
- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, which writes the sightings the dry run prints
- [[tasks/stop-consuming-design]] — task `0505`, whose spec (§6.3) asked this plan for `transferPurchase`
- [[tasks/tester-roles-command]] — task `0425`, the SSH-only command shape copied
- [[tasks/profile-backup-restore-reproof-006]] — the restore drill whose inventory grew
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
- [[systems/player-profile-store]] · [[decisions/sprint-9]]
