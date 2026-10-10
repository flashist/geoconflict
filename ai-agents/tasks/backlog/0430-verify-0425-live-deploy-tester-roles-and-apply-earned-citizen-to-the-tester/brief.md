# Verify 0425 live — deploy tester roles to the profile box, apply "earned citizen" to the tester, and restore it

## ID
0430

> ℹ️ **ID allocation, checked 2026-10-09 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0429` (folder names and `## ID` fields agree). `0430`: no task folder, no
> board hit.

## Sprint
Sprint 8

> 📌 **OWNER RULINGS, 2026-10-09, given live via `AskUserQuestion` in the `fkit lead` session** (during a
> `/fkit-sprint-ship-loop` run on Sprint 8, at `0425`'s close), relayed by `fkit-lead` to a spawned `fkit-producer` with
> no owner channel (ADR-021/037); ⛔ **not producer precedent.**
> - Close: **"Close + file both (Recommended)"** — the owner was told the two unproven items (nothing run on the box; the
>   full backup dry-run not run to completion) and chose to close `0425` and file this verify task.
> - Deploy timing: **"Urgent: after review passes"** — a **mid-week profile deploy**, an explicit exception to the
>   weekend-slot rule (2026-09-29). Not a change to that rule.
>
> Placement: bottom of Sprint 8 (append rank, ADR-035) — the same placement the owner chose for `0429` today.

## Priority
32

> ⚠️ **Priority 32 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs at the very top of this board, directly beside `0420`**, because it is the step that unblocks
> `0420`'s earned-account items (and possibly `0376`), and the owner ruled the deploy urgent. Not inserted there: closed
> rows sit below the top, and ADR-035 never renumbers them — a new row always appends. Appended after the board's highest
> (31, `0429`). **Read it as the top group regardless of the number.**

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human)**, on the profile box over SSH and on the tester's own device. Every
**production write** in this task (the deploy, the allowlist file, each `apply` / `restore`) needs the owner's OK
**in-session** (standing rule). Read-only steps (`show`) also run only with the owner's OK, since they touch production.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0420`/`0429`.)*

## Context

**What this is, in plain terms.** [`0425`](../../done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md)
built a command that runs only on the profile box over SSH. It can put a fixed **test role** (for example "earned
citizen") on one allowlisted tester's record, show that record, and later put the record back exactly as it was. It was
built and tested on the owner's Mac only. **Nothing has run on the box yet.** This task is the first live run.

**Why it matters.** Since the 2026-10-08 incident (`0424`) there is no earned-citizen test account, so `0420`'s
earned-account items cannot be checked. Applying the `earned-citizen` role to the owner's tester record fixes that.

**What `0425` did NOT prove** (told to the owner before the close ruling):
1. **Nothing on the box:** the deploy, migration `008` on the real database, the new compose mount, running the command
   with `docker compose exec`, the allowlist file, and the developer-tools id lookup.
2. **The full backup dry-run** (`tests/profile-backup-dryrun.sh`) did not run to the end — Docker Hub refused the
   `minio/minio` image. Only the restore drill's SQL part was proven, against a throwaway Postgres (new table
   `tester_role_snapshots` covered; dump → restore → `IDENTICAL`). The backup script's encrypt → upload → download path
   was **not** exercised with migration `008` in place.

**The source of truth for every command is the runbook:**
[`profile-tester-roles-runbook.md`](../../../knowledge-base/profile-tester-roles-runbook.md). This brief does not copy its
commands — follow the runbook, so there is one place to fix.

## What to build

Nothing to build. An owner-run checklist. Record each step's result in this task's `worklog.md` (date, pass/fail, what
was seen). **No ids, hosts, URLs, tokens or secrets in the worklog** — write "the tester's id", never the id.

**(a) Deploy the profile box — mid-week (owner ruling "Urgent: after review passes").**
- Precondition: `0425` is **committed** (the owner commits; committed is not deployed).
- Before deploying, check whether any open task reads profile-server numbers that a restart resets (the `0402` lesson,
  2026-10-07); if so, take that read first.
- Deploy with the existing pipeline (`build-deploy-profile.sh` + `setup-profile.sh`). It ships the new image,
  migration `008` (`tester_role_snapshots`), and the new `tester-roles/` mount (`setup-profile.sh` creates the directory
  and rewrites the compose file).
- Check after: the profile `/health` and `/ready` both answer 200; migration `008` is applied.

**(b) Create the allowlist on the box** — runbook *One-time setup*, step 3. **Create it only if it does not exist yet**;
to add a tester later, edit the file, never re-create it (re-creating empties it). One entry: the tester's internal id.

**(c) Find the tester's internal id** — runbook *One-time setup*, step 2, the **recommended** way (developer tools on
the tester's device, decode only the middle part of the session token). ⛔ Never copy or paste the whole token anywhere —
it is a login credential for 24 h. The database-lookup fallback is not recommended.

**(d) Apply "earned citizen" and check it.**
1. `show <tester id>` — confirm it is the right record (runbook *`show` output*). Note the current XP and flags in the
   worklog (values only, no ids).
2. `apply <tester id> earned-citizen`.
3. `show` again — expect: citizen yes, paid no, XP 100, earned date set, a snapshot held.
4. On the tester's device: **full page reload**, outside any lobby or match. Confirm the game shows the earned-citizen
   view. Note in the worklog whether the login was **verified** — an unverified login shows any citizen with XP pinned
   at 100 and no earned date (runbook *After a run*).
5. Check the run log on the box got one line per run (runbook *The run log*).

**(e) Later — restore.** When the owner is done testing with the earned role (for example after `0420`'s earned items):
`restore <tester id>`, then `show` — the record must read exactly as in step (d)1, and no snapshot held. XP earned while
the role was on is **discarded** by `restore` (expected).

**(f) Re-run the full backup dry-run** where MinIO can be pulled — `npm run test:scripts:docker` (needs Docker plus
`age`, `age-keygen`, `rclone`, `curl`, `jq`), or the owner's restore drill on the box per
[`profile-backup-restore-runbook.md`](../../../knowledge-base/profile-backup-restore-runbook.md). Expected: the drill
covers 11 tables including `tester_role_snapshots`, and the result is `IDENTICAL`. This closes `0425`'s second unproven
item.

**(g) Runbook warnings — keep them while a role is on:**
- ⛔ **Never make a real purchase on the tester account while a role is applied.** `restore` would then set "not paid"
  while the purchase receipt stays — a real buyer shown as not paid. If it happens anyway, do **not** restore; re-plan
  with the producer.
- **Apply and restore between matches, outside a lobby** — the game server reads citizen status when a player joins.
- A `paid-citizen` tester counts as one paid player with no purchase record in ad-hoc counts — exclude held testers
  (runbook *Statistics and analytics*).

## Verification steps

1. The worklog names the deployed profile version and the date; `/health` and `/ready` were 200 after it.
2. `show` before and after `apply` are both recorded (values only); the after-`show` matches the `earned-citizen` row of
   the runbook's role table.
3. After a full reload, the tester's device shows the earned-citizen view; the worklog says whether the login was
   verified.
4. The run log has a line for each run, including any refusal.
5. **`restore` round trip** (step e): the after-`restore` `show` equals the step (d)1 `show`, and no snapshot is held.
   This step may run later than 1–4; the task closes only when it has run, or the owner rules to keep the role on and
   says so in the worklog.
6. **Full backup dry-run** (step f) ends `IDENTICAL` with `tester_role_snapshots` covered — or the worklog records why
   it could not run and the owner's ruling on that.
7. **Any failure** — the command refuses unexpectedly, the view is wrong, the drill is not `IDENTICAL` — is written down
   with the exact refusal reason or diff line, and a follow-up build task is filed. This task does not fix code.

## Notes

- **Depends on:** `0425` committed (then deployed by step a).
- **Unblocks:** [`0420`](../0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)'s
  earned-account items (3a, 8b and the earned part of item 4), and possibly
  [`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md) (only
  if its host must be an earned citizen — its brief allows "earned or paid"; the owner decides).
- Build task: [`0425`](../../done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md)
  (closed 2026-10-09, agent-closed — not owner-verified). Its `worklog.md` has the checks (client caches, paid display,
  statistics, the tenure gift) and the full verification table.
- Related: [`0424`](../0424-investigate-yandex-returning-a-different-player-id-for-the-same-account-if-it-recurs/brief.md) —
  if the tester's Yandex id changes again, the role and snapshot stay on the old record (runbook *Recovery*).
- Deploy: **mid-week, by owner ruling** — an exception for this deploy only, not a change to the weekend-slot rule.
- No ids, hosts, URLs or secrets belong in this brief or its worklog.
- Filed 2026-10-09 by a spawned `fkit-producer` at `0425`'s close, on the owner rulings above. ⛔ Not producer precedent.
