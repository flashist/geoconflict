# Worklog — 0241 verify the first-ever weekly backup copy

## Result: PASS — the weekly object was OBSERVED in the bucket

**Observed 2026-09-13 ~06:19 UTC**, by the `fkit-coder` Build worker spawned by `/fkit-sprint-ship-loop`
(owner ruling Q1 at plan approval: the coder runs the read-only bundle over SSH from the local machine).
One SSH session, one read-only script, nothing written on the box. ⛔ `/opt/profile/backup.sh` was **not**
run by hand — the evidence below is from the **scheduled** 02:30 UTC run, untouched.

| Evidence | Value |
|---|---|
| Weekly object key | `profiles/weekly/profile-2026-09-13.dump.age` |
| Weekly object size | **19312 bytes** |
| Daily object (same day) | `profiles/daily/profile-2026-09-13.dump.age`, **19312 bytes** |
| Marker `size_bytes` | **19312** |
| Marker `exit_status` | `0` |
| Marker `started_at` / `finished_at` | `2026-09-13T02:30:01Z` / `2026-09-13T02:30:02Z` |
| CRON record | `2026-09-13T02:30:01` — `(root) CMD (/opt/profile/backup.sh >> /var/log/profile-backup.log 2>&1)` |
| Script log | `Sunday — copying to profiles/weekly/profile-2026-09-13.dump.age` — **no `WARNING` line** in the run |

Three sizes agree (weekly == daily == marker), the log's Sunday branch fired, and the CRON line ties it
to the scheduled run. This is the **PASS row** of the plan's Step 2 table. Every other row was checked
and not hit.

## Step 0 — preconditions (local, read-only)

- `date -u` → `Sun Sep 13 06:18:31 UTC 2026`, `date -u +%u` → `7`. After the 02:30 UTC window.
- `0217` still under `ai-agents/tasks/backlog/` (no `done/0217*`) → the "empty DB" premise holds;
  **small object is correct**.
- Route to the box: `route -n get <host>` → `interface: en0` (physical, not `utun*`). VPN not in the way.
- Key named by `PROFILE_SSH_KEY` present, mode 0600. Remote user = the deploy script's default.
- Plan blob `07e84109e8ccf6093df4b48469dd07617c3d51ab`, 12894 bytes — matches the spawn prompt.

## Step 1 — the evidence bundle (sanitized)

Redactions: box hostname → `<host>`; no bucket, endpoint, IP, or key material appears below.
`PREFIX=profiles` is already public (`0218` A4). `rclone lsl` prints size, modtime, name only.

```
=== (a) schedule + clock ===
13:30 2 * * * root /opt/profile/backup.sh >> /var/log/profile-backup.log 2>&1
# Profile backups — added by setup-profile.sh (T8). Mode: offbox.
                Time zone: UTC (UTC, +0000)
Sun Sep 13 06:19:09 UTC 2026
7
=== (b) scheduler record today ===
2026-09-13T02:30:01.353698+00:00 <host> CRON[3339414]: (root) CMD (/opt/profile/backup.sh >> /var/log/profile-backup.log 2>&1)
=== (b2) cron service / file perms ===
active
-rw-r--r-- 1 root root 1082 Sep 10 11:19 /etc/cron.d/profile-backups
=== (c) marker ===
{
  "schema": 1,
  "started_at": "2026-09-13T02:30:01Z",
  "finished_at": "2026-09-13T02:30:02Z",
  "exit_status": 0,
  "object_key": "profiles/daily/profile-2026-09-13.dump.age",
  "size_bytes": 19312,
  "error": null
}
=== (c2) script log for today 02:xx ===
449:2026-09-13T02:30:01Z [profile-backup] pg_dump -Fc of database 'profile'
450:2026-09-13T02:30:01Z [profile-backup] encrypting dump with age recipient
451:2026-09-13T02:30:01Z [profile-backup] uploading profiles/daily/profile-2026-09-13.dump.age (19312 bytes)
452:2026-09-13T02:30:02Z [profile-backup] upload verified
453:2026-09-13T02:30:02Z [profile-backup] Sunday — copying to profiles/weekly/profile-2026-09-13.dump.age
454:2026-09-13T02:30:02Z [profile-backup] pruning daily > 14d and weekly > 56d
455:2026-09-13T02:30:02Z [profile-backup] backup OK: profiles/daily/profile-2026-09-13.dump.age (19312 bytes)
=== (d) objects ===
PREFIX=profiles
--- daily ---
    19330 2026-09-10 11:19:35.383137450 profile-2026-09-10.dump.age
    21339 2026-09-11 08:03:38.824596118 profile-2026-09-11.dump.age
    19312 2026-09-12 02:30:02.031572300 profile-2026-09-12.dump.age
    19312 2026-09-13 02:30:01.820770097 profile-2026-09-13.dump.age
--- weekly ---
    19312 2026-09-13 02:30:01.820770097 profile-2026-09-13.dump.age
=== END ===
```

### Reading notes — so nobody misreads the bundle later

- **Weekly modtime == daily modtime** (`02:30:01.820770097` on both). The plan named this edge case:
  the server-side `rclone copyto` preserved the source's modtime. **Not a finding.** The CRON line and
  the script log are what tie the weekly object to the 02:30 run, not its modtime.
- **The 09-10 and 09-11 daily objects are not from the 02:30 schedule** (11:19 and 08:03 timestamps,
  19330 and 21339 bytes). Those are `0215`'s deploy smoke run and `0218`'s hand run over the drill
  data — known history, recorded in `0218`. The 09-12 and 09-13 objects are the scheduled runs.
- **19312 vs the ~19 330 the plan expected**: 18 bytes smaller. The plan itself said the size could
  differ by a few bytes after `0218`'s drill advanced two sequences; and the 09-12 scheduled run (the
  night after the drill data was removed) is also exactly 19312, so today's size is consistent with
  the previous night. Not a finding.
- **No `WARNING: weekly prune failed` today** — `weekly/` was non-empty by the time the prune ran, so
  the empty-prefix "directory not found" case the plan warned about did not arise. Earlier nights may
  show that warning; it is not a weekly-*copy* failure.

## The two "must-know" facts, restated (brief §Context)

1. **This weekly object is a dump of an EMPTY database.** `0217` (game-server wiring) has not run;
   `0218`'s 76 synthetic rows were removed 2026-09-11. **Small is correct.** Do not read 19312 bytes as
   "broken backup".
2. **It sits in the weekly slot for ~56 days** (`PROFILE_BACKUP_RETENTION_WEEKLY_DAYS` default,
   `profile-backup.sh:121`). A two-month-old empty weekly object is the accepted cost of proving the
   path now, not evidence of a stalled backup.

## What this does NOT close

- **`0218` residual 1 stands: the schedule and the data are still proven separately, never together.**
  Today's scheduled run captured an empty DB; the data-bearing restore drill was a hand run. This task
  proves the weekly *path* on the schedule, nothing about data on the schedule.
- Not a restore drill of the weekly object — `0218` proved restore against a **daily** object only.
- Object versioning on the bucket host is still UNKNOWN (`0215` residual 6).

## Step 2 — branch hit

**PASS row.** Rows checked and not hit: size mismatch (no — 19312 == 19312 == 19312); no CRON line /
stale marker (no — CRON at 02:30:01, marker `finished_at` today); `WARNING: weekly copy failed` (no such
line); missing `Sunday —` line (present); log-says-copied-but-`weekly/`-empty (object present);
`rclone lsl` error / `daily/` empty (both listings succeeded).

## Step 5 — runbook caveat updated (owner ruling Q3)

`ai-agents/knowledge-base/profile-backup-restore-runbook.md` — the "two things the drill did NOT
establish" item 1 (weekly path "has never run against the current bucket") is now **struck, not
deleted**, with one dated 2026-09-13 line stating the observed key + bytes and the two marker facts.
Knowledge-base only. **The wiki was not touched** — `fkit-wiki` refreshes the wiki's copy of this
claim on ingest (see hand-offs below).

## Hand-off to `0219` — the exact note (owner ruling Q2: coder drafts here, driver/producer applies to `0219`'s brief at close)

> **2026-09-13 — gate from `0241`: GO for the weekly half of G4.** The first-ever scheduled weekly copy
> against the current bucket was **observed**: `profiles/weekly/profile-2026-09-13.dump.age`, **19312
> bytes**, the same size as that day's daily object and as `last-backup.json`'s `size_bytes` (19312 B
> each; byte identity **not checked** — no hash or ETag compared), tied to the 02:30:01 UTC CRON record
> and a `Sunday — copying to …` log line with no `WARNING`. Two facts the
> freshness monitor **must encode**: (i) **`last-backup.json` carries no weekly signal** — `object_key`
> and `size_bytes` are the *daily* object's; a weekly-freshness check has to **list the bucket's
> `weekly/` prefix**, it cannot read the marker; (ii) **a weekly-copy failure is exit 0 by design**
> (`profile-backup.sh:176`, `|| log "WARNING: …"`) and never touches the marker's `exit_status` — so
> "backup OK" ≠ "weekly present". Also: the object is a dump of an **empty** database (`0217` not
> run) and will occupy the weekly slot ~56 days — a small, old weekly object is expected, not stale.
> `0218` residual 1 (schedule × data never proven together) is **not** closed by `0241`.

## Other hand-offs

- **`fkit-wiki`** (on the next ingest/sync of this task or the runbook): the wiki's claim that the
  weekly path has never run against the current bucket is stale as of 2026-09-13. Not edited here —
  wiki writes are `fkit-wiki`'s alone.
- **Producer:** applies the `0219` note above to `0219`'s `## Depends on` gate block when closing
  `0241`; closes `0241` via `/fkit-task-done` with the `(agent-closed — not owner-verified)` marker.
  The owner did not observe the bucket themselves — the agent did, over SSH.

## Change surface

- **New:** `ai-agents/tasks/backlog/0241-profile-verify-first-weekly-backup-copy/worklog.md` (this file).
- **Edited:** `ai-agents/knowledge-base/profile-backup-restore-runbook.md` — one struck-not-deleted
  dated line in the "did NOT establish" list.
- **Not touched:** any source, script, config, test; `profile-backup.sh`; `setup-profile.sh`; `0219`'s
  brief; anything under `done/`; `ai-agents/wiki-vault/`; task-file locations. **No commit.**
- **`npm test` not run and not claimed** — no code changed.

## Decision log (ADR-019 §96 audit obligation, transferred under ADR-032)

**Build step (2026-09-13 ~06:19 UTC):** fixes applied without asking: **none**. Obvious-winner calls:
**none**. Every action was inside the approved plan's Steps 0–5 as written; the only judgment exercised
was reading the bundle against the plan's own Step 2 table, which landed on the PASS row with no
ambiguity.

**Process-review step (2026-09-13, review round 1 — `review.md`):** three fixes applied without asking,
all verified `CORRECT`, mechanical wording-only, inside the approved plan (Step 3 record + Step 4
hand-off + Step 5 runbook line); no source touched.
- **R1** (low, defect — record overclaim): "byte-identical" → "the same size as … (19312 B each; byte
  identity not checked — no hash or ETag compared)" in this file's hand-off note and in the runbook's
  dated line. Qualified: the only evidence was `rclone lsl` size (bundle (d) above); the plan's PASS row
  required size equality and the brief forbids inferring — the old wording inferred. Wording only.
- **R2** (nit): runbook dated line key `weekly/profile-…` → `profiles/weekly/profile-…`, matching the
  runbook's other keys (`:86`, `:116`, `:157`) and this file. Qualified: mechanical, copy-safe key.
- **R3** (nit): runbook strike narrowed to the one stale sentence ("has never run … `weekly/` was empty
  on 2026-09-11"); "It only triggers on a Sunday, and the current bucket was created after the last
  one" left unstruck (still true). Obvious-winner call between the reviewer's two offered shapes
  (narrow the strike vs restate Sunday-only in the trailer): narrowing is the smaller edit and keeps
  the still-true text literally unstruck — within the Q3 ruling's intent (old text struck, not
  deleted; only the stale part is stale).
- **R4** (info): no coder action — producer gate at close; nothing changed.

One note for the record, not a decision: the on-box hostname redaction (`sed` on `$(hostname)`) did not
catch the short name that appears in the syslog CRON line, because the box's `hostname` returns a
different string. I redacted it by hand before pasting the bundle here; the raw output stayed in the
session scratchpad only.
