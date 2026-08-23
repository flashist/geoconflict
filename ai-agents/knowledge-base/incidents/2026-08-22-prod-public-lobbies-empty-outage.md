# Incident — prod `/api/public_lobbies` served an empty body (2026-08-22)

**Status:** Service recovered by container restart. **Root-cause defects are still unfixed in `main`.**
**Severity:** Total loss of public multiplayer lobbies in production. Dev unaffected.
**Investigated by:** fkit-coder session, owner present, diagnosis-only mandate (no mutations without explicit approval).

---

## 1. One-paragraph summary

A single game worker (index 16) died 1.74 s after being forked during the 2026-08-22 prod deploy.
The master's `cluster.on("exit")` handler could not identify it — because it reads a property that
does not exist on a Node `ChildProcess` — so it logged one opaque line and **returned without
restarting**. That left 19 of 20 workers alive. The master only starts scheduling public games when
**all 20** report ready, so scheduling never started, `publicLobbiesJsonStr` stayed at its initial
empty string, and `/api/public_lobbies` returned `200` with a zero-length body until the container
was restarted.

**The deployed code batch did not cause this.** The defect has shipped since the repository's first
commit.

---

## 2. Impact and timeline (all times UTC, 2026-08-22)

| Time | Event |
|---|---|
| 08:08:44 | Prod image built (`0.0.139`) |
| 08:12:26 | Container started; supervisord up |
| 08:12:32.298 | Master process running (PID 27) |
| 08:12:32.307–.801 | 20 workers forked, ~20 ms apart |
| 08:12:32.675 | `Started worker 16 (PID: 144)` |
| 08:12:32.826 | Master HTTP server listening on :3000 |
| **08:12:34.415** | **`worker crashed could not find id`** — worker 16 dies, +1.74 s. Never restarted. |
| 08:12:34 → restart | 19/20 ready. Gate never closes. Lobbies endpoint empty. |
| ~11:5x | Container restarted by owner. 20/20 ready, gate closed, lobbies restored. |

Player-facing effect: the lobby list was empty for every user on the platform for the duration.

---

## 3. Symptom, as observed

```
GET https://geoconflict.ru/api/public_lobbies
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 0
ETag: W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"
X-Cache-Status: HIT   (and MISS, and EXPIRED — all empty)
```

Two details that carried real diagnostic weight:

- **The ETag proves the body is the empty string.** `0-` is the body length, and
  `2jmj7l5rSw0yVb/vlWAYkK/YBwk` is base64(SHA-1(`""`)) — verified locally. It is not a coincidence
  or a cache artifact.
- **The wall of `304 0` responses in the access log was a downstream effect, not a cause.** Browsers
  revalidated against that empty-string ETag and were told "unchanged".

---

## 4. Root-cause chain

```
worker 16 dies 1.74 s after fork (cause unknown — see §7)
  → cluster "exit" fires
  → Master.ts reads worker.process.env.WORKER_ID
  → ChildProcess has NO .env property → always undefined
  → `if (!workerId)` → logs "worker crashed could not find id", RETURNS, no restart
  → 19 workers alive, readyWorkers.size stalls at 19
  → Master.ts gate requires readyWorkers.size === config.numWorkers() (20)
  → gate never closes → fetchLobbies() setInterval never installed
  → publicLobbiesJsonStr never assigned, stays "" (its initial value)
  → res.send("") → 200, Content-Length 0, empty-string ETag
  → client PublicLobby.ts calls response.json() on an empty body → throws → no lobbies rendered
```

---

## 5. Defects found (all in `src/server/Master.ts` unless noted)

| # | Defect | Location | Confidence |
|---|---|---|---|
| 1 | `worker.process.env` does not exist on a `ChildProcess`; `workerId` is **always** `undefined`, so **no worker is ever restarted after a crash** | `Master.ts:134-137` | **Proven** — source, local Node 24 repro, and prod log |
| 2 | `if (!workerId)` treats worker **0** as missing (`0` is falsy). Currently masked by #1; becomes live the moment #1 is fixed | `Master.ts:135` | **Proven by inspection** |
| 3 | Scheduling gate requires `readyWorkers.size === numWorkers()` — no quorum, no timeout, no alarm. One lost worker out of twenty = total outage | `Master.ts:110` | **Proven** — caused this outage |
| 4 | Gate re-satisfied after a worker restart installs a **second** `setInterval` (interval leak) | `Master.ts:112-127` | Code-evident, latent |
| 5 | `publicLobbiesJsonStr` initialised to `""`; endpoint can serve a body the client cannot parse | `Master.ts:78`, `src/client/PublicLobby.ts:138` | Code-evident; produced the client-side symptom |
| 6 | The failure branch of the exit handler **discards `code` and `signal`**, which are in scope. The one piece of instrumentation that would have explained the death is thrown away | `Master.ts:136` | **Proven** — this is why §7 is unresolved |

Defect #1 dates to `feea527` ("First commit of the fork"). `git diff` over the deployed batch shows
`Master.ts` changed only in `/api/env` and the feedback handler — **the batch is not implicated.**

### 5.1 Local proof of defect #1

Run on Node v24.13.0 (prod runs `node:24-slim`):

```js
import cluster from "cluster";
if (cluster.isPrimary) {
  cluster.fork({ WORKER_ID: 7 });
  cluster.on("exit", (worker) => {
    console.log("has .env?", "env" in worker.process);            // false
    console.log("value:", worker.process?.env?.WORKER_ID);        // undefined
    console.log("`if (!id)` fires:", !worker.process?.env?.WORKER_ID); // true
  });
} else { process.exit(1); }
```

---

## 6. Hypotheses tested and refuted

Recorded so nobody re-runs them.

| Hypothesis | Verdict | Evidence |
|---|---|---|
| nginx caching an empty response | **Refuted** | Cache-busted `MISS` was equally empty; all three layers (host nginx, container nginx, node :3000) returned `len=0` |
| The deployed code batch (MapPlaylist `startGold`, Schemas, GameServer, GameManager) | **Refuted** | `git diff 0f48d19..bcdf9af -- src` is **empty**. Dev runs byte-identical source and serves lobbies correctly, including `"startGold":0` in its emitted config |
| Partially-pushed / corrupt image (registry EOF on first push) | **Not supported** | `/api/version` reports the expected `0.0.139`; source identical to a working dev. Digest never compared against the push output — see §9 |
| Changed URLs / HTTPS / SSH settings | **Refuted** | Batch changed no routing. `nginx.conf` changed only to send logs to stdout. `Worker.ts` performs **no `await` and no network call** between the start of `startWorker()` and `server.listen()`, so no URL can prevent a port bind. `public_lobbies` is fetched relative, same-origin |
| Disk full (repeat of the 2026-07-15 32 GB log incident) | **Refuted** | `/` at 22 % used, `ENOSPC` count 0 |
| Worker crash-loop | **Refuted** | `RestartCount=0`, `died with code` count 0, exactly one exit event |
| `EADDRINUSE` swallowed by the missing `server.on("error")` | **Refuted for this incident** | No `EADDRINUSE` in logs; worker 16 never reached `listen` |
| stdout pipe backpressure from nginx access logs (`pipe_write` block) | **Refuted** | No node process blocked on a pipe; all 19 in ordinary idle `S` with healthy CPU time |
| OOM kill | **Refuted** | `dmesg` shows no OOM; `MemLimit=0` (no container limit); host 16 GB with 8.6 GB available and swap untouched; container at 41 % with all 20 workers healthy |
| Process/thread ceiling (`EAGAIN` on fork) | **Refuted** | `PidsLimit=<nil>`; and the process ran for 1.74 s, so the fork succeeded |

---

## 7. What is still unknown — and why it cannot be recovered

**Why worker 16 died is undetermined, and the existing logs cannot answer it.**

The process was forked successfully, ran for 1.74 s, produced **zero output** (it never reached
`Worker.ts:42`, the first log statement of `startWorker`), and died without a kernel kill.
That signature is consistent with a native-level abort (SIGSEGV/SIGABRT) or an abrupt exit inside
the `ts-node`/ESM loader while twenty processes compiled TypeScript concurrently. A JavaScript-level
throw or a V8 heap OOM would have printed a stack trace or `FATAL ERROR`; neither appears.

**Defect #6 is precisely why this is unrecoverable:** `code` and `signal` were available in the exit
callback and were not logged. Fixing #6 is therefore a *requirement*, not a nicety — without it a
recurrence is equally undiagnosable.

### Contributing environmental factor (not a defect, worth knowing)

Prod runs the server as **unbundled TypeScript through `ts-node/esm`**. The `Dockerfile` webpack-builds
the client but ships raw `src/` for the server, so **21 processes each transpile the full server tree
at every container start** (~30-40 s to full readiness, measured). Dev runs the identical source with
`numWorkers(): 2` (`DevConfig.ts:40`) versus prod's `20` (`ProdConfig.ts:6`) — ten times the exposure
to any per-worker startup failure, and ten times the concurrent compile load. This is the most
plausible reason the failure is prod-only, but it is **not proven**.

---

## 8. Recovery performed

`docker restart geoconflict-prod`. Result on the new boot: 20/20 ready, 20/20 listening,
`All workers ready` present once, zero lost workers, endpoint serving a real lobby
(`Content-Length: 398`). Recovery succeeded on the first attempt, which suggests the worker death is
**intermittent, not systematic**.

⚠️ **A restart is not a fix.** Every deploy and every restart re-runs the same 20-worker startup, and
crash recovery remains disarmed in production right now.

**Verification note for future incidents:** `docker logs` is **cumulative across restarts**. Counting
`grep -c` over the whole log after a restart mixes boots. Scope to the current boot with
`docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")"`, or keep only the
text after the last `supervisord started with pid` banner.

---

## 9. Loose ends and out-of-scope findings

- **Image digest never compared.** Running image is
  `flashist/geoconflict-prod@sha256:aeb9a70c0e0005283676ef09856207b7765fdf7e4f5f377b55fe1bd49ef3a012`.
  Comparing it against the push output would fully close the partial-push suspicion. Not done.
- **Prod feedback delivery is broken.** `[feedback] telegram delivery failed: TypeError: fetch failed`,
  twice in one boot. **Corrected 2026-08-23:** this section first cited `Master.ts:237` and guessed
  "likely needs `TELEGRAM_PROXY_URL`". Both were wrong. The line is now `Master.ts:328` (task `0055`
  added ~28 lines above it), and the proxy is **already** read (`Master.ts:217`), wired (`:218`), used
  as `dispatcher` (`:319`) **and forwarded by the deploy** (`deploy.sh:308`). So this is an open
  investigation, not a known fix — likeliest causes are the var being forwarded but empty, the proxy
  being unreachable, or Telegram being network-blocked from the host. Tracked as task `0061`.
- **Log retention is very short.** Docker json-file `max-file:3 × max-size:50m` = 150 MB total, and
  nginx access logs now share that stream (changed this batch, for good reasons — the prior unrotated
  file grew to 32 GB). This nearly cost us the investigation window.
- **`PROFILE_INTERNAL_TOKEN` is not forwarded by `deploy.sh`.** `.env.prod` defines it; the remote env
  heredoc passes only `PROFILE_API_URL` (`deploy.sh:291`). Not related to this outage.
  **Escalated 2026-08-23 — this is far worse than "fail-soft" implied.** `ProfileApiClient.isConfigured()`
  (`src/server/ProfileApiClient.ts:131-133`) requires **both** the URL and the token to be non-empty, so
  with the token absent **every** profile call — `upsertProfile()` and `creditMatch()` — is a no-op in
  production. The miss is logged at `debug` (`:140`), so it is invisible in prod logs. Independently,
  `src/profile-server/InternalAuth.ts:26` fails **closed** on an empty token, rejecting every request
  anyway. Net effect: **no profile row is ever created and no XP is ever credited in production.**
  That blocks task `0017` (earned citizenship fires "as a side effect of `creditMatchXp()`",
  `0017/brief.md:26`) and task `0018` (paid citizenship needs a profile row). Tracked as task `0062`.
- **Prod `/api/env` advertises `http` and a raw IP** for `publicProtocol`, `apiBaseUrl`, and
  `jwtIssuer`, while the site is served over `https` on its domain. Any absolute URL built from those
  from an https page is mixed content. `public_lobbies` is unaffected (fetched relative). Whether this
  is new could not be determined — `.env*` is gitignored.
- **No tests exist for `Master.ts` or `Worker.ts`.** All 30+ files in `tests/` cover game logic.

---

## 10. Draft fix plan (NOT approved, NOT implemented)

**Scope:** `src/server/Master.ts` plus new tests. No client, infra, or Dockerfile changes.

**Step 1 — Restore crash recovery and its diagnostics (defects #1, #2, #6).**
Track worker indices in a `Map<number /* cluster worker.id */, number /* WORKER_ID */>` populated at
fork time and on restart. In the exit handler, look the index up there; test `=== undefined` rather
than falsiness so worker 0 survives; remove the dead worker from `readyWorkers`; and **log `code`,
`signal`, `worker.id` and `pid` on both branches**.

**Step 2 — Make the gate survivable (defects #3, #4).**
Replace `size === numWorkers()` with quorum-or-deadline, guarded by a `schedulingStarted` flag so the
interval installs exactly once. Log at `error` level which worker indices never reported when
scheduling starts degraded.

**Step 3 — Never serve an unparseable body (defect #5).**
`let publicLobbiesJsonStr = JSON.stringify({ lobbies: [] });`

**Step 4 — Tests.** Greenfield for this file. The gate logic currently lives inline inside
`startMaster()`, which forks real processes and cannot be unit-tested; extracting readiness tracking
into a small pure unit (`markReady`, `markDead`, `missing()`, `shouldStart(quorum)`) is required to
test it, and enlarges the diff beyond a minimal patch. Cover: worker 0 is not dropped; a dead worker
is removed from ready and re-forked; the interval installs exactly once across repeated ready events;
quorum and deadline both trigger; missing indices are reported.

### Risk that must be handled in the same change

**Fixing #1 enables worker restarts for the first time in the project's history.** Defect #1 has been
suppressing every restart since the first commit, which also suppressed any restart loop. Since we do
not know why worker 16 died, a worker that crashes *repeatedly* would now be respawned forever. The
change **must** include a restart cap with backoff, or it trades a silent outage for a fork loop.

### Decisions required from the owner before implementation

1. **Quorum threshold and deadline** — how many of 20 must report, and how long to wait before
   scheduling starts anyway. An availability tradeoff, not a technical one.
2. **Restart cap and backoff policy** — how many restarts per worker in what window before giving up
   and alarming.
3. **Worker routing (architecture, likely out of scope).** `schedulePublicGame` selects a worker via
   `simpleHash(gameID) % numWorkers()` (`DefaultConfig.ts:297`), so it can route a game to a dead or
   unready worker — roughly 1-in-20 scheduled games would fail while one worker is down, even with a
   quorum in place. Changing that alters game-to-worker distribution and should go to the architect
   rather than be folded into this fix.

### Suggested follow-up tasks (separate from the fix)

- Precompile/bundle the server at image-build time instead of running `ts-node/esm` in production.
- Add a `server.on("error")` handler in `Worker.ts` (currently a bind failure would surface as an
  `uncaughtException` that is logged and **not** exited, leaving a silently hung worker).
- Fix prod feedback/Telegram delivery.
- Revisit log retention now that nginx access logs share the container stream.

---

## 11. Evidence appendix — commands that produced the findings

All read-only. `CID=$(docker ps -q --filter name=geoconflict-prod)`

```bash
# Boot-scoped counts (docker logs is cumulative across restarts!)
docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")" "$CID" 2>&1 \
  | grep -c 'signaled ready state'
docker logs "$CID" 2>&1 | grep -c 'running on http://localhost'
docker logs "$CID" 2>&1 | grep -c 'All workers ready'
docker logs "$CID" 2>&1 | grep -c 'worker crashed could not find id'
docker logs "$CID" 2>&1 | grep -c 'Started worker'

# Split cache from origin
curl -s -o /dev/null -w '%{http_code} len=%{size_download}\n' 'http://127.0.0.1:3000/api/public_lobbies?cb=1'
docker exec "$CID" curl -s -o /dev/null -w '%{http_code} len=%{size_download}\n' 'http://127.0.0.1/api/public_lobbies?cb=2'
docker exec "$CID" curl -s -o /dev/null -w '%{http_code} len=%{size_download}\n' 'http://127.0.0.1:3000/api/public_lobbies?cb=3'

# Live process census (ps/procps is absent from node:24-slim)
docker exec "$CID" sh -c 'n=0; for p in /proc/[0-9]*; do tr -d "\0" < $p/cmdline 2>/dev/null | grep -q Server.ts && n=$((n+1)); done; echo "node_procs=$n"'
# healthy = 22: 20 workers + master + npm sh wrapper (+1 for your own exec shell)

# Resource ceilings
dmesg -T | grep -iE 'killed process|out of memory|oom'
docker inspect --format 'MemLimit={{.HostConfig.Memory}} PidsLimit={{.HostConfig.PidsLimit}}' "$CID"
free -m

# Preserve a boot's log, filtered of nginx noise and PII (persistentID is the JWT `sub`)
docker logs "$CID" 2>&1 | awk '/supervisord started with pid/{n++} n==1' \
  | grep -vE '^172\.|^[0-9/]+ [0-9:]+ \[|persistentID' > /root/outage-2026-08-22.log
```

⚠️ Container logs contain `persistentID` values, which the codebase documents as the JWT `sub` and
PII (`GameServer.ts:188,217,236,397,457,501`). Filter before sharing; delete saved copies afterwards.
