# Stop the profile deploy's smoke backup from breaking the `daily-backup-object` check

## ID
0465

> ℹ️ **ID allocation, checked 2026-10-15 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) was `0464`.

## Sprint
Backlog

> 📌 **Filed on the OWNER's request of 2026-10-15**, given live in the `fkit lead` session and relayed by `fkit-lead`
> to a spawned `fkit-producer` (no owner channel, ADR-021/037); ⛔ **not producer precedent.** The owner answered
> `fkit-lead`'s offer (*"every profile deploy will trigger this false alarm the next morning. The deploy's test backup
> should save under a different name, or update the record too."*) with: *"yes, file the follow-up task"*. No sprint
> was named, so it is filed on the Backlog board. ⚠️ The *"every deploy … next morning"* part of that offer is
> **narrower in the code than it sounds** — see *Context → When it fires*.

## Priority
Unscheduled

(Backlog board, unranked by design.)

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**In plain terms.** Every night the profile box makes a backup, uploads it off-box as `profile-<today>.dump.age`, and
writes down its size in a small record file (`last-backup.json`). Every morning a checker compares the uploaded file
with that record. When a profile deploy runs, it makes its own **test backup** — and uploads it under the **same
name**, replacing the night's file, while the record still holds the night's size. The checker then sees two
different sizes and reports a failure, although nothing is wrong with the backups. The failure goes to Better Stack,
which opens (or keeps open) an incident — and while that incident is open, **new real alerts are muted**.

**The mechanism, from the code (checked 2026-10-15):**
- The backup names its upload by **date only**: `profile-backup.sh:134-136` (`name="profile-${today}.dump.age"`,
  `daily_key=…/daily/${name}`), uploaded at `:161` with `rclone copyto` — overwrite semantics.
- The deploy smoke runs that **same** `backup` command, against the candidate config, with only its **marker** redirected:
  `setup-profile.sh:1592-1608` (`promote_offbox_backup`; the N6 comment at `:1596-1597` — *"a failed smoke doesn't
  clobber the nightly cron's last-backup.json"*) called at `:1696-1699` with `last-smokecheck.json`. The **object key
  is not redirected** — so a smoke on a day the nightly has already run overwrites that day's daily object.
- The checker reads the nightly marker whenever it exists (`profile-checks.sh:189-190`, `ACTIVE_MARKER="$MARKER"`)
  and fails on a size mismatch (`profile-checks.sh:214-237`, message at `:230`: *"… exists off-box but is X bytes
  while the marker says Y — not the object the backup verified"*). The smoke marker is consulted only when there is no
  nightly marker at all (the fresh-box rule, `:170-187`).
- Known and accepted at build time: `0219`'s worklog residual **R9** (*"The deploy-time smoke backup will also
  overwrite today's daily object at the same key"*) and **R3** (*"Manual `backup.sh` overwrites the marker AND today's
  object"* — that one keeps marker and object **consistent**, so it does not cause this mismatch).
- A side effect worth knowing: today the smoke **replaces** the night's verified object with a newer one. No backup is
  lost (the newer one was also size-verified at upload), but the off-box object no longer is the one the nightly
  marker describes.

**When it fires — narrower than "every deploy, next morning".** Schedules (UTC, box pinned to UTC):
nightly backup `30 2 * * *` (`setup-profile.sh:1826`), checks `0 8 * * *` (`setup-profile.sh:1800`).
- Deploy **between 02:30 and 08:00 UTC** (05:30–11:00 MSK): that same day's 08:00 check fails.
- Deploy **after 08:00 UTC**: the scheduled check is fine — the next 02:30 nightly writes a **new** date key and a new
  marker before the next 08:00 check. But **any manual `checks.sh` run** between the deploy and the next 02:30 fails
  (this is what happened on 2026-10-15).
- Deploy **between 00:00 and 02:30 UTC**: no clash — the nightly runs after the smoke and rewrites both.
- So the scheduled false alarm needs a morning (MSK) deploy, or the next nightly failing to run. This is **read from the
  code, not observed on the box** — step 1 confirms it.

**Observed so far:**
- **2026-10-15 ~19:20 UTC**, right after that day's profile deploy (tag `0.0.164-profile.1`): the owner ran
  `checks.sh` by hand → `FAIL daily-backup-object: profile-2026-10-15.dump.age exists off-box but is 2821619 bytes
  while the marker says 2761747 — not the object the backup verified`; 12 ok, 1 failed; `/fail delivered`.
  Matches the mechanism above (a post-08:00 deploy + a manual run). **Cause: likely — not yet confirmed from the box
  logs.**
- **2026-10-07 and 2026-10-08**: the Better Stack incident timeline (read by `fkit-lead` in the owner's Chrome,
  read-only) shows `daily-backup-object` failures. ⚠️ **Not explained yet.** For the deploy smoke to cause a scheduled
  08:00 failure, a profile deploy would have had to run between 02:30 and 08:00 UTC on those days. If no deploy ran
  in that window, something else broke the check on those days — step 1 must find out before anything is built.
- The heartbeat is the Better Stack check `profile-daily-checks`. Whether one later success ping closes the incident
  automatically is **not verified**.

**Related constraints:**
- **Profile-box code under the shell harnesses** (CLAUDE.md, *"Shell harnesses are part of npm test"*):
  `tests/profile-checks.sh` drives the real `profile-checks.sh` — its case **C4** (`tests/profile-checks.sh:256-260`)
  asserts the fresh-box path uses the **smoke marker's `object_key`**, and the size-mismatch case is at `:282-284`.
  `tests/scripts/profile-deploy-hardening.test.sh` greps `setup-profile.sh`. `tests/profile-backup-redeploy.sh` covers
  `promote_offbox_backup`. `tests/profile-backup-dryrun.sh` (N6 marker isolation, TEST 6 at `:357`) is **not** in
  `npm test` — it needs Docker + `age`/`rclone`/`curl`/`jq`; run it with `npm run test:scripts:docker`.
- **`0218`** (done — durability proof / restore drill) counted the deploy-smoke object as one of the restorable
  objects in `daily/` (`0218` brief, ~`:142`). A change to where the smoke writes changes that picture; re-read `0218`
  before choosing.
- **`0219`** (Sprint 8, `🔄 In progress`) owns `profile-checks.sh` and is where R3/R9 were recorded. This task does
  not depend on `0219` closing — the code is already on the box — but **do not edit `0219`'s folder**.
- **ADR-120** (third-party images digest-pinned; Postgres upgrades backup-first) — touches backups only by
  requiring one **before** a Postgres upgrade. Check whether any upgrade runbook relies on the deploy smoke being
  "today's daily object"; if not, it is unaffected.
- **N5/N6 must survive.** The smoke must still prove the **candidate** config end to end (real dump, encrypt, upload,
  size-verify) before promotion, and a **failed** smoke must still never touch `last-backup.json`.

## What to build

**Goal:** a profile deploy — at any hour — must not make a later `checks.sh` run (scheduled or manual) fail
`daily-backup-object`, while the check keeps catching a daily object that really was replaced or lost.

1. **Confirm the cause first (read-only).** From the code, restate the window above and check it. Then, with the
   owner running the commands on the box (agent SSH to the boxes was denied by the permission classifier on
   2026-10-13 — hand the owner one read-only batch), read `/var/log/profile-checks.log`,
   `/var/log/profile-backup.log` and the deploy times for 2026-10-07, 2026-10-08 and 2026-10-15. Record in the worklog
   which failures the smoke explains. **If 2026-10-07 / 2026-10-08 have a different cause, stop and route it to the
   producer** — it may need its own task. Print no bucket names, hosts or keys into the worklog.
2. **Pick a direction and put it in `plan.md` for owner approval.** Candidates (undecided — the plan chooses):
   - **(a)** The smoke uploads under a **distinct key** (e.g. a `smoke/` prefix, or a non-daily name) and never
     touches `daily/`. Consider: retention — `profile-backup.sh:183-184` prunes only `daily/` and `weekly/`, so smoke
     objects need their own pruning or a lifecycle rule; the fresh-box rule (C4) reads the smoke marker's `object_key`,
     which would then point outside `daily/`; and `0218`'s count of restorable objects.
   - **(b)** A **successful** smoke also updates `last-backup.json` so marker and object agree. Consider: N6 (a failed
     smoke must still never write it), and that `daily-backup-marker` would then report a deploy smoke as "last
     nightly backup OK".
   - **(c)** The check **tolerates a newer verified object** (e.g. accepts the smoke marker's size when the smoke ran
     after the nightly on the same key). Consider: this weakens the defence-in-depth the size check exists for
     (`profile-checks.sh:225-226`).
   State the main trade-off of the chosen one. Owner approves the plan before code.
3. **Build it** in the repo files (`profile-backup.sh`, `setup-profile.sh`, `profile-checks.sh` — whichever the
   direction touches). Never edit the on-box copies.
4. **Tests.** Add harness cases that would have caught this: a smoke run after the nightly on the same day, then a
   check → **OK**; a daily object replaced by something else → still **FAIL**. Keep C4 and the size-mismatch case
   meaningful (update them only if the direction changes their premise, and say so). Run `npm test` (full run, through
   the npm script) and `npm run test:scripts:docker` if `profile-backup.sh` changed.
5. **Docs.** Update the comments at `setup-profile.sh:1592-1597` / `:1686-1694` and the `profile-checks.sh` header, and
   `0219`-adjacent runbook text that says the smoke overwrites today's object. Note it for `fkit-wiki` to ingest at
   close (do not write the wiki).
6. **Deploy in a weekend slot** (owner rule) — the owner runs `npm run deploy:profile`. Committed is not deployed.

**Out of scope / related (do not do here):**
- **A long-open heartbeat incident mutes new alerts.** The same Better Stack incident (opened 2026-10-07 11:00 MSK)
  also stayed open 8 days on `reboot-required` (kernel update; the owner rebooted the box 2026-10-15 ~19:19 UTC and it
  has cleared). While it is open, a new failure — e.g. a failed certificate renewal — raises no new alert. That is
  its own problem and may deserve its own task; raise it with the producer, do not solve it here.
- Changing the backup or check schedule.
- R3 (a manual `backup.sh` run satisfying freshness) — accepted in `0219`, unchanged here.

## Verification steps

1. Worklog records step 1's findings: for each of 2026-10-07, 2026-10-08, 2026-10-15, whether the deploy smoke
   explains the `daily-backup-object` failure, with the evidence (log lines, deploy times) — no secrets, hosts or
   bucket names.
2. `plan.md` names the chosen direction (a / b / c or another) and its trade-off, and is owner-approved before code.
3. New harness case: nightly → smoke on the same day → `checks.sh` → `daily-backup-object` **OK**. It fails on the
   unfixed code (show the red run, then the green one).
4. New or kept harness case: the daily object replaced by something else (size differs from the marker, no smoke
   involved) → still **FAIL** with the existing message.
5. N6 still holds: a **failed** smoke leaves `last-backup.json` byte-for-byte unchanged (existing coverage still
   green, or a new case).
6. `npm test` green (one full run via the npm script; judge any `Exceeded timeout of 5000 ms` by the supertest flake
   rule). `npm run test:scripts:docker` green if `profile-backup.sh` changed.
7. **Live check — belongs to the separate verify task, not this build task** (see Notes): after a weekend deploy,
   the owner runs `checks.sh` by hand the same evening → `daily-backup-object` OK; the next scheduled 08:00 run → OK;
   Better Stack `profile-daily-checks` shows success pings.

## Notes
- **Depends on:** nothing
- **Blocks:** nothing
- **Build/verify split (owner rule).** This is the **build** task. The live check (verification step 7) is **not**
  filed now — when this task closes, the producer files a separate **verify** task at the top of the next sprint.
- **Deploy in a weekend slot** unless the owner rules it urgent.
- **Source of the residuals:** [`0219` worklog](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/worklog.md)
  R3 and R9; [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) for the
  restore-drill picture.
- **Timing correction for the owner:** the offer behind this task said every deploy triggers a false alarm the next
  morning. By the code, a scheduled false alarm needs a deploy between 02:30 and 08:00 UTC (or a missed nightly);
  after-08:00 deploys only break manual runs before the next 02:30. Today's 2026-10-15 failure was a manual run.
  Still worth fixing: morning deploys and manual post-deploy checks are both normal, and each false `/fail` holds the
  incident open and mutes real alerts.
