## 0503: plan for the owner-run profile merge tool (plan only, nothing written)

- **I wrote nothing:** no source, no files, nothing committed. The architect was consulted at hop 2 and also wrote nothing.
- **Architect's verdict: CHANGES REQUESTED**, on six narrow points. All six are now in the plan below. The architect said that with them in, the plan can go to the owner without another architect round. I checked the facts it cited myself: the ADR-112 XP rule, the rewarded-bonus base-credit check, the name-notice query, and the `countOrphanPlayers` test helper.
- **One tool covers both of the brief's options.** It runs `--into <KEEP> --from <S1> [--from <S2>]`. "Move the data to the new record" and "re-point the login to the old record" are the same engine with a different KEEP.
- **For this case I recommend keeping the OLD paid profile.** His two newer logins get moved onto it. The receipt, paid flag, nickname and its history never move. If Yandex flips him back to any of his known IDs, he still lands on the right profile.
- **Chain:** both sources go in one run, one transaction, all or nothing.
- **What happens if his ID changes again:** run the same command once more with the new profile as the source.
- **How it ships: I recommend option (b),** a command inside the profile image. It only ever joins a profile-box deploy; it never holds one back.
- **No source profile is ever deleted.**
- **Must happen before the build:** the architect records **ADR-128** after the owner rules. It must be a new ADR, not a dated note on ADR-113, because it reverses part of ADR-113's "not built / no audit table".
- **7 owner questions** are at the end.

---

## Plan

### 0. Before the build
1. The owner rules on Q1–Q7 below.
2. `fkit-architect` records ADR-128 with `/fkit-record-decision`. It covers:
   - ADR-113's three questions, answered as below;
   - `transferPurchase` as the second writer of paid state (ADR-126 D7);
   - the audit table, if Q3 = yes;
   - identities moved onto one record, for owner-run merges only (the trigger "a second login method is scheduled" stays armed for real account linking);
   - ADR-113 gets append-only ⛔ pointer markers.
3. The build starts only after that.

### 1. Answers to ADR-113's three questions
These are the draft that ADR-128 records.

**Q1. Which XP, citizenship and paid state survive (XP rule pending Q2)**
- **Paid state:** moves only through `transferPurchase`, never copied. Both sides' paid flags are recomputed from the receipts each side holds.
- **Earned citizenship:**
  - KEEP's `citizenship_earned_at` becomes the earliest non-null value across all records, and `is_citizen` is set.
  - If KEEP ends at or above the citizenship threshold with no earned date, it is stamped `now()`.
  - On each source, `citizenship_earned_at` is cleared and `is_citizen` recomputed (architect item 6). Nothing is lost: the before-state goes into the audit row.
- **XP** (recommended rule, pending Q2): every match counted once, the **largest** tenure gift counted once, every ad bonus counted once.
  - Each source keeps XP equal to the sum of the ledger rows it still holds. This keeps ADR-112's rule `xp = Σ credits + Σ grants + Σ rewarded` true on every record (architect item 1).
  - **Checked inside the transaction:** KEEP's XP afterwards must be at least the highest XP any involved record had before. If not, the run rolls back.

**Q2. Child-table clashes**

| Table | Rule |
|---|---|
| `player_identities` | Move all. The key is the platform id, so there is no clash. |
| `processed_purchases` + its `purchase_intents` + `player_entitlements` | Through `transferPurchase`. If KEEP already owns the same durable product, the source's entitlement row is deleted and a warning is printed (it means a double charge). If a source holds more than one receipt for the same durable product, the run refuses. |
| Remaining `purchase_intents` | Move all. A late reconcile then lands on KEEP. This is a `PaymentsRepository` method. |
| `player_match_xp_credits` + `player_rewarded_match_xp` | Clash is per `game_id`, across both tables (architect item 2). If KEEP holds that game in either table, neither of the source's rows moves and their XP counts as a duplicate. Otherwise both move. |
| `player_xp_grants` (tenure) | KEEP has none → the source's row moves. Both have one → the larger row ends on KEEP and the smaller stays on the source (row swap). A 0-XP check row counts as a row. |
| `player_name_history` + display name | See the name rules below. |
| `player_messages` | Move all. |
| `player_cosmetic_ownership` | Move rows that don't clash; clashing rows stay. |
| `purchase_holder_sightings` | Left in place as evidence. Printed in the dry run. |
| `tester_role_snapshots` on any involved record | Refuse. |

Name rules:
- If KEEP has no name and a source has an approved name: clear it on the source, then set it on KEEP, in the same transaction and in that order, so the unique-name index never clashes.
- Then move all of that source's history rows, and insert a new history row on KEEP with `moderation_status='approved'` set **explicitly**. That row is then the newest, so the name card can't show a stale decline notice (architect item 3).
- If KEEP already has a name, see Q6.
- **Refuse** when any source has a pending name request, or when KEEP has a pending request and a name is moving onto it.

**Q3. Live 24-hour login tokens**
- No `merged_into` tombstone. We rely on the 24-hour token life.
- A page still open on a source can keep writing to that source until it reloads: a purchase, or a credit from a match already in progress.
- The dry run warns when a source had a login or credit recently.
- A follow-up dry run 24 hours later is a **required** step (Q7). If it finds anything left on a source, a re-run sweeps it.
- A stale token will show as `other_player` in the game server's identity check for up to 24 hours. That is expected and harmless (ADR-124 D5); the runbook says so.

### 2. The command
It has the same shape as the existing tester-role command (task 0425). It talks to Postgres directly; there is no route.

**Dry run** (the default):
```
npm run -s merge-profiles -- dry-run --into <id> --from <id> [--from <id>]
```
- Ids must be internal UUIDs, distinct, 1–5 sources, and KEEP is not among the sources.
- It prints, per record (labelled "into", "from #1", …, never the ids):
  - created and last-login times, XP and the ADR-112 rule check;
  - earned and paid flags with their dates;
  - display name and its latest moderation state;
  - receipts (count, product, date), entitlements and identities (count and times only);
  - tenure row, ledger counts, messages, intents, tester snapshot.
- Then "what the real run would change", row by row.
- Then the purchase-holder sightings involving these records (no tokens).
- Then warnings, and a **fingerprint**: an md5 over every involved row in every table, computed in SQL with the session timezone set to UTC.

**Real run:**
```
npm run -s merge-profiles -- commit --into <id> --from <id> ... --expect <fingerprint>
```
- It also asks you to type `MERGE` at an interactive prompt. Without a terminal it refuses, so the runbook gives the commit form of `docker compose exec` **without `-T`** (architect item 5).
- Inside one transaction:
  1. Lock every involved `players` row `FOR UPDATE`, in id order.
  2. Recompute the fingerprint and refuse if it differs.
  3. Re-check every precondition.
  4. Apply the moves.
  5. Check the invariants afterwards (rules below).
  6. Insert the audit row, then commit.
- After the moves, the run rolls back unless all of these hold:
  - KEEP's paid flags match its receipts;
  - no source holds a receipt or an identity;
  - the ADR-112 XP rule holds on every record;
  - KEEP's XP is not below anything it was before.

**Refusals**, each of which writes nothing:
- bad arguments;
- unknown player;
- migration `012` not listed in `schema_migrations`;
- tester snapshot;
- pending name request;
- a record whose paid flags don't match its receipts, or whose XP breaks the ADR-112 rule;
- fingerprint mismatch;
- nothing to move.

**Logging:**
- Every run prints one summary line to stdout with counts only.
- A real run also writes one `player_merges` audit row in the same transaction (Q3).
- Dry runs and refusals go to stdout/stderr only.
- Exit codes follow the tester-role convention.

### 3. Files
- `migrations/012_player_merges.sql` (new, if Q3 = yes): id, merged_at, operator (self-reported), into_player_id, from_player_ids uuid[], fingerprint, moved-counts jsonb, before-state jsonb (players rows without the display name). No foreign keys.
- `src/profile-server/PaymentsRepository.ts`:
  - `transferPurchase(client, token, from, to)`;
  - a method to move the remaining intents and a method to read the sightings, both taking the transaction's client;
  - the paid-flag recompute as **one UPDATE per record**, because the check constraints are tested after each statement;
  - the header's "only `grantPaidPurchase`" sentence updated to name the second writer.
- `src/profile-server/ProfileMergeRepository.ts` (new): reads the state, the fingerprint SQL, and the merge transaction. Name SQL passes the moderation status explicitly.
- `src/profile-server/ProfileMergeCommand.ts` (new): argument parsing, guard order, output, confirmation, summary line.
- `src/profile-server/mergeProfiles.ts` (new): the entry point. It must not import `Server`, `Routes` or `Telemetry`.
- `src/profile-server/PlayerProfileRepository.ts`: rewrite the comment above `SELECT_BASE_CREDIT_SQL`. It says "insert-only", which the merge makes false.
- `package.json`: a `merge-profiles` script.
- `scripts/config-parity-allowlist.json`: `PROFILE_MERGE_OPERATOR`, runtime-supplied.
- The restore drill:
  - `tests/testdata/profile-restore-drill/verify.sql` (14 → 15 tables);
  - `tests/profile-backup-dryrun.sh` text;
  - the inventory in `ai-agents/knowledge-base/profile-backup-restore-runbook.md`.
- `tests/integration/support/db.ts`: add the table to the truncate list, and update the `countOrphanPlayers` comment (merged-away records have no identity).
- `tests/integration/Migration006.it.test.ts`: migration and table lists.
- `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md` + `tests/integration/JunkCleanup.it.test.ts`: add a `not exists player_merges` clause, so the cleanup never deletes a merged-away source (and its sightings with it).
- `ai-agents/knowledge-base/profile-merge-runbook.md` (new): dry run, commit, the 24-hour follow-up, and the re-run if the ID changes again. Placeholders only.
- `setup-profile.sh` and the deploy scripts are **not touched**, so the deploy-hardening harness is unaffected.

### 4. Tests
**New `tests/integration/ProfileMerge.it.test.ts`** (real Postgres):
- a dry run changes nothing (digest of every table, before and after);
- the three-record chain with KEEP = old: identities moved, the XP rule, tenure largest-once, sources inert, KEEP's paid state and name untouched, the audit row written;
- the move-data direction with KEEP = current: paid flag, receipt, intent and entitlement moved; `purchased_at` kept; source no longer paid; name moved with no unique-index clash; history moved plus the new approved row; the name card reads "approved";
- each clash: both have a tenure row; the same game in the credit and bonus tables; the same durable product; a cosmetic; a pending name on either side;
- all or nothing: a test-only trigger that raises on the audit insert leaves everything unchanged (no test seam in production code);
- a fingerprint mismatch refuses;
- every refusal in §2;
- a re-run says "nothing to move", and residue left on a source is swept;
- the moved Yandex identity resolves to KEEP (brief check 3);
- KEEP's XP is never below its previous high.

**Extended `tests/integration/PaymentsRepository.it.test.ts`:** `transferPurchase` moves the receipt, intent and entitlement, and recomputes both sides; a source with a second receipt stays paid; a mismatched holder is refused.

**New `tests/profile-server/ProfileMergeCommand.test.ts`** (unit):
- argument parsing and guard order;
- no write without `commit` + `--expect` + a typed `MERGE`;
- no terminal → refuse; wrong word typed → refuse;
- stdout and the summary line contain no UUID-shaped text;
- the import surface excludes `Server`, `Routes` and `Telemetry`;
- no route reaches the merge code (`Routes.ts` and `Server.ts` don't import `ProfileMerge*`).

**Checks I will run:**
- `npx tsc --noEmit`, `npm run lint`;
- targeted suites;
- `npm run test:integration` (needs the `gc-0012-it-pg` container);
- one full `npm test` through the project lock;
- `npm run check:config-parity`.

**Will skip unless Docker plus age, rclone and jq are present:** `npm run test:scripts:docker`. It is the only check that runs the `verify.sql` change. I'll say plainly if it is skipped.

**Rough effort:** 2–3 dev days plus review.

### 5. Risks and edge cases
- **The real records may fail a precondition.** If the old profile's XP doesn't match its ledgers, or its paid flags don't match its receipts, the dry run refuses. That stops the run and we re-plan; it costs a dry run, not data.
- **The fingerprint covers last-login and XP, so an active player can make it fail repeatedly.** Each time, run the dry run again. The runbook says to run with the player offline if possible.
- **A purchase or credit that writes its row just before the merge's lock can commit right after the merge.** The 24-hour follow-up dry run catches it.
- **No undo command.** The audit row's before-state makes a reversal by hand possible.
- **`0504` needs a producer edit if Q1 = keep old.** Its "target = current profile" and its read-back wording ("old record not paid") flip.

---

## Open questions

**Knock-on for every question:** none of these changes any sprint placement or `Depends on:` link. `0504` waits on `0503` and on Yandex either way.

**NEEDS-DECISION Q1: which profile do we keep?**
- Options:
  1. **Keep the old paid profile (Rec):** his two newer logins move onto it.
  2. Keep the current profile: purchase, paid flag, nickname and history move onto it.
- Recommendation: 1.
- Context:
  - Both options give the same result for the player: his login shows his citizenship and nickname. The internal id is never visible to him.
  - Option 1 moves about a dozen rows and never touches the purchase or the name.
  - Option 2 moves the receipt, paid flags, name and history, so there is more that can go wrong.
  - Under option 1, any of his three Yandex IDs lands on the right profile if Yandex switches back.
  - Knock-on: `0504`'s checklist wording changes under option 1 (producer edit). Nothing else changes.

**NEEDS-DECISION Q2: the XP rule**
- Options:
  1. **Add everything up, each match once, the welcome gift once and the largest one kept (Rec).**
  2. Keep only the highest single profile's XP.
  3. Add everything up, including every welcome gift.
- Recommendation: 1.
- Context:
  - Each of his three profiles got its own welcome gift (up to 50 XP) from his browser history, so a plain sum counts that gift three times.
  - Option 1 counts every match he played and the gift once, and he never ends up with less XP than he sees today. That is checked and tested.
  - Option 2 drops the matches he played on the newer profiles.
  - Option 3 gives him extra XP he didn't earn.
  - Knock-on: none.

**NEEDS-DECISION Q3: keep a merge record in the database?**
- Options:
  1. **Yes, a small `player_merges` table (Rec).**
  2. No table; a log file on the box.
- Recommendation: 1.
- Context:
  - The table row is saved in the same step as the merge, so it can never record a merge that didn't happen. It is included in backups.
  - It is the only way to tell later that a profile was merged away.
  - It needs a new migration (`012`) and small test and runbook updates.
  - ADR-113 said "no audit table" on purpose; this changes that, and ADR-128 records it.
  - A log file is weaker: it is not in backups and not tied to the merge's transaction.
  - Knock-on: none.

**NEEDS-DECISION Q4: how the tool reaches the box**
- Options:
  1. **(b) A command inside the profile image (Rec).**
  2. (a) A `psql` script run over SSH.
- Recommendation: 1.
- Context:
  - (b) uses the same tested code as `transferPurchase`.
  - (b) reaches the box only with a profile-box image deploy, which carries everything committed by then: the held `0491`/`0492`/`0496` and `0506` (S1). If `0503` is committed before the S1 deploy, it rides along. If not, it needs its own later profile deploy (weekend slot unless urgent).
  - (a) needs no deploy, but duplicates the purchase-move SQL (a reviewer must keep the two in step), has to create the audit table outside the migration runner, and is weaker to test.
  - `0504` waits on Yandex anyway, so (b) probably adds no delay.
  - Knock-on: with (b), `0503` never holds the S1 deploy. With (a), no deploy is involved.

**NEEDS-DECISION Q5: does the player get an in-game message?**
- Options:
  1. **No automatic message; the owner tells him (`0504` step 6) (Rec).**
  2. The tool sends a "your profile was restored" inbox message.
- Recommendation: 1.
- Context:
  - Option 2 needs a new message template plus en/ru strings. It also raises whether a citizenship gained through a merge gets the usual welcome message.
  - Knock-on: none for option 1; option 2 adds scope to `0503`.

**NEEDS-DECISION Q6: a source's nickname when the kept profile already has one**
- Options:
  1. **Leave it reserved on the merged-away profile (Rec).**
  2. Release it so anyone can take it.
- Recommendation: 1.
- Context:
  - This doesn't happen in this case; it is a rule for future cases.
  - Releasing can't be undone once someone else takes the name. Leaving it reserved is invisible to players, and the existing name tool can clear it later.
  - Knock-on: none.

**NEEDS-DECISION Q7: is the 24-hour follow-up dry run required in `0504`?**
- Options:
  1. **Required (Rec).**
  2. Optional.
- Recommendation: 1.
- Context:
  - For up to 24 hours, a game page left open on an old profile can still write to it, for example a purchase or a match finishing.
  - The follow-up dry run shows anything that landed there, and a re-run moves it.
  - Knock-on: one more owner step in `0504` (producer edit).
