# Game box: `otel-collector` has never exported host metrics (exporter points at loopback), and its container log is unrotated (~885 MB)

## ID
0262

> ℹ️ **ID allocation, checked 2026-09-14 before filing.** Highest ID across `backlog/`, `done/`,
> `cancelled/` was `0261` (folder prefixes and `## ID` fields agree). `0262` has no folder and no
> `## ID` hit; duplicate-prefix check (`uniq -d`) empty.

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Medium** — not owner-ruled. Medium because half of it is
a disk-fill risk of a class that has already taken prod down once (the nginx `access.log` disk-full
incident, 2026-07-15), on a file that grows every day. Not High because the growth rate has not been
measured and the disk is not known to be near full. The metrics half on its own is Low: nothing has
ever depended on these metrics, because they have never existed.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` on an owner ruling** relayed by `fkit-lead` (via
`AskUserQuestion`): *"File it in Backlog"* — unsprinted, no sprint assignment. That ruling covers
**where** it is filed; it rules nothing about scope, and it does **not** answer the open question
below.

**Source:** found read-only by the `0257` coder while checking the telemetry-cert renewal —
[`0257` worklog §5(d) and §6](../../done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/worklog.md).
**Not a certificate problem** — this collector never reached the telemetry host at all, so the cert
expiry never touched it and `0257`'s renewal did not (and could not) fix it. A separate defect, older
than `0257`.

### What was observed (2026-09-14, all read-only — see the `0257` worklog for the raw readings)

1. **The exporter points at loopback.** The collector config mounted into the container on the game
   box has `exporters.otlphttp.endpoint` set to a **plain-HTTP loopback address** — where the game
   box's own host nginx answers. It has **never** pointed at the telemetry ingest.
2. **It fails on every batch.** Last 3 MB of the container's log file: **12,432 lines** (today),
   **1,776 × `Exporting failed … Permanent error … Unimplemented`**, **0 × `x509`/`expired`**.
3. **Host metrics have never been recorded.** ClickHouse on the telemetry box: **`node_*` metrics —
   0 rows, ever** (checked back to at least 2026-06-01). So CPU / memory / disk / network for the game
   box, which this collector exists to ship, have no history at all.
4. **This is NOT the app metrics.** `geoconflict_server_*` comes from the Node SDK **inside the game
   container** (`src/server/WorkerMetrics.ts`), goes straight to the telemetry ingest, and **works** —
   it resumed at 09:17Z after the `0257` renewal. Do not touch that path.
5. **The container log is unrotated.** The container's json-file log is **~885 MB** (885,907,454
   bytes), still growing (mtime today), `LogConfig: json-file` with **no options**. And
   **`docker logs` cannot read past 2026-08-02T14:24Z** — so the one tool anyone would use to debug
   this container is already blind for the last six weeks.
6. Container facts: created 2025-11-08, started 2026-08-02, 0 restarts, `--network=host`, scraping
   node-exporter on the local port (node-exporter is up).

### Where the config comes from — checked in the repo 2026-09-14

- **It is repo-sourced.** `setup.sh` writes the collector config from a heredoc
  (`setup.sh:77-113`) with `endpoint: "${OTEL_EXPORTER_OTLP_ENDPOINT}"` and
  `Authorization: "${OTEL_AUTH_HEADER}"`, then starts `node-exporter` and `otel-collector` with
  `docker run` (`setup.sh:119-143`) — **neither carries `--log-driver`/`--log-opt`**.
- ⚠️ **`setup.sh` is one-time box provisioning, and no deploy re-runs it.** It also does `apt upgrade`,
  installs Docker, writes the host nginx and runs certbot. So **there is no existing path that ships
  a change to this collector** — re-running `setup.sh` whole to fix one sidecar is not acceptable.
  How the fix reaches the box is a real plan decision (What to build, step 2).
- ⚠️ **The worklog's "a loopback default" guess does not match the script.** `setup.sh:11-15` refuses
  to run if `OTEL_EXPORTER_OTLP_ENDPOINT` is empty, and there is no default in the heredoc. So the
  loopback value was **whatever was supplied at provisioning** (2025-11-08, the fork's first box
  setup). Whether the box's file was later hand-edited is **unknown** — diff the live file against a
  render of the heredoc before assuming either.
- ⚠️ **A second likely defect, found while filing — unverified, check it:** the Node SDK sends
  `Authorization: Basic <OTEL_AUTH_HEADER>` (`src/server/WorkerMetrics.ts:33-34`,
  `src/server/Logger.ts:23-24`), but the collector heredoc sends the **raw value with no `Basic `
  prefix** (`setup.sh:101-103`). **Fixing only the endpoint may just trade `Unimplemented` for `401`.**
  Also check what the heredoc's `tls.insecure: true` actually does for an `otlphttp` exporter against
  an HTTPS endpoint — do not ship something that silently skips certificate checks without saying so.
- ⚠️ **Both images are `:latest`** (`setup.sh:121,134`). Recreating the container pulls a collector
  roughly ten months newer than the one running; config parsing (including the escaped
  `${HOSTNAME}` relabel at `setup.sh:91`) may not behave the same. The telemetry box pins its
  collector to an exact version (`ai-agents/knowledge-base/architecture.md:669`) — pinning here is the
  obvious move, but it is the plan's call.

### Related, and the pattern to mirror

- **Rotation pattern:** `update.sh:90-92` (game container, task `0060`) and the profile box's compose
  `logging:` (task `0219`) both use `json-file`, `max-size=100m`, `max-file=10` — one number
  project-wide by owner ruling (`0219` Q3). ⚠️ That 1 GB ceiling is **provisional, not sized**
  (`ai-agents/knowledge-base/container-log-retention.md`).
- **This gap was already reported and not filed:** `0060` noted that `node-exporter` and
  `otel-collector` carry no `--log-opt` (`container-log-retention.md`, "What this does NOT do").
  This brief is that follow-up, for both containers.
- **Same failure class:** the prod disk-full incident from an unrotated nginx `access.log`.
- **Stale doc:** `ai-agents/knowledge-base/architecture.md:626-628` says this collector "forwards
  OTLP to the telemetry fleet". It never has. Correct it as part of this task.
- **Wiki gap:** the wiki's `systems/telemetry` page does not describe the game-box collector at all.
  Flag for `fkit-wiki` at close; do not write the vault.

### 🚩 OPEN OWNER QUESTION — NOT DECIDED, and it gates the shape of the work

**Are game-box host metrics (CPU / memory / disk / network via node-exporter) actually wanted?**

Nobody has asked for them, and nothing has ever used them — they have never existed. Inputs for the
owner, not a recommendation:

- **If yes:** fix the exporter (endpoint + auth), add rotation, pin the image. The telemetry box has
  an OOM history (wiki `systems/telemetry`); a new metrics stream every 10 s is extra ingest load on
  it — small, but not zero. A disk-usage series on the game box would have shown the 2026-07-15
  disk-full incident coming.
- **If no:** the right fix is to **remove `otel-collector` and `node-exporter`** from `setup.sh` and
  from the box — which ends the log growth outright and makes rotation moot. Check first that nothing
  else on the box scrapes node-exporter.

**The coder must get this answered at plan approval, before building either branch.**

### 🚫 Not in scope

- The Node SDK path (`geoconflict_server_*` metrics, server logs, spans) — it works.
- The telemetry box (its own collector, retention `0259`, restart policy `0255`, cert `0257`/`0258`).
- Shipping game-container **logs** off-box through this collector — `0060` left that out on purpose.
- Re-tuning the project-wide `100m × 10` value.

## What to build

0. **Owner question first** (Context, 🚩). Put it at plan approval. Everything below is the "yes"
   branch; the "no" branch is step 6.
1. **Confirm the source of truth.** Read the live collector config on the box (read-only) and diff it
   against a render of `setup.sh`'s heredoc, so the repo change matches what the box actually runs.
   Values stay out of the worklog — say "matches" / "differs in key X", never the value.
2. **Decide and document how a sidecar change reaches the box** — the plan's biggest decision, put to
   the owner. Candidate shapes: move the node-exporter + collector block out of `setup.sh` into a
   small idempotent script that a deploy runs; or keep it in `setup.sh` and ship this once as a
   documented owner box step. Whichever is chosen, `setup.sh` and the box must end up agreeing.
3. **Fix the exporter in the repo:** endpoint rendered from the real telemetry-ingest variable (the
   same one the Node SDK already uses successfully), the `Authorization` header in the form the
   ingest actually accepts (check the `Basic ` mismatch in Context), and a TLS setting that verifies
   the certificate — or a written reason why not.
4. **Add json-file rotation** to **both** `docker run` lines (`otel-collector` and `node-exporter`),
   same flags and values as `update.sh:90-92`. Pin both images to exact versions if the plan agrees.
5. **Harness:** add a structural block to `tests/scripts/profile-deploy-hardening.test.sh` in the
   `0060`/`0219` idiom — both sidecar `docker run` lines carry the rotation flags with the project
   values, and the collector heredoc's endpoint is not a loopback address. **RED first** against the
   pre-change file, then green. Keep the `ALL PASS` marker unchanged so
   `tests/scripts/ShellHarnesses.test.ts` needs no edit.
6. **"No" branch instead of 3–5:** remove both sidecars from `setup.sh` (and from wherever step 2
   moved them), a harness assertion that they stay gone, and an owner box step to `docker rm` both.
7. **Owner box step — the existing ~885 MB log.** Recreating the container (either branch) discards
   its old json log with it, so a separate truncate is only needed if the fix is **not** shipped
   soon. The plan must say which: recreate-and-discard as part of the fix, or truncate now as a
   stopgap. Either way **nothing in that log is worth keeping** — it is 1,776-a-day copies of the same
   export error, and `docker logs` cannot read most of it anyway. Record free disk **before and after**.
8. **Docs:** correct `ai-agents/knowledge-base/architecture.md:626-628` and the "does not cover the
   other containers" bullet in `ai-agents/knowledge-base/container-log-retention.md`.

## Verification steps

1. **Owner answer recorded** in the worklog (which branch, date, channel).
2. **Harness:** new block shown **RED** against the pre-change `setup.sh`, then **`ALL PASS`**; full
   `npm test` green; `npm run lint` clean. Paste both harness outputs.
3. **Rotation is live, not just in the file** — on the box,
   `docker inspect --format '{{.Name}} {{json .HostConfig.LogConfig}}'` for both containers shows
   `json-file` with `max-size` and `max-file` set to the project values.
4. **`docker logs --since 10m otel-collector`** returns current lines (proves the log is readable
   again, not stuck at 2026-08-02).
5. **Exports succeed** — 30 minutes after the recreate, the collector's log shows **0** `Exporting
   failed` and **0** `401`/`403`/`Unimplemented`.
6. **`node_*` rows appear** — a read-only ClickHouse `SELECT` on the telemetry box shows `node_*`
   datapoints with timestamps **after** the recreate, from the game box, still arriving 30 minutes
   later. Today's count is 0, so any non-zero steady count is the proof. Record the count, never a
   hostname.
7. **Disk:** free space on the game box before and after step 7, and the container's log file size
   after (should be small and bounded).
8. **"No" branch instead of 3–6:** `docker ps -a` shows neither sidecar; their log files are gone;
   disk before/after recorded; the harness asserts they are not reintroduced.
9. 🔒 **No values in any artifact** — no hostnames, IPs, endpoints, ports-with-hosts or header values.
   Variable names, container names and file:line only.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Why one brief, not a split:** the two halves (exporter fix, log rotation) land in the **same
  `setup.sh` block**, need the **same** container recreate through the **same** not-yet-existing
  delivery path (step 2), and are gated by the **same** owner question — a "no" answer turns both
  into "remove the container", which would throw away a separately shipped rotation task. The one
  piece that could stand alone — truncating today's log — is a single owner box command, not a task;
  it is step 7, and the owner may run it at any time without waiting for the rest.
- **Effort:** ~0.5–1 day including the owner box steps; the delivery-path decision (step 2) is most
  of the uncertainty. **Risk:** Low–Medium — recreating on a `:latest` image is the main way to make
  it worse (Context).
- **Who touches the box:** the coder does read-only checks itself (per the "run it, don't hand it
  over" rule); every write on the box — recreate, truncate, `docker rm` — is an owner step.
- **VPN:** the telemetry box is unreachable with a full-tunnel VPN on — check the route first (see
  memory note `project_telemetry_vpn_access`).
- **Do not invoke the mover skills** — producer-only since ADR-033; route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — the source worklog already follows this; keep it that way.
