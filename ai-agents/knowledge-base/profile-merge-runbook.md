# Profile merge on the profile box — runbook (task `0503`, ADR-128)

> ⛔ **READ THIS FIRST.**
>
> - **A `commit` on the live box is a PRODUCTION WRITE.** Each one needs the owner's OK in-session.
>   A `dry-run` is read-only, and still needs the owner's OK (it reads one player's data).
> - **Never automatic** (`0424`): the owner runs it by hand, per case, on evidence. Nothing in the
>   system calls it, and no HTTP route reaches it.
> - **Placeholders only.** Never paste a real player id, Yandex id, name or token into a ticket, a
>   chat message, a report, a worklog or the repo. The command's own output names records only as
>   `into`, `from #1`, `from #2`, … — it prints no ids.
> - **No undo command. Undo = restore from the backup** taken before the merge (step 2 checks it
>   exists). The audit row's `before_state` is a guide only: it keeps the `players` rows and
>   per-source counts, not which logins, games, receipts or other rows moved from which source, nor the
>   tenure rows as they were.
> - **Ships only with a profile-image deploy** that carries migration `012_player_merges.sql`. Until
>   then the command does not exist on the box (or refuses with `schema_missing`).

## What it does

One command folds one or more **source** profiles into one **kept** profile (`--into`), in **one
transaction — all or nothing**. The same engine serves both directions: "move his logins onto the old
record" and "move the data onto the new record" differ only in which record is `--into`. Rules
(ADR-128 §2):

| What | Rule |
|---|---|
| Logins (`player_identities`) | All move to `into`. Every Yandex id he has used then lands on `into`. |
| Purchases | Every receipt moves through `transferPurchase`, with its intent and its item-ownership row. Both sides' paid flags are recomputed from the receipts each then holds; each side's purchase date is its earliest receipt's (never re-stamped). |
| Same item owned on both sides | The receipt moves, the source's ownership row is removed, and a **DOUBLE CHARGE** warning is printed (consider a refund). Two receipts for one item on one source → refused. |
| Matches (credits + ad bonuses) | Each game counts once. A game `into` already holds (in either table) stays on the source with both its rows; any other game moves with both its rows. |
| Tenure gift | The largest row ends on `into` (rows swap if the source's is larger). A 0-XP row still counts. |
| XP | Each record's XP becomes the sum of the ledger rows it holds afterwards (ADR-112). `into` never ends below the highest XP any record had before (else refused). |
| Earned citizenship | `into` gets the earliest earned date of all records; stamped now if it reaches the threshold with none. Sources lose theirs. |
| Name | If `into` has no name, the first source's approved name moves (cleared on the source first), with its history, plus one new approved history row on `into`. If `into` has a name, a source's name **stays reserved on the source** — clear it later with the name tool if wanted. |
| Messages, intents | All move. Cosmetics move unless `into` owns the same one. |
| Purchase-holder sightings | Left in place as evidence; printed by the dry run. |
| Sources | **Never deleted.** Each keeps its row, with no login and no receipt. |
| Player message | None (Q5). The owner tells the player. |

**Refusals** (nothing written): bad arguments; an unknown id; migration `012` not applied; a tester
role applied on any record; a pending name request on a source, or on `into` while a name moves onto
it; paid flags that do not match a record's receipts; XP that is not the sum of a record's ledgers;
`into` ending below its previous high; a fingerprint mismatch; nothing to move (commit only).

## Find the internal ids

Use the same way as the tester-role runbook (`profile-tester-roles-runbook.md`, *One-time setup*,
step 2): the `pid` in the middle part of the `POST /v1/login` response's `session.token`, decoded in
the browser console. That reads **the record this browser logs into right now** — the record a login
lands on after a Yandex id change. The other records come from the case's own evidence (for `0504`,
the `0502` worklog). Never copy a whole token: it is a credential for 24 hours.

## Run it

Run as root on the profile box, ideally **while the player is offline**: the fingerprint covers his
last-login time and XP, so an active player keeps changing it and the commit refuses (just dry-run
again).

### 1. Dry run (the default; read-only)

```bash
docker compose -f /opt/profile/docker-compose.yml exec -T \
  profile-api npm run -s merge-profiles -- dry-run \
  --into <keep-internal-id> --from <source-internal-id> [--from <source-internal-id> ...]
```

It prints each record (times, XP and the ledger check, citizen and paid flags with dates, name and
its latest request, receipts, ownership rows, logins, tenure row, messages, intents, tester
snapshot), then **what the real run would change**, row by row, then the purchase-holder sightings,
then warnings, then a **fingerprint** (32 hex characters). Read every warning. A refusal prints no
fingerprint.

### 2. Before the real run: confirm a backup from today

The backup is the only undo. On the box, read the nightly backup's health marker
(`profile-backup-restore-runbook.md`, *What the backup is*):

```bash
cat /opt/profile/backups/last-backup.json   # exit_status must be 0, finished_at must be today (UTC)
```

Not today, or not `0` → take one now and read the marker again (the same step as
`profile-junk-cleanup-runbook.md` § 3):

```bash
/opt/profile/backup.sh
cat /opt/profile/backups/last-backup.json   # exit_status must be 0, finished_at must be now
```

A fresh backup right before the commit also keeps the undo small: everything written after the
backup is not in it. Do not commit without a good marker.

⚠️ **No second backup or profile deploy later the same UTC day; if one ran, undo from the previous
day's backup.** Each day's backup has one fixed name per UTC date, so a later same-day run (a
hand-run `backup.sh`, or a profile deploy's backup) replaces the pre-merge one with a post-merge dump.

**To undo a merge:** restore that backup into a **throwaway** database (backup runbook, *Restore
procedure* — never the live DB: an in-place restore also rolls back every other player's changes
since the backup), read the involved records' rows there, and put them back on the live DB by hand.
Each step of that is a production write and needs the owner's OK.

### 3. Real run

Same `--into` and `--from` values, **in the same order**, plus the fingerprint. **Without `-T`** — it
asks you to type `MERGE`, and refuses without a terminal:

```bash
docker compose -f /opt/profile/docker-compose.yml exec \
  -e PROFILE_MERGE_OPERATOR="$(logname 2>/dev/null || whoami)" \
  profile-api npm run -s merge-profiles -- commit \
  --into <keep-internal-id> --from <source-internal-id> [...] --expect <fingerprint>
```

It re-checks everything read-only, shows the changes again, asks for `MERGE`, then runs the one
transaction: locks every involved player row, recomputes the fingerprint (refuses on a mismatch),
re-checks every precondition, applies the moves, checks the invariants (paid flags match receipts;
no source holds a receipt or a login; the XP rule on every record; `into` not below its previous
high), writes one `player_merges` audit row, commits. `PROFILE_MERGE_OPERATOR` is self-reported; left
out, the audit row records `unknown`.

### 4. Required: the follow-up dry run, 24 hours later (Q7)

For up to 24 hours a game page left open on a source can still write to it (a purchase, a match that
was already running). Run **the same dry run** again 24 hours after the commit:

- `NOTHING TO MOVE` → done.
- Anything else → it landed on a source after the merge. Run steps 2 and 3 again with the new fingerprint;
  it sweeps what is left. (A second audit row is written.)

### If his Yandex id changes again

Run the same steps with **the new record as the source** and the kept record as `--into`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Done: a dry run printed its plan (or `NOTHING TO MOVE`), or a commit merged. |
| `1` | Refused, cancelled (not `MERGE`), or a database error. **Nothing was written** — after a database error, dry-run again before retrying: only a failure at the very commit could leave the outcome unknown. |
| `2` | Bad input (arguments, not a UUID, a duplicate, too many sources, `--expect` missing or malformed). Nothing was written. |

Every run ends with one `merge-profiles summary {…}` line: mode, outcome, reason, and counts only.

## Expected side effects

- **`other_player` in the game server's identity check, for up to 24 hours** (ADR-124 Decision 5): a
  session token minted for a source before the merge still names the source. Expected and harmless;
  it ends when the token expires or the page reloads.
- The junk-profile cleanup (`profile-junk-cleanup-runbook.md`) never deletes a record named in
  `player_merges`, so a merged-away source (no login, possibly nothing else) is safe from it.
- A merged-away source may keep a reserved name, XP from duplicate games, and a smaller tenure row.

## Read the audit trail

```sql
select merged_at, operator, cardinality(from_player_ids) as sources, moved
  from player_merges order by merged_at;
```

`before_state` holds the involved `players` rows as they were (without the display name): a guide
to what changed, not enough to undo it (undo = the backup, step 2). Select it only on the box, and
never copy it off.
