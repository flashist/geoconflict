# Verify 0384 on the profile box — Postgres runs the locked image after the deploy

## ID
0385

## Sprint
Sprint 9

> 📌 **2026-10-16 — was Sprint 8, now Sprint 9.** Relocated by `/fkit-sprint-done` at the Sprint 8 close (agent-closed — not owner-verified), on the OWNER RULINGS given 2026-10-16 in a Claude Code session, relayed by it to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Typed by the owner, verbatim *"Can we move all the tasks tha require wait for certain time to Sprint 9?"*; then live `AskUserQuestion`: *"Move all 5 waiting tasks (0452, 0449, 0385, 0219, 0213) to Sprint 9 — and close Sprint 8?"* → **"Move all + close Sprint 8 (Recommended)"**; *"Where should the 5 go on Sprint 9?"* → **"At the top (Recommended)"** — option text: *"They finish within about 24 hours, so they go first: 0385 → 0219 → 0213, then 0452, 0449, then 0469, 0343, 0455."*. The [Sprint 8](../../../sprints/done/plan-sprint-8.md) row stays as a `➡️ Moved` pointer. Not a close of this task.

*(Earlier value, kept as history — true until 2026-10-16:)* ~~Sprint 8~~

📌 **Moved from the Backlog board to [Sprint 8](../../../sprints/done/plan-sprint-8.md) on 2026-10-15, together with
[`0384`](../../done/0384-profile-box-lock-postgres-to-one-exact-image-by-digest/brief.md)** — OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel
(ADR-021/037); ⛔ not producer precedent. Verbatim **"Build it as 0384 (Recommended)"** — option text: *"The producer
moves 0384 into Sprint 8, and 0385 checks it on the box after the deploy. 0219's B6 item just points to them. It uses the
task, checklist and check-task split that already exist."* ⇒ **This task is now also
[`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md)'s B6/V2 re-check** (*"prune
leaves current + rollback intact"*, and the database stays on the image the compose file names): when it passes,
`0219`'s item (4) is met — record the result in both worklogs; do not run the check twice.
⚠️ **This bends the owner's standing 2026-09-29 build/verify rule** (verify task at the top of the NEXT sprint), as for
`0445`, `0449`, `0450`, `0452`. The ruling's text does not name this task's board — the move is `fkit-lead`'s reading of
it. ~~**Flagged for owner confirmation.**~~ ✅ **OWNER-CONFIRMED 2026-10-15 — Ruling C** (live `AskUserQuestion`,
relayed by `fkit-lead`; ⛔ not producer precedent). Asked: *"0385 is the check you run on the profile box after the
Postgres fix is deployed. Your usual rule puts check tasks at the top of the NEXT sprint, but you've made exceptions
before (0445, 0449, 0450, 0452). Where should 0385 go?"* Selected, verbatim: **"Keep in Sprint 8 (Recommended)"** —
option text: *"Same exception as before. 0219 can't close until 0385 passes, so keeping them on the same board keeps it
simple."* The rule is bent **for this case only**. It still must not hold back any other Sprint 8 deploy.

*(Earlier value, kept as history — true until 2026-10-15:)* ~~Backlog~~

## Priority
1

> 📌 **2026-10-16 — was 55 (Sprint 8), now 1 (Sprint 9).** ✅ **OWNER-RULED placement** — *"At the top (Recommended)"* (order `0385` → `0219` → `0213` → `0452` → `0449`, then `0469`, `0343`, `0455`); the mover had appended it at 8 (ADR-035). The text below is Sprint 8 history, kept as written.

~~**55**~~ — board rank on [Sprint 8](../../../sprints/done/plan-sprint-8.md), set 2026-10-15. ⚠️ **Append rank (ADR-035), NOT a
merit ranking** — ~~flagged for owner confirmation~~. On merit directly below `0384`, which it needs built and deployed.
✅ **Merit order OWNER-CONFIRMED 2026-10-15** (Ruling D, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer
precedent; verbatim *"Yes: 0219, then 0384, then 0385 (Recommended)"*). Row number unchanged (ADR-035).

*(Earlier value:)* ~~Unscheduled~~

> 📌 **Placement note** *(history — written 2026-10-04, superseded 2026-10-15 by the move above).* No sprint was named, so this is on the Backlog board for now. The owner's standing
> build/verify rule (2026-09-29) puts a verify task **at the top of the next sprint after its build ships**, and it
> must not block the build's own sprint deploy. When
> [`0384`](../../done/0384-profile-box-lock-postgres-to-one-exact-image-by-digest/brief.md) closes, that placement is the
> producer's to propose and the owner's to confirm — it is **not** made here.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **the deploy is EXECUTED BY THE OWNER (human)** in a weekend slot. Every check below is read-only,
so an agent session runs them over SSH where it can (standing rule: read-only checks are run, not handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0381`.)*

## Context

**OWNER RULINGS, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer`
with no owner channel (ADR-021/037), on the owner's ruling to lock Postgres by digest (see `0384`'s Context) and the
owner's build/verify split rule (2026-09-29). Decision record: [ADR-120](../../../knowledge-base/decisions/adr-120-third-party-images-digest-pinned-postgres-upgrades-deliberate-backup-first.md).

**This is the production check for `0384`.** Tests prove the file is locked; only the box proves that the running
database is on the locked image, that the one expected container recreate went cleanly, and that a Docker or systemd
restart no longer moves it.

## What to build

Nothing is built. Live check on the profile box after the weekend deploy of `0384`.

**Preconditions:** `0384` committed and deployed via `npm run deploy:profile`. Record the deploy date. A fresh
backup marker existed before the deploy (record its date).

**Steps (all read-only unless marked):**
1. **Image.** The running Postgres container's image digest equals the digest locked in `setup-profile.sh`.
2. **Version.** `SELECT version()` inside the container reports **16.15**.
3. **Data intact.** `schema_migrations` row count is unchanged from before the deploy (record both); `/ready` returns
   200.
4. **Recreate seen.** Note whether the deploy recreated the Postgres container (container start time vs deploy time).
   Either answer is fine; record it — `0384` predicted "likely once".
5. **Backups still work.** The next nightly backup marker after the deploy is fresh and reports success.
6. **Prune kept it.** After the deploy's prune, the locked image is still present on the box (by ID).
7. **Stray image.** Is the 642 MB `postgres:16` image from `0219`'s W5 still on the box? Record yes/no. Removing it is
   a write — the owner's call, not part of the pass/fail.
8. **Optional — owner's call (a write, brief disruption):** restart the `profile` systemd unit (or Docker) and re-run
   step 1. The image must not change. This is the exact path that moved the DB on 2026-09-26. Skipping it is allowed;
   say so if skipped.

## Verification steps

1. Steps 1–3 and 5–6 pass, with the evidence recorded in this task's worklog — digests and version strings only, **no
   hostnames, IPs, connection strings or credentials**.
2. Steps 4 and 7 recorded (they are observations, not pass/fail).
3. Step 8 either passed or is recorded as skipped by the owner.
4. If any step fails: Postgres rollback is a **hand revert** (the deploy's auto-rollback covers `profile-api` only,
   `setup-profile.sh:1221-1250`). Stop and bring it to the owner; do not improvise a fix on the box.

## Notes

- **Depends on:** 0384
- **Blocks:** nothing
- **Why its own task.** The owner's build/verify rule: proof that needs a deploy plus an owner check is a separate task,
  so `0384` can close on its tests and this one does not hold up a sprint.
- **Can share a weekend slot with** [`0387`](../0387-verify-0386-on-the-telemetry-box-postgres-and-redis-run-the-locked-images-after-the-deploy/brief.md)
  (the telemetry check). Producer's suggestion, owner's call.
- **Related:** [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) (the
  incident; its V2 *"leaves current + rollback intact"* is the same concern). Since 2026-10-15 (Ruling A) this task **is** `0219`'s B6/V2 re-check.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
