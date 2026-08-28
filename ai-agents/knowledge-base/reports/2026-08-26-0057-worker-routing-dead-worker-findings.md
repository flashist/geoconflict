# 0057 — Public-game routing to a dead or unready worker: findings

**Task:** `ai-agents/tasks/done/0057-investigate-worker-routing-to-dead-or-unready-workers/brief.md`
**Author:** fkit-architect (spawned build unit, driver `fkit-sprint-ship-loop`), 2026-08-26.
**Plan:** `plan.md` in the task folder (owner-approved 2026-08-26). Executed as written; deviations
are in the worklog's decision log.
**Incident referenced, not modified:**
`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`.
**Code state read:** branch `dev` at `282655c`. No routing code was changed.

Evidence forms used: `path:line` citations against `dev`, two local dev reproductions (2 workers,
no nginx — see §2.4 and the Appendix), one offline hash-distribution count. Anything reasoned but
not observed is marked **(reasoned, not observed)**.

---

## 0. Summary, recommendation, tradeoff

**What happens (Q1).** There are two distinct failure shapes, and they differ by an order of
magnitude in cost.

- **Dead index (port refuses — the case the brief asks about).** Self-healing and cheap. The
  create call fails immediately (`fetch failed` / `ECONNREFUSED`), the master logs 2 error lines,
  the next 100 ms tick logs a 3rd line and drops the ID, and the retry picks a **fresh random ID**
  so it lands elsewhere with probability 18/20. Measured locally: **~100 ms and 3 error lines per
  miss**, no hang, no orphan, and **rarely, briefly player-visible**: the miss tick rewrites the
  public-lobbies JSON to `lobbies: []` (`Master.ts:500-502`), `Master.ts:200-202` serves that string
  as-is, and `nginx.conf:108` caches any 200 for 1 s — so a client poll that lands inside the
  ~100 ms window (p ≈ 0.1 per miss) pins an empty body for **all** clients for up to 1 s, and misses
  can chain (run 1: 2 of 90 samples empty; the reviewer's rerun saw 6 consecutive ≈ 600 ms). At 100
  public games/hour that is roughly **one lobby-card blink per hour, ≤ 1 s long**.
- **Unready / wedged index (port accepts but never answers).** Not self-healing and noisy. The
  create call **hangs with no timeout** (`Master.ts:516-526`); the lobby poll for that ID has a 5 s
  abort but **no in-flight guard**, so every 100 ms tick stacks another request on the same stuck
  ID. Measured locally: **50 `Error fetching game` lines per stuck ID** (~10/s), the public-lobbies
  body **flapped to empty in 25 of 120 samples (~21%)** because late-aborting ticks overwrite the
  good list, a replacement lobby delayed ~5 s whenever a draw lands on the wedged index (every other
  draw in 2-worker dev; p = 1/20 per draw at 20 workers, so most prod replacements stay ~100 ms), and
  — when the worker resumed — **2 orphan public games** the master had already forgotten plus
  **3 `Too Many Requests` create failures** because the queued polls tripped the worker's own 20 req/s
  limiter (`Worker.ts:109-114`). The per-stuck-ID costs are worker-count-independent. This shape is reachable in
  prod because Node's cluster primary owns the listening sockets: a worker whose event loop is
  blocked still has its connections *accepted* (observed: the primary PID held `*:3001`/`*:3002`
  while the worker was stopped).

**Frequency at 18/20 (Q4).** For the dead shape, the expected extra cost per scheduled game is
**≈ 0.11 attempts ≈ 11 ms and ≈ 0.33 error lines**. At 100 public games/hour that is ~11 misses and
~33 log lines per hour. **The findings support keeping 18/20.** The wedged shape is **not a function
of the quorum at all** — `readyWorkers` tracks process liveness, never responsiveness — so no quorum
value changes it.

**What the hash buys (Q2).** It is a **shared placement contract**, not a load-balancing choice: the
client computes the same index with no round-trip (`Transport.ts:317-320` plus eight more lines in four files, listed in §3),
the worker rejects mismatches (`Worker.ts:149-155`, `:341-347`), nginx maps the path to the port
(`nginx.conf:301-347`), and there is **no game→worker registry anywhere** — only `publicLobbyIDs`
(`Master.ts:89`). The codebase already treats the index as fixed and moves the *ID* instead
(`Worker.ts:545-556`). Distribution is uniform to within ±1.2% over 20 indices (offline count, §3).

**Recommendation — one option.** Implement **(v): rejection-sample the game ID onto a ready index
at `Master.ts:509`, plus a bounded timeout on the create call** — master-only, the client/worker/nginx
contract stays intact, no ID is ever placed where the master already knows nothing listens. Sequence
it **after `0056`** as its own brief (it needs `0056` Step 1's maintained ready set) and keep
**18/20** as ruled.

**Main tradeoff.** It only excludes indices the master *knows* are dead. `readyWorkers` is
liveness, not health, so a wedged-but-alive worker is still eligible; the timeout bounds that case
to one failed attempt per ~5 s instead of an unbounded hang, but does not remove it. Private lobbies
(client-side index) are untouched by any master-only option (§7).

**Two findings outside the brief's question that the owner should see** (§7, §8): the
`fetchLobbies` overlap (50× log amplification, lobby-list flapping, post-recovery 429 self-limiting)
is a standalone defect independent of routing; and the `0056` brief carries a stale "0055 not
pushed" claim.

---

## 1. Corrections to the brief's citations

| Brief says | Actual on `dev` (`282655c`) |
|---|---|
| Hash at `DefaultConfig.ts:297` | `workerIndex()` is `src/core/configuration/DefaultConfig.ts:296-298`; `schedulePublicGame` (`src/server/Master.ts:508-535`) reaches it via `workerPath()` `:512` and `workerPort()` `:517` |
| Gate at `Master.ts:110` | `Master.ts:119` (`0055` added lines above it) |
| Exit handler `Master.ts:134-137` (0056 brief) | `Master.ts:142-173`; the `env` read is now `:143` |
| `0056` brief: `0055` "not pushed, not deployed" | **Stale.** `git log` shows PR #133 (`7410bfb`) merged `fix/0055-…` into `dev`; `dev`'s `Master.ts:87` carries the `0055` body fix. **Pushed: yes. Deployed to prod: unknown** — not checked this turn (no prod access from this unit). Relay to the producer; the `0056` brief is not edited here. |

---

## 2. Q1 — What actually happens (trace + reproduction)

### 2.1 Master side, dead index (`src/server/Master.ts`)

1. `:509-510` — `generateID()` then `publicLobbyIDs.add(gameID)` **before** the create call. The
   set holds the ID even if create fails.
2. `:516-526` — `POST http://localhost:<3001+index>/api/create_game/<id>` (`DefaultConfig.ts:302-307`)
   with **no timeout and no abort signal**. Dead/unbound port → undici `TypeError: fetch failed`
   (cause `ECONNREFUSED`). A bound-but-wrong listener (e.g. a port squatter) → `!response.ok` →
   throw `:528-530` — **(reasoned, not observed;** same cadence as the dead path by inspection, not
   reproduced — worklog decision 3).
3. `:531-534` — logs `Failed to schedule public game on worker w<N>: …`, rethrows.
   `:123-125` — logs `Error scheduling public game: …`. **Nothing removes the ID here.**
4. Next tick (`setInterval` 100 ms, `:128-136`): `fetchLobbies()` `:433-505` fetches
   `/api/game/<id>` on the same dead port with a 5 s abort `:437-438`; the catch `:448-453` logs
   `Error fetching game <id>: …` **and deletes the ID**; nulls filtered `:462-464`; JSON rewritten
   `:500-502` (empty if that was the only lobby); returns `publicLobbyIDs.size` `:504` → `0` →
   `scheduleLobbies()` `:131-133` → **new random ID → new hash → different index with p = 18/20.**

So the dead case **fails loudly (3 error lines), does not hang, does not half-succeed, and leaves
no orphan**; the recovery is the ordinary loop, not a retry path anyone wrote.

### 2.2 Master side, unready / wedged index

Same entry, different mechanics:

- The create call at `:516` **hangs** — no abort signal. undici 8.0.2's default headers timeout
  (300 s per its documentation) was **not observed to fire** in the 40 s reproduction window; treat
  "eventually errors after ~5 min" as **(reasoned, not observed)**.
- `fetchLobbies` is invoked by `setInterval` every 100 ms **with no in-flight guard** (`:128-136`).
  Each tick iterates the live `publicLobbyIDs` `:436` and opens a *new* request for the still-present
  stuck ID. The first aborts at 5 s and deletes the ID; the ~49 others abort in the following 100 ms
  steps, each logging its own `Error fetching game` line.
- Each late-aborting tick then executes `:500-502` with **its own** (empty) result list and
  overwrites `publicLobbiesJsonStr` — so the public body **flaps between the real lobby and
  `lobbies: []`** for ~5 s after every stuck ID. Observed in run 2 (§2.4).
- `publicLobbyIDs.size` is read live at `:504`, so the late ticks do **not** double-schedule
  (observed: never more than one lobby in any sample). The cost is log volume and flapping, not
  duplicates.
- If the wedged worker later resumes, it drains the queue: the create requests succeed (worker
  returns 200) but the master has already deleted those IDs → **orphan public games** on the worker
  (§2.4 run 2: 2 orphans). The drained poll burst also exceeds the worker's global limiter
  `Worker.ts:109-114` (20 req/s per IP; the master is one IP), so **subsequent creates get 429**
  → `Failed to schedule public game … Too Many Requests` (observed ×3).

**Why a wedged worker still accepts connections.** `Worker.ts:454-455` calls `server.listen` inside
a cluster worker; Node's cluster primary owns the socket and hands accepted connections to workers.
Observed: `lsof` showed the **primary** PID holding `*:3001`/`*:3002` in both runs, and 108
`ESTABLISHED` connections to `:3002` while worker 1 was `SIGSTOP`ped. A blocked event loop (long
sync work, GC storm, infinite loop) therefore presents as *hang*, not *refuse* — and it is
**invisible to `readyWorkers`**, which only ever changes on `WORKER_READY` (`Master.ts:114`) and,
after `0056`, on `exit`.

### 2.3 Worker and nginx side

- `Worker.ts:148-155` — `create_game` rejects a game whose hash index ≠ this worker (400). `:341-347`
  — a WS `join` for a mismatched game is **silently ignored** (socket left open, no message).
  `:91-96` — path prefix `/w<N>/` mismatch → 404. Any option that places a game off its hash index
  must change all three.
- `nginx.conf:301-347` — `/w<N>/…` → `127.0.0.1:300(N+1)`; `:3-44` the same map for `$port`. Only
  paths the client builds go through it; the master calls workers directly on `localhost`.
- Orphan games: follow the ordinary unjoined-public-lobby lifecycle — after `gameCreationRate()`
  the phase becomes `Active` (`GameServer.ts:886-901`), the worker prestarts/starts it
  (`GameManager.ts:116-127`), it relays turns to zero clients, ends at lifetime + 30 s
  (`GameServer.ts:896-899`), logs `game not started`/`no clients joined, not archiving`
  (`:799-805`). Cost: one GameServer for ~150 s in prod. Never listed, never joinable.

### 2.4 Player side

- **Routing miss on a new game (the residual):** `PublicLobby.ts:68-71` polls `/api/public_lobbies`
  every 1 s; nginx caches it 1 s (`nginx.conf:102-118`); `:160` renders nothing when the list is
  empty. A 100–300 ms miss window is shorter than both intervals, but not hidden by them: the
  master serves the rewritten `lobbies: []` string as-is (`Master.ts:200-202`) and nginx caches any
  200 for 1 s (`nginx.conf:108`), so a poll landing in the window (p ≈ 0.1 per miss) pins an empty
  body for every client for up to 1 s — **rarely visible, and ≤ 1 s when it is** (run 1: 2 of 90
  samples empty; a chained run of 6 misses ≈ 600 ms was seen in the reviewer's rerun). In the wedged
  shape the ~21% flapping is visible as the lobby card blinking out for a poll or two.
- **Worker dies while hosting a lobby/game (not a routing problem, but the brief asks "what the
  player sees"):** the lobby is dropped on the next tick (observed: 32 ms after `SIGKILL`). Joined
  players' sockets close with a non-1000 code → `Transport.ts:361-374` → `reconnect()` →
  `connectRemote` recomputes the **same** `workerPath` `:317-320` → nginx upstream refused →
  **(reasoned, not observed — dev has no nginx)** the WS upgrade fails with a 502 and the browser
  closes with 1006, which is `!== 1000` and `!== 1002`, so the client **loops on reconnect** and
  never fires `reconnect-failed` (`ReconnectModal.ts:196-209` reacts to 1002 only). The 5 s watchdog
  `ClientGameRunner.ts:1029-1034` adds more reconnects. This is `0056`'s domain (crash recovery),
  not `0057`'s; noted so the two are not confused.

### 2.5 Reproduction log (dev, 2 workers, lobby lifetime 5 s per `DevConfig.ts:21`)

Ports 3000–3002 verified free before boot (memory note: Remotion squatters). Commands in the
Appendix. Times are master-log UTC.

**Run 1 — `kill -9` worker 1** (crash recovery disarmed on `dev`, so it stays dead; the `0055`
exit-handler fields were present: `clusterId:2, pid, code:null, signal:"SIGKILL"`).

```
11:29:53.745 error worker crashed could not find id            ← exit handler, no restart
11:29:53.777 error Error fetching game y85LAPfP: fetch failed   ← lobby on dead worker dropped, 32 ms
11:29:58.613 error Failed to schedule public game on worker w1  ← miss #1 (fresh ID hashed to w1)
11:29:58.613 error Error scheduling public game
11:29:58.712 error Error fetching game ALGsmuT4                  ← next tick: ID removed
11:29:58.713 error Failed to schedule public game on worker w1  ← miss #2
11:29:58.713 error Error scheduling public game
11:29:58.814 error Error fetching game nnMeBXun                  ← removed; retry landed on w0 (silent)
```

Over 45 s: every schedule that hashed to w1 cost **~100 ms and exactly 3 error lines**; longest run
of consecutive misses: 2. `/api/public_lobbies` sampled at 500 ms: **2 of 90 samples empty**, none
unparseable, one lobby at a time throughout.

**Run 2 — `SIGSTOP` worker 1 for 40 s, then `SIGCONT`.**

```
11:31:50.591 … 11:31:55.540  50 × Error fetching game SsRq6QTy: AbortError   ← 5 s after stop, 100 ms apart
11:32:00.488 … 11:32:05.4xx  50 × Error fetching game RRD9kQZt: AbortError
             (207 lines over the window; per stuck ID: 50, 50, 50, 50, 6, 1)
11:32:25.66x  worker 1 drains queue: 8 creates, of which 2 (RRD9kQZt, zoLHrA3N) are orphans
11:32:25.701 error Failed to schedule public game on worker w1: … Too Many Requests   ← ×3
11:33:00.697  w_1 ending game with 404 turns / no clients joined, not archiving      ← orphans end
```

`/api/public_lobbies` sampled at 500 ms: **25 of 120 samples empty**, interleaved with a live
lobby (flapping), none unparseable. **No `Failed to schedule` for the hung creates within 40 s**
(the create-side timeout never fired). Exact `lsof` counts: 108 established connections to the
stopped worker's port.

Everything started for the reproduction was stopped; ports re-verified free afterwards.

---

## 3. Q2 — What deterministic hashing buys

- **A client-computable contract.** The client computes the index with no server round-trip:
  `Transport.ts:317-320` (WS URL), `HostLobbyModal.ts:737, 809, 840, 871` (private create / start /
  poll), `JoinPrivateLobbyModal.ts:204, 307`, `Matchmaking.ts:110` (feature off), `LocalServer.ts:303`
  (singleplayer archive, feature off). `numWorkers()` is compile-time per env (`ProdConfig.ts:6` = 20,
  `DevConfig.ts:40` / `PreprodConfig.ts:9` = 2); no runtime source exists (grep). Client, master,
  worker (`Worker.ts:149, 341`) and nginx (`nginx.conf:3-44, 301-347`) must agree, so they ship
  together — the wiki already records this as "sharding, not load balancing"
  (`ai-agents/wiki-vault/wiki/systems/architecture-overview.md:53`).
- **No registry.** The master keeps only `publicLobbyIDs` (`Master.ts:89`); there is no game→worker
  table anywhere. Every master route that needs a worker recomputes the hash (`:413, :439, :517, :546`).
- **The index is treated as fixed; IDs move.** `Worker.ts:545-556` already rejection-samples up to
  1000 IDs to land on a given worker. That is the pattern option (v) reuses.
- **Provenance.** `git log -S` finds the line only in `feea527` (first commit of the fork) — inherited
  from upstream, no local rationale recorded.
- **Distribution.** Offline count over 10⁶ nanoid IDs (`Util.ts:249-255` alphabet, 8 chars) through
  `simpleHash` (`Util.ts:64-72`): per-index deviation ≤ **1.2%** at 20 workers, ≤ 0.13% at 2.
  Rejection-sampling onto 18 ready of 20: **mean 1.11 attempts, max 7** in 2×10⁵ trials. No
  locality/affinity depends on the placement (games are independent; nothing caches per worker).

---

## 4. Q3 — Candidates and what each costs

| # | Option | Client change | nginx change | Breaks contract (`Worker.ts:149/341`) | Restart of a dead index later | Wedged worker | Test surface | Cost / what it breaks |
|---|---|---|---|---|---|---|---|---|
| i | Modulus over the **ready set** | **yes** — lobby info must carry the worker path; all 6 client call sites | no (paths unchanged) | **yes** — both worker checks must accept off-hash games | index set changes → **every existing placement shifts**; games become unfindable unless the path is stored | not helped | new client + worker tests | Highest. Turns the hash into a registry problem the codebase avoided. |
| ii | Retry a **different** worker on failure | no | no | no — a different worker means a **new ID** (index is a function of ID); this is what the 100 ms loop already does implicitly | n/a | only if a create timeout is added | `Master.test.ts` (3 tests, routes only) needs `schedulePublicGame` extracted | Low. Makes the existing behaviour explicit and bounded; without a timeout it changes nothing for the wedged case. |
| iii | **Hold** scheduling while an index is unready | no | no | no | n/a | worse — a capped index (`0056` (b)) would stall scheduling **forever** | small | Rejected: recreates the 2026-08-22 failure on a smaller scale. |
| iv | **Leave it**, add an alarm | no | no | no | n/a | alarm only | none | Cheapest. Needs master log lines to reach Uptrace (§6: they should) and an alert rule on 3 message prefixes; the wedged shape stays at ~10 lines/s until someone acts. |
| **v** | **Rejection-sample the ID onto a ready index** at `Master.ts:509` (`Worker.ts:545` pattern) **+ create timeout** | no | no | no — the game still lives on its hash index | dead index rejoins the set on `WORKER_READY`; nothing placed there in between | timeout bounds it; exclusion needs a health signal the master does not have | master unit test around an extracted `pickGameID(readySet)` + `schedulePublicGame` | Low–medium. Depends on `0056` Step 1 (`markDead` on exit — today `readyWorkers` never shrinks, `Master.ts:20, 114`). Mean 1.11 draws at 18/20. |

Dimension not in the table but relevant to all: the **`fetchLobbies` overlap** (§2.2) is orthogonal
— none of i–v fixes it, and it is the source of most of the wedged-shape cost.

---

## 5. Q4 — Residual at 18/20, and whether the ruling stands

**Dead shape (what the quorum actually permits).** With ≤ 2 of 20 indices absent, P(miss) per
draw ≤ 0.10, so expected extra draws per scheduled game ≤ 0.1/0.9 ≈ **0.111**. Measured cost per
miss: **~100 ms** (one interval tick) and **3 error lines**. Per scheduled game that is **≈ 11 ms
and ≈ 0.33 error lines expected**; at 100 public games/hour ≈ 11 misses/hour ≈ 33 log lines/hour.
Player-visible **rarely and briefly**: a miss rewrites the served body to `lobbies: []`
(`Master.ts:500-502`, served as-is at `:200-202`) and nginx pins any 200 for 1 s (`nginx.conf:108`),
so ≈ 0.1 of misses cause a lobby-card blink of ≤ 1 s for all clients — ≈ **1 blink/hour at 100
games/hour**. No orphan, no hang, no duplicate lobby.

**Wedged shape.** Independent of the quorum value: a worker that reported ready and then stopped
answering is in `readyWorkers` at 18/20, 19/20 or 20/20 alike. Its cost while it lasts is
~10 error lines/s per stuck ID, a ~5 s replacement delay on each draw that lands on the wedged index
(p = 1/20 per draw at 20 workers; the "every ~5 s" cadence in §2.5 is the 2-worker dev number), the
lobby card flapping ~20% of the time while an ID is stuck, and orphans + 429s on recovery. The
per-stuck-ID costs do not depend on the worker count. Changing 18/20 does not touch this; only a create
timeout, an in-flight guard, and (ideally) a responsiveness signal do.

**Recommendation on the ruling: keep 18/20 with the 90 s deadline.** The findings do not show a
severity that argues for a tighter quorum; the one bad shape is orthogonal to the quorum. This is
the owner's call; the number above is what it costs.

**Recommendation on the routing itself:** implement **(v) + create timeout** as a separate brief
sequenced after `0056`. Cost: master-only change, one extracted unit for testing, coupling to
`0056`'s readiness set. What it does not buy: wedged-worker exclusion (needs a health signal) and
private-lobby placement (§7).

---

## 6. Q5 — Has this bitten production?

### 6.1 Catalogue check (no live access from this unit)

Grep over `ai-agents/knowledge-base/` and `ai-agents/wiki-vault/` for the master-side signatures
`Failed to schedule public game`, `Error scheduling public game`, `Error fetching game`, `comp: "m"`
→ **zero hits in any findings, incident, or wiki page**. Specifically:

- `telemetry-error-priorities-2026-05-07.md` families 1–6 are all client or worker-side; family 4
  (`§129-166`) is the **client's** `Error fetching lobbies: Failed to fetch` from `PublicLobby.ts`,
  confirmed as client network aborts in `lobby-map-fetch-investigation-2026-06-03.md` §2.
- `uptrace-knowledge-base.md` §2a/§2d list "scheduling and lobby polling errors (`Master.ts`)" as
  *covered* by error tracking but record no observation of them; §5 retention is `[TO VERIFY]`.
- `telemetry-server-incident-history-2026-06-03.md` and `monitoring-alert-bot-findings-2026-06-04.md`
  §2 cover the telemetry VPS (disk, OOM), not game-server log families.
- `ai-agents/wiki-vault/wiki/systems/telemetry.md:86-96` reproduces the 2026-05-07 table; nothing
  master-side.

**Result: absence of evidence.** Nobody has looked for these lines; the catalogue cannot say they
never occurred. Also note: before `0056` no worker has ever been restarted, and the old all-or-nothing
gate meant a lost worker produced *no* scheduling at all — so a routing signature could only have
appeared from a worker that died **after** the gate closed (i.e. mid-run), which the 2026-08-22
incident record (§7) says has no recorded precedent either.

### 6.2 Do master logs reach Uptrace at all?

**They should.** `Master.ts:14` imports `src/server/Logger.ts`; the OTLP log exporter is installed at
module load whenever `otelEnabled()` is true (`Logger.ts:20-36`, `DefaultConfig.ts:201-206` — true iff
the endpoint env var is set), independent of process role. The wiki's "telemetry init is worker-only"
(`architecture-overview.md:59`) is about **metrics/traces** (`Worker.ts:69-72`), not logs. The endpoint
variable is baked into the image (`Dockerfile:25-26`) and forwarded by `deploy.sh:302`. What this unit
**cannot** verify: that the live prod container's env actually carries it, and whether `comp` arrives
as an attribute or only inside the JSON body (the same unresolved question as `0056` Step 3a).

### 6.3 Live query — for the owner to run (VPN caveat per memory)

Logs, service `openfront`, environment `prod`, **maximum retention**, grouped by day:

1. body contains `Failed to schedule public game on worker`
2. body contains `Error scheduling public game`
3. body contains `Error fetching game`
4. body contains `worker crashed could not find id` — any hit dates a mid-run worker death; lines
   1–3 *should* cluster after it if routing ever bit.
5. body contains `Worker mismatch` or `should be on worker` — client/server worker-count drift, a
   different failure that would look similar from the outside.
6. If `comp` is an attribute: `comp = "m"` AND severity `error`, to see the master's whole error
   profile in one pass.

If (1)–(3) return nothing over the full window **and** (4) also returns nothing, the answer is
"never observed, and never had the chance"; if (4) has hits and (1)–(3) do not, the dead shape is
confirmed harmless in prod as well.

---

## 7. Adjacent surfaces (bounded, as ruled — no options costed)

- **Private lobbies compute the index client-side and never go through the master.**
  `HostLobbyModal.ts:866-871` picks `generateID()` and POSTs `create_game` straight to
  `/w<N>/` (`:871`); polls at `:840`; starts at `:809`. `JoinPrivateLobbyModal.ts:204` checks
  `/exists`, `:307` polls players. A dead or wedged index makes **that lobby ID unusable**: the
  host sees a thrown `HTTP error!` (`:880-884`) or a hang; the joiner's `response.json()` on a
  502 rejects into `private_lobby.error` (`:198`). Nothing retries with a new ID. Frequency is the
  same 2/20 per attempt; severity is one failed click, then the host tries again (new ID). **No
  master-only option (ii, iv, v) helps here**; only (i)-style path indirection or a client-side
  rejection-sample against a *published* ready set would, and that publishes worker health to the
  client. Out of scope; recorded.
- **WS reconnect** recomputes the same path (`Transport.ts:317-320`) — correct by design (the game
  *is* on that index); the loop-forever behaviour on a dead upstream is a `0056`/client-UX concern,
  §2.4.
- **`fetchLobbies` has no in-flight guard** (`Master.ts:128-136`, `:433-505`). Independent of
  routing; produces the 50× log amplification, the lobby-list flapping, and the post-recovery 429s
  (§2.2). A one-line guard (skip the tick if the previous fetch is pending) plus an abort signal on
  the create call would remove most of the wedged-shape cost on its own. **Scoping is the producer's
  call**; flagged as a candidate small brief.
- **Worker rate limiter counts the master.** `Worker.ts:109-114` applies 20 req/s per IP to every
  route including `create_game` and `/api/game/:id` called from `localhost`. Normal cadence is
  ~10 req/s per lobby (one poll per 100 ms tick), so any burst — recovery, or two lobbies at once —
  can 429 the master. Not new, not routing, worth knowing.

---

## 8. Decisions for the owner

1. **Quorum.** Keep **18/20, 90 s** as ruled? — *Recommendation: yes.* The measured residual is
   ≈ 11 ms and ≈ 0.33 error lines per scheduled game; player-visible rarely (≈ 1 blink/hour at
   100 games/hour) and briefly (≤ 1 s). (§5)
2. **Routing change.** Approve a **new brief for option (v) + create timeout**, sequenced **after
   `0056`** (depends on its `markDead`), owner fkit-coder? — *Recommendation: yes.* Alternative:
   accept (iv) and only add the alarm. (§4, §5)
3. **`fetchLobbies` overlap.** Treat the missing in-flight guard / lobby-list flapping / recovery
   429s as its **own small brief** (producer scopes it), or fold it into the (v) brief? —
   *Recommendation: own brief; it is a defect on `dev` today, independent of routing and of `0056`.*
   (§2.2, §7)
4. **Uptrace query.** Run §6.3 (owner has access; this unit does not). Until then Q5 stays
   "never catalogued, not determinable". *Recommendation: run it once before the (v) brief is
   written — a hit on line (5) would change priorities.*
5. **Private lobbies.** Accept the client-side exposure as-is for now (one failed click, host retries
   with a fresh ID)? — *Recommendation: accept; anything else publishes worker health to the client.*
   (§7)
6. **`0056` brief hygiene.** Producer to correct the stale "`0055` not pushed" line and to confirm
   whether `0055` is *deployed* — if not, prod's exit handler still lacks the diagnostics fields.
   (§1)

---

## 9. Open questions

- Is the undici default headers timeout (300 s) what eventually ends a hung create in prod? Not
  observed in 40 s; **(reasoned, not observed)**.
- What does prod nginx return for a WS upgrade to a refused `/w<N>/` upstream, and which close code
  does the browser surface? Dev has no nginx; reasoned as 502 → 1006 → reconnect loop.
- Is `0055` deployed to prod? Unknown; not checked (no prod access from this unit).
- Does the live prod container carry the OTLP endpoint env var, and does `comp` arrive as a log
  attribute? Same unknown as `0056` Step 3a.
- Has a worker ever wedged (alive, not answering) in prod? No signal exists today; a `/health` probe
  or a per-worker "last successful response" timestamp on the master would be the first step to a
  responsiveness signal — not designed here.

---

## Appendix — reproduction commands (dev only; loopback literals and default local ports only)

```
# 0. ports free?  (Remotion renders squat 3001 — memory note)
lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -sTCP:LISTEN || echo free

# 1. boot; wait for "All workers ready"
npm run start:server-dev > run.log 2>&1 &

# 2. sampler (500 ms) of the public body
for i in $(seq 1 90); do date +%T.%N; curl -s localhost:3000/api/public_lobbies; echo; sleep 0.5; done > lobbies.log &

# 3a. run 1 — dead index:      kill -9 <PID of "Started worker 1">
# 3b. run 2 — wedged index:    kill -STOP <PID>;  sleep 40;  lsof -nP -iTCP:3002 | grep -c ESTABLISHED;  kill -CONT <PID>

# 4. read the master's lines
grep '"comp":"m"' run.log | grep -E 'Failed to schedule|Error scheduling|Error fetching|crashed'

# 5. stop everything you started
pkill -f 'src/server/Server.ts'; lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -sTCP:LISTEN || echo free
```

Offline hash count: `simpleHash` (`Util.ts:64-72`) over 10⁶ IDs from the `generateID()` alphabet
(`Util.ts:249-255`), `% 20` and `% 2`; rejection-sampling trial excluding two fixed indices, 2×10⁵
draws. Script kept in the session scratchpad only.
