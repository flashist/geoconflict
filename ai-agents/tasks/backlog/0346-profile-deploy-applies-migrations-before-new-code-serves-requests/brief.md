# Profile deploy: apply migrations before the new code serves requests

## ID
0346

> ℹ️ **ID allocation, checked 2026-09-29 before filing** (the four checks of
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest ID on all three
> boards (folder names and `## ID` fields agree): `0345`. `0346`: no task folder, no `## ID` hit, no `.claude/`
> hit; the repo-wide search finds only two SVG files (coordinate false positives).

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer
precedent. Owner's answer: **"Yes, do all three (Recommended)"**; item (1) of the three was *"file a small task
so the profile DB migration runs before the new server takes requests"*. The owner named no sprint, so this is
filed on the Backlog board.

**What happened (the 2026-09-29 profile deploy, runbook § *Next window* N3; lead's own checks that night).**
The new `profile-api` container started at **20:04:48 UTC**. Migration `007` finished at **20:05:04 UTC**. In
between, the profile server logged **4 errors at 20:05:01 UTC**: `name-change state lookup failed: error: column
"dismissed_at" does not exist` — the new code reading a column that `007` adds. **No such error after 007
finished** (checked at 20:07 UTC). So the new code served real requests for roughly **11–16 seconds** against
the old schema. No data was lost as far as the lead could see; those 4 requests failed.

**Why it happens — a lead, not a finding (read the code yourself before relying on it).** In `setup-profile.sh`,
around the *DB migrations* section (lines ~1198–1275 at filing):

1. `docker compose up -d --force-recreate --no-deps profile-api` starts the **new** image.
2. The script waits up to 120 s for every container to report healthy (the compose healthcheck calls
   `/health`, which does not look at the schema).
3. **Only then** does it run `docker compose exec -T profile-api npm run migrate` inside the new container.

The comment above step 3 says a failed migration *"aborts the deploy BEFORE nginx/systemd, so a half-migrated
schema never goes live"*. That holds on a **first** install. On every **re-deploy** the host nginx is already
proxying to the container's port, so the new container takes traffic as soon as it is listening — before step
3. Related places: `Dockerfile.profile` (its `CMD` starts `Server.ts` directly; the comment above `COPY
migrations` says migrations run at deploy time via `exec`), `src/profile-server/migrate.ts` (the runner's entry
point), `src/profile-server/Server.ts:11` (comment: migrations run at deploy time).

**A worse case the same ordering allows (not seen, inferred from the code):** if a migration **fails**, the
script exits with the new code already serving against the old schema, and there is no automatic rollback on
that path (the image rollback exists only for the health-gate failure, which runs earlier).

**Standing constraints that bear on the fix** (not decisions to reopen):
- The migration runner is idempotent and skips applied files; there is **no down migration**. `006` refuses to
  run against existing data in old tables — a re-run is not automatically safe (`setup-profile.sh` comment).
- Whatever order is chosen, one side runs briefly against the other's schema: **migrate-first** means the
  **old** code sees the **new** schema for a moment (it must tolerate it — e.g. the runbook's N3 rollback
  caveat: old code tolerates `007` except a `'cleared'` row); **code-first** (today) means the new code sees the
  old schema. Picking the order is a real design choice.
- `tests/scripts/profile-deploy-hardening.test.sh` carries grep-level structural assertions over
  `setup-profile.sh`; editing it can turn `npm test` red (CLAUDE.md § *Shell harnesses*). That is the gate, not
  a broken test.
- A profile credit dropped while the server is down or failing is **lost, not queued** (standing cost, runbook
  N3) — a fix that adds downtime has a price too.

## What to build

The profile deploy must not let new server code answer requests before the migrations it needs are applied —
and a migration failure must not leave new code serving against an old schema.

**The approach is the plan's call, not this brief's.** Leads to weigh in the plan (consult `fkit-architect`
if the choice is not clear):
- run the migration runner from the **new** image against postgres **before** recreating `profile-api`
  (e.g. a one-off container), then recreate; or
- run migrations in the container's start-up, before the server listens; or
- keep the order but make the server not report ready / not serve until its schema is current.

For each, state: what the old code sees and for how long; what happens when a migration fails (does the old
image keep serving?); what it does to the first-install path; and how the SIGTERM/PID 1 rule in
`Dockerfile.profile` (exec-form `node`, task `0221`) is kept.

Keep it minimal: this is ordering in the deploy, not a migration framework. Update the stale comments named in
*Context* to match the new order.

## Verification steps

1. **The ordering, proven by a test:** a test in the deploy harness (or a new, registered harness) fails if
   the new `profile-api` can start serving before `migrate` has succeeded, and passes on the fixed script.
   Show it red on today's order.
2. **Migration failure path, proven by a test:** with a migration made to fail, the deploy stops **and** the
   service left answering is the **previous** image (or nothing new was started) — never the new image on the
   old schema.
3. `npm test` and `npm run lint` green; `npm run test:integration` green (migration runner unchanged or still
   passing).
4. **Live (owner, at the next profile deploy — per the owner's split-build-and-verify rule this is a separate
   verify task, not this task's close gate):** profile error lines since boot = **0**, in particular no
   `column … does not exist`; the migration list is the same as before the deploy plus any new file.
5. No hostname, IP, URL, token or connection string in any artifact.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing hard. ⚠️ Until it ships, **every profile deploy that carries a new migration** repeats
  the 2026-09-29 gap (seconds of failed requests on the new code path). A deploy with no new migration is
  unaffected.
- **Related:** runbook [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md)
  § *Next window* — *What happened 2026-09-29* (the evidence) ·
  [`0314`](../../done/0314-name-change-rejected-state-sticks-on-the-card-and-no-way-to-clear-a-name-decide-and-fix/brief.md)
  (migration `007`, the column in the error) ·
  [`0270`](../../done/0270-profile-identity-s1-database-and-rekeying/brief.md) (the migration runner split into
  `Migrations.ts`) · [`0221`](../../done/0221-profile-p6-os-baseline-hardening/brief.md) (PID 1 / SIGTERM rule in
  `Dockerfile.profile`) · [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md)
  / the hardening harness (structural assertions over `setup-profile.sh`).
- **Effort:** small–medium — a few lines of ordering in `setup-profile.sh` plus the harness test; more if the
  plan picks start-up migrations.
- **Producer's rank if pulled in:** Medium — not owner-ruled. Pull it in before the next profile deploy that
  carries a migration.
- 🔒 **Privacy:** no hostnames, IPs, URLs, tokens or connection strings in any artifact. This file is tracked in
  git.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
