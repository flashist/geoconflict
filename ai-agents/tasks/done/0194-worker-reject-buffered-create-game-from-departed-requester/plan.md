# Plan — 0194 `Worker.ts`: reject a buffered `create_game` whose requester has already gone away

> **Approval record.** Approved by the owner 2026-08-28 via `AskUserQuestion` in the `fkit lead` session
> (`/fkit-sprint-ship-loop`, Sprint 4). Rulings: **D1 (A)** bounded settle wait before `createGame`;
> **D2** settle window **10 ms**; **D3** guard **all creates** (public and private); **D4** respond
> `503` JSON. **D5** and **D6**: owner took the plan's recommendations — D5 (A) *if* Step 0b shows
> `Worker.ts` is not importable under Jest, and that contingency **returns to the owner** before it is
> acted on; D6 **skip** the route-level test. Plan text below is the plan worker's return, copied by the
> driver; HTML entities in the relay were restored to `<`, `>`, `=>`.
>
> ⚠️ **This plan departs from the brief on the central point, with the owner's knowledge:** the brief's
> specified synchronous `req.socket.destroyed` / `req.aborted` check is *measured* not to fire (Step 0).
> The brief is not edited; this plan supersedes it on that point.

**Code state read:** clean working tree on `dev` at HEAD `dc90719`. Node **v24.13.0**, TypeScript 5.8.3,
express **4.21.2**, `@types/express` ^4.17.23, Jest 30 (`@swc/jest`), supertest **7.2.2** (already a
devDependency, already used by `tests/server/Master.test.ts`), undici 8. No uncommitted change of any
kind; this plan targets HEAD.

## Line verification (every citation in the brief re-checked at `dc90719`)

| Item | Brief says | Tree at HEAD |
|---|---|---|
| `create_game` route | `Worker.ts:116-164` | **exact** — `app.post("/api/create_game/:id", async (req, res) => {` at `:116`, closing `});` at `:164`. Handler is already `async`. |
| `gm.createGame` call | `Worker.ts:158` | **exact** — `const game = gm.createGame(id, gc, creatorClientID);` |
| express on `http.createServer` | `Worker.ts:59-60` | **exact** |
| 400 (no id) / 400 (bad body) / 401 (public, bad admin token) / 400 (worker-index mismatch) | after which the guard sits | `:125-128`, `:131-135`, `:138-146`, `:148-155` — all synchronous, all before `:158` |
| Master's 5 s abort + failure-path delete | `Master.ts:614-647` | **exact** — `AbortController` `:614`, `setTimeout(…, CREATE_GAME_TIMEOUT_MS)` `:615`, `publicLobbyIDs.delete(gameID)` `:638`, failure `log.error` meta ending `:647`, `clearTimeout` `:652`. `CREATE_GAME_TIMEOUT_MS = 5_000` at `:521`. |
| Orphan end line | `GameServer.ts:805` | **exact** — `this.log.info("no clients joined, not archiving game", { gameID: this.id })` |
| Rate limiter 20 req/s | `Worker.ts:109-114` | **exact**, mounted before the route |
| ADR-109 | untouched | confirmed — the game still lives on its hash index; no client/nginx/master change |

Two things the brief did not mention, found while reading:

- **`Worker.ts:524` is a second `gm.createGame` call site** — the worker's own matchmaking path
  (`pollLobby` → `generateGameIdForWorker`, `:545-556`). It has no HTTP requester, so it is
  **out of scope and untouched**; the guard is route-only. Named here so a reviewer does not read the
  guard as covering it.
- **There is no `GameManager.deleteGame`** (`src/server/GameManager.ts` — `createGame` `:41-73`, games
  reaped only in `tick()` `:110-147` when `phase()` returns `Finished`). This matters for fallback
  option (B) below: a post-create teardown would have to add one, i.e. it leaves the brief's stated
  scope (`Worker.ts` plus tests).

---

## Step 0 — the probe. **Already run; the answer is NO.** (evidence, not reasoning)

The brief's central unknown: *is the peer's departure observable synchronously in the handler, for a
request buffered while the worker was `SIGSTOP`ped?*

A faithful mimic of `Worker.ts`'s app (same express 4.21.2 from this repo's `node_modules`, same
middleware order — `compression()` → `express.json()` → `express-rate-limit`, same
`http.createServer`, POST `/api/create_game/:id`) was run as a child process. A parent mimicking
`Master.ts`'s create call (undici `fetch` + `AbortController`) `SIGSTOP`ped the child, fired **6
buffered creates and aborted each**, waited, then fired **1 create it did not abort** ("the create
genuinely in flight at `SIGCONT`"), then `SIGCONT`. Five trials: **30 aborted requests, 5 live ones.**
Scripts live in the session scratchpad only; nothing was written to the repo.

**Results — 30/30 identical:**

| Checkpoint | Departure observed? |
|---|---|
| synchronous, at handler entry | **0 / 30** |
| `process.nextTick` | **0 / 30** |
| `setImmediate` ×1 | **0 / 30** |
| `setImmediate` ×2 | 30 / 30 (0.23–1.68 ms) |
| `setTimeout(0)` | **26 / 30** — *not reliable* |
| `setTimeout(5 ms)` | 30 / 30 |
| `res` `"close"` event | 30 / 30, at **0.243 – 1.769 ms** after handler entry (median 0.66 ms) |
| the 5 live (un-aborted) requests, at every checkpoint through 200 ms | **0 / 5** — no false positive |

**Which properties are usable, measured (this contradicts the brief's Step 1 suggestion):**

| Property | Healthy request | Departed requester | Verdict |
|---|---|---|---|
| `req.aborted` | `false` | **`false`** | **Unusable.** The request *completed* out of the kernel buffer (`req.complete === true`), so Node never sets `aborted`. Also deprecated (DEP0169). |
| `req.destroyed` | **`true`** | `true` | **Unusable and actively dangerous** — the readable side auto-destroys once the body has been read, so this is `true` for every healthy create. Using it would reject 100 % of creates. |
| `req.closed` | `true` | `true` | Unusable, same reason. |
| `req.socket.destroyed` | `false` | `false` at entry → `true` ~1 ms later | **Usable, but only after a settle window.** |
| `res.destroyed` / `res.socket.destroyed` | `false` | `false` at entry → `true` ~1 ms later | **Usable, same window.** |
| `res.socket === null` | `false` | `false` | Defensive only (null after the response detaches). |

**Conclusion, said plainly as the brief requires:** the synchronous pre-`createGame` check the brief
specifies in Step 1 **does not observe the closed socket** — it would ship a guard that never fires and
change the orphan count by zero. The brief's own first fallback ("defer the check one macrotask") is
**also insufficient** (0/30 at one `setImmediate`; 26/30 at `setTimeout(0)`). This plan therefore
proposes the fallback below, and **Decision D1 is a real gate — steps 1–4 are contingent on it.**

**Step 0 in the build re-runs this probe** (≈ 2 minutes) as the first act, before any product code, and
pastes the table into `worklog.md`. The mimic is not `Worker.ts` itself — it omits the `/w<N>` prefix
middleware (`:81-103`) and `express.static` (`:108`), and its handler is a stub. Neither touches socket
lifecycle, but the end-to-end proof is Step 4's live run, not the probe.

---

## Design in one paragraph

`Worker.ts` gains two small exported functions and one call site. `requesterGone(req, res)` is a pure
predicate over `res.destroyed | res.socket | req.socket` — **never** `req.aborted` or `req.destroyed`.
`awaitRequesterSettled(req, res, settleMs)` returns immediately when the departure is already visible,
and otherwise waits for whichever comes first: a `"close"` event on `res` (the orphan case, ~0.7 ms
median) or `settleMs` elapsing (the healthy case), then re-evaluates the predicate. In the `create_game`
handler, immediately before `gm.createGame` at `:158` — after the existing 400/401/index checks, so
every rejection path is byte-unchanged — an `await` of that helper gates the create: gone → one `warn`
and a `503`, no game; not gone → proceed exactly as today. The guard's failure mode is *"does nothing"*,
never *"rejects a live request"*: it can only fire on a socket Node has already marked destroyed, which
a live peer's never is (0/5 in the probe, over 200 ms). `Master.ts`, `GameManager.ts`, `GameServer.ts`,
the client, nginx and configs are untouched.

---

## Step 1 — the predicate and the settle helper (`src/server/Worker.ts`)

Placed at module scope, above `startWorker()`, so they are importable by a test without binding a port.

```ts
// 0194: a create whose requester has already gone away has no legitimate outcome — the
// master aborted it (Master.ts CREATE_GAME_TIMEOUT_MS, :615) and dropped the ID from
// publicLobbyIDs (:638), so it will never list the ID and nobody can join the game.
// Aborting the master's side does not retract bytes already buffered in a stopped
// worker's socket, so on SIGCONT the worker parses them and creates orphans (0192
// worklog run 4: 5 orphans of 6 drained creates).
//
// Measured on Node v24.13.0 / express 4.21.2, 30 buffered-then-aborted requests (0194
// Step 0 probe, worklog): the departure is NOT visible synchronously at handler entry
// (0/30), nor at process.nextTick (0/30), nor after one setImmediate (0/30). It surfaces
// 0.24–1.77 ms later as res.destroyed / req.socket.destroyed flipping and a "close" event
// on res. `req.aborted` stays false throughout (the request completed out of the kernel
// buffer) and `req.destroyed` is true even for a healthy request (the readable side
// auto-destroys after the body is read) — neither is usable here.
export const REQUESTER_SETTLE_MS = 10;

interface SocketState {
  destroyed: boolean;
}
interface RequestLike {
  socket: SocketState | null;
}
interface ResponseLike {
  destroyed: boolean;
  socket: SocketState | null;
  once(event: "close", listener: () => void): unknown;
  removeListener(event: "close", listener: () => void): unknown;
}

// Pure. True only once Node has marked the connection dead; a live peer — however slow —
// is never reported gone.
export function requesterGone(req: RequestLike, res: ResponseLike): boolean {
  return (
    res.destroyed ||
    res.socket === null ||
    res.socket.destroyed ||
    req.socket === null ||
    req.socket.destroyed
  );
}

// Resolves as soon as the departure surfaces (~0.7 ms median for a buffered, aborted
// request), or after settleMs for a live one. Never rejects; arms no timer when the
// answer is already known; removes its own listener on both exits.
export async function awaitRequesterSettled(
  req: RequestLike,
  res: ResponseLike,
  settleMs: number = REQUESTER_SETTLE_MS,
): Promise<boolean> {
  if (requesterGone(req, res)) return true;
  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      res.removeListener("close", done);
      resolve();
    };
    const timer = setTimeout(done, settleMs);
    res.once("close", done);
  });
  return requesterGone(req, res);
}
```

Express's `Request` / `Response` satisfy these structurally (`IncomingMessage.socket: Socket`,
`ServerResponse.socket: Socket | null`, `destroyed` from `Writable`), so the call site needs no cast and
the tests need no real socket.

**Why `REQUESTER_SETTLE_MS = 10`** — 5.6× the observed worst case (1.769 ms) with room for a loaded box,
and small enough to be invisible on the player-facing private-lobby path. The wait exits early on
`"close"`, so an orphan is caught in ~1 ms; only a *healthy* create pays the full 10 ms. See **D2**.

**Why a bounded wait and not a fixed number of event-loop turns** — `setImmediate` ×2 was 30/30 here,
but that is one poll-iteration of margin: it is the same "the EOF lands in the *next* loop turn" story
that makes ×1 fail, and nothing guarantees it survives a Node upgrade or a loaded worker.
`setTimeout(0)` already misses 4/30. The event-or-timer race does not depend on turn counting.

## Step 2 — the guard at the call site (`src/server/Worker.ts`, between `:155` and `:158`)

```ts
    // 0194: give a departed requester the ~1 ms it needs to surface (Step 0 probe), then
    // skip a create nobody can ever join. Sits after the 400/401/worker-index checks, so
    // those responses are unchanged. Cannot fire for a live peer.
    if (await awaitRequesterSettled(req, res)) {
      log.warn(
        `cannot create game ${id}, requester went away before creation (worker ${workerId}, ip ${ipAnonymize(clientIP)}, settle ${REQUESTER_SETTLE_MS}ms)`,
        {
          gameID: id,
          workerIndex: workerId,
          isPublic: gc.gameType === GameType.Public,
          settleMs: REQUESTER_SETTLE_MS,
        },
      );
      return res.status(503).json({ error: "Requester gone" });
    }
```

- **Level `warn`** (brief-specified, and right): abnormal but self-correcting and needing no operator
  action. Volume is bounded by the 20 req/s limiter and, in practice, by one line per aborted create —
  5 per wedge episode in the `0192` run-4 shape. Not `error` (nothing to fix), not `info` (not normal).
- **`0056` Step 3a rule applied**: every value appears in both the message *and* a single-object meta,
  and **no meta field can be null** — `isPublic` is a boolean (`gc` is `result.data`, non-optional at
  this point, so no `?.`), `workerIndex`/`settleMs` are numbers, `gameID` is a string. Uptrace drops
  `null` attributes, so `gc.gameMode` (optional) is deliberately kept out of the meta and out of the
  message. **Noted for the reviewer:** the three existing `warn` lines in this route (`:126`, `:142`,
  `:151`) carry *no* meta at all, so this line is locally novel — the project rule wins over the file's
  neighbours, and the neighbours are not retrofitted (out of scope).
- **No PII**: `ipAnonymize(clientIP)` is the existing form used at `:143` and `:152`; no `persistentID`
  anywhere on this path.
- **`503` rather than a bare `return`** (see **D4**): unobservable in the real case (writing to a
  destroyed response is a no-op — probe-verified, `res.json()` returns without throwing), but if the
  predicate ever misfired, a response is bounded behaviour and a hanging request is not.
  `HostLobbyModal.createLobby` (`src/client/HostLobbyModal.ts:866-893`) throws on `!response.ok` and
  **does not retry**, so no client retry loop is possible.

### Healthy creates: what changes, exactly

Nothing except **≤ 10 ms of latency** before `gm.createGame`, and one `"close"` listener attached to
`res` for that window (removed on both exits). Consequences, stated so they are not discovered in
review:

- `GameServer.createdAt` (`Date.now()` at construction) shifts by ≤ 10 ms, so the public lobby's
  `msUntilStart` and its ~5 s lifetime shift by ≤ 10 ms — 0.2 % of one cadence, well inside the
  4.76–4.86 s spread `0192` run 5 already measured.
- The handler now yields between the index check and `createGame`. Two creates for the *same* ID could
  therefore interleave where today they could not. End state is identical either way (`createGame` does
  `this.games.set(id, game)`, overwriting), each handler answers with its own `game` object, and the
  master draws unique IDs while private IDs are client-generated — so this is a shape change with no
  behavioural difference. Listed, not mitigated.
- The 20 req/s limiter runs *before* the route and is untouched; 6 buffered creates drained in 6 ms
  stay far under it.
- **Private lobbies** (`HostLobbyModal` → nginx → `/w<N>/api/create_game/<id>`, no body) take the same
  path: a live host is never flagged, and the only cost is the ≤ 10 ms. A *departed* private host is
  now also guarded — worth more per orphan than the public case, because `GameServer.phase()` returns
  `Lobby` for an unstarted private game until `maxGameDuration` (`GameServer.ts:56` — **3 hours**),
  where a public orphan is reaped in ~150 s. See **D3**.

## Step 3 — tests

**Where.** A new `tests/server/Worker.test.ts` (none exists today; `tests/server/` covers master,
archive, game-server reconnect, cosmetics, profile). Importing `src/server/Worker.ts` executes its
module scope only — `getServerConfigFromServer()`, `logger.child`, `new MapPlaylist(false)`,
`parseInt(process.env.WORKER_ID ?? "0")` — the same shape `Master.ts` has, which `Master.test.ts`
already imports successfully; no transitive import has a heavier module-level side effect (checked:
only `Archive.ts` calls `getServerConfigFromServer()` at module scope; `initWorkerMetrics` /
`initOtelTracing` / `pollLobby` / the `GameManager` interval all run **inside** `startWorker()`, which
the test never calls).

> **Step 0b, before writing any test body:** prove `Worker.ts` is importable under Jest (a one-line
> `import` + trivial assertion, run once). `Worker.ts:56-57` declares `const __filename` / `const
> __dirname` — the exact identifiers `Master.ts:63-66` documents as unimportable when declared at
> module scope under `@swc/jest`. Here they are **function-scoped** inside `startWorker()`, which is
> legal, so this should pass — but it is asserted, not assumed. **If it fails, stop: see D5.**

**Predicate and helper tests** (no port, no socket, no supertest):

| # | Case | Assertion |
|---|---|---|
| 1 | Healthy request | `requesterGone({socket:{destroyed:false}}, {destroyed:false, socket:{destroyed:false}, …})` → `false` |
| 2 | `res.destroyed` | → `true` |
| 3 | `req.socket.destroyed` | → `true` |
| 4 | `res.socket.destroyed` | → `true` |
| 5 | `res.socket === null` | → `true` |
| 6 | `req.socket === null` | → `true` |
| 7 | **Regression guard for the Step 0 finding** | An object shaped like a *healthy, fully-read* request — extra properties `destroyed: true`, `aborted: false`, `closed: true`, `complete: true` on the request, live sockets — must still yield **`false`**. This is the test that fails if anyone reintroduces `req.destroyed` / `req.aborted` into the predicate, i.e. the test that would have caught the brief's suggested signals. Comment cites the probe numbers. |
| 8 | `awaitRequesterSettled`, already gone | resolves `true`; `jest.getTimerCount() === 0` (no timer armed) and `res.listenerCount("close") === 0` |
| 9 | `awaitRequesterSettled`, live | fake timers; pending after 9 ms, resolves **`false`** after advancing `REQUESTER_SETTLE_MS`; `res.listenerCount("close") === 0` afterwards; `jest.getTimerCount() === 0` |
| 10 | `awaitRequesterSettled`, departs during the window | fake timers; at 1 ms flip `res.destroyed = true` and `res.emit("close")` → resolves **`true`** without advancing to `settleMs`; timer cleared (`jest.getTimerCount() === 0`) |
| 11 | Constant pinned | `REQUESTER_SETTLE_MS === 10`, and `<` `Master.CREATE_GAME_TIMEOUT_MS` by three orders of magnitude (comment pointing at `Master.ts:521`) |

Tests 8–10 use an `EventEmitter`-backed fake `res` so `once` / `removeListener` / `emit` are the real
Node implementations (`once`'s wrapper is correctly removed by `removeListener` with the original
function — asserted by test 9's `listenerCount`).

**Route-level test: skipped — and here is the cost, as the brief requires it be stated.**
`app` is a local inside `startWorker()` (`:59`), which also constructs a `GameManager` (a 1 s
`setInterval`), a `ProfileApiClient`, a `PrivilegeRefresher` that starts polling, a `WebSocketServer`,
and `express.static`. A supertest seam means extracting an app-or-router factory with injected
`gm` / `log` / `workerId` — the first such seam in the file, ~60 lines of `startWorker()` restructured,
plus three background timers to tame in the test. `supertest` itself is free (7.2.2, already used in
`Master.test.ts`), so the cost is entirely the **seam**, and it is well past the brief's "skip this if
it needs a new seam of any size". Worse, it would not buy the thing that matters: supertest cannot
reproduce the race — it needs the socket to die *after* the body is buffered and *before* the handler
dispatches, which is exactly what `SIGSTOP` creates and an in-process test cannot. **The race is covered
by Step 0's probe (predicate level, 30/30) and Step 4 run 2 (end-to-end, live).** See **D6**.

**Also run:** `npx jest tests/server/Worker.test.ts --randomize` ×2, `--detectOpenHandles`,
`npm test` (full suite), `npm run lint`, `npx tsc --noEmit -p tsconfig.json`.

## Step 4 — verification (dev, 2 workers, loopback only; commands per the `0057` Appendix)

Pre-flight every run: `lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -sTCP:LISTEN` free (memory note:
Remotion renders squat 3001). Stop everything afterwards and re-verify free. Every log excerpt filtered
for `persistentID` before it reaches `worklog.md`.

1. **Unit, lint, types** — Step 3's list, all green. Report failures verbatim if any.
2. **Wedged index — the `0192` run-4 procedure.** Fresh boot, both workers ready, `Quorum reached`.
   `kill -STOP` worker 1, hold **40 s**, `kill -CONT`. On recovery:
   - count `no clients joined, not archiving game` lines on worker 1 for IDs the **master never listed**
     (the `0192` run-4 method: intersect worker-1 create IDs against the master's `publicLobbyIDs`
     history from the 500 ms `/api/public_lobbies` sampler);
   - count the new guard `warn` lines.
   **Expected: ≈ 0 orphans** against the recorded baseline of **5** (`0192` worklog run 4; `0193`
   `review.md:7`), with **guard warns ≈ the number of drained-but-aborted creates** (5 in the recorded
   run — the two numbers should trade one-for-one). **The create genuinely in flight at `SIGCONT` — the
   one the master did list — must still be created**, and must produce no warn line.
   **Report the exact numbers, including a non-zero orphan count.** Do not re-run until the number is
   0; if orphans remain, report them with the warn count and stop for a decision.
   Also report `Too Many Requests` count (recorded run: 0) and total master error lines in the window
   (recorded: 16) to show `0192`/`0193` behaviour is unchanged.
3. **Healthy path unchanged.** Full boot, all workers ready, **≥ 5 min**: creates continue at the normal
   cadence, `/api/public_lobbies` shows them, per-worker create counts roughly even, **zero** guard
   `warn` lines, zero new error lines. Compare cadence against `0192` run 5's mean 4.84 s.
4. **Private lobby unchanged.** Host a private lobby from the client (`HostLobbyModal` POSTs
   `create_game` to `/w<N>/`): created and joinable, no guard line.
5. **Rejection paths unchanged.** Against a running worker: bad body → **400**, public create without
   the admin token → **401**, worker-index mismatch → **400** — the guard sits after all three, so all
   three are byte-unchanged.
6. **Post-deploy — pending by design.** On the next prod deploy carrying this: scope `docker logs` to
   the current boot, confirm no guard `warn` lines on a healthy run and that `0192`'s
   `Failed to schedule public game` count is unchanged. Deployment state is **UNKNOWN**; not assumed.

## Change surface

- **Edit `src/server/Worker.ts`** — module scope: `REQUESTER_SETTLE_MS`, `SocketState` /
  `RequestLike` / `ResponseLike`, `requesterGone`, `awaitRequesterSettled` (~45 lines including the
  evidence comment); route: the `await` guard block between `:155` and `:158` (~15 lines). Everything
  else byte-unchanged; no import added (`ipAnonymize`, `GameType`, `log` are already in scope).
- **New `tests/server/Worker.test.ts`** — tests 1–11.
- **Write** the task folder's `worklog.md` (Step 0 probe table, run evidence, decision log — including
  an explicit `none` if no unattended fix or obvious-winner call was made).
- **Not touched:** `Master.ts`, `GameManager.ts`, `GameServer.ts`, `WorkerSupervisor.ts`, configs,
  nginx, client, `Dockerfile`, `ai-agents/wiki-vault/`, the `0057` findings, `0192`/`0193` records,
  ADR-109. No commit, no push, no task-file move.

## Risks / edge cases

- **The guard is best-effort by construction.** If the peer's FIN/RST has not reached the worker within
  `REQUESTER_SETTLE_MS` of the handler running, the create proceeds and the orphan happens exactly as
  today. It is never *worse* than today. Observed margin: 1.77 ms worst of 30 against a 10 ms window.
- **It cannot reject a live request.** The predicate reads only `destroyed` flags Node sets on a dead
  connection. A slow-but-connected peer is `false` at every checkpoint through 200 ms (probe, 5/5).
- **It does not fix the wedge itself.** While worker 1 is wedged the master still spends one 5 s failed
  attempt per draw that lands on it (ADR-109's accepted residual; `0057` §9 wants a responsiveness
  signal). This task only stops those attempts from becoming games. Unchanged from `0192`.
- **`Worker.ts:524`'s matchmaking create is not guarded** — no requester exists there. Intentional.
- **A future refactor could reintroduce `req.aborted` / `req.destroyed`.** Test 7 exists to fail loudly
  if it does; the evidence comment records why.
- **Node-version sensitivity.** The measurement is Node v24.13.0 / express 4.21.2. A Node upgrade could
  move the ~1 ms; the design absorbs that up to 10 ms and degrades to "does nothing", not to a
  false rejection. Step 4 run 2 re-measures end-to-end.
- **`0192`'s numbers must not move.** Run 2 reports the master-side error-line and `Too Many Requests`
  counts alongside the orphan count so a regression in `0192`/`0193` behaviour is visible, not inferred.
- **Coverage thresholds** (`jest.config` global 21 % statements / 16 % branches) — a new test file only
  raises them; no risk.

## Decisions raised at plan time — **D1 gates everything below Step 0**

- **D1 — the synchronous check is proven a no-op; approve the bounded settle wait.** *(Rec: A)*
  **(A) Bounded settle wait before `createGame`** — the plan above. Worker.ts-only; catches the orphan
  in ~1 ms; costs ≤ 10 ms on healthy creates; failure mode is "does nothing".
  **(B) Post-create teardown** — create, then tear the game down when `res` closes without the response
  finishing. Needs a new `GameManager.deleteGame`, i.e. **outside the brief's stated scope**
  (`Worker.ts` plus tests), and introduces a new destructive path for a game that briefly existed.
  **(C) Ship the brief's synchronous check as literally written** — measured to fire 0/30; ships a
  guard that changes nothing and a `warn` that never appears. Honest only if paired with keeping the
  residual open.
  **(D) Do nothing; keep `0192`'s accepted orphan residual** — cost is 5 idle `GameServer`s × ~150 s per
  wedge episode, no player impact.
- **D2 — settle window.** *(Rec: 10 ms)* 5 ms (2.8× the observed worst case, tighter healthy-path cost)
  / **10 ms** / 25 ms (14× margin, still imperceptible). Only healthy creates pay it in full.
- **D3 — scope of the guard.** *(Rec: all creates)* **All creates** (public and private; a departed
  private host otherwise orphans a `GameServer` for 3 hours per `GameServer.ts:56`) / public-with-admin-
  token only (zero added latency on the player-facing path, private orphans left unguarded).
- **D4 — response on rejection.** *(Rec: `503` JSON)* `res.status(503).json({ error: "Requester gone" })`
  (bounded behaviour if the predicate ever misfired; unobservable in the real case) / bare `return` with
  no response (leaves a request unanswered if it ever misfired).
- **D5 — contingency if Step 0b shows `Worker.ts` is not importable under Jest.** *(Rec: A, and
  re-approve)* **(A)** move the predicate + helper into a new `src/server/RequesterGone.ts` imported by
  `Worker.ts` — a new source file, slightly beyond "scope: `Worker.ts` plus tests", so it needs a nod;
  **(B)** ship with no unit test and rely on Step 4's live run alone. Step 0b runs before any test body
  is written, so this only costs a re-approval, not rework.
- **D6 — route-level test.** *(Rec: skip)* **Skip** (cost = a new app-factory seam in `startWorker()`,
  and it still cannot reproduce the race) / build the seam.
