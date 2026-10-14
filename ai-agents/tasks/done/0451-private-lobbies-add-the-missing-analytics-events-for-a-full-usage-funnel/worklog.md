# Worklog — 0451: analytics events for the private-lobby usage funnel

## 2026-10-14 — Build (sequence steps 1–8), fkit-coder as `fkit-sprint-ship-loop` Build worker

Built against the owner-approved `plan.md` (blob `928592ed2a5868169612293f48b75c6aa354af7a`, re-hashed this turn),
including its *Owner decisions* section (**16** events — "Add both failure events"). Nothing committed, no task or
board status changed, no `.env*` touched, `plan.md` and the wiki untouched.

### What changed
- **`src/client/flashist/FlashistFacade.ts`** — 16 new keys in `analyticEvents`, each a full string, with a comment
  block (task 0451).
- **`src/client/PrivateLobbyAnalytics.ts` (new)** — one `log…` function per event, plus
  `rememberPrivateLobbyHostClientID` / `privateLobbyRole` / `resetPrivateLobbyAnalyticsForTests`. Buckets map to
  **enum keys** through fixed tables, and the key is resolved at call time (a mocked registry in a test still
  resolves). No `"PrivateLobby:` literal in this file.
- **`src/client/HostLobbyModal.ts`** — `Created` + remember host clientID in the create-OK branch; `CreateFailed` from
  the create chain's `.catch`; `InviteCopied:{Link|Code}` and `InviteCopyFailed` in `copyToClipboard()` (each with its
  own once-per-opening latch, reset in `open()` and `reset()`); `Start:Tapped` after the in-flight guard;
  `showStartFailed(status)` logs `Start:Failed` (3 call sites pass the settings status, `0`, the start status);
  `Left:Host` in `handleModalClose()` when joined. `copyText` is still the first call, nothing awaited before it.
- **`src/client/JoinPrivateLobbyModal.ts`** — `joinLobby(via)`: `open(id)` passes `"Link"`, the button passes
  `"Code"`; `Joined:{via}` in `checkActiveLobby`'s exists branch, latched on `!hasJoined`; `JoinFailed:NotFound` on the
  archive `not_found`; `JoinFailed:Error` on the archive `error` and in the `catch`; `Left:Guest` in
  `handleModalClose()` when joined.
- **`src/client/MatchStartAnalytics.ts`** — `logMatchStartAnalytics(…, clientID)`: after `Game:Start` and
  `Game:Mode:*` (both unchanged), a private start logs `MatchStarted:{Host|Guest}` and sets `activeMatchIsPrivate`;
  `logMatchEndAnalytics` logs `MatchEnded` (value = `durationSeconds`) after `Match:Duration`;
  `clearActiveMatchStartTime()` clears the flag.
- **`src/client/ClientGameRunner.ts`** — passes `this.lobby.clientID` (1 line).
- **`ai-agents/knowledge-base/analytics-event-reference.md`** — new `### Private Lobby Events` section (16 rows:
  key, string, when, when not, value), funnel note, gating note, accepted residuals; pointer on the
  `Game:Mode:Multiplayer` row (meaning unchanged).
- **Tests:**
  - `tests/client/MatchStartAnalytics.test.ts` — clientID passed; the Private case now expects 3 calls (1–2
    unchanged: `Game:Start` = players, `Game:Mode:Multiplayer`; 3 = `MatchStarted:Guest`); new Host/Guest,
    public/solo, reconnect/replay/repeat and `MatchEnded` cases.
  - Mock-only: `HostLobbyOpen`, `HostLobbyModalLeave`, `HostLobbyPoll`, `HostLobbyModalUrl` gain
    `flashistConstants: { analyticEvents: {} }` + `flashist_logEventAnalytics: jest.fn()`. No assertion changed.
  - New `tests/client/HostLobbyAnalytics.test.ts` (23 tests), `tests/client/JoinPrivateLobbyAnalytics.test.ts`
    (16), `tests/client/PrivateLobbyAnalyticsNames.test.ts` (19, real registry).
  - New helper `tests/client/support/privateLobbyEvents.ts` (the 16 key→string pairs for mocks); the names test
    asserts it equals the real registry, so mocks cannot drift.
- **No change** to `Main.ts`, `InvitePayload.ts`, either HTML template, `en.json`/`ru.json`, or `src/core/`.

### Verification
- **(a) Names and count — 16:** `PrivateLobby:Created`, `PrivateLobby:CreateFailed`,
  `PrivateLobby:InviteCopied:Link`, `PrivateLobby:InviteCopied:Code`, `PrivateLobby:InviteCopyFailed`,
  `PrivateLobby:Start:Tapped`, `PrivateLobby:Start:Failed`, `PrivateLobby:MatchStarted:Host`,
  `PrivateLobby:MatchStarted:Guest`, `PrivateLobby:MatchEnded`, `PrivateLobby:Left:Host`, `PrivateLobby:Left:Guest`,
  `PrivateLobby:Joined:Link`, `PrivateLobby:Joined:Code`, `PrivateLobby:JoinFailed:NotFound`,
  `PrivateLobby:JoinFailed:Error`. `PrivateLobbyAnalyticsNames.test.ts` checks against the real registry: exactly 16,
  unique, `^[A-Z][A-Za-z0-9]*(:[A-Z][A-Za-z0-9]*){1,4}$` (≤5 parts, PascalCase), no `_`, each part ≤64, none equal
  to an existing event string.
- **(b) No inline event literal in game code.**
  `git diff -- src ':!src/client/flashist/FlashistFacade.ts' | grep -E '^\+.*"PrivateLobby:'` → empty (exit 1).
  The new untracked file is outside `git diff`, so also `grep -nE '"PrivateLobby:' src/client/PrivateLobbyAnalytics.ts`
  → empty (exit 1). Tests do contain literals (mocks, assertions); read as out of scope for verification 2, as the
  plan says.
- **(c) Enum keys vs doc rows:** `PRIVATE_LOBBY_*` keys in `FlashistFacade.ts` (16) vs key column of the doc section
  (16) → `diff` identical; event strings src vs doc → identical.
- **(d) Privacy:** `HostLobbyAnalytics.test.ts` and `JoinPrivateLobbyAnalytics.test.ts` each end with a privacy case
  that runs most events and checks no call contains the lobby code, any creator clientID (host), or the portal URL,
  that every name starts `PrivateLobby:`, and that values are only numbers or absent.
- **Mutation spot-checks** (temporary, reverted, restore confirmed): dropping the copy's lobby-exists guard and the
  `Left:Host` call → 3 host tests fail; dropping the join latch and making `open(id)` pass `Code` → 2 join tests fail.
- **Targeted run:** 18 suites, 468 tests, all pass (MatchStartAnalytics, HostLobby*, JoinPrivateLobby*,
  PrivateLobby*, FlashistFacade, ClientGameRunnerTeardown, JoinLobbyReconnectSession, ErrorModalCopy,
  LobbyJoinSequence).
- **`npx tsc --noEmit`:** clean. **`npm run lint`:** clean. Prettier run on the 4 touched files that drifted (all were
  clean at HEAD).
- **Full `npm test`:** see the entry below.

### Local walk-through (dev build, Playwright, 3 isolated browser contexts)
Ports 3000/3001/3002/9000 checked free first. Ran the client (`webpack serve`, without `--open`) and the dev server
via `concurrently` with `GAME_ENV=dev` — the same two processes as `npm run dev`, minus the browser launch. Tester
marker set in each context (shows the private row); guests also had `tutorialCompleted` set, since a fresh context
auto-starts the tutorial. Clipboard permission granted to the host. Events read from the `flashist_logEventAnalytics |`
console lines (non-prod builds log, never send).

Run 1 — full funnel, lobby `AQAT8XBY`, 3 players:
- **Host:** `UI:Tap:PrivateTab` → `PrivateLobby:Created` → `PrivateLobby:InviteCopied:Link` (two copy clicks, one
  event; standalone copies `…/#join=` — verified clipboard content) → `PrivateLobby:Start:Tapped` (Start was
  **double-clicked**, one event) → `Game:Start = 3` → `Game:Mode:Multiplayer` → `PrivateLobby:MatchStarted:Host`.
- **Guest 1 (typed `aqat-8xby`, lower case with a dash):** `UI:Tap:PrivateTab` → `PrivateLobby:Joined:Code` →
  `Game:Start = 3` → `Game:Mode:Multiplayer` → `PrivateLobby:MatchStarted:Guest`.
- **Guest 2 (opened `/#join=AQAT8XBY`):** `PrivateLobby:Joined:Link` → `Game:Start = 3` → `Game:Mode:Multiplayer` →
  `PrivateLobby:MatchStarted:Guest`.
- **Match end (leave path — `leave-lobby` dispatched in each page, the same handler the in-game leave uses):** each
  of the three: `Game:End` → `Match:Duration = N` → `PrivateLobby:MatchEnded = N` (N = 30 / 28 / 32) → `Game:Abandon`.
- No duplicates; the host never fired a guest event; no guest fired `Created`.

Run 2 — lobby leave and a failed join:
- Host: `PrivateLobby:Created` → (Escape) `PrivateLobby:Left:Host`.
- Guest: wrong code `ZZZZ2222` → `PrivateLobby:JoinFailed:Error` → real code → `PrivateLobby:Joined:Code` → (Escape)
  `PrivateLobby:Left:Guest`.
- ⚠️ **A wrong code gave `JoinFailed:Error`, not `NotFound`, locally.** Network trace: `/w0/api/game/ZZZZ2222/exists`
  → 200 (`exists: false`), then the archive lookup `localhost:8787/game/ZZZZ2222` → **connection refused** (no archive
  API locally) → the `catch` → `Error`; the player sees the generic error line. That is the code doing what it says.
  **Whether production's archive lookup answers 404 (→ `NotFound`) is not checked.** If it does not, every wrong code
  in production lands in `JoinFailed:Error`. Recorded as a residual in the reference doc.
- **Not walked:** the finish path (win modal) for `MatchEnded` — unit-tested only (`logMatchEndAnalytics(120, …)`);
  the Yandex portal-link copy and the Yandex invite payload join (not reachable locally) — unit-tested only;
  `CreateFailed` and `Start:Failed` live — unit-tested only.
- Cleanup: browser closed; dev server stopped; ports 3000–3002/9000 confirmed free, no webpack/server process left.

### Decision log (applied without asking, inside the approved plan)
1. **`InviteCopyFailed` has its own latch, not `InviteCopied`'s** (Owner decisions: "the coder decides … and records
   why"). Why: with a shared latch, a failed copy followed by a successful retry would never count as copied — the
   funnel step would under-count exactly the users who hit 0380's failure. Own latch: at most one `InviteCopyFailed`
   and one `InviteCopied` per opening. Obvious winner within the plan's intent ("at most once per window opening",
   "a failed copy must not count as copied"). Tested ("a failed copy then a successful retry counts both").
2. **Version mismatch is not counted** (Owner decisions: "Error, or not counted"). Why: `version_mismatch` comes from
   the archived-game branch — the code names a finished game, which parsed badly or is from another build. The owner
   said the join-failure events do not fire on the archived/replay branch, and defined `Error` as a network/HTTP
   error. Counting it as `Error` would mix "old game code" into "network broke". Obvious winner within intent. Tested.
3. **A text that is not a code at all (incl. an empty Join press) sends no `JoinFailed`.** Why: the owner's wording
   is "the lookup says the lobby does not exist"; this path makes no lookup (the format check returns first), and an
   empty press would add noise. Literal reading of the owner text — recorded because it is a choice. Tested.
4. **No latch on `JoinFailed:*`: one per Join press.** Why: the plan's rule is one event per player action, and the
   owner set a latch only for the copy events. Each retry with a wrong code is a separate action. Tested.
5. **`PrivateLobbyAnalytics.ts` maps buckets to enum KEYS resolved at call time** (plan said "fixed lookup to an enum
   key"). Mechanical: same guarantee (no string building), and it keeps suites that mock the registry working.
6. **Test helper `tests/client/support/privateLobbyEvents.ts`** (not named in the plan). Mechanical: lets the new jsdom
   suites assert exact strings without loading the real facade (SDK/telemetry imports), and the names test pins it to
   the real registry.
7. **Copy guard checks `hasJoinedLobby` as of the copy's start**, not after the `await`. Why: a copy begun before the
   create answered copies an empty/stale code and must not count even if the lobby appears while it settles. Inside
   the plan ("a copy made before this opening's lobby exists"). Tested.
8. **Doc residual on `JoinFailed:NotFound` vs the archive API**, from the walk-through finding above. Documentation of
   observed behaviour only; no code change.

### Full `npm test` (one run, through the npm script, lock taken, 2026-10-14)
- **Red: 1 failed suite / 227 passed (228); 1 failed test / 4680 passed (4681); 208.88 s; exit 1.**
- The one failure is **`.fkit/tmp/tests/client/Probe0353Stale.test.ts`** — a probe from task 0353 dated 2026-10-04,
  **gitignored** (`.gitignore:28 .fkit/`), so it is in no commit, yet jest's `testRegex` still collects it on this
  machine. Its FlashistFacade mock has no `flashistConstants`, so the new `Left:Host` call in `handleModalClose()`
  throws `Cannot read properties of undefined (reading 'analyticEvents')` (`PrivateLobbyAnalytics.ts:44`). Same cause
  the four tracked host tests had, which got the plan's mock-only edit. Caused by this change; it did not fail before
  it (not re-run against HEAD — the stack trace points at the new call).
- **Every tracked suite passed.** Not a flake: no `SIGSEGV`, no `Exceeded timeout`, deterministic. So no re-run.
- **Not touched:** the probe belongs to another task and is outside the approved plan — returned to the driver as a
  decision (delete the stray probe / give it the same 2-line mock / leave it).

## 2026-10-14 — Review round 1 (Process-review worker, `fkit-sprint-ship-loop`, standing approval)

### Decision log (applied without asking, inside the approved plan)
1. **R1 → `JoinFailed:NotFound` decided by our worker's `exists: false`.** What changed: `checkActiveLobby()` in
   `src/client/JoinPrivateLobbyModal.ts` returns `"joined" | "not_found" | "unknown"` instead of a boolean;
   `joinLobby()` keeps `workerSaidNotFound` and, on the archive `"error"` result **and** in the `catch` (production's
   archive answers 200 HTML, so `json()` throws), logs `NotFound` when the worker said the lobby does not exist,
   else `Error`. Archive 404 still logs `NotFound`. Control flow and every player message are unchanged (owner
   ruling 2026-10-13: the player-facing wrong-code message is a separate task). Why it qualified: verified
   `CORRECT` (catch-all `app.get("*")` → `index.html`, `src/server/Master.ts:738-740`; archiving off,
   `DefaultConfig.ts` `archiveEnabled()` → false), localized to one file, and it is the owner's own definition in
   the approved plan ("the lookup says the lobby does not exist" = NotFound; network/HTTP error = Error).
   Accepted cost, documented: worker said `exists: false` and the archive then fails for a real network reason →
   counts `NotFound`.
2. **R2 → `response.ok` guard, counting only.** What changed: `"not_found"` only when `response.ok &&
   gameInfo.exists === false`; any other non-join reply is `"unknown"` (→ `Error` unless the archive says 404).
   The join itself (`gameInfo.exists` truthy) is untouched, so no player-visible change. Why it qualified: verified
   `CORRECT` as latent and made load-bearing by fix 1 (without it a JSON-bodied `/exists` error would count as
   NotFound); mechanical, same function, in-plan (Error = HTTP error).
3. **R3 → doc rows reworded.** What changed: the `JoinFailed:NotFound` / `:Error` rows in
   `analytics-event-reference.md` now say "a replay that opened (archive found the game)" instead of "the
   archived-game/replay branch", state the new NotFound/Error split, and the residual now records the production
   check (200 HTML) and that the player still sees the generic error line. Why it qualified: docs-only, verified
   `CORRECT` (the old text contradicted the code), in-plan (the doc is plan step 7).
4. **Tests.** `tests/client/JoinPrivateLobbyAnalytics.test.ts`: default archive reply is now production's shape
   (200 HTML, `json()` throws); new cases — production shape counts NotFound with the message unchanged, archive 404
   counts NotFound, archive 500 after `exists: false` counts NotFound, `/exists` 500 with a JSON body counts Error
   (R2), `/exists` HTML counts Error; the old "archive 500 → Error" case was replaced (it encoded the R1 bug).
   Privacy case now gets its Error from an `/exists` 500.

### Verification (round 1)
- Targeted: 12 suites / 246 tests green (the plan's targeted list). `npx tsc --noEmit` exit 0. `npm run lint` clean.
- Prettier: the two code files clean; `analytics-event-reference.md` reports style issues **at HEAD too**
  (pre-existing, not reformatted here).
- **One full `npm test`** (npm script, lock): **1 failed / 226 passed suites (227); 1 failed / 4683 passed tests;
  97.63 s; exit 1.** The failure: `tests/profile-server/SessionRoutes.test.ts` › "Bearer only → ok…",
  `Exceeded timeout of 5000 ms` — the known supertest flake shape; no `SIGSEGV`, no `node-*.ips`. **Re-ran that
  suite alone** (targeted, not a second full run): 124/124 green. The 0353 probe from the build round was not
  collected (`.fkit/tmp/tests/client/` no longer exists; not investigated who removed it). No jest process left.
