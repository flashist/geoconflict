# Container log retention — where the setting lives

**Written:** 2026-09-01, task `0060`.
**Scope:** the **game** container (`geoconflict-<deployment>`) only. The profile and telemetry
boxes are not covered here.

---

## The one thing to remember

**Log retention for the game container is set in `update.sh`, in the `docker run` invocation.**

It is version-controlled, it **overrides** whatever the host's `daemon.json` says, and it ships on
every ordinary `deploy.sh` run. If you need to change how much log history the box keeps, change it
there and redeploy — do not edit a file on the server.

🚨 **The two halves of this task deploy differently. Do not assume one deploy ships both.**

| Change | File | How it reaches the box |
|---|---|---|
| Retention flags | `update.sh` | **`deploy.sh` is enough** — the script is uploaded and run on every deploy. |
| `access_log off;` for `/api/public_lobbies` | `nginx.conf` | ⚠️ **Needs an image rebuild — `build-deploy.sh`.** `nginx.conf` is baked into the image (`Dockerfile:87`), so a plain `deploy.sh` run ships the retention flags and **silently not** the log-volume fix. |

Since the volume fix is the half that actually stops the app's history being evicted, shipping only
`deploy.sh` gets you the smaller win and none of the mechanism.

```
--log-driver json-file
--log-opt max-size=100m
--log-opt max-file=10
```

## Why this note exists

Before `0060`, retention was set **only** in the host's `/etc/docker/daemon.json` — an untracked file
on the box, referenced in the repo by a single passing comment in `nginx.conf` and by nothing else.
Nobody could find it, nobody could review it, and nobody could tell what it was set to without
shelling into production. That invisibility is the actual problem `0060` was filed to fix; the
numbers are secondary.

⚠️ **The previously-effective value is UNVERIFIED.** A figure circulates in the `2026-08-22` incident
record, but it appears in no repo artifact and has never been confirmed with `docker inspect`. Do not
repeat it as fact, and do not use it as a baseline for "we increased retention by N×" claims until
someone has actually read the live config.

## Why the value is provisional

⚠️ **`100m × 10` = a 1 GB ceiling is NOT a sized figure.** It was picked before any measurement, as a
deliberate, owner-ruled decision to make a safe change now rather than stall it behind a production
shell session. Two things must be measured before it can be called right:

1. the real daily log volume, split app-output vs nginx access lines;
2. the disk's actual total size and free space — **also not established anywhere in the repo.**

Both are recorded as unchecked items in `0060`'s worklog. Re-tune the value once they land.

## Why `/api/public_lobbies` is not logged

`nginx.conf`'s `location = /api/public_lobbies` block carries `access_log off;`.

Every client sitting on the main menu polls that endpoint once per second
(`src/client/PublicLobby.ts`), and nginx logs cache hits as well as misses — the 1-second
`proxy_cache` saves the upstream call, not the log line. Since access and error logs were merged into
the container's stdout/stderr stream, those lines are the single largest source in it, and they push
the application's own history out of the bounded ring.

**This is not an oversight to restore** — but be clear about what it costs, because the original
version of this note overstated the fallbacks. **This endpoint now has no server-side request record
of any kind.**

| Claimed fallback | What is actually true |
|---|---|
| `X-Cache-Status` | ⚠️ **Partly.** The header is still returned, so a manual `curl` shows hit/miss. There is **no server-side hit ratio** — the default `combined` format never carried `$upstream_cache_status`, and nothing is logged for this location now. |
| Node-side handler (`src/server/Master.ts`) | ❌ **Not a fallback.** The handler is `res.send(publicLobbiesJsonStr)` — no logging, no counter. No `morgan` or `express-winston` anywhere in `src/server/`. |
| OTEL server metrics | ❌ **Does not exist for this endpoint.** `initWorkerMetrics` is called only from `src/server/Worker.ts`; `Master.ts`, which serves this route, references no metric, and there is no OTEL HTTP/express auto-instrumentation in `package.json`. The master process emits **zero** metrics. |
| `error_log` | ✅ **Genuine.** `error_log /dev/stderr;` at server level is untouched, so nginx-level upstream connect/timeout failures on this route are still recorded. |

**Do not assume this endpoint is covered somewhere else — it is not.** The trade still holds on its
own merits: the response is a precomputed static string, so a per-request log line carries almost no
diagnostic signal while at this volume it evicts everything that does.

## What this does NOT do

- ❌ **It does not make the container log a durable evidence store.** It buys a longer window, not a
  reliable one. Anything that must survive is still lost on eviction or on a container recreate.
- ❌ **It does not ship logs off-box.** That is the real fix and it was explicitly left out of scope.
  An otel-collector already runs on the host, so the pieces exist — the work does not.
- ❌ **It does not cover the other containers on the host.** `node-exporter` and `otel-collector` are
  created by `setup.sh` with no `--log-opt` and still inherit the host default. Worth a follow-up.
- ❌ **Nothing checks this automatically.** There is no CI in this repo. A grep-level assertion lives
  in `tests/scripts/profile-deploy-hardening.test.sh`, but it only catches a regression **if someone
  runs it**.

## Other bounded log destinations in the container

Named for completeness — neither is currently a risk, and both live on the container's ephemeral
writable layer, destroyed on every deploy's `docker rm`.

| Destination | Bound |
|---|---|
| `/var/log/supervisor/supervisord.log` | supervisor defaults (`supervisord.conf` sets `logfile=` but not the size/backup caps) |
| `/var/cache/nginx`, `/var/cache/nginx/api` | `max_size=1g` and `max_size=100m` in `nginx.conf` — caches, not logs, but they share the layer |

**No unbounded log destination exists in the repo today. Do not add one.** The 2026-07-15 disk-full
came from exactly that: an unrotated nginx access-log file, in an image with no `logrotate`.
