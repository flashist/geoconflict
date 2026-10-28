# Profile box served requests before its migrations finished: find why and make the start order safe

## ID
0517

> ℹ️ **ID allocation, checked 2026-10-28 before filing.** Highest existing ID `0516` on all three boards (`## ID`
> fields, base-10) → `0517`.

## Sprint
Backlog

> 📌 **Filed 2026-10-28 on an OWNER RULING** given via `AskUserQuestion` in the `fkit-lead` session, relayed to a
> spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Asked *"The ~10-second
> startup race on the profile box (2 errors on 27 Oct): what to do?"* → **"Brief a task on Backlog (Recommended)"** —
> option text: *"Producer files a coder task to find the cause and fix the order. Knock-on: none; Backlog board,
> nothing waits on it."*

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**What was seen, in plain terms.** On the 2026-10-27 profile-box deploy, the profile API answered requests that needed
a table which did not exist yet. A few seconds later the migrations that create it were recorded as applied. Nothing has
gone wrong since. The risk is that **every** deploy that adds a table can repeat this for a few seconds.

**The observed facts — the only facts known** (read-only box checks, 2026-10-28, recorded in
[`0511`'s worklog](../../done/0511-verify-0506-live-the-profile-box-answers-held-purchases-quietly-and-says-consume-false-for-citizenship-s1v/worklog.md),
entry *"2026-10-28 — read-only box checks over SSH"*, section *Reported, not diagnosed*):

- The profile API started at **2026-10-27 14:04:35 UTC**.
- At **14:04:36 UTC** it logged **2** error lines: `entitlements lookup failed: relation "player_entitlements" does not
  exist`.
- `schema_migrations` records migrations `009`–`012` applied at **14:04:45 UTC**.
- No such errors since then.
- The error text held no personal data.

**No cause is known.** ⚠️ *Unverified guess, not a finding:* the API may accept traffic before the migration step runs.
The investigation may show something else.

- **Where to look (pointers, not conclusions):** the profile deploy pipeline (`build-deploy-profile.sh`,
  `setup-profile.sh`, `Dockerfile.profile`) and the migration runner (`src/profile-server/Migrations.ts`). Memory note:
  these exist — do not recreate them.
- ⚠️ **`setup-profile.sh` and `build-deploy-profile.sh` are covered by grep-level assertions** in
  `tests/scripts/profile-deploy-hardening.test.sh`, which runs inside `npm test` (CLAUDE.md, *Shell harnesses*).
  Editing them can turn `npm test` red; that is the gate working.
- **Related history:** the profile deploy-hardening work once failed a review loop (memory note: decompose on resume).
  Keep this change small.

## What to build

Plan → owner approval → build, as usual:

1. **Find why** requests were served before the migrations finished — with evidence (code path, deploy-script order,
   container start order). State it in `plan.md` before proposing a fix.
2. **Make the start order safe:** the profile API must not serve requests that touch the database until the migrations
   for that release have been applied — or must fail those requests in a way that leaves no harm, if the plan shows that
   is the better trade-off. The plan says which, and why.
3. Test it. Deploy in a weekend slot unless the owner says it is urgent (owner rule).

## Verification steps

1. `plan.md` states the cause with evidence, or says plainly that the cause could not be pinned down and what the fix
   protects against anyway.
2. A test (unit, integration or shell harness — the plan picks) shows that with a pending migration, the API does not
   serve database-backed requests before the migration is applied (or the chosen safe alternative holds).
3. `npm test` green; `npm run test:integration` green if migration or database code changed; lint clean.
4. If a deploy script changes, `tests/scripts/profile-deploy-hardening.test.sh` still passes, updated if its assertions
   needed to change (said why in the worklog).
5. After the next profile-box deploy (a separate, owner-run step — split into a verify task if the owner wants, per the
   build/verify rule): the API log shows no `relation … does not exist` error around boot.
6. No connection strings, endpoints, keys or player data in any artifact.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Evidence:** `0511` worklog (linked above). `0511` itself is closed.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
