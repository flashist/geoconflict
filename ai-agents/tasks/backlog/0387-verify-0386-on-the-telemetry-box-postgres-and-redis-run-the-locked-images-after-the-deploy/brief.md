# Verify 0386 on the telemetry box — all five outside images run their locked digests after the deploy

## ID
0387

## Sprint
Backlog

## Priority
Unscheduled

> 📌 **Placement note.** No sprint was named, so this is on the Backlog board for now. The owner's standing
> build/verify rule (2026-09-29) puts a verify task **at the top of the next sprint after its build ships**, and it
> must not block the build's own sprint deploy. When
> [`0386`](../0386-telemetry-box-lock-postgres-and-redis-to-one-exact-image-by-digest/brief.md) closes, that placement
> is the producer's to propose and the owner's to confirm — it is **not** made here.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **the deploy is EXECUTED BY THE OWNER (human)** in a weekend slot. Every check below is read-only,
so an agent session runs them over SSH where it can (standing rule). ⚠️ The telemetry box is unreachable while a
full-tunnel VPN is on.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0381`.)*

## Context

**OWNER RULINGS, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer`
with no owner channel (ADR-021/037), on the owner's rulings to include telemetry in the digest lock — all five outside images (see `0386`'s
Context) — and the owner's build/verify split rule (2026-09-29). Decision record: [ADR-120](../../../knowledge-base/decisions/adr-120-third-party-images-digest-pinned-postgres-upgrades-deliberate-backup-first.md).

> ℹ️ The folder slug says *"postgres-and-redis"*: filed before the same-day scope widening. Folder names are not
> renamed; **the title and this brief are the scope.**

**This is the production check for `0386`.**

## What to build

Nothing is built. Live check on the telemetry box after the weekend deploy of `0386`.

**Preconditions:** `0386` committed and deployed via `npm run deploy:telemetry`. Record the deploy date and the date of
the newest Postgres backup on the box before the deploy.

**Steps (all read-only unless marked):**
1. **Images.** Each of the five running containers (ClickHouse, Postgres, Redis, Uptrace, otelcol) runs the image
   digest locked for it in `setup-telemetry.sh`.
2. **Versions.** Postgres reports the locked 17.x version; Redis the locked 7.x version; ClickHouse, Uptrace and
   otelcol the versions on their labels (Uptrace still 2.0.2).
3. **Stack healthy.** All five services up and healthy (`docker compose ps`); the Uptrace UI loads; new telemetry is
   arriving (a fresh span or log from the game in the last few minutes).
4. **Recreate seen.** Note whether Postgres and/or Redis were recreated by the deploy (container start time vs deploy
   time) and compare with `0386`'s prediction.
5. **Optional — owner's call (a write, brief telemetry gap):** restart the `uptrace` systemd unit and re-run step 1.
   The images must not change. Skipping is allowed; say so if skipped.

## Verification steps

1. Steps 1–3 pass, with evidence in this task's worklog — digests, versions and service states only, **no hostnames,
   IPs or credentials**.
2. Step 4 recorded (an observation, not pass/fail). Step 5 passed or recorded as skipped by the owner.
3. If any step fails: stop and bring it to the owner; the revert is putting the previous compose lines back and
   redeploying — a hand action, there is no auto-rollback on this box.

## Notes

- **Depends on:** 0386
- **Blocks:** nothing
- **Why its own task.** The owner's build/verify rule: proof needing a deploy plus an owner check is separate, so
  `0386` can close on its tests.
- **Can share a weekend slot with** [`0385`](../0385-verify-0384-on-the-profile-box-postgres-runs-the-locked-image-after-the-deploy/brief.md).
  Producer's suggestion, owner's call.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
