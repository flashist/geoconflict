# Container log retention is too short now that nginx access logs share the stream

## ID
0060

## Sprint
Sprint 4

## Priority
Pull in now. This is the one item that protects the **next** investigation while the outage track is
paused.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

From §9 of the 2026-08-22 incident record (loose ends, not the outage's cause):
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

Production's container logs are kept under a Docker `json-file` driver at **`max-file:3` ×
`max-size:50m` = 150 MB total**. In the same 2026-08-22 deploy batch, **nginx access logs were
redirected into that same stdout stream** — for good reasons: the previous unrotated nginx log had
grown to **32 GB** and caused a disk-full incident on 2026-07-15.

The fix was right. The consequence was not sized. Access-log volume now shares a 150 MB budget with
the application logs, so the application's own history is evicted far faster than before. The
incident record states this plainly: **it nearly cost us the investigation window** on 2026-08-22.

### Why this is worth doing now, specifically

The owner has **paused the outage track** (2026-08-23) — `0057` and `0056` are held, so **production
continues to run without worker crash recovery.** A recurrence is a live possibility, not a
hypothetical. Meanwhile `0055`'s new exit-handler diagnostics are committed only to an unpushed
branch, so they are not in production either.

That leaves the container log as the primary — in places the only — evidence trail for the next
incident, on a retention budget that is now demonstrably too small. Extending it is cheap, carries
almost no risk, and is worth more during the pause than it would be after the fix ships.

### ⚠️ The log configuration is NOT in this repository

Verified 2026-08-23: `grep` for `log-opt`, `max-size`, `max-file`, `log-driver` across all `*.sh`,
`*.yml`, `*.yaml` and `Dockerfile*` in this repo returns **nothing**, and there is no
`docker-compose*.yml`. So the retention values are set somewhere outside the tree — the Docker
daemon's `daemon.json` on the host, the remote update script that `deploy.sh` invokes, or a `docker
run` line on the server.

**This may therefore not be a code change at all.** Do not assume a file in this repo is the target.
Finding where the setting actually lives is step 1, and it determines whether this task produces a
commit or a documented server-side change.

## What to build

1. **Locate the configuration.** Find where `max-file` / `max-size` are actually set for the
   `geoconflict-prod` container. Candidates: host `daemon.json`, the remote update script,
   a `docker run`/`docker create` invocation. `docker inspect --format '{{json .HostConfig.LogConfig}}'`
   on the running container reports what is **in effect** — start there, then find what sets it.

2. **Measure before changing.** Establish how much log volume a day actually produces now, split
   application vs nginx access lines if you can. Without that number, any new value is a guess.
   Record the measurement.

3. **Raise retention to cover a realistic investigation window.** The 2026-08-22 investigation needed
   the logs from a boot roughly 3.5 hours before anyone looked, and the record notes the window was
   nearly lost. Size for **days, not hours**, and account for disk headroom on the host — `/` was at
   22% used during the incident, so there is room, but confirm it rather than assuming.

4. **Consider separating the two streams instead of just growing the budget.** Merging them is what
   created the problem. If nginx access logs can go to their own rotated destination — with rotation
   this time, unlike the 32 GB file that caused the 2026-07-15 incident — the application log gets its
   full budget back and the sizing question gets much easier. **Evaluate this and recommend; do not
   implement both.** State the tradeoff.

5. **Do not reintroduce the 32 GB failure mode.** Whatever you change, every log destination must be
   rotated and bounded. That is the hard constraint this task must not violate.

## Verification steps

1. **The effective config changed.** `docker inspect --format '{{json .HostConfig.LogConfig}}'` on the
   running container reports the new values. Configuration that was edited but requires a container
   recreate to take effect is **not** verified until the container has been recreated and re-inspected.
2. **A realistic window survives.** Using the measured daily volume from step 2, show that logs from at
   least the intended retention window are still present. Do not assert this from the config values
   alone — check that old lines are actually still readable.
3. **Disk headroom is still healthy** after the change, with the larger budget fully consumed. Compute
   the worst case; do not wait to observe it.
4. **Every destination is bounded and rotated.** No path can grow unbounded. Name each destination and
   its bound.
5. **Boot-scoped reads still work.** Confirm
   `docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")" "$CID"` still
   isolates the current boot — `docker logs` is cumulative across restarts, and counting over the whole
   log mixes boots. This is the technique the next investigation will depend on.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing formally — but it protects every future investigation, which is why it is in
  the sprint during the pause.
- **Related:** `0055` (its new diagnostics are only useful if the logs holding them survive),
  `0056`/`0057` (paused), `0061`–`0063` (the other three §9 follow-ups).

- **Producer note on placement.** I recommended Sprint 4 for this one specifically, and the owner
  selected the four §9 items with that framing attached. I still hold that view: it is cheap, it is
  the only one of the four that improves our ability to diagnose the *next* incident, and the pause
  makes the next incident more likely rather than less. The other three (`0061`–`0063`) are on the
  Backlog board.
- **This may be a server-side change with no commit.** If so, that is a legitimate outcome — record
  what was changed and where, so the next person can find it. A change nobody can locate later is how
  this setting became invisible in the first place.
- ✅ **F6 — CONFIRMED. Owner ruling 2026-09-02, given live in session: KEEP THE TABLE.** Review finding
  **F6** shipped **without an owner disposition** — the driver's relay ruled F1–F5, F7 and F8 and
  skipped F6; the coder verified it independently, found it held, applied it as an obvious winner
  (doc accuracy, same file and class as F1) and **flagged rather than absorbed it**. The item is the
  **deploy-path table** in `ai-agents/knowledge-base/container-log-retention.md`, which records that
  `deploy.sh` ships this task's **retention flags** but **not** the `nginx.conf` log-volume fix — that
  half is baked into the image at `Dockerfile:87` and needs `build-deploy.sh`. **The owner confirmed
  it; the table stays.** The reverse option (delete the one table) was live and was **not** taken.
  This closes the only finding on this task that carried no disposition at close. It changes **no**
  status and clears **no** Deferred Live Tail item — the seven live-tail items stay unchecked and
  nothing here is verified in production.
- **Do not modify the incident record.** Reference it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** Container logs contain `persistentID` values, documented as the JWT
  `sub` and PII. Filter any excerpt before it lands in a worklog, review, or commit.
