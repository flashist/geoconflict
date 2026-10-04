# Telemetry box: lock all five outside images by digest — Postgres, Redis, ClickHouse, Uptrace, OTel collector

## ID
0386

> ℹ️ **Folder name vs title.** The folder slug says *"postgres-and-redis"* because the brief was filed before the
> owner widened the scope the same day (ruling 2 below). Folder names are not renamed (task identity is the `0386`
> prefix); **the title and this brief are the scope.**

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**OWNER RULINGS, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer`
with no owner channel (ADR-021/037), on two rulings the owner gave live via `AskUserQuestion` in the `fkit lead`
session:

1. *"The telemetry server has the same problem (Postgres + Redis use moving labels). Include it?"* → **"Include
   telemetry too (Recommended)"** — *"Same fix on the telemetry server, in the same or a sibling task. Same risk, same
   small change."* The producer chose a **sibling task** (see Notes).
2. *(follow-up, same session, amended into this brief the same day)* *"The telemetry server has 3 more programs
   (ClickHouse, Uptrace, the OTel collector) on exact version labels — not moving, so low risk. Lock those 3 too, so
   the rule is simply 'everything is locked'?"* → **"Lock those 3 too (Recommended)"** — *"Same task, tiny extra
   work. The rule stays simple: every outside program on both servers is locked to exact bytes."*

The lock itself and the reminder to bump it are the owner's other rulings, recorded in full in
[`0384`](../0384-profile-box-lock-postgres-to-one-exact-image-by-digest/brief.md)'s Context.

**Decision record:** [ADR-120](../../../knowledge-base/decisions/adr-120-third-party-images-digest-pinned-postgres-upgrades-deliberate-backup-first.md)
(status *proposed*; the decision itself is owner-ruled) — §1: *every* third-party image on both boxes is pinned by
digest, `image: <name>:<tag>@sha256:<64-hex>`, tag kept as a human label; any image added later is pinned from day one.

### The problem, in plain terms

- The telemetry (Uptrace) compose file in `setup-telemetry.sh` names five outside images:
  | Image | Line | Today |
  |---|---|---|
  | `clickhouse/clickhouse-server:25.8.15.35` | `:542` | exact version label — rarely moves, but can be re-pushed |
  | `postgres:17-alpine` | `:565` | **moving label** |
  | `redis:7-alpine` | `:581` | **moving label** |
  | `uptrace/uptrace:2.0.2` | `:590` | exact version label |
  | `otel/opentelemetry-collector-contrib:0.123.0` | `:608` | exact version label |
- **How the drift would happen here — it differs from the profile box.** No `docker compose pull` and no image prune
  in `setup-telemetry.sh` or `build-deploy-telemetry.sh` (producer grep, 2026-10-04; ADR-120 agrees). The deploy
  force-recreates only `clickhouse uptrace otelcol` (`:632`); the `uptrace` systemd unit runs a plain
  `docker compose up` (`:982`). So a label resolves to *whatever it means that day* only when the image is **missing
  locally** — a fresh box, a manual or future prune, a Docker data reset. Lower odds than the profile box; same kind of
  unchosen change. Telemetry Postgres and Redis publish no ports (ADR-120, `setup-telemetry.sh:564-588`).
- Weekly Postgres backups exist on this box (`/etc/cron.d/uptrace-backups`, `setup-telemetry.sh:1226-1241`) —
  relevant to "backup first" before the deploy.

### Code facts and traps (producer re-checked 2026-10-04 — find code by name if lines drift)

- The compose heredoc is **unquoted** (`<< EOF`, `:539`) — unlike the profile one, `$` expands here. A digest literal
  contains no `$`, so it is safe as a literal; do not add new shell variables for it.
- 🚨 **Trap 1 — an existing harness check will break.** `tests/scripts/profile-deploy-hardening.test.sh:2431` reads the
  Uptrace tag with a `sed` that captures everything after `uptrace/uptrace:` to end of line, then (`:2436`) requires it
  to equal the `# Schema verified against: uptrace/uptrace:2.0.2` line (`setup-telemetry.sh:1085`, task `0285`). After
  the lock it would capture `2.0.2@sha256:…` and **fail**. The plan must adapt that check so it still compares the
  *version* (and keeps failing loudly on a real version change) — not delete it.
- ⚠️ **Trap 2 — the pre-deploy Uptrace config check runs a tag, not the lock.** `build-deploy-telemetry.sh:229` reads
  the Uptrace version out of `setup-telemetry.sh` (`grep -oE '[0-9]+\.[0-9]+\.[0-9]+'` — still yields `2.0.2` with a
  digest on the line, since hex has no dots) and `:243` runs `uptrace/uptrace:${UPTRACE_VERSION}` locally to validate
  the generated config. After the lock, that validation would run whatever the **tag** means, not the locked bytes.
  Recommended: validate against the same locked reference; the plan decides and says why.
- The `0285` channel-state probe and `src/profile-server/AlertRelay.ts` are tied to Uptrace **2.0.2**. This task keeps
  2.0.2 (locks the bytes the box runs), so the schema verification stays valid.

## What to build

1. **Plan first** (`/fkit-plan-task`), owner approves before any edit.
2. **Get the digests the box runs today — a read-only box check, not yet run.** On the telemetry box, for **each of the
   five** running containers, read the image's registry digest (`RepoDigests`, the multi-arch index digest) and the
   exact version. Read-only ⇒ an agent session runs it over SSH if it can; otherwise it is the one command the owner
   runs. ⚠️ The telemetry box is unreachable while a full-tunnel VPN is on (project memory: add a `/32` bypass route
   or turn the VPN off). **Lock to what is running now** so the deploy changes no bytes. For the three version-labelled
   images, also confirm the running version equals the label in the file; if not, **stop and report**. If any digest
   is missing, **stop and report** — do not pick one from Docker Hub instead.
3. **Lock all five** in the compose heredoc as literals `<name>:<exact-version-tag>@sha256:<64-hex>` — Postgres as
   `postgres:17.<n>-alpine@sha256:…` and Redis as `redis:7.<n>.<p>-alpine@sha256:…` (exact tag replaces the moving
   one); ClickHouse, Uptrace and otelcol keep their current tags with the digest appended.
4. **Fix Trap 1** (adapt the `0285` Uptrace-version assertion) and **decide Trap 2** (what the pre-deploy config check
   runs).
5. **New structural assertion** in `tests/scripts/profile-deploy-hardening.test.sh`: **every** `image:` line in the
   telemetry compose heredoc ends in `@sha256:[0-9a-f]{64}` — written so a sixth image added later without a digest
   fails it (ADR-120 §1, "pinned from day one"). Plus a count check so the assertion cannot pass vacuously on zero
   matches.
6. **One deploy note** for the owner, in the worklog: which containers the first deploy after this change will
   recreate (from the converge commands — `clickhouse uptrace otelcol` are force-recreated every deploy anyway;
   say what happens to Postgres and Redis), and that data lives on the volumes. Weekend slot (owner's standing rule).
   Confirm a recent Postgres backup exists before deploying.

**Out of scope:** the profile box (`0384`); the periodic bump (`0388`); `setup.sh`'s game-box
`otel/opentelemetry-collector-contrib:latest` (`setup.sh:150,159` — a game-box image, not one of the two boxes ADR-120
names; raise it as an open question in the plan if the coder thinks it belongs under the same rule).

## Verification steps

1. `bash tests/scripts/profile-deploy-hardening.test.sh` passes, including the new assertion and the adapted `0285`
   version check. **Negative checks**, each shown in the worklog then restored: (a) one image line put back without its
   digest → the new assertion **fails**; (b) the Uptrace version changed in the compose line but not in the
   `Schema verified against` line → the adapted `0285` check **still fails**.
2. `grep -n 'postgres:17-alpine\|redis:7-alpine' setup-telemetry.sh` returns **nothing**, and every `image:` line in
   the heredoc carries `@sha256:`.
3. The locked digests equal the ones read from the box in step 2 (quote the box output in the worklog — digests and
   versions only, no hostnames, IPs or credentials).
4. The pre-deploy Uptrace config validation still passes (run the relevant part of `build-deploy-telemetry.sh`'s local
   dry-run, or state plainly that it could not be run and why).
5. `npm test` green.
6. The production check is **not** part of this task — it is `0387`, run after the weekend deploy.

## Notes

- **Depends on:** nothing
- **Blocks:** 0387, 0388
- **Why a sibling task, not part of `0384`.** Different box, different script (`setup-telemetry.sh`), different deploy
  command (`npm run deploy:telemetry` vs `npm run deploy:profile`) and a different drift path (no pull here). Each lock
  can be built, tested, deployed and rolled back alone; joining them would tie one box's deploy to the other's. The
  coder may build both in one session — that is fine; they still close separately.
- **Why the three version-labelled images are in this task, not a third one** — the owner ruled *"Same task, tiny extra
  work"*; they share the file, the harness and the deploy.
- **Related:** [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) (where the
  profile-box incident that prompted this is recorded), `0285` (the Uptrace version pin and schema check this task must
  keep working).
- **Deploy:** the owner's, in a weekend slot. Committed ≠ deployed.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
