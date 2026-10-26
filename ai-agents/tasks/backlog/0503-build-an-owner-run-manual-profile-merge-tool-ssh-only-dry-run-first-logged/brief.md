# Build an owner-run manual profile merge tool (SSH-only, dry run first, logged)

## ID
0503

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-26**, relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel;
> ADR-021/037). ⛔ Not producer precedent. The owner picked **"Merge tool + stop consuming"** — option text: *"Both.
> Stopping consuming is medium work, needs a new ADR, and touches the purchase flow waiting to deploy. Knock-on: may
> hold that deploy (0493/0497/0498 wait on it)."* Full provenance in
> [`0502`](../0502-confirm-the-two-record-cause-of-the-lost-citizenship-report-owner-run-read-only-prod-checks/brief.md).

## Priority
30

> ⚠️ Priority 30 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0502`** (where it sits), and with it at the top of the open work, because it
> is the only way back for a paying player whose login now lands on a fresh record. Appended after the board's highest
> rank, never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-coder

> The plan needs an **architect review** before approval (see *Conflict* below) — a consult from the coder's plan, not
> a separate task. The owner approves the plan.

## Context

- A player's profile (XP, citizenship, paid flag, approved nickname, purchase receipts, entitlements) hangs off one
  `players` row; logins map to it through `player_identities` (ADR-113). If Yandex hands the same person a new
  `getUniqueID()` — or he logs in from another Yandex account — he gets a **fresh empty record** and the old one becomes
  unreachable. It happened to the owner's test account on 2026-10-08 (`0424`), and is the suspected cause of the
  2026-10-25 report from **the affected player** (`0502` confirms or refutes it).
- Our client **consumes** every purchase after the server records it, so Yandex no longer lists the affected player's
  citizenship purchase; our database is the only place it still exists. Stopping that (`0505`/`0506`) helps future
  buyers only.
- **Owner rule from `0424`, binding here: never an automatic merge.** The only link between two records is a person's
  claim; an automatic merge would let anyone claim someone else's progress. The tool is run by the owner, by hand, per
  case, on evidence.

### ⚠️ Conflict — a locked decision this re-opens

[ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md) § *Account
linking — recorded, deliberately NOT built, NO task (owner, 2026-09-15)* deferred merging, and deliberately did **not**
add a `merged_into` tombstone, a merge audit table, or `unique (player_id, platform)`. A manual merge tool is not
account linking (no second login method), but it must answer the three questions that section lists:

1. which XP, citizenship and paid state survive a merge;
2. child-table primary-key clashes (two `tenure` rows in `player_xp_grants`, pending name changes, the same
   `game_id` in both records' credit ledgers);
3. live session tokens (24 h TTL) pointing at a merged-away record.

The plan answers them; the architect reviews; the answers are recorded as an ADR or a dated note on ADR-113
(`/fkit-record-decision`, by `fkit-architect`) **before the build**. If the plan wants a tombstone or an audit table,
that is exactly the ADR-113 change to record.

## What to build

A command the owner runs on the profile box over SSH. **No HTTP route** — ADR-113 §3: no public route accepts a player
id; operator tooling may.

1. **Inputs:** the source (old) and target (new) player ids, given on the command line. No platform ids needed.
2. **Dry run is the default.** It prints, for both records: paid flag, citizenship dates, XP, display name and its
   moderation state, receipt count, entitlement count, identity count, and **exactly what the real run would change**,
   row by row. A real run needs an explicit flag **and** a typed confirmation.
3. **The real run is one transaction** — all or nothing. It re-checks the dry run's preconditions inside the
   transaction and refuses if either record changed since (e.g. compare a printed fingerprint of both rows).
4. **What it moves** (the lead's scope): paid flag and `citizenship_purchased_at` (and `is_citizen` as the
   constraints require), purchase receipts (`processed_purchases.player_id`), entitlements (`player_entitlements`,
   only if migration `010` is applied on the box — it is not yet, `0496` is undeployed), XP, and the approved nickname.
   - **Move, never copy.** After the run the old record no longer holds the paid flag, the receipts or the
     entitlements, so two records never both count as paid.
   - **Nickname:** `display_name` is unique case-insensitively (`players_display_name_uq`), so clear it on the old
     record and set it on the new one inside the same transaction. Its approved history row comes with it or a new
     approved row is written — the plan says which.
   - **XP:** the rule is the owner's (sum, keep the larger, or old + new match credits) — ADR-111 says awards move up,
     never down. The plan proposes one; the owner rules at plan approval.
   - **Everything else** in child tables (`player_xp_grants`, `player_match_xp_credits`,
     `player_rewarded_match_xp`, `player_name_history`, `player_messages`, `purchase_intents`,
     `player_cosmetic_ownership`, `tester_role_snapshots`): the plan lists each table with *move / leave / merge* and
     the reason, including every PK clash.
5. **Alternative the plan must weigh — re-point the login instead of moving the data.** Move the new Yandex identity
   row (`player_identities`) onto the **old** record, so the player's login lands on his old record with everything
   intact; then decide what happens to the fresh record's few matches of XP. Fewer rows touched, receipts never move.
   The plan compares both and the **owner picks at plan approval**. (Both remain manual and owner-run.)
6. **Logged:** every dry run and real run writes one line to the profile server's log (or stdout captured by the
   owner) with what changed in counts. Ids may appear in box-local output only — never in a tracked file.
7. **Generic:** the tool serves the next case too, not just this one. No hard-coded ids.

### ⚠️ How it ships — a knock-on to settle in the plan

The profile box has **committed but undeployed** server code waiting (`0491`, `0492`, `0496`; checked by `0499`,
`0493`, `0497`). If the tool ships **inside the profile image**, deploying it also deploys all of that. The plan says
how the tool reaches the box:

- **(a) a script run with `psql` over SSH** (no image deploy; nothing else ships), or
- **(b) a command inside the profile image** — the deploy then carries `0491`/`0492`/`0496` too, and the owner decides
  that deploy (weekend slot unless urgent).

Do not settle this silently in code; the owner rules at plan approval.

## Verification steps

1. Integration tests (`npm run test:integration`, real Postgres) cover: dry run changes nothing (row-for-row compare
   before/after); a real run moves paid flag, receipts, entitlements (when the table exists), XP per the ruled rule and
   the nickname; after it, the old record is not paid, has no receipts, and holds no `display_name`; a
   `players_display_name_uq` clash cannot happen; the run is all-or-nothing (a forced failure mid-run leaves both
   records unchanged); the precondition re-check refuses when a record changed between dry run and real run.
2. Tests for each PK clash the plan lists (at least: both records hold a `tenure` grant row).
3. If the plan picks the re-point alternative, tests that the moved identity resolves to the old record on the next
   login, and that the new record no longer has that identity.
4. Running without the explicit flag and confirmation never writes.
5. No new public route: a test or a grep shows no HTTP handler reaches the merge code.
6. The ADR-113 questions are answered in a recorded decision (ADR or dated ADR-113 note) before the build is reviewed.
7. `npm test` and `npm run test:integration` green (full runs through the npm scripts — project lock).
8. A short operator note (where the existing profile-box runbook lives) says how to run a dry run and a real run,
   with placeholders only.

## Notes

- **Depends on:** nothing
- **Blocks:** 0504 (running it for the affected player).
- **Build does not wait on `0502`; use does.** The tool is generic, so it can be built and tested while the owner runs
  the checks. `0504` waits on both.
- **Related:** `0424` — this is a **new task that `0424` relates to**, not a pull or absorb of it. `0424` scoped "any
  code change … a merge tool" as *a new brief*; this is that brief. `0424` stays parked on the Backlog board for the
  root-cause question (can a Yandex id change, how often) unless the owner un-parks it.
- **Related:** `0505` (stop consuming) — a merge that moves receipts and an unconsumed-purchase "move to the new
  record" path will touch the same `processed_purchases` ownership. Keep the two consistent; the architect sees both.
- 📝 **2026-10-26 — notes for the plan, from the approved `0505` design (inputs, not decisions).** The owner approved
  the `0505` spec and ADR-126 (**"Approve (Recommended)"**, relayed by `fkit-lead`; ⛔ not producer precedent). The
  design (D1) builds **no automatic move** — this tool stays the only way a purchase changes profile. The spec (§6.3,
  §6.2, §12 knock-ons) asks this plan to:
  1. **Use one shared repository primitive, `transferPurchase(token, fromPlayerId, toPlayerId)`**, built **here**: it
     moves the receipt (`processed_purchases.player_id`), the paid flags and the entitlement row **together** — move,
     never copy; the source's `is_paid_citizen` / `citizenship_purchased_at` recomputed from its remaining receipts.
     Any future move (should the owner ever reopen D1) reuses it. A tester-role profile (`0425`) is refused or handled
     explicitly.
  2. **Print the "held elsewhere" sightings in the dry run** — the rows of the new `purchase_holder_sightings` table
     (`0506`/S1, migration `011`) for the two records given, as evidence for the owner. Evidence, not proof (a replayed
     payload can plant one; the row keeps `payload_issued_at`). If the table is not on the box yet, say so in the output.
  3. **Prefer option (b), a command inside the profile image** (*How it ships*, above): then the tool calls the same
     primitive. If the plan picks (a), its SQL must be that primitive's SQL and a reviewer checks the two match. The
     owner still rules (a) vs (b) at plan approval. ⚠️ Knock-on of (b): the image deploy carries whatever profile code
     is committed by then — the held `0491`/`0492`/`0496`, and `0506` (S1) once it is built — i.e. the held
     profile-box bundle, which the owner ruled waits for `0506`.
- **Ships by:** see *How it ships* above. Committed is not deployed. Split a live verify out at close only if the
  owner wants one; `0504` is the live use.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets, no personal data** in tests, fixtures, logs committed to git, or this folder.
