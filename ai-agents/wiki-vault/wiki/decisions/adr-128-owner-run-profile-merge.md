# ADR-128: Owner-Run Profile Merges — One SSH-Only Command Folds Source Profiles into a Kept One; Paid State Moves Only via `transferPurchase`; Every Real Merge Is Audited

**Date**: 2026-10-27
**Status**: accepted *(supersedes [[decisions/adr-113-internal-player-id]] in part — owner-run merges only)*

> Source: `ai-agents/knowledge-base/decisions/adr-128-owner-run-profile-merge-tool-paid-state-moves-only-via-transfer-purchase-merges-are-audited.md`
> (drafted by `fkit-architect`, step 0.2 of task `0503`'s approved plan). Owner approval of that plan, 2026-10-27:
> **"Approve, all 7 as recommended (Recommended)"** — *"Keep old profile, XP each match once + one gift, record table,
> ships in profile image, no auto message, extra name stays reserved, 24h follow-up required. Then ADR-128, then
> build."* The architect heard every ruling by relay only.
>
> 📝 **Two dated clarifications, 2026-10-27** (owner rulings R1 and R3 from `0503`'s review; append-only, Status stays
> `accepted`, no decision changes) — folded in below where marked.
>
> 🏗️ **2026-10-27 sync (`5f93b96`) — built (`0503`, [[tasks/profile-merge-tool]]), committed `962f427`, NOT
> deployed.** At HEAD: `migrations/012_player_merges.sql`, `src/profile-server/mergeProfiles.ts`,
> `ProfileMergeCommand.ts`, `ProfileMergeRepository.ts`, `transferPurchase` in `PaymentsRepository.ts`, and the
> `merge-profiles` npm script (matched by grep/ls). Operator steps: `ai-agents/knowledge-base/profile-merge-runbook.md`.

## Context

- **The case:** the affected player's Yandex player ID changed twice (2026-10-22, 2026-10-25), leaving three records —
  old paid profile, intermediate profile, current profile
  ([[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]). Nothing but `player_identities` ties them.
- **ADR-113 deferred merging** and listed three questions a future decision must answer — which XP / citizenship / paid
  state survives; child-table PK clashes; live 24 h tokens on a merged-away id — and chose no `merged_into` tombstone,
  no merge audit table, no `unique (player_id, platform)`.
- **Paid state has one writer**, `grantPaidPurchase`, plus the SSH-only tester-role command as one documented
  exception ([[tasks/tester-roles-command]]). ADR-126 Decision 7 pre-committed a single `transferPurchase` primitive.
- **XP invariant** ([[decisions/adr-112-free-xp-grants]], 2026-10-24 amendment): `xp = Σ match credits + Σ grants +
  Σ rewarded match bonus`; tenure grant ≤ 50 XP, one row per player. [[decisions/adr-111-xp-economy-rescale]]: awards
  move up, never down.
- **Why a new ADR, not a dated note:** building merging and adding an audit table undoes ADR-113's stated choices.

## Decision

1. **One tool, owner-run, no route.** `merge-profiles dry-run | commit --into <KEEP> --from <S> [--from <S> …]`
   (1–5 sources, internal UUIDs only) inside the profile image, same shape as the tester-role command. **No HTTP
   route reaches it.** **Never automatic** (`0424`). One engine serves both directions — "move the logins to the old
   record" and "move the data to the new record" differ only in KEEP. **For this case KEEP = the old paid profile**
   (Q1); both newer profiles go in **one run, one transaction, all or nothing**. Dry run is the default; a real run
   needs `commit`, `--expect <fingerprint>` and a typed `MERGE` (no terminal → refuse). Inside the transaction it locks
   the rows, re-checks the fingerprint and every precondition, moves, checks invariants, writes the audit row. **No
   source is ever deleted.**
2. **ADR-113's three questions, answered for owner-run merges:**
   - **Paid state** moves only through `transferPurchase` — receipt, its intent and its entitlement row together, both
     sides' paid flags recomputed from the receipts each holds. 📝 *R3: each side's purchase date comes from receipt
     dates, never re-stamped — the receiver gets `least(its own date, this receipt's processed_at)`; the source gets
     `min(processed_at)` of what it still holds, null if none.* It is the **second writer of paid state from receipts**;
     tester-role stays the one flag-only exception. KEEP already owning the same durable item → the source's
     entitlement row is deleted and a double-charge warning printed. Under KEEP = old, **no purchase moves at all**.
   - **Earned citizenship:** KEEP gets the earliest earned date of all records; sources lose theirs.
   - **XP (Q2): each match once, the largest tenure gift once, every ad bonus once.** Clashes per `game_id` across the
     credit and rewarded-bonus tables; tenure rows swap so the larger ends on KEEP. ADR-112's invariant holds on every
     record afterwards; KEEP never ends below the highest XP any record had before (else roll back).
   - **Child tables:** identities all move; remaining intents and messages move; cosmetics move unless they clash;
     `purchase_holder_sightings` stay as evidence (printed by the dry run); any `tester_role_snapshots` → refuse.
   - **Names:** KEEP without a name takes a source's approved name (cleared on the source first, plus one new approved
     history row on KEEP). **KEEP with a name → a source's extra name stays reserved on the source** (Q6). A pending
     name request → refuse.
   - **Live 24 h tokens (Q7):** **no tombstone** (ADR-113's choice stands); a **follow-up dry run 24 h after the merge
     is required** and sweeps anything that landed on a source. A stale token reads as `other_player` in the game
     server's vouch for up to 24 h — expected and harmless ([[decisions/adr-124-join-token]] Decision 5).
3. **Every real merge is audited in `player_merges`** (Q3; migration `012`) — operator (self-reported), into, from
   list, fingerprint, moved counts, before-state (the `players` rows **without** display name). Written in the
   merge's own transaction; in backups. The junk-profile cleanup gains a `not exists player_merges` clause.
   📝 *R1: the before-state is a **guide only**. **Undo = restore a same-day backup into a throwaway database** and copy
   rows back by hand, each write with the owner's OK; a "confirm today's backup" step precedes every real run. Still
   **no undo command**.*
4. **Several Yandex identities on one record** — allowed by ADR-113 point 2, so `unique (player_id, platform)` stays
   out. **Not account linking:** ADR-113's trigger *"A second login method is scheduled"* stays armed.
5. **No automatic player message (Q5)** — the owner tells the player (`0504`).

## Consequences

- **Positive:** one tested, repeatable way back for an ID-changed player; a single receipt-moving path, so two records
  never both count as paid; XP never goes down and is never double-counted; a durable, backed-up record of every merge.
- **Costs:** migration `012` (14 → 15 tables) touches the restore drill, integration truncate list, the junk-cleanup
  runbook and test; `SELECT_BASE_CREDIT_SQL`'s *"Credit rows are insert-only"* comment becomes false; a merged-away
  source stays forever as an inert row; an active player keeps changing the fingerprint (run with him offline); one
  more required owner step (24 h follow-up); ships only with a profile-image deploy (weekend slot unless urgent).
- **Options rejected:** KEEP = current profile (moves more, same visible result); keep only the highest record's XP;
  plain sum including every tenure gift; a log file instead of a table; a `psql` script over SSH (duplicates the
  purchase-move SQL); an automatic "profile restored" message; releasing the extra name; an optional 24 h follow-up; a
  `merged_into` tombstone; a manual SQL session per case; an automatic merge on matching evidence.
- **Re-raise only if:** a second login method is scheduled; anyone proposes running a merge automatically, from a
  route or on a player's request (a defect against this ADR and `0424`); writes to a source are seen beyond the 24 h
  follow-up; a purchase needs to change profile outside this tool (must reuse `transferPurchase`); merges become
  routine (then `0424` and automated detection need a decision).

## Related

- [[decisions/adr-113-internal-player-id]] — superseded in part (§ *Account linking*'s "not built" and "no merge audit
  table"); its tombstone and uniqueness choices stand
- [[decisions/adr-126-permanent-purchases-not-consumed]] — Decision 7 and the sightings evidence
- [[decisions/adr-127-consume-switch-source-setting]] — the profile-box deploy this command rides with
- [[decisions/adr-112-free-xp-grants]] · [[decisions/adr-111-xp-economy-rescale]] · [[decisions/adr-124-join-token]]
- [[tasks/profile-merge-tool]] — task `0503`, the build
- [[tasks/lost-citizenship-cause-checks]] — task `0502`, the evidence (outcome A)
- [[tasks/tester-roles-command]] — task `0425`, the command shape copied
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
- [[systems/player-profile-store]]
- [[systems/shared-purchase-flow]] — the purchase flow whose receipts `transferPurchase` moves
- [[decisions/sprint-9]] — the sprint it was recorded in
