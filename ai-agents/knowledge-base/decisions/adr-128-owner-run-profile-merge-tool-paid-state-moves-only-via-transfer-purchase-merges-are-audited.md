# ADR-128: Owner-run profile merges — one SSH-only command folds source profiles into a kept one in one transaction; paid state moves only through `transferPurchase`; every real merge is audited in `player_merges`

- **Status:** accepted — the owner approved the `0503` plan that specifies this decision (ruling below). The architect
  heard every ruling by relay only (`fkit-lead`, Sprint 9).
- **Supersedes ADR-113 in part:** only § *Account linking*'s *"Not built now and no backlog task"* (for **owner-run
  merges** — real account linking stays not built) and its *"Deliberately not added: … a merge audit table"*. ADR-113's
  `merged_into`-tombstone and `unique (player_id, platform)` choices **stand**, as does its re-raise trigger *"A second
  login method is scheduled"*. ADR-113's Status stays `accepted`; ⛔ pointers mark the two sites.
- **Owner rulings, verbatim:**
  - **Plan approval, 2026-10-27** (`AskUserQuestion` in the `fkit-lead` session). Question: *"Approve the 0503 merge tool
    plan?"* Picked: **"Approve, all 7 as recommended (Recommended)"** — option description: *"Keep old profile, XP each
    match once + one gift, record table, ships in profile image, no auto message, extra name stays reserved, 24h
    follow-up required. Then ADR-128, then build."*
  - **`0502`, 2026-10-27:** **"A now, merge after Yandex (Recommended)"** — the two-record cause is called on our data;
    `0504` (the live restore) waits on Yandex confirming.
  - **`0424`'s rule, standing:** **never an automatic merge** — *"the only link between the two records is a person's
    claim, and an automatic merge would let anyone claim someone else's progress"* (`0424` brief). Owner-run only.
- **Date:** 2026-10-27
- **Deciders:** the owner. Drafted by `fkit-architect`, spawned by `fkit-lead` (step 0.2 of `0503`'s approved plan), with
  no owner channel.
- **Why a new ADR, not a dated note on ADR-113** (`decisions/README.md`, *the carve-out covers CLARIFICATIONS ONLY*):
  ADR-113 chose *not* to build merging and *not* to add an audit table. Building one and adding the other undoes stated
  choices; it does not sharpen wording.
- **Plan:** `../../tasks/done/0503-build-an-owner-run-manual-profile-merge-tool-ssh-only-dry-run-first-logged/plan.md`
  (git blob `271fda24`), §0–§5 and Q1–Q7. Not built at this writing.
- **Citation frame:** working tree on `dev` at `cc522968`, 2026-10-27. File + quoted phrase; no line numbers.
- **No ids, names or hosts** appear in this ADR. The three records are named by role only.

## Context

- **The case** (`0502` worklog, *corrected evidence and outcome (A)*): one player, one browser, whose Yandex player ID
  changed **twice** — 2026-10-22 and 2026-10-25. Each change gave him a fresh empty record, so he has three:
  - the **old paid profile** — paid flag, 1 citizenship receipt, his approved nickname;
  - the **intermediate profile** (2026-10-22 → 2026-10-25) — not paid, no nickname, his matches of those days, its own
    tenure grant;
  - the **current profile** (since 2026-10-25) — not paid, no nickname, its own tenure grant.
  Browser counts rise steadily across the three (daysPlayed 54 → 75 → 77), and each starts shortly after the previous one
  stops. His client consumed the purchase, so our database is the only place it still exists (`0503` brief).
- **What makes a record "his":** `player_identities`, PK `(platform, platform_user_id)`, many per player
  (`migrations/006_player_identity.sql`, *"create table player_identities"*; ADR-113 point 2). Login resolves the
  Yandex id through it. Nothing else ties the three records together.
- **ADR-113 deferred merging** and listed three questions a future decision must answer: which XP, citizenship and paid
  state survive; child-table PK clashes; live 24 h tokens on a merged-away id. It also chose no tombstone, no audit
  table, and no `unique (player_id, platform)`.
- **Paid state has one writer today**, `grantPaidPurchase`, plus one documented exception, the SSH-only tester-role
  command (`src/profile-server/PaymentsRepository.ts` header, *"written by grantPaidPurchase ONLY"* and *"ONE documented
  exception (task 0425"*). ADR-126 Decision 7 pre-committed that any move of a purchase goes through **one**
  `transferPurchase` primitive, built by `0503`.
- **XP invariant:** `xp = Σ match credits + Σ grants + Σ rewarded match bonus` on every record (ADR-112, 2026-10-24
  amendment). Tenure grant ≤ 50 XP (`src/core/profile/Citizenship.ts`, *"TENURE_XP_CAP = 50"*), one row per player.
  ADR-111: awards move up, never down.
- **Constraints carried in:** ADR-113 point 3 — no public route accepts a player id; operator tooling may. ADR-124
  Decision 5 — `verified` changes nothing the game server grants today.

## Decision

### 1. One tool, owner-run, no route

1. **An SSH-only command inside the profile image** (Q4 option (b)): `merge-profiles dry-run | commit --into <KEEP>
   --from <S> [--from <S> …]` (1–5 distinct sources; KEEP never a source; internal UUIDs only). Same shape as the
   tester-role command (`package.json`, *"tester-role"*). **No HTTP route reaches it**; its entry point imports no
   `Server`, `Routes` or `Telemetry`.
2. **Never automatic.** The owner runs it by hand, per case, on evidence (`0424`). Nothing in the system calls it.
3. **One engine, either direction.** "Move the logins to the old record" and "move the data to the new record" are the
   same merge with a different KEEP.
4. **For this case KEEP = the old paid profile** (Q1). The intermediate and current profiles are the sources, **both in
   one run, one transaction, all or nothing**. If his ID changes again, run it once more with the new record as the
   source.
5. **Dry run is the default.** A real run needs `commit`, `--expect <fingerprint>` from the dry run, and a typed `MERGE`
   at an interactive prompt (no terminal → refuse). Inside the transaction it locks every involved `players` row
   `FOR UPDATE` in id order, recomputes the fingerprint and refuses on a mismatch, re-checks every precondition, applies
   the moves, checks the invariants (§2.6), writes the audit row, then commits. Output labels records "into", "from #1",
   …, never by id.
6. **No source profile is ever deleted.** A merged-away source keeps its row, with no identity and no receipt.

### 2. ADR-113's three questions, answered (for owner-run merges)

**2.1 Paid state — moves only through `transferPurchase`, never copied.**
- `transferPurchase(client, token, from, to)` in `PaymentsRepository` moves the receipt (`processed_purchases`), its
  `purchase_intents` row and the `player_entitlements` row **together**, then recomputes **both** sides' paid flags from
  the receipts each side holds (one `UPDATE` per record, because the check constraints are tested per statement).
  `purchased_at` is kept.
  > 📝 **2026-10-27 — clarified (owner ruling R3, `0503` review):** "kept" means *taken from receipts, never
  > re-stamped*. The receiving side gets `least(its own date, this receipt's processed_at)`; the source's date is
  > recomputed as the `min(processed_at)` of the receipts it still holds (null if none). See § *Note, 2026-10-27*.
- It is the **second writer of paid state from receipts** (ADR-126 D7), beside `grantPaidPurchase`; the tester-role
  command stays the one flag-only exception. The `PaymentsRepository` header names it.
- KEEP already owns the same durable product → the source's entitlement row is deleted and a double-charge warning is
  printed. A source holding two receipts for the same durable product → refuse.
- Under this case's KEEP = old, no purchase moves at all.

**2.2 Earned citizenship.**
- KEEP's `citizenship_earned_at` = the **earliest** non-null value across all involved records, and `is_citizen` is set.
  KEEP at or above the citizenship threshold with no earned date → stamped `now()`.
- Each source's `citizenship_earned_at` is cleared and its `is_citizen` recomputed. The before-state is kept in the
  audit row.

**2.3 XP — each match once, the largest tenure gift once, every ad bonus once** (Q2).
- Match credits (`player_match_xp_credits`) and rewarded-ad bonuses (`player_rewarded_match_xp`) clash **per
  `game_id`, across both tables**: if KEEP holds that game in either table, neither of the source's rows for it moves
  (its XP is a duplicate); otherwise both move.
- Tenure (`player_xp_grants`): KEEP has none → the source's row moves. Both have one → the **larger** row ends on KEEP
  and the smaller stays on the source (row swap). A 0-XP "checked" row counts as a row (ADR-112).
- **ADR-112's invariant holds on every record afterwards**, sources included: each keeps XP equal to the ledger rows it
  still holds.
- **KEEP's XP afterwards is never below the highest XP any involved record had before** (ADR-111, *move up, never
  down*). Checked inside the transaction; a breach rolls back.

**2.4 Child-table clashes.**

| Table | Rule |
|---|---|
| `player_identities` | Move all (PK is the platform id — no clash). |
| `processed_purchases` + its `purchase_intents` + `player_entitlements` | Only through `transferPurchase` (2.1). |
| Remaining `purchase_intents` | Move all, so a late reconcile lands on KEEP. |
| `player_match_xp_credits` + `player_rewarded_match_xp` | Per `game_id` across both tables (2.3). |
| `player_xp_grants` (tenure) | Largest row once (2.3). |
| `player_name_history` + display name | Name rules (2.5). |
| `player_messages` | Move all. |
| `player_cosmetic_ownership` | Move the rows that don't clash; clashing rows stay. |
| `purchase_holder_sightings` | Left in place as evidence; printed in the dry run (ADR-126). |
| `tester_role_snapshots` on any involved record | Refuse. |

**2.5 Names.**
- KEEP has no name and a source has an approved one: clear it on the source, then set it on KEEP, in that order in the
  same transaction (so `players_display_name_uq` never clashes); move that source's history rows; then insert **one new
  history row on KEEP with `moderation_status = 'approved'` set explicitly**, so it is the newest row and the name card
  cannot show a stale decline notice.
- **KEEP already has a name: a source's extra name stays reserved on the merged-away source** (Q6). It is not released;
  the existing name tool can clear it later.
- **Refuse** if any source has a pending name request, or KEEP has one while a name is moving onto it.
- Under this case's KEEP = old, the name does not move.

**2.6 Live 24 h tokens — no tombstone; a required 24 h follow-up dry run** (Q7).
- **No `merged_into` tombstone** (ADR-113's choice stands). We rely on the token's ~24 h life (ADR-113 point 5).
- Until a page on a source reloads, it can still write to that source (a purchase; a credit from a match in progress).
  The dry run warns when a source had a recent login or credit.
- **A follow-up dry run 24 h after the merge is a required step**; anything that landed on a source is swept by a
  re-run.
- A stale token reads as `other_player` in the game server's vouch for up to 24 h (`src/profile-server/SessionVouch.ts`,
  *"a genuine verified token of a DIFFERENT player"*). Expected and harmless (ADR-124 Decision 5); the runbook says so.
- **Post-move invariants, else roll back:** KEEP's paid flags match its receipts; no source holds a receipt or an
  identity; ADR-112's XP rule holds on every record; KEEP's XP is not below anything it was before.

### 3. Every real merge is audited in `player_merges` (Q3) — reverses ADR-113's "no merge audit table"

- New migration **`012_player_merges.sql`**: id, merged_at, operator (self-reported, `PROFILE_MERGE_OPERATOR`),
  into_player_id, from_player_ids `uuid[]`, fingerprint, moved counts `jsonb`, before-state `jsonb` (the involved
  `players` rows **without** the display name). No foreign keys.
- Written **in the merge's own transaction**, so it can never record a merge that did not happen; it is in backups;
  it is the only durable sign that a profile was merged away. Its before-state makes a hand reversal possible (there is
  no undo command).
  > 📝 **2026-10-27 — clarified (owner ruling R1, `0503` review): "makes a hand reversal possible" overstates.** The
  > before-state is a **guide only**. **Undo = restore from a backup taken the same day**, into a throwaway database,
  > with rows copied back by hand and the owner's OK. A *confirm today's backup* step precedes every real run. See
  > § *Note, 2026-10-27*.
- The junk-profile cleanup gains a `not exists player_merges` clause, so it never deletes a merged-away source (which
  has no identity and would otherwise look like junk) or its sightings.
- Dry runs and refusals write no row; every run prints one count-only summary line.

### 4. Identities moved onto one record — owner-run merges only

- After a merge, KEEP holds **several Yandex identities**. That is allowed by ADR-113 point 2 (many per player) and is
  why ADR-113 left out `unique (player_id, platform)`; it stays left out.
- This is **not account linking.** No second login method, no player-facing link flow, no automatic match. ADR-113's
  trigger *"A second login method is scheduled — then design account linking"* **stays armed and is not fired by this
  ADR**; a real linking design may reuse this engine but must decide afresh.

### 5. No automatic player message (Q5)

The tool sends nothing. The owner tells the player (`0504` step 6). Whether a merge-gained citizenship gets a welcome
message is therefore not decided here.

## Options considered

- **Q1 — KEEP = old paid profile (chosen).** Moves about a dozen rows; never touches the receipt or the name; any of his
  three Yandex ids lands on the right record if Yandex flips back.
  - *KEEP = current profile* — rejected: moves the receipt, paid flags, name and history; more that can go wrong, for
    the same player-visible result (the internal id is never visible).
- **Q2 — each match once, largest gift once, every ad bonus once (chosen).**
  - *Keep only the highest single record's XP* — rejected: drops the matches he played on the newer records.
  - *Plain sum incl. every tenure gift* — rejected: counts one browser's gift up to three times; XP he did not earn.
- **Q3 — `player_merges` table (chosen).**
  - *No table, a log file on the box* — rejected: not in backups, not tied to the merge's transaction, cannot tell
    later that a record was merged away.
- **Q4 — (b) a command in the profile image (chosen).** Uses the same tested `transferPurchase`; the table comes from
  the migration runner. Cost: reaches the box only with a profile-image deploy (it rides whatever is committed then).
  - *(a) a `psql` script over SSH* — rejected: duplicates the purchase-move SQL (two copies to keep in step), creates the
    table outside the runner, weaker to test. Its one gain, no deploy, matters little: `0504` waits on Yandex anyway.
- **Q5 — no automatic message (chosen).**
  - *A "profile restored" inbox message* — rejected: new template + en/ru strings, and opens the welcome-message
    question; adds scope for one case.
- **Q6 — a source's extra name stays reserved (chosen).**
  - *Release it* — rejected: one-way once someone else takes it; reserving is invisible to players and reversible.
- **Q7 — 24 h follow-up dry run required (chosen).**
  - *Optional* — rejected: a page left open on a source can still write to it for up to 24 h.
- **Live tokens — rely on the 24 h TTL plus the follow-up (chosen).**
  - *`merged_into` tombstone with login/route redirection* — rejected: touches every token and resolve path for a rare,
    owner-run event; the follow-up sweep covers the same window.
- **A manual SQL session per case, no tool** — rejected: no fingerprint, no all-or-nothing invariants, no test.
- **An automatic merge on matching evidence** — rejected by the owner (`0424`): it would let anyone claim another
  player's progress.

## Consequences

- **Positive:**
  - one tested, repeatable way back for a player whose Yandex id changed, serving every future case, not just this one;
  - paid state still has a single receipt-moving path, so two records never both count as paid;
  - XP never goes down and is never double-counted; ADR-112's invariant stays checkable on every record;
  - a durable, backed-up record of every merge.
- **Negative / costs:**
  - migration `012` (14 → 15 tables): the restore drill (`verify.sql`, `tests/profile-backup-dryrun.sh`, the backup
    runbook inventory), the integration truncate list, `Migration006.it.test.ts`, the junk-cleanup runbook and test all
    change;
  - `SELECT_BASE_CREDIT_SQL`'s comment *"Credit rows are insert-only"* (`src/profile-server/PlayerProfileRepository.ts`)
    becomes false and must be rewritten — the merge moves credit rows;
  - `PaymentsRepository`'s "single writer" header must name the second writer;
  - a merged-away source stays forever as an inert row (no identity, no receipt), possibly holding a reserved name;
  - an active player can keep changing the fingerprint, forcing repeat dry runs (run with the player offline);
  - for up to 24 h a source can receive writes; one more required owner step in `0504`;
  - no undo command — reversal is by hand from the audit row;
    > 📝 **2026-10-27 — clarified (owner ruling R1):** reversal is by hand **from a same-day backup**, not from the
    > audit row (a guide only); the cost is one more owner step before every real run. See § *Note, 2026-10-27*.
  - ships only with a profile-image deploy (weekend slot unless urgent).
- **Knock-ons (producer edits, not decided here):** `0504`'s "target = current profile" and its read-back wording flip
  under KEEP = old; `0504` gains the required 24 h follow-up.

### Re-raise only if

- **A second login method is scheduled** — then design account linking (ADR-113's trigger, still armed). Reusing this
  engine is allowed; reusing its owner-only trust model is not.
- **Anyone proposes running a merge automatically**, or from a route, or from a player's request without the owner's
  hand — that is a defect against this ADR and `0424`.
- **Writes to a source after a merge are seen in practice beyond the 24 h follow-up** (e.g. tokens living longer than
  ADR-113's TTL) — then reconsider a tombstone.
- **A purchase ever needs to change profile outside this tool** (ADR-126 D1 reopened) — it must reuse
  `transferPurchase`, not add a third receipt-moving path.
- **Merges become routine** (more than a handful of cases) — then the root cause (`0424`) and an automated detection
  path need a decision; this tool is sized for rare, owner-run cases.

Absent those, *"why no tombstone"*, *"why not sum all XP"*, *"why not release the extra name"*, *"why is the source not
deleted"* and *"why an audit table when ADR-113 said none"* are closeout of this ADR, not new findings.

## Related

- [ADR-113](adr-113-profile-internal-player-id-and-platform-identities.md) — superseded in part (above); ⛔ pointers at
  its Status line and § *Account linking*.
- [ADR-112](adr-112-free-xp-grants-capped-server-clamped-acked-once-per-account.md) — XP invariant and tenure row, kept.
- [ADR-111](adr-111-xp-economy-rescale-awards-move-up-never-down.md) — awards move up, never down.
- [ADR-124](adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md) — Decision 5 (stale
  `other_player` is harmless).
- [ADR-126](adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md) —
  Decision 7 (`transferPurchase`, built here) and the `purchase_holder_sightings` evidence; no marker needed, D7
  pre-committed this.
- [ADR-127](adr-127-consume-permanent-switch-is-a-committed-source-setting-s1-goes-to-the-live-profile-box-first.md) —
  the profile-box deploy this command rides with.
- Tasks `0503` (build), `0504` (live restore, waits on Yandex), `0502` (cause, outcome A), `0424` (root cause, parked;
  "never an automatic merge"), `0425` (tester-role command, the shape copied), `0505`/`0506` (stop consuming).

## Note, 2026-10-27 — two owner rulings from `0503`'s review (R1, R3)

**Added 2026-10-27 by `fkit-architect`, spawned by `fkit-lead`, during `0503`'s stateful review**, under
`decisions/README.md`'s clarification carve-out (*an owner's follow-up ruling that clarifies wording already in the
ADR*). Append-only: every earlier wording above stays as written; 📝 pointers at §2.1, §3 and Consequences lead here.
**No decision in this ADR changes; Status stays `accepted`.** Still one tool, no undo command, an audit row in the
merge's transaction, paid state moved only by `transferPurchase`. What changes is how two claims are worded.

**Owner rulings, verbatim** (2026-10-27, `AskUserQuestion` in the `fkit-lead` session, relayed; the architect had no
owner channel):
- **R1** — Q *"R1: how should undoing a merge work?"* → **"Backup check + fix wording (Recommended)"** — *"Runbook:
  confirm today's backup before the real run; undo = restore from backup, note as a guide. Knock-on: none (checked)."*
- **R3** — **"Fix it now (Recommended)"** — *"Small change: use that receipt's own date; recompute the source's
  date."*

**R1 — undo, clarified (§3 and Consequences).**
- **Why the old wording overstated** (`0503` `review.md`, R1, confirmed by the coder): the audit row's before-state
  holds only the involved `players` rows (without the display name) and per-source moved counts. It does not say
  which identities, games, messages, intents, cosmetics or receipts moved from which source, nor the tenure rows as
  they were before the swap. A hand reversal cannot be rebuilt from it alone.
- **Undo = restore from a backup taken the same day** (UTC), into a **throwaway** database, never the live one (an
  in-place restore also rolls back every other player's changes since the backup). The involved records' rows are
  read there and copied back to the live database **by hand, each write with the owner's OK**.
- **The audit row's before-state is a guide only** — to what changed, not a way to undo it.
- **A "confirm today's backup" step precedes every real run**: `profile-merge-runbook.md` step 2, *Before the real
  run: confirm a backup from today* (the backup health marker must show success and today's date; otherwise take a
  backup and re-read it). No commit without a good marker.
- Unchanged: there is still **no undo command**, and §3's table, columns and transaction rule stand.

**R3 — purchase date, clarified (§2.1, "`purchased_at` is kept").**
- "Kept" was imprecise for a **partial** transfer (a source holding several receipts and giving up one). The date
  rule, as built (`src/profile-server/PaymentsRepository.ts`, `TRANSFER_TO_FLAGS_SQL` and
  `RECOMPUTE_PAID_FLAGS_SQL`):
  - the **receiving side** gets `least(its own citizenship_purchased_at, this receipt's processed_at)` — the moved
    receipt's own date, unless it already holds an earlier one;
  - the **source** gets the `min(processed_at)` of the receipts it still holds — **null if none**.
- So each side's purchase date comes from receipt dates, never re-stamped to `now()`. In a full merge
  every receipt leaves the source, so its date ends null either way; the rule matters for the re-raise path *"must
  reuse `transferPurchase`"* if that ever moves one receipt out of several.
