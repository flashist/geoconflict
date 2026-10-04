# Verify 0384 on the profile box — Postgres runs the locked image after the deploy

## ID
0385

## Sprint
Backlog

## Priority
Unscheduled

> 📌 **Placement note.** No sprint was named, so this is on the Backlog board for now. The owner's standing
> build/verify rule (2026-09-29) puts a verify task **at the top of the next sprint after its build ships**, and it
> must not block the build's own sprint deploy. When
> [`0384`](../0384-profile-box-lock-postgres-to-one-exact-image-by-digest/brief.md) closes, that placement is the
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
  incident; its V2 *"leaves current + rollback intact"* is the same concern).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
