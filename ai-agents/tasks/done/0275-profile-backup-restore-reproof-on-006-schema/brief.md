# Re-prove the profile backup restore on the `006` schema — update the dry-run, re-run the restore drill

## ID
0275

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0270`**, because it needs only `0270` (done), gates XP go-live
(`0217`), and is cheapest while the live profile tables hold zero real rows — which ends once `0273`
(S4, client login) is deployed. Appended at the bottom (ADR-035), not inserted.

## Status
✅ Done (agent-closed — not owner-verified)

---

## 🎉 CLOSING RECORD — 2026-09-16. READ BEFORE CITING THIS TASK.

### The headline: **`IDENTICAL`.**

Part B ran on the live profile box on **2026-09-16** and **passed completely**. The restore path is
proven end to end on the `006` schema **with non-empty data**: all 10 tables, both sequences, and the
constraint- and index-**definition** digests matched (`source.txt` and `restored.txt` byte-identical);
all **eight** behavioural lines printed verbatim; teardown clean — live tables back to 0 rows,
`MIGRATIONS UNCHANGED`, throwaway container and its volume gone, the `age` identity shredded, `/ready`
200. Restore wall clock **`real 0m1.252s`**.

⛔ **Do not restate the evidence here — read it.** The full, step-by-step record is in
[`worklog.md`](worklog.md) § *"Part B — the drill on the box (2026-09-16, OWNER-EXECUTED)"*, with
Part A's build and its two review rounds above it.

### 🚨 This closes the standing "never tested" alarm

The claim carried in [`0218`](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md)
and in project memory — ***"NOT proven — THE RESTORE PATH HAS NEVER BEEN TESTED"*** — is **closed by
evidence as of 2026-09-16.** `0218`'s brief has been annotated in place (its pre-work *"restore is
still unproven"* / *"a non-empty round-trip has never been verified"* statements are struck and marked
superseded, not deleted).

### ⚠️ What this close does NOT say — none of this may be softened when quoting the result

1. **The close carries the `(agent-closed — not owner-verified)` marker** (ADR-033 §5) — it was
   performed by a spawned producer with no owner channel. **And, in the other direction: the OWNER
   personally executed every writing command of Part B and reported the output**, with the lead running
   only read-only checks. Both facts are true. Quoting either one alone misleads.
2. **`real 0m1.252s` is NOT a usable RTO for a real outage.** It is a **24 KB** dump. It proves the path
   works and is not pathologically slow; it says **nothing** about restore time at real data volume.
   That caveat is `0218`'s residual 2 and it **survives this task unchanged.**
3. **`before.txt` was reconstructed, not produced by P5's own `tee`** — the lead ran that query
   read-only, without the redirect, and the file was rebuilt from the captured output. Recorded as a
   residual; a future drill should produce it in-line, from the same command that produces the values.
4. **The drill's synthetic rows are inside today's daily backup object** and stay for its full **14-day**
   retention. Owner-accepted (ruling D5). Tonight's 02:30 UTC run writes the **next** date's key and
   does **not** replace it.

### Residuals carried forward

The four items above, plus everything under [`worklog.md`](worklog.md) § *"Residuals from Part B"* and
§ *"Residuals"* (Part A). The **key-custody** item found during the drill is **not** carried here — it is
filed as its own task, [`0281`](../../backlog/0281-profile-backup-age-identity-custody-move-to-the-owners-password-manager/brief.md).

---

## Owner
fkit-coder

⚠️ Plus **owner steps on the profile box** (as in `0218`: the owner runs every box command and observes
every result). The task cannot close on code alone.

## Context

**Filed 2026-09-15 on an OWNER RULING (`AskUserQuestion`, lead session, relayed by `fkit-lead` to a
spawned `fkit-producer`):** *"New task, before XP go-live"*. Not producer precedent.

**The gap.** The only proof that a profile backup restores is `0218` (closed 2026-09-11,
`(agent-closed — not owner-verified)`). That proof was made on the **pre-`006` schema**:
- `0218`'s drill seeded 76 rows into the old tables (`player_profiles` + six `yandex_player_id`-keyed
  child tables) and compared 8 tables, 2 sequences, 23 constraints and 15 indexes.
- `tests/profile-backup-dryrun.sh` still applies only `migrations/001_player_profiles.sql` and seeds
  `player_profiles` / `player_match_xp_credits`. It is **not in `npm test`** (needs Docker + tools), so
  nothing turned red when the schema changed.
- Migration `006` (task `0270`, [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md),
  deployed to the box 2026-09-15) **dropped every old table** and created `players`,
  `player_identities` (PK `(platform, platform_user_id)`), `player_xp_grants`, and re-keyed every child
  table to `player_id uuid` with `on delete cascade`. The restore path has never run against that shape.

**Why this matters.** `pg_dump -Fc` / `pg_restore` are schema-agnostic in principle, but `0218` found
that "the command exited 0" proves nothing — the value was in counts, content digests, constraint /
index shape and the three behavioural checks. Those checks are written against old table and column
names and now fail or silently check nothing.

**Already known to be stale (producer-verified read-only 2026-09-15):**
- `tests/profile-backup-dryrun.sh:21` — `MIGRATION` points at `001` only; `:89-102`, `:169-178` seed
  and assert on `player_profiles` / `yandex_player_id`.
- `ai-agents/knowledge-base/profile-backup-restore-runbook.md:184` — behavioural check (a) inserts into
  `player_name_history (yandex_player_id, …)`, a column that no longer exists. Its pass criteria also
  say *"all eight tables"*; the `006` schema has more.
- The drill's `verify.sql` lives in `0218`'s `plan.md` (step B3) — old table list.

**Two facts about `006` the coder must respect** (from the migration header and ADR-113):
- `006` is **deliberately not idempotent** and carries a **guard** that refuses if any old table holds
  rows. Re-application is prevented only by the runner's `schema_migrations` bookkeeping. ADR-113:
  *"integration tests must apply migrations through the runner on a fresh schema."*
- The untracked `005` was deleted; the sequence is `001, 002, 003, 004, 006`.

**Dependency / timing risk — flagged, not decided.** `0218` seeded synthetic rows **into the live
database**, backed up, restored, then deleted them. That was free because the tables were empty. Today
they still hold 0 rows (lead-verified 2026-09-15 at `0270`'s close). Once `0271` (S2) + `0273` (S4) are
deployed, real players create `players` rows on login and seeding the live DB stops being free. **Run
Part B before `0273` is deployed**, or the plan must seed somewhere other than the live DB.

## What to build

### Part A — update the local dry-run (code, no box)

1. `tests/profile-backup-dryrun.sh` builds its source DB on the **current** schema: `001–004` and
   `006`, in order, recorded in `schema_migrations` the way the real runner records them
   (`src/profile-server/Migrations.ts`). Prefer driving the real runner or mirroring its bookkeeping
   exactly — the plan decides how, but a restored DB must look like a box DB.
2. Seed a small but **representative** set on the new schema — at minimum:
   - `players` rows (incl. a bigint `xp` above int4 range, a NULL and a non-ASCII `display_name`);
   - `player_identities` rows linked to them;
   - at least one **keyed child row** per re-keyed relationship worth proving — at minimum a
     `player_match_xp_credits` row (PK `(game_id, player_id)`); ideally also `player_name_history`,
     `player_messages` (bigserial), `purchase_intents` + `processed_purchases` (`on delete set null`),
     and `player_xp_grants`.
3. The restore round-trip asserts on the new tables: row counts per table, one spot-checked row's
   content, and that the key constraints survived (PKs, the `player_id` FKs, the partial unique index
   `player_name_history_one_pending_uq`, `players_display_name_uq`).
4. Keep every other test in the script (encryption check, weekly copy, default-deny restore guard,
   marker override, retention validation) working. Keep its success marker; if the final summary line
   changes, note it (the script is **not** registered in `tests/scripts/ShellHarnesses.test.ts` and
   this task does not change that).
5. Update the runbook's drill section (`profile-backup-restore-runbook.md` §"Restore TEST drill") so
   the verify step, table list, behavioural checks and pass criteria name the `006` tables and columns.
   Write the updated `verify.sql` into this task's `plan.md` or worklog, as `0218` did.

### Part B — re-run `0218`'s restore drill on the box (owner-executed)

Follow `0218`'s procedure (brief *What to build* 3–4; worklog Phases B, C, F; runbook §"Restore TEST
drill") against the `006` schema, **using the runbook commands as updated in Part A**:

1. **Seed** synthetic, prefixed (`drill0275-`), non-empty data across the `006` tables; record the
   multibyte-encoding check (bytes > chars), as `0218` did.
2. **Source fingerprint** — per-table counts + content digests, sequence positions, constraint/index
   counts and index digest, with the session settings the runbook requires.
3. **Backup** (encrypt → upload) with `profile-backup.sh`, then **restore** into a throwaway target
   (download → decrypt → `pg_restore`) using the documented command line.
4. **Compare** — `IDENTICAL` across every table, sequences and schema shape; run the behavioural checks
   (duplicate pending name change → `23505`; FK cascade + `set null` inside a rolled-back
   transaction; non-colliding sequence value) on the new columns.
5. **Tear down** — throwaway removed, identity shredded, temp files gone, synthetic rows deleted from
   the live DB, all tables back to 0 rows, `schema_migrations` unchanged, `/ready` 200.
6. Record the restore wall-clock time — **and say it does not extrapolate** (`0218` residual 2).

### 🚫 Not in this task

- Registering the dry-run in `npm test` (it hard-fails without its tools — see `CLAUDE.md`).
- Closing `0218`'s residual 1 (a **cron-produced** backup of real data) — that still needs real data
  and stays with `0217` / `0219`.
- Any change to `profile-backup.sh` itself, unless the drill proves it is wrong on `006` (then it is a
  finding, raised before fixing).
- Key custody — unchanged since `0218`; this task uses the existing key.

## Verification steps

1. **Part A:** `npm run test:scripts:docker` passes on a machine with Docker, `age`, `age-keygen`,
   `rclone`, `curl`, `jq`, printing its success marker. The output shows the source DB was built with
   `001–004` + `006` and that `schema_migrations` holds those five filenames on both source and
   restored DB.
2. **Part A:** the restored DB's counts match the source for `players`, `player_identities` and every
   seeded child table; one spot-checked row matches by content; a duplicate `(game_id, player_id)`
   credit and a duplicate pending name change are both rejected on the restored DB.
3. **Part A:** `grep` finds no `player_profiles` or `yandex_player_id` in `tests/profile-backup-dryrun.sh`
   or in the runbook's drill section, except in explicitly historical notes.
4. **Part B:** the worklog records the source fingerprint, the backup result, the restore log line
   `restore complete`, and a diff reading `IDENTICAL` across **every** `006` table plus sequences and
   schema shape — not *"the command exited 0"*.
5. **Part B:** the three behavioural checks are recorded with their actual outputs on the new columns.
6. **Part B:** teardown recorded — throwaway gone, identity shredded, live tables back to 0 rows,
   `/ready` 200, and the box's `schema_migrations` unchanged from before the drill.
7. 🔒 **No values anywhere** — no key material or length, bucket, endpoint, host, IP, credential, or
   real player id. Names only.

## Notes

- **Depends on:** [`0270`](../0270-profile-identity-s1-database-and-rekeying/brief.md) (S1 — the `006` schema, done and deployed 2026-09-15)
- **Blocks:** [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live)
- **Order inside the task:** Part A before Part B — the drill uses the runbook as corrected in Part A.
- **Timing:** Part B before `0273` (S4) is deployed — see *Context*. Can run in parallel with `0271`,
  `0272`, `0274`.
- **Procedure sources:** [`0218` brief](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md)
  (closing record, *What to build*, *Verification steps*) and
  [`0218` worklog](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/worklog.md)
  (Phases B, C, F; RTOs; runbook findings #1 and #4); `0218`'s `plan.md` step B3 for the old `verify.sql`;
  [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md).
- **Tool needs (Part A, local):** a running Docker daemon plus `age`, `age-keygen`, `rclone`, `curl`,
  `jq`. ⚠️ Docker Desktop cannot be started headlessly on the owner's machine — ask the owner to start
  it rather than polling.
- **Owner steps (Part B):** as in `0218`, the owner runs the box commands and observes results; no
  agent holds the `age` identity or a box credential.
- ⚠️ **`0218` residual 5 applies:** a hand-run `profile-backup.sh` **overwrites that day's scheduled
  backup object** at the same key. Harmless while the DB holds no real rows; say so in the plan.
- 🚩 **Open questions for the owner (not ruled):**
  1. Repeat `0218`'s **live in-place restore** (Phase E), or is a throwaway restore enough this time?
     Producer recommends throwaway only — the live path's mechanics did not change with `006`.
  2. `0218` dropped **D2** (restore from a cron-produced object) because the drill had to run in one day.
     Keep that trade again, or let Part B span one 02:30 UTC boundary to prove schedule × data together?
     Producer recommends asking at plan time; it would close `0218` residual 1 early, but only on
     synthetic data.
  3. This brief bundles two independently shippable parts (A: local harness; B: box drill) into one
     task per the owner's *"New task"* ruling. Split into two briefs if the owner prefers.
- 🔒 No secrets, hosts, IPs, bucket names or endpoints in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
