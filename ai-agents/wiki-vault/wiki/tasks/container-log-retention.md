# Container Log Retention After the nginx Stream Merge

**Source**: `ai-agents/tasks/done/0060-container-log-retention-after-nginx-stream-merge/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — §9 follow-up of the 2026-08-22 outage record; last item on the config-track execution order

> ✅ **Closed 2026-09-01 by a spawned producer — agent-closed, not owner-verified. No owner was present; no human has checked this work.**
>
> 🚨 **NOTHING IS VERIFIED IN PRODUCTION. No agent touched any server.** Seven **Deferred Live Tail** items are unchecked, every one gated on the owner having a production shell. **This is fixed IN THE REPO, pending a deploy — do not read it as "log retention is fixed in production."**
>
> **Note of record:** `ai-agents/knowledge-base/container-log-retention.md`.

## Goal

Production's game-container logs ran under a Docker `json-file` driver with a small total budget. In the same 2026-08-22 deploy batch, **nginx access logs were redirected into that same stdout stream** — for good reasons: the previous unrotated nginx log had grown to **32 GB** and caused a disk-full incident on 2026-07-15.

The fix was right; the consequence was not sized. Access-log volume then shared the budget with application output, so the application's own history was evicted far faster than before — and the incident record states plainly that it **nearly cost the 2026-08-22 investigation window**.

It was pulled into the sprint specifically because the outage track was paused at the time, leaving the container log as the primary — in places the only — evidence trail for the next incident.

## Key Changes

Two edits, in two different files, which is the single most important fact on this page:

| File | Change |
|---|---|
| `update.sh` (lines 90–92) | The `docker run` invocation now sets `--log-driver json-file`, `--log-opt max-size=100m`, `--log-opt max-file=10` |
| `nginx.conf` | `access_log off;` on the `location = /api/public_lobbies` block |

**🔧 The brief's premise was REFUTED at build, and the correction is what makes the setting findable.** The brief warned that *"the log configuration is NOT in this repository"* and that this might be a server-side change with no commit. **That is false.** Retention now lives in version control at `update.sh:90-92`, **overrides** whatever the host's `daemon.json` says, and ships on every ordinary deploy because `update.sh` already recreates the container. **It shipped as an ordinary two-file commit.**

Before `0060`, retention was set **only** in the host's untracked `/etc/docker/daemon.json` — referenced in the repo by a single passing comment and nothing else. Nobody could find it, review it, or read its value without shelling into production. **That invisibility is the actual problem the task fixed; the numbers are secondary.**

## Outcome

### 🚢 The two halves deploy differently — do not assume one deploy ships both

| Change | How it reaches the box |
|---|---|
| Retention flags in `update.sh` | **A plain `deploy.sh` run is enough** — the script is uploaded and run on every deploy |
| `access_log off;` in `nginx.conf` | ⚠️ **Needs an image rebuild — `build-deploy.sh`.** `nginx.conf` is baked into the image, so a plain `deploy.sh` ships the retention flags and **silently not** the log-volume fix |

Since the volume fix is the half that actually stops the application's history being evicted, shipping only `deploy.sh` buys the smaller win and none of the mechanism.

### ⚠️ The value is provisional, and two baselines are unverified

- **`100m × 10` = a 1 GB ceiling is NOT a sized figure.** It was picked before any measurement, as a deliberate owner-ruled decision to make a safe change now rather than stall it behind a production shell session. Two things must be measured before it can be called right: **the real daily log volume** split app-output vs nginx access lines, and **the disk's actual size and free space** — neither established anywhere in the repo.
- ⚠️ **The previously-effective retention value is UNVERIFIED.** A figure circulates in the 2026-08-22 incident record, but it appears in no repo artifact and has never been confirmed with `docker inspect`. **Do not repeat it as fact**, and do not use it as the baseline for a "retention increased N×" claim.

### Why `/api/public_lobbies` stopped being logged, and what that actually costs

Every client on the main menu polls that endpoint once per second (`src/client/PublicLobby.ts`), and nginx logs cache hits as well as misses — the 1-second `proxy_cache` saves the upstream call, not the log line. Since the streams were merged those lines are the single largest source in the container log.

**This is not an oversight to restore — but the fallbacks were overstated in the note's first version and the corrected picture is: this endpoint now has no server-side request record of any kind.**

| Claimed fallback | What is actually true |
|---|---|
| `X-Cache-Status` | ⚠️ **Partly.** The header is still returned, so a manual `curl` shows hit/miss. There is **no server-side hit ratio** — the `combined` format never carried the cache-status variable, and nothing is logged for this location now |
| Node-side handler in `src/server/Master.ts` | ❌ **Not a fallback.** The handler just sends a precomputed string — no logging, no counter, and no `morgan`/`express-winston` anywhere in `src/server/` |
| OTEL server metrics | ❌ **Does not exist for this endpoint.** Worker metrics are initialized only from `src/server/Worker.ts`; the master process, which serves this route, emits **zero** metrics, and there is no HTTP/express auto-instrumentation |
| `error_log` | ✅ **Genuine.** `error_log /dev/stderr;` at server level is untouched, so nginx-level upstream connect/timeout failures on this route are still recorded |

The trade still holds on its own merits — the response is a precomputed static string, so a per-request log line carries almost no diagnostic signal while at this volume it evicts everything that does.

### What this deliberately does NOT do

- ❌ **It does not make the container log a durable evidence store.** It buys a longer window, not a reliable one; anything that must survive is still lost on eviction or a container recreate.
- ❌ **It does not ship logs off-box.** That is the real fix and was explicitly out of scope. An otel-collector already runs on the host, so the pieces exist — the work does not.
- ❌ **It does not cover the other containers on the host.** `node-exporter` and `otel-collector` are created by `setup.sh` with no log options and still inherit the host default. Worth a follow-up.
- ❌ **Nothing checks this automatically.** There is no CI in this repository. A grep-level assertion lives in `tests/scripts/profile-deploy-hardening.test.sh`, but it only catches a regression **if someone runs it** — which is the gap task `0201` was filed for.

**No unbounded log destination exists in the repo today, and none may be added.** The 2026-07-15 disk-full came from exactly that: an unrotated nginx access-log file in an image with no `logrotate`.

### ✅ Review finding F6 — confirmed after the close (owner ruling 2026-09-02): KEEP THE TABLE

**F6 shipped without an owner disposition** — the relay driving this task's close ruled F1–F5, F7 and F8 and **skipped F6**. The coder verified it independently, found it held, applied it as an obvious winner (documentation accuracy, same file and class as F1) and **flagged it rather than absorbing it silently**. The item is the **deploy-path table** in `ai-agents/knowledge-base/container-log-retention.md`, which records that `deploy.sh` ships this task's **retention flags** but **not** the `nginx.conf` log-volume fix — that half is baked into the image at `Dockerfile:87` and needs `build-deploy.sh`. That is the same two-halves-deploy-differently hazard recorded above.

**The owner confirmed it; the table stays.** The reverse option — delete the one table — was live and was **not** taken. This closes the only finding on this task that carried no disposition at close.

⚠️ **It changes NO status and clears NO Deferred Live Tail item. The seven live-tail items stay unchecked and nothing here is verified in production.**

## Related

- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the outage record whose §9 filed this task, and the investigation window this budget nearly cost
- [[decisions/config-parity-failure-class]] — the config track this is the last item on (`0063` → `0062` → `0195` → `0064` → `0060`)
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, the item immediately before this on that order
- [[tasks/master-lobbies-worker-exit-diagnostics]] — task `0055`, whose exit diagnostics are only useful if the logs holding them survive
- [[systems/telemetry]] — the observability stack, and the off-box shipping this task deliberately did not do
- [[systems/configuration]] — deploy-script and container configuration
- [[decisions/sprint-4]] — the sprint board carrying this task
- [[decisions/sprint-backlog]] — where the follow-up `0201` (nothing runs the shell harnesses) is tracked
