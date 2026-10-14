# Plan — 0454: a wrong private-lobby code shows "Lobby not found"

This was planning only. EnterPlanMode is not available in a spawn, so I kept to that by declaring it. No source and no repo files were written. Statuses were not touched.

## Summary
- **Fix:** skip the archive lookup when `archiveEnabled()` is false. A wrong code then goes straight to the existing `private_lobby.not_found` line. Uses the existing flag, adds no second flag, leaves the value a hard `false`, adds no new text.
- **Absorbs `0292`: YES.** With the flag false, the client makes no request to `${getApiBase()}/game/<code>`, and no `/commit.txt` request either (that fetch lives only inside `checkArchivedGame()`). The flag is read through the existing `getServerConfigFromClient()` handle with no new plumbing, so the owner's condition for cancelling `0292` at close is met. The closer still checks this against the diff and worklog, as the ruling says.
- **0451's events are unchanged on every path production can reach.** The screen is made to follow the same classification. One shared helper sets both the message and the event, so the two can no longer disagree.
- **Effort:** one client file, three test files, plus one optional doc edit (open question 1).

## Verified facts the plan rests on (read this session)
- `src/client/JoinPrivateLobbyModal.ts` (0451's final version, committed in `daa1bcc`, clean in the working tree):
  - `joinLobby()` sets `workerSaidNotFound = active === "not_found"`.
  - `checkActiveLobby()` already returns `"not_found"` only for `response.ok && exists === false`, otherwise `"unknown"` (0451's R2).
  - The `"error"` branch and the `catch` both show `private_lobby.error` and log `workerSaidNotFound ? "NotFound" : "Error"`.
  - `checkArchivedGame()` fetches `${getApiBase()}/game/<id>` together with `/commit.txt`, and only `404` counts as not-found.
- `archiveEnabled()` is declared on the `ServerConfig` interface (`src/core/configuration/Config.ts:68`) and implemented only in `DefaultServerConfig` (`src/core/configuration/DefaultConfig.ts:316`, hard `false`).
  - No subclass overrides it.
  - `getServerConfigFromClient()` (`src/core/configuration/ConfigLoader.ts:29`) returns `DevServerConfig` / `preprodConfig` / `prodConfig` and is cached, so the client reads the same constant the server uses.
  - The modal already awaits it inside `checkActiveLobby()`. The handle is confirmed, so the "stop if plumbing is needed" clause in `0292`'s brief does not fire.
- Test mocks of `getServerConfigFromClient` in `tests/client/JoinPrivateLobbyAnalytics.test.ts`, `JoinPrivateLobbyModalLeave.test.ts` and `JoinPrivateLobbyModalPaste.test.ts` return only `{ workerPath }`.
  - Once the gate exists, a not-joined lookup would call `config.archiveEnabled()` on such a mock and throw a TypeError. The `catch` would swallow it and show the error line, so tests could pass for the wrong reason.
  - The mocks must therefore gain `archiveEnabled`. This is the main trap in the build.
- Jest is 30.x. `jest.restoreAllMocks()` only restores spies, so the Leave test's existing per-test `mockResolvedValue` pattern carries over.

## Changes

### 1. `src/client/JoinPrivateLobbyModal.ts` (the only source file)
a. **Read the config once, at the top of `joinLobby()`'s `try`:**
   - Add `const config = await getServerConfigFromClient();` and pass it into `checkActiveLobby(lobbyId, config, generation, via)`.
   - Remove that function's own config call. It has no other caller.
   - A failed config read stays inside the `try`, so it still ends as `private_lobby.error` + `JoinFailed:Error`, as today.
   - The joining mark (`0336`/`0374`) still begins before the `try`, so its scope is unchanged.
   - `pollPlayers()` keeps its own call. I rejected calling the config a second time instead: it is one wasted await, and it is one more place where a close mid-lookup could slip through.

b. **Gate, immediately after the existing `if (active === "joined" || this.isClosedSince(generation)) return;` and `workerSaidNotFound = …`:**
   ```ts
   // Task 0454: archiving is off (ADR-104), so nothing serves the archive —
   // don't ask it. The worker's answer alone decides what the player sees.
   if (!config.archiveEnabled()) {
     this.showJoinFailed(workerSaidNotFound);
     return;
   }
   ```

c. **New private helper:** `showJoinFailed(notFound: boolean)`.
   - It sets `this.message` to `translateText(notFound ? "private_lobby.not_found" : "private_lobby.error")` and calls `logPrivateLobbyJoinFailed(notFound ? "NotFound" : "Error")`.
   - Use it in the `"error"` switch branch and in the `catch`: `this.showJoinFailed(workerSaidNotFound)`.
   - The `"not_found"` (archive 404) branch keeps its current behaviour, not_found + NotFound, written as `showJoinFailed(true)`.
   - The `version_mismatch` and `success` branches are untouched.
   - Message and event are now always set together, so they cannot disagree.

d. **The decision the brief asks for: what an archive answer that is not a real archive answer means.** This only matters once `0030` switches archiving on. Cases: a `200` that is not JSON (the production shape), a body that fails to parse, an HTTP error, or a network failure.
   - **Decided:** the outcome follows the worker's answer.
     - If our worker said `exists: false`, the player sees **not_found** (+ NotFound, which is already 0451's event).
     - Otherwise, the player sees **error** (+ Error).
   - **Reason:** the worker is the authority on live lobbies. A broken archive only means "we couldn't offer a replay", not "something you did failed".
   - This also removes 0451's own recorded disagreement between screen and event (archive fails after a worker NotFound → screen showed "error" while the event said NotFound).
   - `checkArchivedGame()` itself needs **no edit**. A `.json()` throw still goes to the `catch`, which now uses the helper.
   - A short comment at the `catch` names `0030`, so that task inherits the decision knowingly.
   - Overturnable in one line.

e. **Not touched:**
   - the early bad-format path (`PrivateLobbyCodeSchema`, which already shows not_found);
   - `checkActiveLobby()`'s live-join path, the `Joined:{Link|Code}` dedupe, and `isClosedSince`;
   - `archiveEnabled()`'s value, `getApiBase` (still imported and used inside `checkArchivedGame()`), and every lang file.

**Before and after, per path:**

| Path | Archiving | Screen before → after | Event before → after |
|---|---|---|---|
| Worker says `exists: false` (prod and local today) | off | error → **not_found** | NotFound → NotFound |
| Worker non-OK, `{}` with no `exists: true`, HTML, network failure, config read failure | off | error → error | Error → Error |
| Worker says false, archive 404 | on (dormant) | not_found → not_found | NotFound → NotFound |
| Worker says false, archive 500 / HTML / throws | on (dormant) | error → **not_found** | NotFound → NotFound |
| Worker unknown, archive 500 / HTML / throws | on (dormant) | error → error | Error → Error |
| Version mismatch / replay | on (dormant) | unchanged | none → none |

⚠️ **One clause becomes unreachable, not changed.** The reference doc's line *"or the archive itself answered 404"* (a NotFound even when the worker answered "unknown") cannot happen while archiving is off, because no archive request is made. Production never answered 404 there anyway: it answers 200 HTML, and locally the connection is refused. So no reachable count moves. The event's definition is unchanged, so I see no owner question here. Stated so it is not missed.

### 2. Tests (no full run in parallel; targeted runs while building)
**`tests/client/JoinPrivateLobbyAnalytics.test.ts`:**
- Add `let archiveOn = false`, and in `beforeEach` set `getServerConfigFromClient` to resolve `{ workerPath: () => "w1", archiveEnabled: () => archiveOn }`.
- Default the archive mock to `"html"`, the production shape, never 404.
- Assert the `.message-area` text in every join-failed test, so screen and event are checked together.
- New or changed cases:
  - **Wrong code, archiving off:** message `private_lobby.not_found`; events exactly `["PrivateLobby:JoinFailed:NotFound"]`; **no fetch** to a URL starting `/archive/` and **none** to `/commit.txt`. This replaces 0451's test *"…message unchanged (private_lobby.error)"*, which asserted the old bug on purpose.
  - **Archiving off, worker fails:** HTTP 500 with a JSON body, HTML, network reject, and `200 {}`. Each gives message `private_lobby.error`, `["…JoinFailed:Error"]` once, never NotFound, and no archive fetch.
  - **Archiving on + 200 HTML archive answer (production shape) after the worker said false:** not `private_lobby.error` from the uncaught `.json()`; message `private_lobby.not_found` + NotFound, asserted explicitly.
  - **Archiving on + archive 500 after the worker said false:** not_found + NotFound.
  - **Archiving on + worker unknown + archive HTML:** error + Error.
  - **Archiving on + archive 404:** keep, not_found + NotFound.
  - Version mismatch, the replay spy, and "a failure that settles after the window closed" (pending archive) get `archiveOn = true`, otherwise they stop reaching the archive.
  - The existing joined, dedupe, close-mid-lookup, bad-format and no-code-in-payload tests keep passing unchanged. The payload test's 4-call count still holds.

**`tests/client/JoinPrivateLobbyModalLeave.test.ts`:**
- Add `archiveEnabled: () => false` to the module mock and to the `0389` describe's `beforeEach`/`afterEach` `mockResolvedValue`.
- `(f2) closing while the archive check is in flight` sets `archiveEnabled: () => true` for that test only. It still proves the close guard on the archive path, which stays reachable once `0030` lands.
- Add one small case: a close while `/exists` is pending with archiving off shows no late message and makes no archive fetch.
- J2/J3, the joining-mark tests, pass as before. Re-check that J2 now settles through the gate and not through a swallowed TypeError.

**`tests/client/JoinPrivateLobbyModalPaste.test.ts`:** add `archiveEnabled: () => false` to the mock, so it stays a valid shape. Its flows join before the gate, so no assertion changes.

The HostLobby tests only mention the Join modal in comments. They stay untouched.

### 3. Verification (Build worker)
1. Targeted: `npm test -- tests/client/JoinPrivateLobbyAnalytics.test.ts tests/client/JoinPrivateLobbyModalLeave.test.ts tests/client/JoinPrivateLobbyModalPaste.test.ts` (no lock taken).
2. `npm run lint` on the touched files.
3. Brief step 6: `git diff resources/lang/` is empty. `grep -rn "archiveEnabled" src/` shows one definition (`DefaultConfig.ts`), one interface line (`Config.ts`), and the new consumer alongside `Archive.ts` and `LocalServer.ts`. `DefaultConfig.ts` is unchanged and still returns `false`.
4. **One** full `npm test` through the npm script, at the end, after checking that no other full run or leftover background job is active. Project lock, about 5 minutes. A lone `Exceeded timeout of 5000 ms` is judged by the supertest flake rule: re-run once, and say that it was re-run.
5. Local browser check, brief step 5:
   - Run `npm run dev` and drive the page with Playwright: a made-up valid-format code shows the not-found line in English and in Russian, and the network log shows no `/game/<code>` or `/commit.txt` request. A live lobby code from a second tab joins.
   - If the dev server can't start (port 3001 squatter, see memory), report it as **unverified** with the reason. Never claim it passed.
6. No endpoint, hostname, real lobby code or credential in the diff, comments or worklog. Tests use the existing fake `K7M4PCRX`.

### 4. Doc (conditional — see open question 1)
- **File:** `ai-agents/knowledge-base/analytics-event-reference.md`.
- **What is now false:** the `JoinFailed:NotFound` row's *"Counting only: the player's message is not changed by this"* and the note at about lines 518-525: *"⚠️ The player still sees the generic error line … left unchanged here"* and the "Rare cost" sentence. After this task those statements are false.
- The **firing point does not move**. The brief says to update the doc "only if the firing point moves", so this edit sits slightly outside the brief's literal wording.
- **Proposed:** correct only those sentences. Say the screen now matches the event, and that while archiving is off there is no archive step at all. Leave the trigger definitions untouched.

### Risks and edge cases
- **Mock shape (above).** The most likely way to get a test that is "green for the wrong reason". The new tests must assert the message text, not only the event.
- **Moving the config read to the top of `joinLobby()`** sits inside the existing `try`, before the first `await` that matters, so close-generation behaviour is unchanged. No extra `isClosedSince` check is needed: the gate runs after the existing check.
- **Event volume:** unchanged (owner preference 2026-10-14). No event is added, removed or filtered, and every reachable path fires the same event once.
- **Analytics enum:** unchanged.

### At close (for the producer, not built here)
- **`0292`:** the condition is met if the diff shows the gate as planned. The producer cancels `0292` as absorbed by `0454`, per the owner ruling of 2026-10-14, in the same act as the `0454` close.
- **Verify task (recommended):** "verify 0454 — on the live game, a wrong code shows 'Lobby not found' (EN + RU) and the network log shows no `/game/<code>` request".
  - Placement: **top of Sprint 9**, per the standing owner ruling of 2026-09-29 (build/verify split: a verify task at the top of the NEXT sprint, never blocking this sprint's deploy). This brief says the sprint is the owner's call; that ruling is the owner's standing answer, so ask again only if the owner wants something else.
- **Wiki:** `wiki/tasks/archive-endpoint-failures.md` and `wiki/decisions/adr-104-archiving-disabled.md` still say the client read is "benign / 404 → not_found". Flag them for `fkit-wiki` to fix on the next sync. Never edit them from this task.
- **`0426`'s player-facing announcement** may mention "a wrong lobby code now says the lobby was not found".

## Owner decisions (2026-10-14, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver session, relayed by fkit-lead)

These override any conflicting text above.

- **Plan approval — verbatim selection: "Approve (Recommended)".**
- **Doc fix — verbatim selection: "Fix the stale sentences (Recommended)".** Option text: "About 4 lines in one doc; event definitions untouched." ⇒ §4 is in scope: correct only the now-false player-message sentences in `ai-agents/knowledge-base/analytics-event-reference.md`; leave the event trigger definitions untouched.
- **Verify task placement:** the standing build/verify-split rule (owner ruling 2026-09-29) applies — top of Sprint 9 (no Sprint 9 board exists yet; the closing producer parks it on the Backlog board flagged "top of Sprint 9", as done for 0460).
